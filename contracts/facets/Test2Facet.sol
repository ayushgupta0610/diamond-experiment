// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract Test2Facet is ERC165 {

    address[] owners;
    uint256 totalCount;
    mapping(address => uint) public count;

    function addOwner(address owner) external {
        owners.push(owner);
        totalCount++;
    }

    function manipulateCount(uint256 _totalCount) external {
        totalCount = _totalCount;
    }

    function getTotalCount() external view returns (uint256) {
        return totalCount;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function testFunc(address user) external view returns (address[] memory, uint256, uint256) {
        return (owners, totalCount, count[user]);
    }

    function supportsInterface(bytes4 interfaceId) public override view returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

