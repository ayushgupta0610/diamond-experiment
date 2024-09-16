import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, Interface, FunctionFragment } from "ethers";
import { AaveFacet, AaveFacet__factory, IERC20 } from "../typechain-types";

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

function getFacetCuts(addresses: string[], facets: Interface[]): FacetCut[] {
  const facetCuts: FacetCut[] = []; // Initialize the array to hold FacetCut objects
  for (let i = 0; i < facets.length; i++) {
    const facet = facets[i]; // Get the corresponding facet
    facetCuts.push({
      // Push the new FacetCut object into the array
      facetAddress: addresses[i],
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }
  return facetCuts; // Return the array of FacetCut objects
}

async function impersonateSigner(account: string): Promise<Signer> {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [account],
  });
  await network.provider.send("hardhat_setBalance", [
    account,
    "0x56BC75E2D63100000", // 100 ETH
  ]);
  console.log("Balance: ", await ethers.provider.getBalance(account));
  return await ethers.provider.getSigner(account);
}

describe("DiamondTest", function () {
  let diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    ownershipFacet: Contract,
    aaveFacet: AaveFacet;
  let AaveFacet: AaveFacet__factory;
  let diamond: Contract;
  let weth: IERC20;
  let owner: Signer, whale: Signer;
  let result: string[];
  let addresses: string[] = [];
  let accounts: Signer[];

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const AAVE_POOL_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const WHALE_ADDRESS = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
  const OWNER_ADDRESS = "0xD3a7e3C5602F8A66B58dc17ce33f739eFac33da2"; // WETH holder

  before(async function () {
    accounts = await ethers.getSigners();
    owner = await impersonateSigner(OWNER_ADDRESS);
    whale = await impersonateSigner(WHALE_ADDRESS);
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
    // const Test1Facet = await ethers.getContractFactory("Test1Facet");
    // const deployedTest1Facet = await Test1Facet.deploy();
    // addresses.push(await deployedTest1Facet.getAddress());
    // const Test2Facet = await ethers.getContractFactory("Test2Facet");
    // const deployedTest2Facet = await Test2Facet.deploy();
    // addresses.push(await deployedTest2Facet.getAddress());
    AaveFacet = await ethers.getContractFactory("AaveFacet");
    console.log("AaveFacet selectors :", getSelectors(AaveFacet.interface));
    const deployedAaveFacet = await AaveFacet.deploy();
    addresses.push(await deployedAaveFacet.getAddress());
    const facets = [
      DiamondCutFacet.interface,
      DiamondLoupeFacet.interface,
      OwnershipFacet.interface,
      AaveFacet.interface,
    ];
    const facetCuts = getFacetCuts(addresses, facets);
    const diamondArgs = {
      owner: await accounts[0].getAddress(),
    };
    diamond = await Diamond.deploy(facetCuts, diamondArgs);

    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      await diamond.getAddress()
    );

    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      await diamond.getAddress()
    );

    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      await diamond.getAddress()
    );

    aaveFacet = await ethers.getContractAt(
      "AaveFacet",
      await diamond.getAddress()
    );

    // Get owner() from ownership facet
    console.log("Account 0: ", await accounts[0].getAddress());
    console.log(
      "diamondDiamondOwnership owner: ",
      await ownershipFacet.owner()
    );
  });

  it("should have aave functions", async function () {
    // Encode init function on aave facet with lending pool address
    const encodedData = aaveFacet.interface.encodeFunctionData("init", [
      AAVE_POOL_ADDRESS,
    ]);
    const selectors = getSelectors(AaveFacet.interface);
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: addresses[3],
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      addresses[4],
      encodedData
    );
    // console.log("Aave selectors: ", selectors);
    [...result] = await diamondLoupeFacet.facetFunctionSelectors(addresses[5]);
    expect(result).to.have.members(selectors);
    expect(addresses.length).to.equal(6);
  });

  // Test for aave deposit and withdraw functions
  it("should successfully deposit WETH", async function () {
    const depositAmount = ethers.parseEther("1");

    // Transfer WETH from whale to owner
    await weth.connect(whale).transfer(OWNER_ADDRESS, depositAmount);
    // console.log("Check balance: ", await weth.balanceOf(OWNER_ADDRESS));

    // Approve WETH spending
    await weth
      .connect(owner)
      .approve(await aaveFacet.getAddress(), depositAmount);
    console.log(
      "Allowance: ",
      await weth.connect(owner).allowance(OWNER_ADDRESS, AAVE_POOL_ADDRESS)
    );
    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);

    // Deposit WETH
    await aaveFacet.connect(owner).deposit(WETH_ADDRESS, depositAmount);

    // Check balance after deposit
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    console.log("Final balance: ", finalBalance);
    // expect(finalBalance).to.equal(initialBalance.sub(depositAmount));

    // Check user's deposit balance in Aave
    const depositBalance = await aaveFacet.getUserDepositBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );
    expect(depositBalance).to.be.gt(0);
  });

  it("should successfully withdraw WETH", async function () {
    const depositAmount = ethers.parseEther("1");
    const withdrawAmount = ethers.parseEther("0.5");

    // Deposit WETH first (assuming deposit functionality works)
    await weth.connect(whale).transfer(OWNER_ADDRESS, depositAmount);
    await weth
      .connect(owner)
      .approve(await aaveFacet.getAddress(), depositAmount);
    await aaveFacet.connect(owner).deposit(WETH_ADDRESS, depositAmount);

    // Get initial balance
    const initialBalance = await weth.balanceOf(OWNER_ADDRESS);

    // Get aToken address
    const pool = await ethers.getContractAt("IPool", AAVE_POOL_ADDRESS);
    const aTokenAddress = (await pool.getReserveData(WETH_ADDRESS))
      .aTokenAddress;
    const aToken = await ethers.getContractAt("IERC20", aTokenAddress);

    // Approve aToken spending
    await aToken
      .connect(owner)
      .approve(await aaveFacet.getAddress(), withdrawAmount);

    // Withdraw WETH
    const tx = await aaveFacet
      .connect(owner)
      .withdraw(WETH_ADDRESS, withdrawAmount);
    const receipt = await tx.wait();

    // Get withdrawn amount from event logs
    const withdrawnEvent = receipt.events.find((e) => e.event === "Withdrawn");
    const withdrawnAmount = withdrawnEvent.args.amount;

    // Check balance after withdrawal
    const finalBalance = await weth.balanceOf(OWNER_ADDRESS);
    expect(finalBalance).to.equal(initialBalance.add(withdrawnAmount));

    // Check user's deposit balance in Aave
    const depositBalance = await aaveFacet.getUserDepositBalance(
      OWNER_ADDRESS,
      WETH_ADDRESS
    );
    expect(depositBalance).to.be.lt(ethers.parseEther("1"));
  });
});
