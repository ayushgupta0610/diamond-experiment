// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeTransferLib} from "lib/solady/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solady/src/utils/ReentrancyGuard.sol";
import { Initializable } from "lib/solady/src/utils/Initializable.sol";
import { LibCompound } from "../libraries/LibCompound.sol";
import { IComet } from "../interfaces/IComet.sol";

contract CompoundFacet is ReentrancyGuard, Initializable {
    using SafeTransferLib for address;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event RewardsHarvested(address indexed user, uint256 amount);

    function _initializableSlot() internal pure override returns (bytes32) {
        return 0x4f69cd1e0ac2d5983be69b42aa7f87c422e701b5093769a3e54ae5dfa9d201fd;
    }

    function init(address cometAddress) public initializer {
       LibCompound.setCometAddress(cometAddress);
    }

    function comet() internal view returns (IComet) {
        return IComet(LibCompound.getCometAddress());
    }

    function compoundDeposit(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.safeApprove(address(comet()), amount);
        comet().supplyTo(msg.sender, token, amount);
        emit Deposited(msg.sender, token, amount);
    }

    function compoundWithdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(getUserBalance(msg.sender, token) >= amount, "Insufficient balance");
        address comet = address(comet());
        // Approve the comet contract to transfer the token
        // comet.safeTransferFrom(msg.sender, address(this), amount);
        // comet.safeApprove(comet, amount); // This might not work
        IComet(comet).withdrawTo(msg.sender, token, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    // TODO: Get it from the compound contract
    function getUserBalance(address user, address token) public view returns (uint256) {
        // Get this from the comet contract
        return comet().collateralBalanceOf(user, token);
    }

    function getSupplyRate() external view returns (uint256) {
        uint256 utilization = comet().getUtilization();
        return comet().getSupplyRate(utilization);
    }

    function getBorrowRate() external view returns (uint256) {
        uint256 utilization = comet().getUtilization();
        return comet().getBorrowRate(utilization);
    }

    // TODO: Add function to repay

    // TODO: Check if it's required
    // function emergencyWithdraw(address token) external onlyOwner {
    //     uint256 balance = IERC20(token).balanceOf(address(this));
    //     if (balance > 0) {
    //         IERC20(token).safeTransfer(msg.sender, balance);
    //     }
    // }
}