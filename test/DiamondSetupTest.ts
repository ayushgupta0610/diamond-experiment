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

describe("DiamondSetupTest", function () {
  let diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    ownershipFacet: Contract,
    aaveFacet: AaveFacet;
  let AaveFacet: AaveFacet__factory;
  let diamond: Contract;
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
    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    const deployedTest1Facet = await Test1Facet.deploy();
    addresses.push(await deployedTest1Facet.getAddress());
    const Test2Facet = await ethers.getContractFactory("Test2Facet");
    const deployedTest2Facet = await Test2Facet.deploy();
    addresses.push(await deployedTest2Facet.getAddress());
    AaveFacet = await ethers.getContractFactory("AaveFacet");
    console.log("AaveFacet selectors :", getSelectors(AaveFacet.interface));
    const deployedAaveFacet = await AaveFacet.deploy();
    addresses.push(await deployedAaveFacet.getAddress());
    const facets = [
      DiamondCutFacet.interface,
      DiamondLoupeFacet.interface,
      OwnershipFacet.interface,
      Test1Facet.interface,
      // Test2Facet.interface,
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

  it("should have four facets -- call to facetAddresses function", async function () {
    const addresses = await diamondLoupeFacet.facetAddresses();
    console.log("Adresses: ", addresses);
    expect(addresses.length).to.equal(4);
  });

  it("should remove test1Facet functions", async function () {
    const sel1 = ethers.id("manipulateCount(uint256)").slice(0, 10);
    const sel3 = ethers.id("getPlayers()").slice(0, 10);
    let testSelectors = [sel1, sel3];
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: ZERO_ADDRESS,
          action: FacetCutAction.Remove,
          functionSelectors: testSelectors,
        },
      ],
      ZERO_ADDRESS,
      "0x"
    );
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
    expect(result).to.not.have.members(testSelectors);
  });

  it("should add test2Facet functions", async function () {
    const sel0 = ethers.id("addOwner(address)").slice(0, 10);
    const sel2 = ethers.id("getTotalCount()").slice(0, 10);
    const sel4 = ethers.id("testFunc2(address)").slice(0, 10);
    let testSelectors = [sel0, sel2, sel4];
    await diamondCutFacet.diamondCut(
      [
        {
          facetAddress: addresses[4],
          action: FacetCutAction.Add,
          functionSelectors: testSelectors,
        },
      ],
      ZERO_ADDRESS,
      "0x"
    );
    [...result] = await diamondLoupeFacet.facetFunctionSelectors(addresses[4]);
    expect(result).to.have.members(testSelectors);
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
          facetAddress: addresses[5],
          action: FacetCutAction.Add,
          functionSelectors: selectors,
        },
      ],
      addresses[5],
      encodedData
    );
    // console.log("Aave selectors: ", selectors);
    [...result] = await diamondLoupeFacet.facetFunctionSelectors(addresses[5]);
    expect(result).to.have.members(selectors);
    expect(addresses.length).to.equal(6);
  });
});
