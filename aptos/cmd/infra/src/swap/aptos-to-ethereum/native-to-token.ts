import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { ok } from "assert";
import { keccak256 } from "ethers";
import { Account, U256, U64, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

import { config } from "../../config.js";

const maker = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(
        process.env.APTOS_MAKER_PRIVATE_KEY as string
    ),
});

console.log("Maker Address:", maker.accountAddress.toString());

const secret = new U256(
    BigInt("0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a")
);
const secretAsBytes = secret.bcsToBytes();
const hashedSecret = keccak256(secretAsBytes);
