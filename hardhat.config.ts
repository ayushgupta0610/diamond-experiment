import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
// import "@nomiclabs/hardhat-ethers";
// import "@nomiclabs/hardhat-waffle";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      loggingEnabled: true,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.7.1",
      },
      {
        version: "0.8.24",
      },
    ],
  },
  // paths: {
  //   sources: "./contracts",
  //   tests: "./test",
  //   cache: "./cache",
  //   artifacts: "./artifacts",
  // },
};

export default config;
