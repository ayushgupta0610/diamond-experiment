// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.24;

// import {AaveFacet} from "../contracts/facets/AaveFacet.sol";
// import {console2} from "forge-std/console2.sol";
// import {Test} from "forge-std/Test.sol";
// import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
// import {ICreditDelegationToken} from "@aave/core-v3/contracts/interfaces/ICreditDelegationToken.sol";
// import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";

// // Test the aave facet contract without using the diamond

// contract AaveFacetTest is Test {
//     AaveFacet public aaveFacet;
//     address constant AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
//     address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
//     address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
//     address constant WHALE = 0xF977814e90dA44bFA03b6295A0616a897441aceC; // Binance hot wallet

//     function setUp() public {
//         // Fork Ethereum mainnet
//         string memory ethereumFork = vm.envString(
//             "ETHEREUM_RPC_URL"
//         );
//         vm.createSelectFork(ethereumFork);
        
//         // Deploy AaveFacet
//         aaveFacet = new AaveFacet();
//         aaveFacet.init(AAVE_POOL); // This wouldn't be the case with diamond. At the time of adding the facet, the lending pool address would be initialized
//         console2.log("AaveFacet deployed at: ", address(aaveFacet));
//     }

//     function testDeposit() public {
//         uint256 depositAmount = 1 ether;

//         // Impersonate the whale and transfer WETH to this contract
//         vm.startPrank(WHALE);
//         IERC20(WETH).transfer(address(this), depositAmount);
//         vm.stopPrank();

//         // Approve WETH spending
//         IERC20(WETH).approve(address(aaveFacet), depositAmount);

//         // Get initial balance
//         uint256 initialBalance = IERC20(WETH).balanceOf(address(this));

//         // Deposit WETH
//         aaveFacet.deposit(WETH, depositAmount);

//         // Check balance after deposit
//         uint256 finalBalance = IERC20(WETH).balanceOf(address(this));
//         assertEq(finalBalance, initialBalance - depositAmount, "Deposit failed");

//         // Check user's deposit balance in Aave
//         uint256 depositBalance = aaveFacet.getUserDepositBalance(address(this), WETH);
//         console2.log("Deposit balance in USD value: ", depositBalance / 10 ** 8); // Aave saves the balance in 10^8 precision
//         assertGt(depositBalance, 0, "Deposit balance should be greater than 0");
//     }

//     function testWithdraw() public {
//         uint256 depositAmount = 1 ether;
//         uint256 withdrawAmount = 0.5 ether;

//         // Impersonate the whale and transfer WETH to this contract
//         vm.startPrank(WHALE);
//         IERC20(WETH).transfer(address(this), depositAmount);
//         vm.stopPrank();

//         // Approve WETH spending
//         IERC20(WETH).approve(address(aaveFacet), depositAmount);

//         // Deposit WETH
//         aaveFacet.deposit(WETH, depositAmount);

//         // Get initial balance
//         uint256 initialBalance = IERC20(WETH).balanceOf(address(this));

//         // Withdraw WETH
//         // Get the aToken address from the lending pool
//         IPool pool = IPool(AAVE_POOL);
//         address aToken = pool.getReserveData(WETH).aTokenAddress;

        
//         IERC20(aToken).approve(address(aaveFacet), withdrawAmount);
//         uint256 withdrawnAmount = aaveFacet.withdraw(WETH, withdrawAmount);

//         // Check balance after withdrawal
//         uint256 finalBalance = IERC20(WETH).balanceOf(address(this));
//         assertEq(finalBalance, initialBalance + withdrawnAmount, "Withdrawal failed");

//         // Check user's deposit balance in Aave
//         uint256 depositBalance = aaveFacet.getUserDepositBalance(address(this), WETH);
//         console2.log("Deposit balance in USD value: ", depositBalance / 10 ** 8); // Aave saves the balance in 10^8 precision
//         // assertEq(depositBalance, depositAmount - withdrawnAmount, "Incorrect deposit balance after withdrawal"); // The depositBalance should be converted to usd value
//     }

//     function testGetCurrentLendingRate() public view {
//         uint256 lendingRate = aaveFacet.getCurrentLendingRate(WETH);
//         assertGt(lendingRate, 0, "Lending rate should be greater than 0");
//     }

