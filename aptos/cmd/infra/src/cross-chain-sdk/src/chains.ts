import { NetworkEnum } from "@1inch/fusion-sdk";
import { TupleToUnion } from "./type-utils.js";

const APTOS_NETWORK = 1301;
export const SupportedChains = [
    NetworkEnum.ETHEREUM,
    APTOS_NETWORK,
    NetworkEnum.COINBASE,
    NetworkEnum.POLYGON,
] as const;

type UnsupportedChain = Exclude<
    NetworkEnum,
    TupleToUnion<typeof SupportedChains>
>;

export type SupportedChain = Exclude<NetworkEnum, UnsupportedChain>;

export const isSupportedChain = (chain: unknown): chain is SupportedChain =>
    SupportedChains.includes(chain as number);
