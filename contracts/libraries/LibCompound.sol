// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library LibCompound {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.compound.storage");

    struct DiamondStorage {
        address cometAddress;
        mapping(address => uint256) userDeposits;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function getUserDeposits(address user) internal view returns (uint256) {
        return diamondStorage().userDeposits[user];
    }

    function updateUserDeposits(address user, uint256 amount, bool isDeposit) internal returns (uint256) {
        DiamondStorage storage ds = diamondStorage();
        if (isDeposit) {
            ds.userDeposits[user] += amount;
        } else {
            require(ds.userDeposits[user] >= amount, "Insufficient balance");
            ds.userDeposits[user] -= amount;
        }
        return ds.userDeposits[user];
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
