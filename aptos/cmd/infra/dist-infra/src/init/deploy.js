import "dotenv/config";
import Sdk from "@1inch/cross-chain-sdk";
import { computeAddress, ContractFactory, JsonRpcProvider, Wallet as SignerWallet, } from "ethers";
import factoryContract from "../../dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json";
import resolverContract from "../../dist/contracts/Resolver.sol/Resolver.json";
const { Address } = Sdk;
export const initEthereum = async (cnf, resolverPk) => {
    const provider = new JsonRpcProvider(cnf.url);
    const deployer = new SignerWallet(cnf.ownerPrivateKey, provider);
    // deploy EscrowFactory
    const escrowFactory = await deploy(factoryContract, [
        cnf.limitOrderProtocol,
        cnf.wrappedNative, // feeToken,
        Address.fromBigInt(0n).toString(), // accessToken,
        deployer.address, // owner
        60 * 30, // src rescue delay
        60 * 30, // dst rescue delay
    ], deployer);
    console.log(`[${cnf.chainId}]`, `Escrow factory contract deployed to`, escrowFactory);
    // deploy Resolver contract
    const resolver = await deploy(resolverContract, [
        escrowFactory,
        cnf.limitOrderProtocol,
        computeAddress(resolverPk), // resolver as owner of contract
    ], deployer);
    console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver);
    return { provider, resolver, escrowFactory };
};
export const deploy = async (json, params, deployer) => {
    const deployed = await new ContractFactory(json.abi, json.bytecode, deployer).deploy(...params);
    await deployed.waitForDeployment();
    return await deployed.getAddress();
};
//# sourceMappingURL=deploy.js.map