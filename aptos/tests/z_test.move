#[test_only]
module z_aptos::Resolver_tests {
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use std::error;
    use std::signer;
    use std::vector;
    use std::bcs;
    use std::debug;

    use z_aptos::Resolver;

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
    ) {
        let burn_cap = basic_test_setup(aptos_framework, resolver);

        let resolver_address = signer::address_of(resolver);
        Resolver::initialize_resolver<AptosCoin>(resolver, resolver_address);

        let maker_addr = signer::address_of(maker);
        aptos_account::create_account(maker_addr);

        // Maker side
        let secret: u256 =
            0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a;
        // debug::print(&secret);
        let hashed_secret: u256 = Resolver::hash_message(bcs::to_bytes(&secret));
        // debug::print(&hashed_secret);

        // Resolver side
        // --------------> Maker has sent only the `hashed_secret` to the resolver.
        Resolver::create_escrow<AptosCoin>(
            resolver,
            maker_addr,
            hashed_secret,
            secret,
            1000,
            1000
        );
        // --------------> Maker has sent the `secret` to the resolver.
        Resolver::release_funds<AptosCoin>(resolver, maker_addr, secret);

        // Check the balance of the maker after the release
        assert!(coin::balance<AptosCoin>(maker_addr) == 1000, 0);

        // Clean up
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, resolver = @0x123, maker = @0x234)]
    #[expected_failure(abort_code = 196613, location = Resolver)]
    public entry fun test_invalid_cancel_and_withdraw_flow(
        aptos_framework: &signer, resolver: &signer, maker: &signer
    ) {
        let burn_cap = basic_test_setup(aptos_framework, resolver);

        let resolver_address = signer::address_of(resolver);
        Resolver::initialize_resolver<AptosCoin>(resolver, resolver_address);

        let maker_addr = signer::address_of(maker);
        aptos_account::create_account(maker_addr);

        // Maker side
        let secret: u256 =
            0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a;
        let hashed_secret: u256 = Resolver::hash_message(bcs::to_bytes(&secret));

        // Resolver side
        // --------------> Maker has sent only the `hashed_secret` to the resolver.
        Resolver::create_escrow<AptosCoin>(
            resolver,
            maker_addr,
            hashed_secret,
            secret,
            1000,
            1000
        );

        // ! ---> Maker has changed their mind and wants to cancel the escrow.
        Resolver::cancel_escrow_and_withdraw<AptosCoin>(
            maker, resolver_address, maker_addr, secret
        );

        // Clean up
        coin::destroy_burn_cap(burn_cap);
    }

    #[test(aptos_framework = @0x1, resolver = @0x123, maker = @0x234)]
    public entry fun test_valid_cancel_and_withdraw_flow(
        aptos_framework: &signer, resolver: &signer, maker: &signer
    ) {
        let burn_cap = basic_test_setup(aptos_framework, resolver);

        let resolver_address = signer::address_of(resolver);
        Resolver::initialize_resolver<AptosCoin>(resolver, resolver_address);

        let maker_addr = signer::address_of(maker);
        aptos_account::create_account(maker_addr);

        // Maker side
        let secret: u256 =
            0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a;
        let hashed_secret: u256 = Resolver::hash_message(bcs::to_bytes(&secret));

        debug::print(&secret);
        debug::print(&hashed_secret);

        // Resolver side
        // --------------> Maker has sent only the `hashed_secret` to the resolver.
        Resolver::create_escrow<AptosCoin>(
            resolver,
            maker_addr,
            hashed_secret,
            secret,
            1000,
            1000
        );

        // ! ---> Resolver didn't receive the `secret` from the maker,
        //        or it didn't want to honor the deal while time has expired.
        timestamp::fast_forward_seconds(1500);

        // Maker side
        Resolver::cancel_escrow_and_withdraw<AptosCoin>(
            maker, resolver_address, maker_addr, secret
        );

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
