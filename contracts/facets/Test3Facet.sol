// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library libStorage {
    bytes32 constant SIMPLE_STORAGE_POSITION = keccak256("diamond.standard.simple.storage");
    bytes32 constant COMPLEX_STORAGE_POSITION = keccak256("diamond.standard.complex.storage");


    struct simpleStorage {
        string greeting;
    }

    struct complexStorage {
        mapping(address account => uint256) balances;
        mapping(address account => mapping(address spender => uint256)) allowances;
        uint256 totalSupply;
    }

    // we declare this function in this library to be used in our "SImpleStorage" facet
    function getGreeting() internal view returns (string memory) {
        return diamondSimpleStorage().greeting;
    }

    // we declare this function in this library to be used in our "SImpleStorage" facet
    function setGreeting(string memory _newGreeting) internal {
        diamondSimpleStorage().greeting = _newGreeting;
    }

    function diamondSimpleStorage() internal pure returns (simpleStorage storage ds) {
        bytes32 position = SIMPLE_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function getBalances(address user) internal view returns (uint256) {
        return diamondComplexStorage().balances[user];
    }

    // Obviously this can't be a public function that can be set by anyone
    function setBalances(address user, uint256 balance) internal returns (bool) {
        diamondComplexStorage().balances[user] = balance;
        return true;
    }

    function diamondComplexStorage() internal pure returns (complexStorage storage ds) {
        bytes32 position = COMPLEX_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}

contract Test3Facet {
    // get the greeting string declared in the DiamondStorage
    function getGreeting() external view returns (string memory) {
        return libStorage.getGreeting();
    }

    // update greeting string declared in the DiamondStorage
    function setGreeting(string memory _newGreeting) external {
        libStorage.setGreeting(_newGreeting);
    }

    function getBalances(address user) external view returns (uint256) {
        return libStorage.getBalances(user);
    }

    function setBalances(address user, uint256 balance) external returns (bool) {
        return libStorage.setBalances(user, balance);
    }
}