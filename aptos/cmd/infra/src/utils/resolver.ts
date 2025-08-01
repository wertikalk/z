import { Interface, Signature, TransactionRequest } from "ethers";
import * as Sdk from "../cross-chain-sdk/src/index.js";
import * as Contract from "../artifacts/Resolver.js";
import {
    Network as AptosNetwork,
    NetworkToNetworkName as AptosNetworkToNetworkName,
    AptosConfig,
    Aptos,
    U256,
    U64,
} from "@aptos-labs/ts-sdk";

const APTOS_NETWORK: AptosNetwork =
    AptosNetworkToNetworkName[process.env.APTOS_NETWORK ?? AptosNetwork.DEVNET];
export const config = new AptosConfig({ network: APTOS_NETWORK });
export const aptos = new Aptos(config);

export class Resolver {
    private readonly iface = new Interface((Contract.ARTIFACT as any).abi);

    constructor(
        public readonly srcAddress: string,
        public readonly dstAddress: string
    ) {}

    public deploySrc(
        chainId: number,
        order: Sdk.CrossChainOrder,
        signature: string,
        takerTraits: Sdk.TakerTraits,
        amount: bigint,
        hashLock = order.escrowExtension.hashLockInfo,
        isAptos: boolean = false
    ): TransactionRequest | any {
        if (!isAptos) {
            const { r, yParityAndS: vs } = Signature.from(signature);
            const { args, trait } = takerTraits.encode();
            const immutables = order.toSrcImmutables(
                chainId,
                new Sdk.Address(this.srcAddress),
                amount,
                hashLock
            );

            const data = this.iface.encodeFunctionData("deploySrc", [
                immutables.build(),
                order.build(),
                r,
                vs,
                amount,
                trait,
                args,
            ]);

            console.log("---> ", data);

            return {
                to: this.srcAddress,
                data,
                value: order.escrowExtension.srcSafetyDeposit,
            };
        } else {
            throw new Error(
                "ERR: [Aptos] User should deploy SRC escrow instead of approving tokens!"
            );
        }
    }

    public async deployDst(
        immutables:
            | Sdk.Immutables
            | {
                  resolverAddress: any;
                  hashedSecret: U256;
                  secret: U256;
                  dstEscrowFactory: any;
                  coinType: any;
                  amount: U64;
                  safetyDeposit: any;
                  unlockTime: U64;
              }
            | any,
        isAptos: boolean = false
    ): Promise<TransactionRequest | any> {
        if (!isAptos) {
            return {
                to: this.dstAddress,
                data: this.iface.encodeFunctionData("deployDst", [
                    immutables.build(),
                    immutables.timeLocks.toSrcTimeLocks().privateCancellation,
                ]),
                value: immutables.safetyDeposit,
            };
        } else {
            return await aptos.transaction.build.simple({
                sender: immutables.resolverAddress,
                data: {
                    function: `${immutables.dstEscrowFactory}::locked_coins_z_3::create_escrow`,
                    typeArguments: [immutables.coinType],
                    functionArguments: [
                        immutables.resolverAddress,
                        immutables.hashedSecret,
                        immutables.secret,
                        immutables.amount,
                        immutables.unlockTime,
                    ],
                },
                options: {
                    maxGasAmount: 1000,
                    gasUnitPrice: 100,
                },
            });
        }
    }

    public withdraw(
        side: "src" | "dst",
        escrow: Sdk.Address,
        secret: string,
        immutables: Sdk.Immutables
    ): TransactionRequest {
        return {
            to: side === "src" ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData("withdraw", [
                escrow.toString(),
                secret,
                immutables.build(),
            ]),
        };
    }

    public cancel(
        side: "src" | "dst",
        escrow: Sdk.Address,
        immutables: Sdk.Immutables
    ): TransactionRequest {
        return {
            to: side === "src" ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData("cancel", [
                escrow.toString(),
                immutables.build(),
            ]),
        };
    }
}
