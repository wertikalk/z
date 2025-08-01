pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TestEscrowFactory.sol";
import "../lib/cross-chain-swap/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
contract Deploy_TestEscrowFactory is Script {
    function setUp() public {}

    function run() public {
        deployerPk = vm.envUint("TEST_POLYGON_USER_PRIVATE_KEY");
        vm.startBroadcast(deployerPk);

        address limitOrderProtocol = address(0x111111125421cA6dc452d289314280a0f8842A65);
        address feeToken = address(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270); 
        address accessToken = address(0);
        address owner = address(0x7B0D7D88039E8ec1C3f362B65dF052D986CeC129);
        uint32 rescueDelaySrc = 0;
        uint32 rescueDelayDst = 0;
        TestEscrowFactory factory = new TestEscrowFactory(
            limitOrderProtocol,
            IERC20(feeToken),
            IERC20(accessToken),
            owner,
            rescueDelaySrc,
            rescueDelayDst
        );
        vm.stopBroadcast();
        console.log("TestEscrowFactory deployed at:", address(factory));
    }


    uint256 private deployerPk;
}
