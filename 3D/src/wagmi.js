import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

export const mezoTestnet = {
  id: 31611,
  name: "Mezo Testnet",
  nativeCurrency: {
    name: "tBTC",
    symbol: "tBTC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.test.mezo.org"] },
  },
  blockExplorers: {
    default: { name: "MezoScan", url: "https://explorer.test.mezo.org" },
  },
};

export const config = createConfig({
  chains: [mezoTestnet],
  connectors: [injected()],
  transports: {
    [mezoTestnet.id]: http(),
  },
});