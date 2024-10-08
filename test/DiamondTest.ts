import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, Interface, FunctionFragment } from "ethers";
import {
  AaveFacet,
  CompoundFacet,
  AaveFacet__factory,
  CompoundFacet__factory,
  IERC20,
  IComet,
} from "../typechain-types";

interface FacetCut {
  facetAddress: string;
  action: FacetCutAction;
  functionSelectors: string[];
}

enum FacetCutAction {
  Add,
  Replace,
  Remove,
}

const WHALE_ADDRESS = "0x57757E3D981446D585Af0D9Ae4d7DF6D64647806"; // WETH holder

function getSelectors(contractInterface: Interface): string[] {
  const selectors: string[] = [];
  for (const fragment of Object.values(contractInterface.fragments)) {
    if (fragment.type === "function") {
      const functionFragment = fragment as FunctionFragment;
      if (functionFragment.name !== "init") {
        selectors.push(functionFragment.selector);
      }
    }
  }
  return selectors;
}

function getFacetCuts(
  addresses: string[],
  facetInterfaces: Interface[]
): FacetCut[] {
  const facetCuts: FacetCut[] = []; // Initialize the array to hold FacetCut objects
  for (let i = 0; i < facetInterfaces.length; i++) {
    const facetInterface = facetInterfaces[i]; // Get the corresponding facet
    facetCuts.push({
      // Push the new FacetCut object into the array
      facetAddress: addresses[i],
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facetInterface),
    });
  }
  return facetCuts; // Return the array of FacetCut objects
}

async function impersonateSigner(account: string): Promise<Signer> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [account],
  });
  return await ethers.provider.getSigner(account);
}

async function setBalance(
  account: string,
  tokenAddress: string,
  balance: bigint
): Promise<Signer> {
  await impersonateSigner(account);
  await network.provider.request({
    method: "hardhat_setBalance",
    params: [account, "0x56BC75E2D63100000"],
  });
  // Transfer WETH to account
  const token: IERC20 = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    tokenAddress
  );
  const whale = await impersonateSigner(WHALE_ADDRESS);
  await token.connect(whale).transfer(account, balance);

  return await ethers.provider.getSigner(account);
}

async function addFacetToDiamond(
  facetInterface: Interface,
  initAddress: string,
  facetAddress: string,
  diamondCutFacet: Contract
) {
  const encodedData = facetInterface.encodeFunctionData("init", [initAddress]);
  const selectors = getSelectors(facetInterface);
  await diamondCutFacet.diamondCut(
    [
      {
        facetAddress: facetAddress,
        action: FacetCutAction.Add,
        functionSelectors: selectors,
      },
    ],
    facetAddress,
    encodedData
  );
}

