import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";

enum FacetCutAction {
  Add,
  Replace,
  Remove,
}

function getSelectors(contract: Contract): string[] {
  const signatures = Object.keys(contract.interface.functions);
  return signatures.reduce((acc: string[], val: string) => {
    if (val !== "init(bytes)") {
      acc.push(contract.interface.getSighash(val));
    }
    return acc;
  }, []);
}

function removeItem<T>(array: T[], item: T): T[] {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}

function findPositionInFacets(
  facetAddress: string,
  facets: { facetAddress: string }[]
): number {
  return facets.findIndex((facet) => facet.facetAddress === facetAddress);
}

describe("DiamondTest", function () {
  let diamondCutFacet: Contract,
    diamondLoupeFacet: Contract,
    ownershipFacet: Contract;
  let diamond: Contract, test1Facet: Contract, test2Facet: Contract;
  let result: string[];
  let addresses: string[] = [];
  let accounts: Signer[];

  const zeroAddress = "0x0000000000000000000000000000000000000000";

  // Selectors without 0x
  const sel0 = ethers.id("addPlayer(address)").slice(2, 10);
  const sel1 = ethers.id("manipulateCount(uint256)").slice(2, 10);
  const sel2 = ethers.id("getTeamsCount()").slice(2, 10);
  const sel3 = ethers.id("getPlayers()").slice(2, 10);
  const sel4 = ethers.id("testFunc(address)").slice(2, 10);
  const sel5 = ethers.id("supportsInterface(bytes4)").slice(2, 10);
  let selectors = [sel0, sel1, sel2, sel3, sel4, sel5];

  before(async function () {
    accounts = await ethers.getSigners();
    const Diamond = await ethers.getContractFactory("Diamond");
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    const DiamondLoupeFacet = await ethers.getContractFactory(
      "DiamondLoupeFacet"
    );
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    const Test2Facet = await ethers.getContractFactory("Test2Facet");

    diamond = await Diamond.deploy(
      await accounts[0].getAddress(),
      DiamondCutFacet.address
    );
    await diamond.deployed();

    diamondCutFacet = await ethers.getContractAt(
      "DiamondCutFacet",
      diamond.address
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamond.address
    );
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamond.address
    );
    test1Facet = await Test1Facet.deploy();
    test2Facet = await Test2Facet.deploy();
    await test1Facet.deployed();
    await test2Facet.deployed();
  });

  it("should have three facets -- call to facetAddresses function", async function () {
    addresses = await diamondLoupeFacet.facetAddresses();
    expect(addresses.length).to.equal(3);
  });

  it("should add test1 functions", async function () {
    let testSelectors = getSelectors(test1Facet).slice(0, -1);
    addresses.push(test1Facet.address);
    await diamondCutFacet.diamondCut(
      [[test1Facet.address, FacetCutAction.Add, testSelectors]],
      zeroAddress,
      "0x"
    );
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
    expect(result).to.have.members(testSelectors);
  });

  it("should remove a few test1 functions", async function () {
    addresses.push(test1Facet.address);
    let selectorsToRemove = [sel0, sel3, sel5];
    await diamondCutFacet.diamondCut(
      [[test1Facet.address, FacetCutAction.Remove, selectorsToRemove]],
      zeroAddress,
      "0x"
    );
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
    expect(result).to.not.have.members(selectorsToRemove);
  });
});
