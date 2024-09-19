// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library LibAave {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.aave.storage");

    struct DiamondStorage {
        address lendingPool;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function getLendingPoolAddress() internal view returns (address) {
        require(diamondStorage().lendingPool != address(0), "LibAave: Lending pool not set");
        return diamondStorage().lendingPool;
    }

    // set lending pool address
    function setLendingPoolAddress(address lendingPool) internal {
        require(lendingPool != address(0), "LibAave: Lending pool cant be address(0)");
        diamondStorage().lendingPool = lendingPool;
    }
   
}
