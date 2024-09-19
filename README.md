# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

## Learnings while implementing

1. The diamond storage / library structure allows to not cause conflicts between the storage as it randomizes the slot where the variables are stored.
2. WETH is the base asset in Compound V3. When trying to deposit USDC and then withdraw it, there was a rounding issue that could be observed, because of which for 1000e6 value of USDC, 999999999 value of USDC could be withdrawn back.
3. While trying to make use of whale or other accounts for testing in Hardhat (or for Foundry) there might be a possibility that approval or other required steps might already be executed on chain by that account, because of which your code/tests might fail when used in real with actual accounts.
