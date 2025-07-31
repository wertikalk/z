import { Interface, Signature } from "ethers";
import Sdk from "@1inch/cross-chain-sdk";
import Contract from "../../dist/contracts/Resolver.sol/Resolver.json";
export class Resolver {
    srcAddress;
    dstAddress;
    iface = new Interface(Contract.abi);
    constructor(srcAddress, dstAddress) {
        this.srcAddress = srcAddress;
        this.dstAddress = dstAddress;
    }
    deploySrc(chainId, order, signature, takerTraits, amount, hashLock = order.escrowExtension.hashLockInfo) {
        const { r, yParityAndS: vs } = Signature.from(signature);
        const { args, trait } = takerTraits.encode();
        const immutables = order.toSrcImmutables(chainId, new Sdk.Address(this.srcAddress), amount, hashLock);
        return {
            to: this.srcAddress,
            data: this.iface.encodeFunctionData("deploySrc", [
                immutables.build(),
                order.build(),
                r,
                vs,
                amount,
                trait,
                args,
            ]),
            value: order.escrowExtension.srcSafetyDeposit,
        };
    }
    deployDst(
    /**
     * Immutables from SrcEscrowCreated event with complement applied
     */
    immutables) {
        return {
            to: this.dstAddress,
            data: this.iface.encodeFunctionData("deployDst", [
                immutables.build(),
                immutables.timeLocks.toSrcTimeLocks().privateCancellation,
            ]),
            value: immutables.safetyDeposit,
        };
    }
    withdraw(side, escrow, secret, immutables) {
        return {
            to: side === "src" ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData("withdraw", [
                escrow.toString(),
                secret,
                immutables.build(),
            ]),
        };
    }
    cancel(side, escrow, immutables) {
        return {
            to: side === "src" ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData("cancel", [
                escrow.toString(),
                immutables.build(),
            ]),
        };
    }
}
//# sourceMappingURL=resolver.js.map