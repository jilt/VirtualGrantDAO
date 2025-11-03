import {
  useAccount,
  useConnect,
  useConnectorClient,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { mezoTestnet } from "./wagmi";
import { useSetAtom } from "jotai";
import { signerAtom } from "./state";
import { useEffect } from "react";

const buttonStyle = {
  position: "absolute",
  top: "20px",
  right: "20px",
  padding: "10px 20px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  zIndex: 1000,
};

const addressStyle = {
  ...buttonStyle,
  backgroundColor: "#28a745",
  cursor: "default",
};

export const SignIn = () => {
  const { address, isConnected, chain, connector } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Get the signer object from the connected wallet
  const { data: client } = useConnectorClient({ connector });
  const setSigner = useSetAtom(signerAtom);

  // Update the global signer atom whenever the client changes
  useEffect(() => {
    setSigner(client ?? null);
  }, [client, setSigner]);

  if (!isConnected) {
    return (
      <button style={buttonStyle} onClick={() => connect({ connector: injected() })}>
        Connect Wallet
      </button>
    );
  }

  if (chain?.id !== mezoTestnet.id) {
    return (
      <button
        style={buttonStyle}
        onClick={() => switchChain({ chainId: mezoTestnet.id })}
      >
        Switch to Mezo Testnet
      </button>
    );
  }

  return (
    <div style={addressStyle}>
      {`${address.substring(0, 6)}...${address.substring(
        address.length - 4
      )}`}
      <button
        style={{ marginLeft: "10px", cursor: "pointer" }}
        onClick={() => disconnect()}
      >
        Disconnect
      </button>
    </div>
  );
};