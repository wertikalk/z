import { z } from "zod";
import Sdk from "@1inch/cross-chain-sdk";
import * as process from "node:process";
const ConfigSchema = z.object({
    ETHEREUM_RPC_URL: z.string().url(),
    APTOS_RPC_URL: z.string().url(),
});
const fromEnv = ConfigSchema.parse(process.env);
export const config = {
    chain: {
        source: {
            chainId: Sdk.NetworkEnum.ETHEREUM,
            url: fromEnv.ETHEREUM_RPC_URL,
            limitOrderProtocol: "0x111111125421ca6dc452d289314280a0f8842a65",
            wrappedNative: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
            ownerPrivateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
            tokens: {
                USDC: {
                    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                    donor: "0xd54F23BE482D9A58676590fCa79c8E43087f92fB",
                },
            },
        },
        destination: {
            chainId: 1301,
            url: fromEnv.APTOS_RPC_URL,
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
    },
};
//# sourceMappingURL=config.js.map