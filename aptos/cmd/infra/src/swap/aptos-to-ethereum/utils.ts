import {
    Account,
    AccountAddress,
    Aptos,
    AptosConfig,
    U64,
    parseTypeTag,
    Network,
    NetworkToNetworkName,
    InputViewFunctionJsonData,
    U256,
} from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";
dotenv.config();

export const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
export const Z_ESCROW_MANAGER =
    "0x206f737fb2c082825c62c5027d336da76bda90f1dd7bb8866e9a098161c6a071::locked_coins_z_3";

const APTOS_NETWORK: Network =
    NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];

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

export const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);

export const createSrcEscrow = async (
    maker: Account,
    resolver: AccountAddress,
    secret: U256,
    secretHash: U256,
    amount: U64,
    unlockTime: U64
) => {
    const createObject = await aptos.transaction.build.simple({
        sender: maker.accountAddress,
        data: {
            function: `${Z_ESCROW_MANAGER}::create_escrow`,
            typeArguments: [APTOS_COIN],
            functionArguments: [
                resolver,
                secretHash,
                secret,
                amount,
                unlockTime,
            ],
        },
        options: {
            maxGasAmount: 1000,
            gasUnitPrice: 100,
        },
    });

    const pendingObjectTxn = await aptos.signAndSubmitTransaction({
        signer: maker,
        transaction: createObject,
    });
    const response = await aptos.waitForTransaction({
        transactionHash: pendingObjectTxn.hash,
    });

    return response;
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