describe("DiamondAaveTest", function () {
  let diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    ownershipFacet: Contract,
    aaveFacet: AaveFacet,
    compoundFacet: CompoundFacet;
  let AaveFacet: AaveFacet__factory;
  let CompoundFacet: CompoundFacet__factory;
  let diamond: Contract;
  let weth: IERC20;
  let owner: Signer;
  let result: string[];
  let addresses: string[] = [];
  let accounts: Signer[];
  let diamondAddress: string;

  const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const AAVE_POOL_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const COMET_ADDRESS = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const OWNER_ADDRESS = "0x4B7b13C0bbcCa0D6c6863a6E0A0101554271EB17"; // Random account with no eth and weth

  before(async function () {
    accounts = await ethers.getSigners();
    owner = await setBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS,
      BigInt(300 * 10 ** 18)
    );
    weth = await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      WETH_ADDRESS
    );

    const Diamond = await ethers.getContractFactory("Diamond");
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const deployedDiamondCutFacet = await DiamondCutFacet.deploy();
    addresses.push(await deployedDiamondCutFacet.getAddress());
    const DiamondLoupeFacet = await ethers.getContractFactory(
      "DiamondLoupeFacet"
    );
    const deployedDiamondLoupeFacet = await DiamondLoupeFacet.deploy();
    addresses.push(await deployedDiamondLoupeFacet.getAddress());
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const deployedOwnershipFacet = await OwnershipFacet.deploy();
    addresses.push(await deployedOwnershipFacet.getAddress());
    AaveFacet = await ethers.getContractFactory("AaveFacet");
    const deployedAaveFacet = await AaveFacet.deploy();
    addresses.push(await deployedAaveFacet.getAddress());
    CompoundFacet = await ethers.getContractFactory("CompoundFacet");
    const deployedCompoundFacet = await CompoundFacet.deploy();
    addresses.push(await deployedCompoundFacet.getAddress());
    const facets = [
      DiamondCutFacet.interface,
      DiamondLoupeFacet.interface,
      OwnershipFacet.interface,
      // AaveFacet.interface,
    ];
    const facetCuts = getFacetCuts(addresses, facets);
    const diamondArgs = {
      owner: await accounts[0].getAddress(),
    };
    diamond = await Diamond.deploy(facetCuts, diamondArgs);
    diamondAddress = await diamond.getAddress();

    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamondAddress
    );

    // Add AaveFacet to diamond
    await addFacetToDiamond(
      AaveFacet.interface,
      AAVE_POOL_ADDRESS,
      addresses[3],
      diamondCutFacet
    );

    // Add CompoundFacet to diamond
    await addFacetToDiamond(
      CompoundFacet.interface,
      COMET_ADDRESS,
      addresses[4],
      diamondCutFacet
    );

    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );

    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );

    aaveFacet = await ethers.getContractAt("AaveFacet", diamondAddress);

    compoundFacet = await ethers.getContractAt("CompoundFacet", diamondAddress);

    // Get owner() from ownership facet
    console.log("Account 0: ", await accounts[0].getAddress());
    console.log("diamond Ownership owner: ", await ownershipFacet.owner());
  });

  it("should successfully deposit WETH to Aave", async function () {
    console.log(
      "Zeroth deposit balance in Aave:",
      (
        await aaveFacet.getUserDepositBalance(OWNER_ADDRESS, WETH_ADDRESS)
      ).toString()
    );
    // Deposit WETH
    const depositAmount = ethers.parseEther("1");

    // Check owner's WETH balance before approval
    const balanceBeforeApproval = await weth.balanceOf(OWNER_ADDRESS);
    console.log(
      "Owner balance before approval:",
      balanceBeforeApproval.toString()
    );

    // Approve WETH spending
    await weth
      .connect(owner)
      .approve(await aaveFacet.getAddress(), depositAmount);

    // Check allowance
    const allowance = await weth.allowance(
      OWNER_ADDRESS,
      await aaveFacet.getAddress()
    );

    // Ensure allowance is set correctly
    expect(allowance).to.equal(depositAmount);

    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Initial balance:", initialBalance.toString());

    // Deposit WETH
    await aaveFacet.connect(owner).aaveDeposit(WETH_ADDRESS, depositAmount);

    // Check balance after deposit
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Final balance:", finalBalance.toString());

    // Check user's deposit balance in Aave
    const depositBalance = await aaveFacet.getUserDepositBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );
    console.log("Deposit balance in Aave:", depositBalance.toString());

    // Assertions
    expect(finalBalance).to.equal(initialBalance - depositAmount);
    expect(depositBalance).to.be.gt(0); // Value received would be in USD with 8 decimals
  });

  it("should successfully withdraw WETH from Aave", async function () {
    const depositAmount = ethers.parseEther("1");
    const withdrawAmount = ethers.parseEther("0.5");

    await weth
      .connect(owner)
      .approve(await aaveFacet.getAddress(), depositAmount);
    await aaveFacet.connect(owner).aaveDeposit(WETH_ADDRESS, depositAmount);

    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Initial balance after deposit:", initialBalance.toString());

    // Get aToken address
    const pool = await ethers.getContractAt("IPool", AAVE_POOL_ADDRESS);
    const aTokenAddress = (await pool.getReserveData(WETH_ADDRESS))
      .aTokenAddress;
    const aToken = await ethers.getContractAt("IAToken", aTokenAddress);

    // Approve aToken spending
    await aToken
      .connect(owner)
      .approve(await aaveFacet.getAddress(), withdrawAmount);

    // Withdraw WETH
    const tx = await aaveFacet
      .connect(owner)
      .aaveWithdraw(WETH_ADDRESS, withdrawAmount);
    const receipt = await tx.wait();

    // Check balance after withdrawal
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    expect(finalBalance).to.equal(initialBalance + withdrawAmount);

    // Check user's deposit balance in Aave
    const depositBalance = await aaveFacet.getUserDepositBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );
    console.log("Deposit balance in Aave:", depositBalance.toString());
    expect(depositBalance).to.be.lt(depositAmount);
  });

  // Write test cases to add Compound Facet and since the approval would be there because of the proxy storage, it  won't be required here
  it("should successfully deposit WETH to Compound", async function () {
    // Deposit WETH
    const depositAmount = ethers.parseEther("1");
    const initialDepositBalance = await compoundFacet.getUserBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );

    // Check owner's WETH balance before approval
    const balanceBeforeApproval = await weth.balanceOf(OWNER_ADDRESS);
    console.log(
      "Owner balance before approval:",
      balanceBeforeApproval.toString()
    );

    // Approve WETH spending but on Aave facet, which is basically the diamond to show that the approval is already there
    await weth
      .connect(owner)
      .approve(await aaveFacet.getAddress(), depositAmount);

    // Check allowance
    const allowance = await weth.allowance(
      OWNER_ADDRESS,
      await compoundFacet.getAddress()
    );

    // Ensure allowance is set correctly
    expect(allowance).to.equal(depositAmount);

    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Initial balance:", initialBalance.toString());

    // Deposit WETH
    await compoundFacet
      .connect(owner)
      .compoundDeposit(WETH_ADDRESS, depositAmount);

    // Check balance after deposit
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Final balance:", finalBalance.toString());

    const depositBalance = await compoundFacet.getUserBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );

    // Assertions
    expect(finalBalance).to.equal(initialBalance - depositAmount);
    expect(depositBalance).to.equal(depositAmount - initialDepositBalance);
  });

  it("should successfully withdraw WETH from Compound", async function () {
    const depositAmount = ethers.parseEther("1");
    const withdrawAmount = ethers.parseEther("0.5");

    await weth
      .connect(owner)
      .approve(await compoundFacet.getAddress(), depositAmount);
    await compoundFacet
      .connect(owner)
      .compoundDeposit(WETH_ADDRESS, depositAmount);

    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Initial balance after deposit:", initialBalance.toString());

    // Withdraw WETH
    // Make instance of IComet
    const comet = await ethers.getContractAt("IComet", COMET_ADDRESS);
    await comet.connect(owner).withdraw(WETH_ADDRESS, withdrawAmount);
    // await comet.connect(owner).transfer(diamondAddress, withdrawAmount);
    // const tx = await compoundFacet
    //   .connect(owner)
    //   .compoundWithdraw(WETH_ADDRESS, withdrawAmount);
    // const receipt = await tx.wait();

    // Check balance after withdrawal
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    expect(finalBalance).to.equal(initialBalance + withdrawAmount);

    // Check user's deposit balance in Aave
    const depositBalance = await compoundFacet.getUserBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );
    console.log("Deposit balance in Aave:", depositBalance.toString());
    expect(depositBalance).to.equal(depositAmount - withdrawAmount);
  });
});
