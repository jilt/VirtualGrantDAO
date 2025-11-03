import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "dotenv/config";

const MEZO_TESTNET_RPC_URL = process.env.MEZO_TESTNET_RPC_URL || "https://rpc.test.mezo.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";

const config: HardhatUserConfig = {
  defaultNetwork: "mezotestnet",
  networks: {
    hardhat: {
    },
    mezotestnet: {
      url: MEZO_TESTNET_RPC_URL,
      chainId: 31611,
      accounts: [PRIVATE_KEY],
    },
  },
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "london",
      optimizer: {
        enabled: true,
        runs: 200
      }
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
};

export default config;
