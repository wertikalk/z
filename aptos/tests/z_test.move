#[test_only]
module z_aptos::taker_tests {
    use std::string;
    use std::signer;
    use aptos_framework::account;

    use z_aptos::taker;
    
    #[test]
    fun test_keccak256_hash() {
        let test_account = account::create_account_for_test(@0x1);

        taker::hash_message(string::utf8(b"Hello World"));
    }
}