//     function testBorrowAndRepay() public {
//         uint256 depositAmount = 10 ether;
//         uint256 borrowAmount = 1 ether;

//         // Impersonate the whale and transfer WETH to this contract
//         vm.startPrank(WHALE);
//         IERC20(WETH).transfer(address(this), depositAmount);
//         // IERC20(DAI).transfer(address(this), borrowAmount);
//         vm.stopPrank();

//         // Approve WETH spending
//         IERC20(WETH).approve(address(aaveFacet), depositAmount);

//         // Deposit WETH as collateral
//         aaveFacet.deposit(WETH, depositAmount);
//         uint256 depositBalance = aaveFacet.getUserDepositBalance(address(this), WETH);
//         console2.log("Deposit balance in USD value: ", depositBalance / 10 ** 8); // Aave saves the balance in 10^8 precision

//         // Borrow DAI
//         // Get the reserve data for the asset (DAI in this case)
//         DataTypes.ReserveData memory reserveData = IPool(AAVE_POOL).getReserveData(DAI);
//         // Get the address of the Stable Debt Token
//         address variableDebtTokenAddress = reserveData.variableDebtTokenAddress;
//         ICreditDelegationToken(variableDebtTokenAddress).approveDelegation(address(aaveFacet), type(uint256).max);
//         aaveFacet.borrow(DAI, borrowAmount, 2); // Variable interest rate

//         // Check borrowed balance
//         uint256 borrowedBalance = IERC20(DAI).balanceOf(address(this));
//         assertEq(borrowedBalance, borrowAmount, "Borrow failed");

//         // Approve DAI spending for repayment
//         IERC20(DAI).approve(address(aaveFacet), borrowAmount);

//         // Repay borrowed DAI
//         aaveFacet.repay(DAI, borrowAmount, 2); // Variable interest rate

//         // Check repaid balance
//         uint256 finalBalance = IERC20(DAI).balanceOf(address(this));
//         console2.log("Final DAI balance: ", finalBalance);
//         assertEq(finalBalance, 0, "Repayment failed");
//         uint256 finalDepositBalance = aaveFacet.getUserDepositBalance(address(this), WETH);
//         console2.log("Deposit balance in USD value: ", finalDepositBalance / 10 ** 8); // 10 Ethers equivalent in USD
//     }

//     function testWithdrawMaxAmount() public {
//         uint256 depositAmount = 1 ether;

//         // Impersonate the whale and transfer WETH to this contract
//         vm.startPrank(WHALE);
//         IERC20(WETH).transfer(address(this), depositAmount);
//         vm.stopPrank();

//         // Approve WETH spending
//         IERC20(WETH).approve(address(aaveFacet), depositAmount);

//         // Deposit WETH
//         aaveFacet.deposit(WETH, depositAmount);

//         // Get initial balance
//         uint256 initialBalance = IERC20(WETH).balanceOf(address(this));

//          // Get the aToken address from the lending pool
//         IPool pool = IPool(AAVE_POOL);
//         address aToken = pool.getReserveData(WETH).aTokenAddress;

//         // Withdraw max amount of WETH
//         IERC20(aToken).approve(address(aaveFacet), type(uint256).max);
//         aaveFacet.withdraw(WETH, type(uint256).max);

//         // Check balance after withdrawal
//         uint256 finalBalance = IERC20(WETH).balanceOf(address(this));
//         assertGt(finalBalance, initialBalance, "Max withdrawal failed");

//         // Check user's deposit balance in Aave
//         uint256 depositBalance = aaveFacet.getUserDepositBalance(address(this), WETH);
//         assertEq(depositBalance, 0, "Deposit balance should be 0 after max withdrawal");
//     }

//     function testFailDepositZeroAmount() public {
//         aaveFacet.deposit(WETH, 0);
//     }

//     function testFailWithdrawZeroAmount() public {
//         aaveFacet.withdraw(WETH, 0);
//     }

//     function testFailBorrowZeroAmount() public {
//         aaveFacet.borrow(DAI, 0, 2);
//     }

//     function testFailRepayZeroAmount() public {
//         aaveFacet.repay(DAI, 0, 2);
//     }
// }