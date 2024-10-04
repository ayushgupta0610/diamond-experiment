# Diamond Pattern Implementation

This repo demonstrates diamond pattern contract implementation where the `Diamond.sol` is used as the main contract and the entrypoint for all interactions with the Facets. The below Facets are deployed along with the main `Diamond.sol` contract:

1. `OwnershipFacet.sol` - To allow admin/owner driven functions
2. `DiamondLoupeFacet.sol` - To allow finding the desired facet and function to be called via the entry point contract (`Diamond.sol`)
3. `DiamondCut.sol` - To allow adding / removing any Facet contract

There's a `LibDiamond.sol` which allows to store and retrieve data while avoiding any conflicts as the data is stored in a random slot (`DIAMOND_STORAGE_POSITION`) in the contract

In addition to the above setup there're two additional contracts added to showcase lending and borrowing via Aave and Compound. The implementations of the same are implemented under `AaveFacet.sol` and `CompoundFacet.sol`.

The tests allows to test Aave and Compound functionailities separately via `AaveFacet.t.sol` and `CompoundFacet.t.sol` as well via the Diamond pattern.

## To run the tests:

1. Copy the `.env.template` to `.env` file
2. Encrypt the `.env` file and generate `.env.enc` file by running `npx env-enc set` and following the steps in the terminal
3. Run `npx env-enc set-pw` to set the password in the terminal
4. In a separate terminal run a local folk of Ethereum mainnet by running `npx hardhat node --fork ${ETHEREUM_RPC_URL}`
5. Run the test by running the command `npx hardhat test --network localhost`. This will run the tests on the locally forked mainnet.

```

## Learnings while implementing

1. The diamond storage / library structure allows to not cause conflicts between the storage as it randomizes the slot where the variables are stored.
2. WETH is the base asset in Compound V3. When trying to deposit USDC and then withdraw it, there was a rounding issue that could be observed, because of which for 1000e6 value of USDC, 999999999 value of USDC could be withdrawn back.
3. While trying to make use of whale or other accounts for testing in Hardhat (or for Foundry) there might be a possibility that approval or other required steps might already be executed on chain by that account, because of which your code/tests might fail when used in real with actual accounts.
4. Was using solady Initializable contract and at the time of initializing Aave and Compound a conflict arose, hence overrode the `_initializableSlot` function.

## To test the Aave and Compound setup, you can run a mainnet fork in one terminal by executing the below command and then executing `npx hardhat test --network localhost`

```

npx hardhat node --fork <MAINNET_FORK_URL>

```

```
