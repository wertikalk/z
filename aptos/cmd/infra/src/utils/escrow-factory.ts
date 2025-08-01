import { id, Interface, JsonRpcProvider } from "ethers";
import * as Sdk from "../cross-chain-sdk/src/index.js";
import * as EscrowFactoryContract from "../artifacts/EscrowFactory.js";
export class EscrowFactory {
    private iface = new Interface((EscrowFactoryContract.ARTIFACT as any).abi);

    constructor(
        private readonly provider: JsonRpcProvider | any,
        private readonly address: string | any,
        private readonly isAptos: boolean = false
    ) {}

    public async getSourceImpl(): Promise<Sdk.Address | any> {
        if (this.isAptos) {
            return "---aptos";
        }

        return Sdk.Address.fromBigInt(
            BigInt(
                await this.provider.call({
                    to: this.address,
                    data: id("ESCROW_SRC_IMPLEMENTATION()").slice(0, 10),
                })
            )
        );
    }

    public async getDestinationImpl(): Promise<Sdk.Address | any> {
        if (this.isAptos) {
            return "---aptos";
        }

        return Sdk.Address.fromBigInt(
            BigInt(
                await this.provider.call({
                    to: this.address,
                    data: id("ESCROW_DST_IMPLEMENTATION()").slice(0, 10),
                })
            )
        );
    }

    public async getSrcDeployEvent(
        blockHash: string
    ): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
        const event = this.iface.getEvent("SrcEscrowCreated")!;
        const logs = await this.provider.getLogs({
            blockHash,
            address: this.address,
            topics: [event.topicHash],
        });

        const [data] = logs.map((l: any) =>
            this.iface.decodeEventLog(event, l.data)
        );

        const immutables = data.at(0);
        const complement = data.at(1);

        return [
            Sdk.Immutables.new({
                orderHash: immutables[0],
                hashLock: Sdk.HashLock.fromString(immutables[1]),
                maker: Sdk.Address.fromBigInt(immutables[2]),
                taker: Sdk.Address.fromBigInt(immutables[3]),
                token: Sdk.Address.fromBigInt(immutables[4]),
                amount: immutables[5],
                safetyDeposit: immutables[6],
                timeLocks: Sdk.TimeLocks.fromBigInt(immutables[7]),
            }),
            Sdk.DstImmutablesComplement.new({
                maker: Sdk.Address.fromBigInt(complement[0]),
                amount: complement[1],
                token: Sdk.Address.fromBigInt(complement[2]),
                safetyDeposit: complement[3],
            }),
        ];
    }
}
