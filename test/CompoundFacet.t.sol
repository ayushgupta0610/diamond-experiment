// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {CompoundFacet, IComet} from "../contracts/facets/CompoundFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CompoundFacetTest is Test {
    
    address constant alice = address(0x1);
    address constant bob = address(0x2);
    address constant COMET = 0xc3d688B66703497DAA19211EEdff47f25384cdc3;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant WHALE = 0xF977814e90dA44bFA03b6295A0616a897441aceC; // Binance hot wallet
    IComet public comet;
    IERC20 public usdc;
    IERC20 public weth;
    CompoundFacet public compoundFacet;
    uint256 public depositAmount = 10e18; // 10 ETH
    uint256 public withdrawAmount = 5e18; // 5 ETH


    function setUp() public {
        // Fork Ethereum mainnet
        string memory ethereumFork = vm.envString(
            "ETHEREUM_RPC_URL"
        );
        vm.createSelectFork(ethereumFork);
        
        // Deploy CompoundFacet
        compoundFacet = new CompoundFacet();
        compoundFacet.init(COMET); // This wouldn't be the case with diamond. At the time of adding the facet, the lending pool address would be initialized
        console2.log("CompoundFacet deployed at: ", address(compoundFacet));
        usdc = IERC20(USDC);
        weth = IERC20(WETH);
        comet = IComet(COMET);

        // Fund test accounts
        deal(USDC, address(this), 1_000_000e6);
        deal(WETH, address(this), 100e18);
    }

    function testDeposit() public {
        // uint256 depositAmount = 1000e6; // 1000 USDC
        
        weth.approve(address(compoundFacet), depositAmount);
        compoundFacet.deposit(WETH, depositAmount);

        assertEq(compoundFacet.getUserBalance(address(this)), depositAmount, "User balance should match deposit amount");
        assertEq(weth.balanceOf(address(compoundFacet)), 0, "Wrapper should have no USDC balance");
    }

    function testWithdraw() public {
        // uint256 depositAmount = 1000e6; // 1000 USDC
        // uint256 withdrawAmount = 500e6; // 500 USDC

        weth.approve(address(compoundFacet), depositAmount);
        compoundFacet.deposit(WETH, depositAmount);

        uint256 balanceBefore = weth.balanceOf(address(this));
        compoundFacet.withdraw(WETH, withdrawAmount);
        uint256 balanceAfter = weth.balanceOf(address(this));

        assertEq(balanceAfter - balanceBefore, withdrawAmount, "Withdrawn amount should match");
        assertEq(compoundFacet.getUserBalance(address(this)), depositAmount - withdrawAmount, "User balance should be updated correctly");
    }

    function testMultipleDepositsAndWithdrawals() public {
        uint256 firstDeposit = depositAmount; // 10 ETH
        uint256 secondDeposit = 2 * depositAmount; // 20 ETH

        // First deposit
        weth.approve(address(compoundFacet), firstDeposit);
        compoundFacet.deposit(WETH, firstDeposit);

        // Second deposit
        weth.approve(address(compoundFacet), secondDeposit);
        compoundFacet.deposit(WETH, secondDeposit);


        assertEq(compoundFacet.getUserBalance(address(this)), firstDeposit + secondDeposit, "Balance should match total deposits");

        // Partial withdrawal
        compoundFacet.withdraw(WETH, firstDeposit);

        assertEq(compoundFacet.getUserBalance(address(this)), secondDeposit, "Balance should match remaining deposit");

        // Full withdrawal
        compoundFacet.withdraw(WETH, secondDeposit); // Why is this small amount getting deducted by comet? Is this because of rounding issue? or any fees at play?        

        assertEq(compoundFacet.getUserBalance(address(this)), 0, "Balance should be zero after full withdrawal");
    }

    function testGetSupplyAndBorrowRates() public {
        uint256 supplyRate = compoundFacet.getSupplyRate();
        uint256 borrowRate = compoundFacet.getBorrowRate();

        assertTrue(supplyRate > 0, "Supply rate should be greater than zero");
        assertTrue(borrowRate > 0, "Borrow rate should be greater than zero");
        assertTrue(borrowRate > supplyRate, "Borrow rate should be higher than supply rate");
    }

    function testHarvestRewards() public {
        // uint256 depositAmount = 1_000_000e6; // 1,000,000 USDC

        weth.approve(address(compoundFacet), depositAmount);
        compoundFacet.deposit(WETH, depositAmount);

        // Fast forward time to accrue rewards
        vm.warp(block.timestamp + 3650 days);

        // Harvest rewards
        compoundFacet.harvestRewards();

        // Check if rewards were received (this assumes rewards are in the base token)
        address baseToken = comet.baseToken();
        uint256 rewardBalance = IERC20(baseToken).balanceOf(address(compoundFacet));
        console2.log("Reward balance: ", rewardBalance);
        // assertTrue(rewardBalance > 0, "Should have received some rewards");
    }

    function testFailWithdrawTooMuch() public {
        // uint256 depositAmount = 1000e6; // 1000 USDC

        weth.approve(address(compoundFacet), depositAmount);
        compoundFacet.deposit(WETH, depositAmount);

        // Try to withdraw more than deposited
        compoundFacet.withdraw(WETH, depositAmount + 1);
    }

    // function testEmergencyWithdraw() public {
    //     uint256 depositAmount = 1000e6; // 1000 USDC

    //     usdc.approve(address(compoundFacet), depositAmount);
    //     compoundFacet.deposit(USDC, depositAmount);

    //     // Simulate some USDC stuck in the contract
    //     deal(USDC, address(compoundFacet), 100e6);

    //     // Call emergencyWithdraw
    //     compoundFacet.emergencyWithdraw(USDC);

    //     assertEq(usdc.balanceOf(address(compoundFacet)), 0, "All USDC should be withdrawn from the compound facet");
    //     assertEq(usdc.balanceOf(address(this)), 100e6, "Test contract should receive the stuck USDC");
    // }

    receive() external payable {}
}
