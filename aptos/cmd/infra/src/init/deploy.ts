import "dotenv/config";

import * as Sdk from "../cross-chain-sdk/src/index.js";
import {
    computeAddress,
    ContractFactory,
    JsonRpcProvider,
    Wallet as SignerWallet,
} from "ethers";
import { ChainConfig } from "../config.js";
import * as factoryContract from "../artifacts/EscrowFactory.js";
import * as resolverContract from "../artifacts/Resolver.js";

const { Address } = Sdk;

export const initEVM = async (
    cnf: ChainConfig,
    resolverPk: string
): Promise<{
    provider: JsonRpcProvider;
    escrowFactory: string;
    resolver: string;
}> => {
    const provider = new JsonRpcProvider(cnf.url);

    const deployer = new SignerWallet(resolverPk, provider);

    const values = [
        cnf.limitOrderProtocol,
        cnf.wrappedNative, // feeToken,
        Address.fromBigInt(0n).toString(), // accessToken,
        await deployer.getAddress(), // owner
        60 * 30, // src rescue delay
        60 * 30, // dst rescue delay
    ];
    console.log(values);

    // deploy EscrowFactory
    const escrowFactory = await deploy(
        factoryContract.ARTIFACT,
        values,
        deployer
    );
    console.log(
        `[${cnf.chainId}]`,
        `Escrow factory contract deployed to`,
        escrowFactory
    );

    // deploy Resolver contract
    const resolver = await deploy(
        resolverContract.ARTIFACT,
        [
            escrowFactory,
            cnf.limitOrderProtocol,
            computeAddress(resolverPk), // resolver as owner of contract
        ],
        deployer
    );
    console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver);

    return { provider, resolver, escrowFactory };
};

export const deploy = async (
    json: any,
    params: unknown[],
    deployer: SignerWallet
): Promise<string> => {
    const deployed = await new ContractFactory(
        json.abi,
        json.bytecode,
        deployer
    ).deploy(...params);
    await deployed.waitForDeployment();

    return await deployed.getAddress();
};
