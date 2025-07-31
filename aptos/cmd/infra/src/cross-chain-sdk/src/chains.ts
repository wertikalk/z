import { NetworkEnum } from "@1inch/fusion-sdk";
import { TupleToUnion } from "./type-utils.js";

export const SupportedChains = [NetworkEnum.ETHEREUM] as const;

type UnsupportedChain = Exclude<
    NetworkEnum,
    TupleToUnion<typeof SupportedChains>
>;

export type SupportedChain = Exclude<NetworkEnum, UnsupportedChain>;

export const isSupportedChain = (chain: unknown): chain is SupportedChain =>
    SupportedChains.includes(chain as number);
