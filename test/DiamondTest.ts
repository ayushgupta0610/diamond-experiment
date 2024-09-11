import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, Interface, FunctionFragment } from "ethers";

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

describe("DiamondTest", function () {
  console.log("Inside describe function");
  let diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    ownershipFacet: Contract;
  let diamond: Contract,
    test1Facet: Contract,
    test2Facet: Contract,
    test3Facet: Contract;
  let result: string[];
  let addresses: string[] = [];
  let accounts: Signer[];

  const zeroAddress = "0x0000000000000000000000000000000000000000";

  before(async function () {
    accounts = await ethers.getSigners();
    console.log("Inside before function");
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
    console.log("facetCuts: ", facetCuts);
    console.log("diamondArgs: ", diamondArgs);
    diamond = await Diamond.deploy(facetCuts, diamondArgs);
    console.log("diamond address: ", await diamond.getAddress());
    console.log("diamond interface: ", diamond.interface);

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

    test1Facet = await ethers.getContractAt(
      "Test1Facet",
      await diamond.getAddress()
    );

    test2Facet = await ethers.getContractAt(
      "Test2Facet",
      await diamond.getAddress()
    );

    // Get owner() from ownership facet
    console.log("Account 0: ", await accounts[0].getAddress());
    console.log(
      "diamondDiamondOwnership owner: ",
      await ownershipFacet.owner()
    );
  });

  it("should have three facets -- call to facetAddresses function", async function () {
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
          facetAddress: zeroAddress,
          action: FacetCutAction.Remove,
          functionSelectors: testSelectors,
        },
      ],
      zeroAddress,
      "0x"
    );
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
    expect(result).to.not.have.members(testSelectors);
  });

  it("should add test2Facet functions", async function () {
    console.log("addresses: ", addresses);
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
      zeroAddress,
      "0x"
    );
    [...result] = await diamondLoupeFacet.facetFunctionSelectors(addresses[4]);
    console.log("result: ", result);
    console.log("testSelectors: ", testSelectors);
    expect(result).to.have.members(testSelectors);
  });
});
