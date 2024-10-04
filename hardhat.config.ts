import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as envEnc from "@chainlink/env-enc";
envEnc.config();
// import "@nomiclabs/hardhat-ethers";
// import "@nomiclabs/hardhat-waffle";

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      loggingEnabled: true,
    },
    ethereum: {
      url: `${process.env.ETHEREUM_RPC_URL}`,
      accounts: [`${process.env.PRIVATE_KEY}`], // Your private key
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
