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

// function removeItem<T>(array: T[], item: T): T[] {
//   const index = array.indexOf(item);
//   if (index > -1) {
//     array.splice(index, 1);
//   }
//   return array;
// }

// function findPositionInFacets(
//   facetAddress: string,
//   facets: { facetAddress: string }[]
// ): number {
//   return facets.findIndex((facet) => facet.facetAddress === facetAddress);
// }

function getSelectorsForTest1Facet(): string[] {
  // Selectors without 0x for Test1Facet
  const sel0 = ethers.id("addPlayer(address)").slice(0, 10);
  const sel1 = ethers.id("manipulateCount(uint256)").slice(0, 10);
  const sel2 = ethers.id("getTeamsCount()").slice(0, 10);
  const sel3 = ethers.id("getPlayers()").slice(0, 10);
  const sel4 = ethers.id("testFunc(address)").slice(0, 10);
  const sel5 = ethers.id("supportsInterface(bytes4)").slice(0, 10);
  return [sel0, sel1, sel2, sel3, sel4, sel5];
}

function getSelectorsForTest2Facet(): string[] {
  // Selectors without 0x for Test1Facet
  const sel0 = ethers.id("addOwner(address)").slice(0, 10);
  const sel1 = ethers.id("manipulateCount(uint256)").slice(0, 10);
  const sel2 = ethers.id("getTotalCount()").slice(0, 10);
  const sel3 = ethers.id("getOwners()").slice(0, 10);
  const sel4 = ethers.id("testFunc(address)").slice(0, 10);
  const sel5 = ethers.id("supportsInterface(bytes4)").slice(0, 10);
  return [sel0, sel1, sel2, sel3, sel4, sel5];
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
    diamondCutFacet = await DiamondCutFacet.deploy();
    addresses.push(await diamondCutFacet.getAddress());
    const DiamondLoupeFacet = await ethers.getContractFactory(
      "DiamondLoupeFacet"
    );
    diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    addresses.push(await diamondLoupeFacet.getAddress());
    const OwnershipFacet = await ethers.getContractFactory("OwnershipFacet");
    ownershipFacet = await OwnershipFacet.deploy();
    addresses.push(await ownershipFacet.getAddress());

    const Test1Facet = await ethers.getContractFactory("Test1Facet");
    test1Facet = await Test1Facet.deploy();
    addresses.push(await test1Facet.getAddress());

    const Test2Facet = await ethers.getContractFactory("Test2Facet");
    test2Facet = await Test2Facet.deploy();
    addresses.push(await test2Facet.getAddress());

    const Test3Facet = await ethers.getContractFactory("Test3Facet");
    test3Facet = await Test3Facet.deploy();
    addresses.push(await test3Facet.getAddress());

    console.log("account[0]: ", await accounts[0].getAddress());

    const facetCuts: FacetCut[] = [
      {
        facetAddress: addresses[3],
        action: FacetCutAction.Add,
        functionSelectors: getSelectorsForTest1Facet(),
      },
      // {
      //   facetAddress: addresses[4],
      //   action: FacetCutAction.Add,
      //   functionSelectors: getSelectorsForTest2Facet(),
      // },
    ];

    let selectors: string[] = getSelectors(test3Facet.interface);
    facetCuts.push({
      facetAddress: addresses[5],
      action: FacetCutAction.Add,
      functionSelectors: selectors,
    });

    const diamondArgs = {
      owner: await accounts[0].getAddress(),
    };
    console.log("facetCuts: ", facetCuts);
    console.log("diamondArgs: ", diamondArgs);
    diamond = await Diamond.deploy(facetCuts, diamondArgs);
    console.log("The above got executed");
    // await diamond.deployed();
    console.log("diamond address: ", await diamond.getAddress());
  });

  // it("should have three facets -- call to facetAddresses function", async function () {
  //   addresses = await diamondLoupeFacet.facetAddresses();
  //   console.log("Adresses: ", addresses);
  //   expect(addresses.length).to.equal(3);
  // });

  it("should add test1 functions", async function () {
    console.log("Inside add function test");
    // let testSelectors = (await getSelectors(test1Facet)).slice(0, -1);
    // let testSelectors = selectors;
    // addresses.push(await test1Facet.getAddress());
    // await diamondCutFacet.diamondCut(
    //   [[test1Facet.address, FacetCutAction.Add, testSelectors]],
    //   zeroAddress,
    //   "0x"
    // );
    // result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
    // expect(result).to.have.members(testSelectors);
  });

  // it("should remove a few test1 functions", async function () {
  //   addresses.push(test1Facet.address);
  //   let selectorsToRemove = [sel0, sel3, sel5];
  //   await diamondCutFacet.diamondCut(
  //     [[test1Facet.address, FacetCutAction.Remove, selectorsToRemove]],
  //     zeroAddress,
  //     "0x"
  //   );
  //   result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3]);
  //   expect(result).to.not.have.members(selectorsToRemove);
  // });
});
