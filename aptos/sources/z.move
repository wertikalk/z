module z_aptos::Resolver {
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
        locks: Table<u256, Escrow<CoinType>>,
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
    /// DBG: Invalid `secret` provided does not match the expected `hashed_secret` value.
    const E_DBG_INVALID_SECRET_TO_HASHED: u64 = 4;

    /// Initialize the `Resolver` account for a specific `CoinType`.
    public entry fun initialize_resolver<CoinType>(
        resolver: &signer, withdrawal_address: address
    ) {
        move_to(
            resolver,
            AllEscrows<CoinType> {
                locks: table::new<u256, Escrow<CoinType>>(),
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
        assert_resolver_initialized<CoinType>(resolver);

        let resolver_address = signer::address_of(resolver);

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
        let locks = borrow_global_mut<AllEscrows<CoinType>>(resolver_address);

        assert!(
            !table::contains(&locks.locks, key_hash),
            error::already_exists(E_ESCROW_ALREADY_EXISTS)
        );
        table::add(
            &mut locks.locks,
            key_hash,
            Escrow<CoinType> { coins, unlock_time_secs }
        );
        locks.total_active_escrows = locks.total_active_escrows + 1;
    }

    /// Release the funds from the `Escrow` using the `secret`.
    public entry fun release_funds<CoinType>(
        maker: &signer, resolver: address, secret: u256
    ) acquires AllEscrows {
        assert!(
            exists<AllEscrows<CoinType>>(resolver),
            error::not_found(E_RESOLVER_ACCOUNT_NOT_INITIALIZED)
        );

        let maker_address = signer::address_of(maker);

        let maker_vec = bcs::to_bytes(&maker_address);
        let hashed_secret = hash_message(bcs::to_bytes(&secret));
        let concanated_vec = bcs::to_bytes(&hashed_secret);
        vector::append(&mut concanated_vec, maker_vec);

        let key_hash = hash_message(concanated_vec);

        let locks = borrow_global_mut<AllEscrows<CoinType>>(resolver);
        assert!(
            table::contains(&locks.locks, key_hash),
            error::not_found(E_ESCROW_NOT_FOUND)
        );

        let Escrow { coins, unlock_time_secs } = table::remove(
            &mut locks.locks, key_hash
        );
        locks.total_active_escrows = locks.total_active_escrows - 1;

        coin::deposit(maker_address, coins);
    }

    public fun hash_message(bytes_vec: vector<u8>): u256 {
        let hash_vec: vector<u8> = keccak256(bytes_vec);
        let hash_val: u256 = 0;
        for (i in 1..(vector::length(&hash_vec) + 1)) {
            let byte: u256 = *vector::borrow(&hash_vec, i - 1) as u256;
            hash_val = (hash_val << 8) | byte;
        };
        hash_val
    }

    fun assert_resolver_initialized<CoinType>(resolver: &signer) {
        let resolver_address = signer::address_of(resolver);
        assert!(
            exists<AllEscrows<CoinType>>(resolver_address),
            error::not_found(E_RESOLVER_ACCOUNT_NOT_INITIALIZED)
        );
    }

    #[test_only]
    use aptos_framework::account;
    #[test_only]
    use aptos_framework::coin::BurnCapability;
    #[test_only]
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    #[test_only]
    use aptos_framework::aptos_account;

    #[test(aptos_framework = @0x1, resolver = @0x123, maker = @0x234)]
    public entry fun test_basic_flow(
        aptos_framework: &signer, resolver: &signer, maker: &signer
    ) acquires AllEscrows {
        let burn_cap = basic_test_setup(aptos_framework, resolver);

        let resolver_address = signer::address_of(resolver);
        initialize_resolver<AptosCoin>(resolver, resolver_address);

        let maker_addr = signer::address_of(maker);
        aptos_account::create_account(maker_addr);

        //  Maker side
        let secret: u256 =
            0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a;
        // debug::print(&secret);
        let hashed_secret: u256 = hash_message(bcs::to_bytes(&secret));
        // debug::print(&hashed_secret);

        // Resolver side
        // --------------> Maker has sent only the `hashed_secret` to the resolver.
        create_escrow<AptosCoin>(
            resolver,
            maker_addr,
            hashed_secret,
            secret,
            1000,
            1000
        );
        // --------------> Maker has sent the `secret` to the resolver.
        release_funds<AptosCoin>(maker, resolver_address, secret);

        // Check the balance of the maker after the release
        assert!(coin::balance<AptosCoin>(maker_addr) == 1000, 0);

        // Clean up
        coin::destroy_burn_cap(burn_cap);
    }

    #[test_only]
    fun basic_test_setup(aptos_framework: &signer, resolver: &signer):
        BurnCapability<AptosCoin> {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        account::create_account_for_test(signer::address_of(resolver));
        coin::register<AptosCoin>(resolver);
        let coins = coin::mint<AptosCoin>(2000, &mint_cap);
        coin::deposit(signer::address_of(resolver), coins);
        coin::destroy_mint_cap(mint_cap);

        burn_cap
    }
}
