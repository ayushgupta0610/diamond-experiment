// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {CompoundFacet} from "../contracts/facets/CompoundFacet.sol";

contract DiamondTest is Test {

    CompoundFacet public compoundFacet;
    address constant COMET = address(0); // TODO: Update this with the actual comet address
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant WHALE = 0xF977814e90dA44bFA03b6295A0616a897441aceC; // Binance hot wallet

    function setUp() public {
        // Fork Ethereum mainnet
        string memory ethereumFork = vm.envString(
            "ETHEREUM_RPC_URL"
        );
        vm.createSelectFork(ethereumFork);
        
        // Deploy CompoundFacet
        compoundFacet = new CompoundFacet();
        compoundFacet.init(COMET); // This wouldn't be the case with diamond. At the time of adding the facet, the lending pool address would be initialized
        console2.log("CompoundFacet deployed at: ", address(compoundFacet));
    }
}
