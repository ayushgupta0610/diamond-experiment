// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LibAave} from "../libraries/LibAave.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeTransferLib} from "lib/solady/src/utils/SafeTransferLib.sol";
import {ReentrancyGuard} from "lib/solady/src/utils/ReentrancyGuard.sol";
import {Initializable} from "lib/solady/src/utils/Initializable.sol";

contract AaveFacet is ReentrancyGuard, Initializable {
    using SafeTransferLib for address;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event BorrowedInterestRate(address indexed user, address indexed token, uint256 amount, uint256 interestRate);

    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {}

    function initialize(address lendingPool) external initializer {
       LibAave.setLendingPoolAddress(lendingPool);
    }

    /**
     * @dev Deposits tokens into Aave lending pool
     * @param token The address of the token to deposit
     * @param amount The amount of tokens to deposit
     */
    function deposit(address lendingPoolAddress, address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from user to this contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Approve lending pool to spend tokens
        token.safeApprove(lendingPoolAddress, amount);

        // Deposit tokens into Aave lending pool
        IPool(lendingPoolAddress).supply(token, amount, msg.sender, 0);

        emit Deposited(msg.sender, token, amount);
    }

     /**
     * @dev Withdraws tokens from Aave lending pool
     * @param token The address of the token to withdraw
     * @param amount The amount of tokens to withdraw (use type(uint256).max for max amount)
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        uint256 amountToWithdraw = amount;
        if (amount == type(uint256).max) {
            amountToWithdraw = IERC20(token).balanceOf(address(this));
        }

        // Transfer the aToken from the user to this contract
        // Get the aToken address from the lending pool
        address aToken = lendingPool().getReserveData(token).aTokenAddress;

        // TODO: Calculate the amountToWithdraw in aToken
        uint256 aTokenAmount = amount;
        aToken.safeTransferFrom(msg.sender, address(this), aTokenAmount);
        uint256 withdrawnAmount = lendingPool().withdraw(token, amount, msg.sender);

        emit Withdrawn(msg.sender, token, withdrawnAmount);
    }

    /**
     * @dev Gets the user's deposit balance for a specific token
     * @param _user The address of the user
     * @param token The address of the token
     * @return The user's deposit balance
     */
    function getUserDepositBalance(address _user, address token) external view returns (uint256) {
        (uint256 totalCollateralBase, , , , , ) = lendingPool().getUserAccountData(_user);
        return totalCollateralBase;
    }

    /**
     * @dev Gets the current lending rate for a specific token
     * @param token The address of the token
     * @return The current lending rate (in ray)
     */
    function getCurrentLendingRate(address token) external view returns (uint256) {
        return lendingPool().getReserveData(token).currentLiquidityRate;
    }

    /**
     * @dev Borrow tokens from Aave lending pool
     * @param token The address of the token to borrow
     * @param amount The amount of tokens to borrow
     * @param interestRateMode The interest rate mode (1 for stable, 2 for variable)
     */
    function borrow(address token, uint256 amount, uint256 interestRateMode) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(interestRateMode == 1 || interestRateMode == 2, "Invalid interest rate mode");

        lendingPool().borrow(token, amount, interestRateMode, 0, msg.sender);

        uint256 borrowRate = interestRateMode == 1 ? 
            lendingPool().getReserveData(token).currentStableBorrowRate :
            lendingPool().getReserveData(token).currentVariableBorrowRate;

        emit BorrowedInterestRate(msg.sender, token, amount, borrowRate);
    }

    /**
     * @dev Repays borrowed tokens to Aave lending pool
     * @param token The address of the token to repay
     * @param amount The amount of tokens to repay (use type(uint256).max for max amount)
     * @param interestRateMode The interest rate mode (1 for stable, 2 for variable)
     */
    function repay(address token, uint256 amount, uint256 interestRateMode) external nonReentrant {
        require(interestRateMode == 1 || interestRateMode == 2, "Invalid interest rate mode");

        uint256 amountToRepay = amount;

        if (amount == type(uint256).max) {
            amountToRepay = token.balanceOf(msg.sender);
        }

        token.safeTransferFrom(msg.sender, address(this), amountToRepay);
        token.safeApprove(address(lendingPool()), amountToRepay);

        lendingPool().repay(token, amountToRepay, interestRateMode, msg.sender);
    }

    function lendingPool() public view returns (IPool) {
        address lendingPoolAddress = LibAave.getLendingPoolAddress(); // Get lending pool address from storage
        return IPool(lendingPoolAddress);
    }
}