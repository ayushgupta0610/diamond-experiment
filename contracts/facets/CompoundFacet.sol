// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// import {console2} from "forge-std/console2.sol";
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

    function init(address cometAddress) external initializer {
       LibCompound.setCometAddress(cometAddress);
    }

    function comet() internal view returns (IComet) {
        return IComet(LibCompound.getCometAddress());
    }

    function compoundDeposit(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        token.safeApprove(address(comet()), amount);
        
        comet().supply(token, amount);
        // console2.log("Deposit executed. Balance of this contract: ", comet().balanceOf(address(this)));
        LibCompound.updateUserDeposits(msg.sender, amount, true);
        
        emit Deposited(msg.sender, token, amount);
    }

    function compoundWithdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        // console2.log("User deposits: ", LibCompound.getUserDeposits(msg.sender));
        require(LibCompound.getUserDeposits(msg.sender) >= amount, "Insufficient balance");

        comet().withdraw(token, amount);
        // console2.log("Withdraw executed");
        LibCompound.updateUserDeposits(msg.sender, amount, false);
        token.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    // TODO: Get it from the compound contract
    function getUserBalance(address user) external view returns (uint256) {
        return LibCompound.getUserDeposits(user);
    }

    function getTotalBalance() external view returns (uint256) {
        return comet().balanceOf(address(this));
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