// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library LibCompound {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.compound.storage");

    struct DiamondStorage {
        address cometAddress;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function getCometAddress() internal view returns (address) {
        require(diamondStorage().cometAddress != address(0), "LibCompound: Comet address not set");
        return diamondStorage().cometAddress;
    }

    // set lending pool address
    function setCometAddress(address cometAddress) internal {
        require(cometAddress != address(0), "LibCompound: Comet cant be address(0)");
        diamondStorage().cometAddress = cometAddress;
    }
   
}
