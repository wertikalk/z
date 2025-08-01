import dotenv from "dotenv";
dotenv.config();

import {
    Account,
    AccountAddress,
    Aptos,
    AptosConfig,
    Network,
    NetworkToNetworkName,
    InputViewFunctionJsonData,
    U256,
} from "@aptos-labs/ts-sdk";
import { randomBytes, parseUnits } from "ethers";
import { uint8ArrayToHex, UINT_40_MAX } from "@1inch/byte-utils";
import { randBigInt, AuctionDetails } from "@1inch/fusion-sdk";
import * as Sdk from "../cross-chain-sdk/src/index.js";

export const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
export const Z_ESCROW_MANAGER =
    "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071::locked_coins_z_3";

const APTOS_NETWORK: Network =
    NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
export const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);

export const getBalance = async (
    aptos: Aptos,
    address: AccountAddress
): Promise<any> => {
    const payload: InputViewFunctionJsonData = {
        function: "0x1::coin::balance",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [address.toString()],
    };
    const [balance] = await aptos.viewJson<[number]>({ payload: payload });
    return balance;
};

export const claimFunds = async (
    resolver: Account,
    resolverAddress: AccountAddress,
    secret: U256
) => {
    const createObject = await aptos.transaction.build.simple({
        sender: resolver.accountAddress,
        data: {
            function: `${Z_ESCROW_MANAGER}::claim_funds`,
            typeArguments: [APTOS_COIN],
            functionArguments: [resolverAddress, secret],
        },
        options: {
            maxGasAmount: 1000,
            gasUnitPrice: 100,
        },
    });

    const pendingObjectTxn = await aptos.signAndSubmitTransaction({
        signer: resolver,
        transaction: createObject,
    });
    const response = await aptos.waitForTransaction({
        transactionHash: pendingObjectTxn.hash,
    });

    return response;
};

export const createOrder = async (
    srcChainId: Sdk.NetworkEnum,
    dstChainId: Sdk.NetworkEnum,
    srcTimestamp: bigint,
    srcEscrowFactory: any,
    makerAddress: any,
    makerAssetAddress: any,
    makingAmount: bigint,
    takingAmount: bigint,
    takerAssetAddress: any,
    resolver: any
) => {
    const secret = uint8ArrayToHex(randomBytes(32)); // note: use crypto secure random number in real world

    const x = new AptosAddress(makerAssetAddress) as any;

    console.log({ x }, x.toString(), x.isNative(), x.isZero());

    const order = Sdk.CrossChainOrder.new(
        new AptosAddress(srcEscrowFactory) as any,
        {
            salt: randBigInt(1000n),
            maker: makerAddress,
            makingAmount,
            takingAmount,
            makerAsset: new AptosAddress(makerAssetAddress) as any,
            takerAsset: new Sdk.Address(takerAssetAddress),
        },
        {
            hashLock: Sdk.HashLock.forSingleFill(secret),
            timeLocks: Sdk.TimeLocks.new({
                srcWithdrawal: 10n, // 10sec finality lock for test
                srcPublicWithdrawal: 120n, // 2m for private withdrawal
                srcCancellation: 121n, // 1sec public withdrawal
                srcPublicCancellation: 122n, // 1sec private cancellation
                dstWithdrawal: 10n, // 10sec finality lock for test
                dstPublicWithdrawal: 100n, // 100sec private withdrawal
                dstCancellation: 101n, // 1sec public withdrawal
            }),
            srcChainId: srcChainId as any,
            dstChainId: dstChainId as any,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
        },
        {
            auction: new AuctionDetails({
                initialRateBump: 0,
                points: [],
                duration: 120n,
                startTime: srcTimestamp,
            }),
            whitelist: [
                {
                    address: resolver, // ??
                    allowFrom: 0n,
                },
            ],
            resolvingStartTime: 0n,
        },
        {
            nonce: randBigInt(UINT_40_MAX),
            allowPartialFills: false,
            allowMultipleFills: false,
        }
    );

    return order;
};

export class AptosAddress {
    static NATIVE_CURRENCY: AptosAddress = new AptosAddress(APTOS_COIN);
    static ZERO_ADDRESS: AptosAddress = new AptosAddress("0");
    private readonly val;
    constructor(val: string) {
        this.val = val;
    }
    static fromBigInt(val: bigint): AptosAddress {
        return new AptosAddress(val.toString());
    }
    static fromFirstBytes(bytes: string): AptosAddress {
        return new AptosAddress(bytes);
    }
    toString(): string {
        return this.val;
    }
    equal(other: AptosAddress): boolean {
        return this.val === other.val;
    }
    isNative(): boolean {
        return this.val === AptosAddress.NATIVE_CURRENCY.val;
    }
    isZero(): boolean {
        return this.val === AptosAddress.ZERO_ADDRESS.val;
    }
    lastHalf(): string {
        return this.val.slice(-32);
    }
}
