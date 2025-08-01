import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { ok } from "assert";
import { keccak256, JsonRpcProvider, parseUnits, randomBytes } from "ethers";
import {
    Account,
    U256,
    U64,
    Ed25519PrivateKey,
    MoveString,
} from "@aptos-labs/ts-sdk";
import * as Sdk from "../../cross-chain-sdk/src/index.js";
import { Wallet } from "../../utils/wallet.js";
import { Resolver } from "../../utils/resolver.js";
import { EscrowFactory } from "../../utils/escrow-factory.js";

import { config } from "../../config.js";
import { randBigInt, UINT_32_MAX } from "@1inch/fusion-sdk";
import { aptos } from "../../utils/utils.js";
import { uint8ArrayToHex } from "@1inch/byte-utils/dist/utils/index.js";
import { initEVM } from "../../init/deploy.js";

// Swap parameters ......

const SRC = "POLYGON";
const DST = "APTOS";

const INPUT_TOKEN = {
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    amount: 100n,
};

const OUTPUT_TOKEN = {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    minAmount: 1n,
};

// Initialization .......

const provider = {
    POLYGON: new JsonRpcProvider(process.env.POLYGON_RPC_URL as string),
    APTOS: null,
};

const resolver = {
    APTOS: {
        account: Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(
                process.env.TEST_APTOS_RESOLVER_PRIVATE_KEY as string
            ),
        }),
    },
    POLYGON: new Wallet(
        process.env.TEST_POLYGON_RESOLVER_PRIVATE_KEY as string,
        provider.POLYGON
    ),
};
const pk = process.env.TEST_POLYGON_RESOLVER_PRIVATE_KEY as string;

console.log("[Init] Resolver private key", pk);

// await initEVM(config[SRC], pk);
// process.exit(1);

console.log("[Init] Resolver", resolver);

const user = {
    APTOS: Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(
            process.env.TEST_APTOS_USER_PRIVATE_KEY as string
        ),
    }),
    POLYGON: new Wallet(
        process.env.TEST_POLYGON_USER_PRIVATE_KEY as string,
        provider.POLYGON
    ),
};

console.log("[Init] User", user);

const escrowFactory = {
    POLYGON: new EscrowFactory(
        provider.POLYGON,
        config.POLYGON.srcEscrowFactory
    ),
    APTOS: null,
};

console.log("[Init] Escrow Factory", escrowFactory);
// User:::Create order .......

// const secretBytes = randomBytes(32);

const secret =
    "0x15d87951228b5f5de52a2ca404622c9ebd06d662f0d74395f366c4239abaf67a";
// const secret = uint8ArrayToHex(secretBytes); // note: use crypto secure random number in real world

ok(secret.length === 66, "Secret should be 32 bytes long!" + secret.length);

const hashLock = Sdk.HashLock.forSingleFill(secret);

const adaptSecretToAptos = (secret: string): U256 => {
    const _secret = secret.replace("0x", "");
    let _correctSecret = "";
    for (let i = 0; i < 64; i += 2) {
        _correctSecret = _secret[i] + _secret[i + 1] + _correctSecret;
    }

    _correctSecret = "0x" + _correctSecret;

    const secretBigInt = BigInt(_correctSecret);
    return new U256(secretBigInt);
};

const secretAptos = adaptSecretToAptos(secret);
const hashedSecret = keccak256(secretAptos.bcsToBytes());

console.log("[Init] Secret EVM", secret);
console.log("[Init] Secret APTOS", secretAptos.toString());
console.log("[Init] HashLock EVM", hashLock.toString());
console.log("[Init] Expected Hash APTOS", hashedSecret);
console.log("ALL gud:", hashedSecret === hashLock.toString());

process.exit(1);
// ------> Approves token to 1inch's LOP
await user.POLYGON.approveToken(
    INPUT_TOKEN.address,
    config.POLYGON.limitOrderProtocol,
    INPUT_TOKEN.amount
);

await new Promise((resolve) => setTimeout(resolve, 10000));

const srcTimestamp = BigInt(
    (await provider.POLYGON.getBlock("latest"))!.timestamp
);

