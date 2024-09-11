// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol"; 

contract Test1Facet is ERC165 {

    mapping(address => uint) public count;
    address[] public players;
    uint256 public teamsCount;

    event TestEvent(address something);

    function addPlayer(address player) external {
        players.push(player);
        teamsCount++;
    }

    function manipulateCount(uint256 _teamsCount) external {
        teamsCount = _teamsCount;
    }

    function getTeamsCount() external view returns (uint256) {
        return teamsCount;
    }

    function getPlayers() external view returns (address[] memory) {
        return players;
    }

    function testFunc(address user) external view returns (address[] memory, uint256, uint256) {
        return (players, teamsCount, count[user]);
    }
}
