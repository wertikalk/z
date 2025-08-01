import { z } from "zod";
import * as Sdk from "./cross-chain-sdk/src/index.js";
import * as process from "node:process";

import "dotenv/config.js";

const ConfigSchema = z.object({
    ETHEREUM_RPC_URL: z.string().url(),
    APTOS_RPC_URL: z.string().url(),
    BASE_RPC_URL: z.string().url(),
    POLYGON_RPC_URL: z.string().url(),
    TEST_ETHEREUM_PRIVATE_KEY: z.string(),
    TEST_ETHEREUM_RESOLVER_PRIVATE_KEY: z.string(),
    TEST_APTOS_USER_PRIVATE_KEY: z.string(),
    TEST_APTOS_RESOLVER_PRIVATE_KEY: z.string(),
    TEST_BASE_USER_PRIVATE_KEY: z.string(),
    TEST_BASE_RESOLVER_PRIVATE_KEY: z.string(),
    TEST_POLYGON_USER_PRIVATE_KEY: z.string(),
    TEST_POLYGON_RESOLVER_PRIVATE_KEY: z.string(),
});

const fromEnv = ConfigSchema.parse(process.env);

export const config = {
    ETHEREUM: {
        chainId: Sdk.NetworkEnum.ETHEREUM,
        url: fromEnv.ETHEREUM_RPC_URL,
        srcEscrowFactory:
            "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071",
        dstEscrowFactory:
            "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071",
        limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65",
        wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        ownerPrivateKey:
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        tokens: {
            USDC: {
                address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                donor: "0xd54F23BE482D9A58676590fCa79c8E43087f92fB",
            },
        },
    },
    APTOS: {
        chainId: Sdk.NetworkEnum.APTOS,
        url: fromEnv.APTOS_RPC_URL,
        srcEscrowFactory:
            "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071",
        dstEscrowFactory:
            "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071",
        limitOrderProtocol: "",
        wrappedNative: "",
        ownerPrivateKey: "",
        tokens: {
            USDC: {
                address: "",
                donor: "",
            },
        },
    },
    BASE: {
        chainId: Sdk.NetworkEnum.ETHEREUM,
        url: fromEnv.BASE_RPC_URL,
        srcEscrowFactory: "0x111111125421ca6dc452d289314280a0f8842a65",
        dstEscrowFactory: "0x111111125421ca6dc452d289314280a0f8842a65",
        limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65",
        wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        ownerPrivateKey:
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        tokens: {
            USDC: {
                address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                donor: "0xd54F23BE482D9A58676590fCa79c8E43087f92fB",
            },
        },
    },
    POLYGON: {
        chainId: Sdk.NetworkEnum.POLYGON,
        url: fromEnv.POLYGON_RPC_URL,
        srcEscrowFactory: "0x7B0D7D88039E8ec1C3f362B65dF052D986CeC129",
        srcResolverContract: "0x79Ab227136C7830fcb06994db804b891D12d41f2",
        dstEscrowFactory: "0x7B0D7D88039E8ec1C3f362B65dF052D986CeC129",
        limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65",
        wrappedNative: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
        ownerPrivateKey:
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        tokens: {
            USDC: {
                address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                donor: "0xd54F23BE482D9A58676590fCa79c8E43087f92fB",
            },
        },
    },
} as const;

export type ChainConfig = (typeof config)[
    | "ETHEREUM"
    | "APTOS"
    | "BASE"
    | "POLYGON"];