const order = Sdk.CrossChainOrder.new(
    new Sdk.Address(config[SRC].srcEscrowFactory),
    {
        salt: 100n,
        maker: new Sdk.Address(await user[SRC].getAddress()),
        makingAmount: INPUT_TOKEN.amount,
        takingAmount: OUTPUT_TOKEN.minAmount,
        makerAsset: new Sdk.Address(INPUT_TOKEN.address),
        takerAsset: OUTPUT_TOKEN.address as any,
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
        srcChainId: config[SRC].chainId as any,
        dstChainId: config[DST].chainId as any,
        srcSafetyDeposit: 0n,
        dstSafetyDeposit: 0n,
    },
    {
        auction: new Sdk.AuctionDetails({
            initialRateBump: 0,
            points: [],
            duration: 120n,
            startTime: srcTimestamp,
        }),
        whitelist: [
            {
                address: config[SRC].srcResolverContract as any,
                allowFrom: 0n,
            },
        ],
        resolvingStartTime: 0n,
    },
    {
        nonce: randBigInt(UINT_32_MAX),
        allowPartialFills: false,
        allowMultipleFills: false,
    }
);

const signature = await user.POLYGON.signOrder(config[SRC].chainId, order);
const orderHash = order.getOrderHash(config[SRC].chainId);

const resolverContract = new Resolver(
    config[SRC].srcResolverContract,
    resolver[DST].account.accountAddress.toString()
);

const fillAmount = order.makingAmount;
const txRequestObject0 = resolverContract.deploySrc(
    config[SRC].chainId,
    order,
    signature,
    Sdk.TakerTraits.default()
        .setExtension(order.extension)
        .setAmountMode(Sdk.AmountMode.maker)
        .setAmountThreshold(order.takingAmount),
    fillAmount
);
console.log(
    "[Polygon] Deploying SRC escrow with tx request object:",
    txRequestObject0
);

const { txHash: orderFillHash, blockHash: srcDeployBlock } = await resolver[
    SRC
].send(txRequestObject0);

process.exit(1);

await new Promise((resolve) => setTimeout(resolve, 10000));

console.log(
    `[Polygon] Order deployed: ${orderFillHash} at block ${srcDeployBlock}`
);

const srcEscrowEvent = await escrowFactory[SRC].getSrcDeployEvent(
    srcDeployBlock
);

console.log(`[Polygon] srcEscrowEvent parsed`, srcEscrowEvent);

// const dstImmutables = srcEscrowEvent[0]
//     .withComplement(srcEscrowEvent[1])
//     .withTaker(resolver[DST].account.accountAddress.toString() as any);

const dstImmutables = {
    resolverAddress: resolver[DST].account.accountAddress.toString(),
    dstEscrowFactory: config[DST].dstEscrowFactory,
    coinType: "0x1::aptos_coin::AptosCoin",
    amount: order.takingAmount,
    safetyDeposit: order.escrowExtension.dstSafetyDeposit,
    hashedSecret: new U256(BigInt(hashLock.toString())),
    secret: new U256(BigInt(secret)),
    unlockTime: 0n,
};

console.log(`[Aptos] dstImmutables parsed`, dstImmutables);

const txRequestObject = await resolverContract.deployDst(dstImmutables, true);

console.log(`[Aptos] txRequestObject parsed`, txRequestObject);

const pendingObjectTxn = await aptos.signAndSubmitTransaction({
    signer: resolver[DST].account,
    transaction: txRequestObject,
});

console.log(`[Aptos] pendingObjectTxn parsed`, pendingObjectTxn);

const response = await aptos.waitForTransaction({
    transactionHash: pendingObjectTxn.hash,
});

console.log(`[Aptos] Dst escrow deployed:`, response);

const ESCROW_SRC_IMPLEMENTATION = await escrowFactory[SRC].getSourceImpl();
// const ESCROW_DST_IMPLEMENTATION = await escrowFactory[DST].getDestinationImpl();

const srcEscrowAddress = new Sdk.EscrowFactory(
    new Sdk.Address(config[SRC].srcEscrowFactory)
).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);

const { txHash: resolverWithdrawHash } = await resolver[SRC].send(
    resolverContract.withdraw(
        "src",
        srcEscrowAddress,
        secret,
        srcEscrowEvent[0]
    )
);
