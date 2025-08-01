pragma solidity 0.8.23;

import "cross-chain-swap/EscrowFactory.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import {IPostInteraction} from "limit-order-protocol/contracts/interfaces/IPostInteraction.sol";


contract TestEscrowFactory is EscrowFactory {
    constructor(
        address limitOrderProtocol,
        IERC20 feeToken,
        IERC20 accessToken,
        address owner, uint32 rescueDelaySrc,
        uint32 rescueDelayDst
    ) EscrowFactory(limitOrderProtocol, feeToken, accessToken, owner, rescueDelayDst, rescueDelayDst) {}
}
