module z_aptos::taker {
    use std::debug;  

    use std::string;
    use std::signer;

    use aptos_std::aptos_hash::keccak256;

    public entry fun hash_message(message: string::String) {
        let byte_vector_ref: &vector<u8> = message.bytes();
        let hash_value = keccak256(*byte_vector_ref);
        debug::print(&hash_value);
    }
}