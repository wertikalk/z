import { id, Interface } from "ethers";
import Sdk from "@1inch/cross-chain-sdk";
import EscrowFactoryContract from "../../dist/contracts/EscrowFactory.sol/EscrowFactory.json";
export class EscrowFactory {
    provider;
    address;
    iface = new Interface(EscrowFactoryContract.abi);
    constructor(provider, address) {
        this.provider = provider;
        this.address = address;
    }
    async getSourceImpl() {
        return Sdk.Address.fromBigInt(BigInt(await this.provider.call({
            to: this.address,
            data: id("ESCROW_SRC_IMPLEMENTATION()").slice(0, 10),
        })));
    }
    async getDestinationImpl() {
        return Sdk.Address.fromBigInt(BigInt(await this.provider.call({
            to: this.address,
            data: id("ESCROW_DST_IMPLEMENTATION()").slice(0, 10),
        })));
    }
    async getSrcDeployEvent(blockHash) {
        const event = this.iface.getEvent("SrcEscrowCreated");
        const logs = await this.provider.getLogs({
            blockHash,
            address: this.address,
            topics: [event.topicHash],
        });
        const [data] = logs.map((l) => this.iface.decodeEventLog(event, l.data));
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
//# sourceMappingURL=escrow-factory.js.map