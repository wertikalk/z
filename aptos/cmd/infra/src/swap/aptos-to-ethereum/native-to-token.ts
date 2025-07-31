import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { ok } from "assert";
import { keccak256 } from "ethers";
import { Account, U256, U64, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

import { createSrcEscrow, claimFunds } from "./utils.js";

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

// Expected values:
const expectedSecret = BigInt(
    "9881046084942319317051528014966670028548901821291847182136520033685657548410"
);
const expectedHashedSecret = BigInt(
    "17495693279741366028282178236420941512064715111494521660862812275588305430701"
);
// Actual values:
const actualHashedSecret = BigInt(hashedSecret);

// Sanity checks
ok(expectedHashedSecret === actualHashedSecret, "Hashed secret value mismatch");
ok(hashedSecret.length === 66, "Secret hash should be 66 characters long");

const tx = await createSrcEscrow(
    maker,
    maker.accountAddress, // resolver
    secret,
    new U256(BigInt(hashedSecret)),
    new U64(10n), // amount
    new U64(60n) // unlock time
);

console.log("Create Escrow Transaction:", tx);

const claimTx = await claimFunds(maker, maker.accountAddress, secret);

console.log("Claim Transaction:", claimTx);
