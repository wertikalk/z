export {
    Address,
    TakerTraits,
    AmountMode,
    AuctionDetails,
} from "@1inch/fusion-sdk";
export * from "./cross-chain-order/index.js";
export * from "./escrow-factory/index.js";
export * from "./immutables/index.js";

import { NetworkEnum as F_NetworkEnum } from "@1inch/fusion-sdk";
export enum NetworkEnum {
    ETHEREUM = 1,
    APTOS = 1301,
    BASE = F_NetworkEnum.COINBASE,
    POLYGON = F_NetworkEnum.POLYGON,
}
