// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Test2Facet {

    address[] owners;
    uint256 totalCount;
    mapping(address => uint) public count;

    function addOwner(address owner) external {
        owners.push(owner);
        totalCount++;
    }

    function updateCount(uint256 _totalCount) external {
        totalCount = _totalCount;
    }

    function getTotalCount() external view returns (uint256) {
        return totalCount;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function testFunc2(address user) external view returns (address[] memory, uint256, uint256) {
        return (owners, totalCount, count[user]);
    }
}

