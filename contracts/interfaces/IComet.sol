// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
interface IComet {
    function supply(address asset, uint amount) external;
    function supplyTo(address dst, address asset, uint amount) external;
    function withdraw(address asset, uint amount) external;
    function withdrawTo(address to, address asset, uint amount) external;
    function balanceOf(address account) external view returns (uint256);
    function accrueAccount(address account) external;
    function baseToken() external view returns (address);
    function baseTokenPriceFeed() external view returns (address);
    function getSupplyRate(uint utilization) external view returns (uint);
    function getBorrowRate(uint utilization) external view returns (uint);
    function getUtilization() external view returns (uint);
    function collateralBalanceOf(address account, address asset) external view returns (uint);
    // function approve(address spender, uint amount) external returns (bool);
    function withdrawFrom(address src, address to, address asset, uint amount) external;
    function approveThis(address manager, address asset, uint amount) external;
    function transfer(address dst, uint amount) external returns (bool);
}