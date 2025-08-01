module z_aptos_tmp::Resolver {
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use std::error;
    use std::signer;
    use std::vector;
    use std::bcs;
    use std::debug;

    use aptos_std::aptos_hash::keccak256;

    /// Struct to hold locked `coins` until `unlock_time_secs` has been reached.
    struct Escrow<phantom CoinType> has store {
        coins: Coin<CoinType>,
        unlock_time_secs: u64
    }

    /// Map from `key_hash` => `Escrow`.
    struct AllEscrows<phantom CoinType> has key {
        // Where `key_hash` == `hash(maker, hash(secret))`.
        escrows: Table<u256, Escrow<CoinType>>,
        // Resolver's withdrawal address.
        withdrawal_address: address,
        // Number of `Escrow`s that have not yet been resolved.
        total_active_escrows: u64
    }

    /// There exists no `Escrow` with the specified `key_hash`.
    const E_ESCROW_NOT_FOUND: u64 = 1;
    /// Can only create one active `Escrow` per `key_hash`.
    const E_ESCROW_ALREADY_EXISTS: u64 = 2;
    /// `Resolver` account has not been initialized to create `Escrows` for the specified `CoinType`.
    const E_RESOLVER_ACCOUNT_NOT_INITIALIZED: u64 = 3;
    /// Cannot cancel and withdraw from `Escrow` until the `unlock_time_secs` has passed.
    const E_CANCEL_ESCROW_CANNOT_YET_HAPPEN: u64 = 5;
    /// DBG: Invalid `secret` provided does not match the expected `hashed_secret` value.
    const E_DBG_INVALID_SECRET_TO_HASHED: u64 = 6;

    /// Initialize the `Resolver` account for a specific `CoinType`.
    public entry fun initialize_resolver<CoinType>(
        resolver: &signer, withdrawal_address: address
    ) {
        move_to(
            resolver,
            AllEscrows<CoinType> {
                escrows: table::new<u256, Escrow<CoinType>>(),
                withdrawal_address,
                total_active_escrows: 0
            }
        )
    }

    /// Create a new `Escrow` for the specified `CoinType`.
    public entry fun create_escrow<CoinType>(
        resolver: &signer,
        maker: address,
        hashed_secret: u256,
        dbg_secret: u256,
        amount: u64,
        unlock_time_secs: u64
    ) acquires AllEscrows {
        let resolver_address = assert_resolver_initialized<CoinType>(resolver);

        let dbg_hashed_secret = hash_message(bcs::to_bytes(&dbg_secret));
        assert!(
            dbg_hashed_secret == hashed_secret,
            error::invalid_argument(E_DBG_INVALID_SECRET_TO_HASHED)
        );

        let maker_vec = bcs::to_bytes(&maker);
        let concanated_vec = bcs::to_bytes(&hashed_secret);
        vector::append(&mut concanated_vec, maker_vec);

        let key_hash: u256 = hash_message(concanated_vec);

        let coins = coin::withdraw<CoinType>(resolver, amount);
        let escrows = borrow_global_mut<AllEscrows<CoinType>>(resolver_address);

        assert!(
            !table::contains(&escrows.escrows, key_hash),
            error::already_exists(E_ESCROW_ALREADY_EXISTS)
        );
        table::add(
            &mut escrows.escrows,
            key_hash,
            Escrow<CoinType> { coins, unlock_time_secs }
        );
        escrows.total_active_escrows = escrows.total_active_escrows + 1;
    }

    /// Release the funds from the `Escrow` using the `secret`.
    public entry fun release_funds<CoinType>(
        resolver: &signer, maker: address, secret: u256
    ) acquires AllEscrows {

        let resolver_address = assert_resolver_initialized<CoinType>(resolver);

        let maker_vec = bcs::to_bytes(&maker);
        let hashed_secret = hash_message(bcs::to_bytes(&secret));
        let concanated_vec = bcs::to_bytes(&hashed_secret);
        vector::append(&mut concanated_vec, maker_vec);

        let key_hash = hash_message(concanated_vec);

        let escrows = borrow_global_mut<AllEscrows<CoinType>>(resolver_address);
        assert!(
            table::contains(&escrows.escrows, key_hash),
            error::not_found(E_ESCROW_NOT_FOUND)
        );

        let Escrow { coins, unlock_time_secs } =
            table::remove(&mut escrows.escrows, key_hash);
        escrows.total_active_escrows = escrows.total_active_escrows - 1;

        coin::deposit(maker, coins);
    }

    /// Release the funds from the `Escrow` using the `secret`.
    public entry fun cancel_escrow_and_withdraw<CoinType>(
        anyone: &signer,
        resolver_address: address,
        maker: address,
        secret: u256
    ) acquires AllEscrows {

        let maker_vec = bcs::to_bytes(&maker);
        let hashed_secret = hash_message(bcs::to_bytes(&secret));
        let concanated_vec = bcs::to_bytes(&hashed_secret);
        vector::append(&mut concanated_vec, maker_vec);

        let key_hash = hash_message(concanated_vec);

        let escrows = borrow_global_mut<AllEscrows<CoinType>>(resolver_address);

        // Ensure the `Escrow` exists
        assert!(
            table::contains(&escrows.escrows, key_hash),
            error::not_found(E_ESCROW_NOT_FOUND)
        );

        let Escrow { coins, unlock_time_secs } =
            table::remove(&mut escrows.escrows, key_hash);

        // Ensure the unlock time has passed
        assert!(
            timestamp::now_seconds() >= unlock_time_secs,
            error::invalid_state(E_CANCEL_ESCROW_CANNOT_YET_HAPPEN)
        );

        escrows.total_active_escrows = escrows.total_active_escrows - 1;

        coin::deposit(maker, coins);
    }

    public fun hash_message(bytes_vec: vector<u8>): u256 {
        let reversed_vec: vector<u8> = vector::empty();
        vector::reverse_append(&mut reversed_vec, bytes_vec);

        let hash_vec: vector<u8> = keccak256(reversed_vec);
        let hash_val: u256 = 0;
        for (i in 1..(vector::length(&hash_vec) + 1)) {
            let byte: u256 = *vector::borrow(&hash_vec, i - 1) as u256;
            hash_val = (hash_val << 8) | byte;
        };
        hash_val
    }

    fun assert_resolver_initialized<CoinType>(resolver: &signer): address {
        let resolver_address = signer::address_of(resolver);
        assert!(
            exists<AllEscrows<CoinType>>(resolver_address),
            error::not_found(E_RESOLVER_ACCOUNT_NOT_INITIALIZED)
        );
        resolver_address
    }
}
