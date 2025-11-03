import { atom, useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";

import { AvatarCreator } from "@readyplayerme/react-avatar-creator";
import { motion } from "framer-motion";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { erc721Abi } from "viem";
import { roomItemsAtom } from "./Room";
import { signerAtom } from "./state"; // Import signerAtom
import { roomIDAtom, socket } from "./SocketManager";
export const buildModeAtom = atom(false);
export const shopModeAtom = atom(false);
export const draggedItemAtom = atom(null);
export const draggedItemRotationAtom = atom(0);

export const avatarUrlAtom = atom(
  localStorage.getItem("avatarURL") ||
    "https://models.readyplayer.me/64f0265b1db75f90dcfd9e2c.glb?meshlod=1&quality=medium"
);

// --- CONTRACT ADDRESSES ---
const RENT_ROOM_NFT_ADDRESS = "0x4b24FB006418DD4999eeb52aADb486575D152552";
const GOVERNANCE_TOKEN_ADDRESS = "0x9420467929c216d7181b2542026d4Ad353E1B216"; // This is the RoomMarketplace which is also the DaoVerse token

const AccessControlModal = ({ onClose, onSuccess }) => {
  const signer = useAtomValue(signerAtom);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const DEPLOYER_ADDRESS = "0x0E7B7b373E7A1CbEbD6d7e4A4D570408f5948971";

  const checkAccess = async () => {
    if (!signer) {
      setError("Please connect your wallet first.");
      return;
    }
    setLoading(true);
    setError("");

    const userAddress = signer.account.address;

    // Allow the deployer to always pass
    if (userAddress.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase()) {
      setLoading(false);
      onSuccess();
      onClose();
      return;
    }

    try {
      const balance = await signer.readContract({
        address: RENT_ROOM_NFT_ADDRESS,
        abi: erc721Abi,
        functionName: "balanceOf",
        args: [userAddress],
      });

      if (balance > 0) {
        onSuccess();
        onClose();
      } else {
        setError("You do not own the required NFT to access build mode.");
      }
    } catch (e) {
      console.error("Error checking NFT balance:", e);
      setError("Could not verify NFT ownership. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-10 grid place-items-center w-full h-full top-0 left-0">
      <div
        className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-white rounded-lg shadow-lg p-4 z-10">
        <p className="text-lg font-bold">Build Mode Access</p>
        <p className="text-sm text-gray-500 mb-4">
          Verify NFT ownership to enter build mode.
        </p>
        <div className="space-y-2 mt-2">
          <button
            className="bg-blue-500 text-white rounded-lg px-4 py-2 flex-1 w-full disabled:bg-blue-300"
            onClick={checkAccess}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Check Access"}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const ProposalForm = ({ signer }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!signer || !title || !description) {
      alert("Please fill out all fields.");
      return;
    }
    setLoading(true);
    // TODO: Wire this up to the `propose` function on the DaoVerseGovernor contract
    console.log("Submitting proposal:", { title, description, proposer: signer.account.address });
    setLoading(false);
    alert("Proposal submitted! (Console log for now)");
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <p className="text-md font-bold mb-2">Create a New Proposal</p>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Proposal Title"
          className="w-full border rounded-lg p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Describe your proposal..."
          className="w-full border rounded-lg p-2 h-24 resize-none"
          maxLength={800}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-gray-500 text-center">
          Your connected wallet will be used to create this proposal.
        </p>
        <button className="bg-green-500 text-white rounded-lg px-4 py-2 w-full" onClick={handleSubmit} disabled={loading}>{loading ? "Submitting..." : "Submit Proposal"}</button>
      </div>
    </div>
  );
};

const ProposalList = ({ proposals, signer }) => {
  const handleVote = (proposalId, vote) => {
    if (!signer) return;
    // TODO: Wire this up to the `castVote` or `castVoteWithReason` function on the DaoVerseGovernor contract
    const voteString = vote === 1 ? "Yes" : "No";
    console.log(`Voting ${voteString} on proposal ${proposalId} with account ${signer.account.address}`);
    alert(`Voted ${voteString} on proposal ${proposalId}! (Console log for now)`);
  };

  return (
    <div className="mt-6">
      <p className="text-md font-bold mb-2">Vote on Active Proposals</p>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {proposals.map((proposal) => (
          <div key={proposal.proposalId} className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-sm font-semibold">{proposal.description}</p>
            <p className="text-xs text-gray-400 mt-1">Proposer: {proposal.proposer}</p>
            <div className="text-xs text-gray-400 flex space-x-4">
              <span>State: {proposal.state}</span>
              <span>For: {proposal.votesFor}</span>
              <span>Against: {proposal.votesAgainst}</span>
            </div>
            <div className="flex space-x-2 mt-2">
                <button className="bg-green-500 text-white text-xs rounded-lg px-3 py-1 flex-1 disabled:bg-gray-400" onClick={() => handleVote(proposal.proposalId, 1)} disabled={proposal.state !== "Active"}>Yes</button>
                <button className="bg-red-500 text-white text-xs rounded-lg px-3 py-1 flex-1 disabled:bg-gray-400" onClick={() => handleVote(proposal.proposalId, 0)} disabled={proposal.state !== "Active"}>No</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProposalModal = ({ onClose }) => {
  const signer = useAtomValue(signerAtom);
  const [govTokenBalance, setGovTokenBalance] = useState(0);
  const [roomNftBalance, setRoomNftBalance] = useState(0);
  const [loadingBalances, setLoadingBalances] = useState(true);

  // --- Special address with full access ---
  const specialVoterAddress = "0x0E7B7b373E7A1CbEbD6d7e4A4D570408f5948971";
  const isSpecialVoter = signer?.account?.address.toLowerCase() === specialVoterAddress.toLowerCase();

  // --- Role Definitions ---
  const canCreateProposals = roomNftBalance > 0;
  const canVote = govTokenBalance > 0;

  // --- Placeholder Data ---
  const placeholderProposals = [
    { proposalId: '7823...9823', description: 'Proposal #1: Increase marketplace fee to 10%', state: 'Active', proposer: '0xabc...def', votesFor: '150', votesAgainst: '20' },
    { proposalId: '1234...5678', description: 'Proposal #2: Fund a new community event', state: 'Active', proposer: '0x123...456', votesFor: '500', votesAgainst: '10' },
    { proposalId: '9876...5432', description: 'Proposal #3: Upgrade the chat system', state: 'Defeated', proposer: '0x789...abc', votesFor: '50', votesAgainst: '100' },
  ];

  /*
  // --- Function to fetch real proposal data from the blockchain ---
  const fetchProposalsFromChain = async (signer) => {
    const governorContract = new Contract(GOVERNOR_CONTRACT_ADDRESS, governorAbi, signer);
    const proposalCount = await governorContract.proposalCount();
    const proposals = [];
    for (let i = 0; i < proposalCount; i++) {
      const proposalId = await governorContract.proposals(i);
      const proposalDetails = await governorContract.getActions(proposalId);
      const proposalState = await governorContract.state(proposalId);
      proposals.push({
        proposalId: proposalId.toString(),
        description: proposalDetails.description,
        state: proposalState.toString(), // Note: This will be a number, you'd map it to a string (Pending, Active, etc.)
      });
    }
    return proposals;
  };
  */

  useEffect(() => {
    const checkBalances = async () => {
      if (!signer) {
        setLoadingBalances(false);
        return;
      }
      try {
        const [govBalance, nftBalance] = await Promise.all([
          signer.readContract({ address: GOVERNANCE_TOKEN_ADDRESS, abi: erc721Abi, functionName: "balanceOf", args: [signer.account.address] }),
          signer.readContract({ address: RENT_ROOM_NFT_ADDRESS, abi: erc721Abi, functionName: "balanceOf", args: [signer.account.address] }),
        ]);
        setGovTokenBalance(Number(govBalance));
        setRoomNftBalance(Number(nftBalance));
      } catch (e) {
        console.error("Failed to fetch token balances:", e);
      } finally {
        setLoadingBalances(false);
      }
    };
    checkBalances();
  }, [signer]);

  return (
    <div className="fixed z-10 grid place-items-center w-full h-full top-0 left-0">
      <div
        className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-white rounded-lg shadow-lg p-4 z-10 w-full max-w-md">
        <p className="text-lg font-bold mb-4">DAO Governance</p>
        {loadingBalances ? (
          <p>Checking your roles...</p>
        ) : (
          <>
            {isSpecialVoter ? (
              <>
                <ProposalForm signer={signer} />
                <ProposalList proposals={placeholderProposals} signer={signer} />
              </>
            ) : canCreateProposals ? (
              <ProposalForm signer={signer} />
            ) : canVote ? (
              <ProposalList proposals={placeholderProposals} signer={signer} />
            ) : (
              <p className="text-center text-gray-500">This content is allowed only for DAO contributors and voters.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const UI = () => {
  const [buildMode, setBuildMode] = useAtom(buildModeAtom);
  const [shopMode, setShopMode] = useAtom(shopModeAtom);
  const [draggedItem, setDraggedItem] = useAtom(draggedItemAtom);
  const [draggedItemRotation, setDraggedItemRotation] = useAtom(
    draggedItemRotationAtom
  );
  const [_roomItems, setRoomItems] = useAtom(roomItemsAtom);
  const [accessControlMode, setAccessControlMode] = useState(false);
  const [proposalMode, setProposalMode] = useState(false);
  const [avatarMode, setAvatarMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useAtom(avatarUrlAtom);
  const [roomID, setRoomID] = useAtom(roomIDAtom);
  const [passwordCorrectForRoom, setPasswordCorrectForRoom] = useState(false);
  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setRoomID(null);
    setBuildMode(false);
    setShopMode(false);
  };
  useEffect(() => {
    setPasswordCorrectForRoom(false); // PS: this is an ugly shortcut
  }, [roomID]);

  const ref = useRef();
  const [chatMessage, setChatMessage] = useState("");
  const sendChatMessage = () => {
    if (chatMessage.length > 0) {
      socket.emit("chatMessage", chatMessage);
      setChatMessage("");
    }
  };

  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const signer = useAtomValue(signerAtom); // Get the signer object

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {avatarMode && (
          <AvatarCreator
            subdomain="icpland"
            className="fixed top-0 left-0 z-[999999999] w-full h-full" // have to put a crazy z-index to be on top of HTML generated by Drei
            onAvatarExported={(event) => {
              let newAvatarUrl =
                event.data.url === avatarUrl.split("?")[0]
                  ? event.data.url.split("?")[0] + "?" + new Date().getTime()
                  : event.data.url;
              newAvatarUrl +=
                (newAvatarUrl.includes("?") ? "&" : "?") +
                "meshlod=1&quality=medium";
              setAvatarUrl(newAvatarUrl);
              localStorage.setItem("avatarURL", newAvatarUrl);
              if (roomID) {
                socket.emit("characterAvatarUpdate", newAvatarUrl);
              }
              setAvatarMode(false);
            }}
          />
         )}
        {accessControlMode && (
          <AccessControlModal
            onClose={() => setAccessControlMode(false)}
            onSuccess={() => {
              setBuildMode(true);
              setPasswordCorrectForRoom(true);
            }}
          />
        )}
        {proposalMode && (
          <ProposalModal onClose={() => setProposalMode(false)} />
        )}
        <div className="fixed inset-4 flex items-center justify-end flex-col pointer-events-none select-none">
          {roomID && !shopMode && !buildMode && (
            <div className="pointer-events-auto p-4 flex items-center space-x-4">
              <input
                type="text"
                className="w-56 border px-5 p-4 h-full rounded-full"
                placeholder="Message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendChatMessage();
                  }
                }}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={sendChatMessage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-center space-x-4 pointer-events-auto">
            {roomID && !shopMode && !buildMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={leaveRoom}
              >
                LOBBY
              </button>
            )}
            {/* WALLET CONNECT */}
            {!buildMode && !shopMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => {
                  if (isConnected) {
                    disconnect();
                  } else {
                    connect({ connector: injected() });
                  }
                }}
              >
                {isConnected
                  ? `Disconnect ${address.substring(0, 4)}...${address.substring(
                      address.length - 4
                    )}`
                  : "Connect Wallet"}
              </button>
            )}

            {/* BACK */}
            {(buildMode || shopMode) && draggedItem === null && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => {
                  shopMode ? setShopMode(false) : setBuildMode(false);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                  />
                </svg>
              </button>
            )}
            {/* AVATAR */}
            {!buildMode && !shopMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setAvatarMode(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </button>
            )}
            {/* DANCE */}
            {roomID && !buildMode && !shopMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => socket.emit("dance")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
                  />
                </svg>
              </button>
            )}
            {/* PROPOSAL */}
            {roomID && !buildMode && !shopMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setProposalMode(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.31h5.418a.562.562 0 0 1 .321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988H8.88a.563.563 0 0 0 .475-.31L11.48 3.5Z"
                  />
                </svg>
              </button>
            )}
            {/* BUILD */}
            {roomID && !buildMode && !shopMode && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => {
                  if (!passwordCorrectForRoom) {
                    setAccessControlMode(true);
                  } else {
                    setBuildMode(true);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
              </button>
            )}
            {/* SHOP */}
            {buildMode && !shopMode && draggedItem === null && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setShopMode(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                  />
                </svg>
              </button>
            )}

            {/* ROTATE */}
            {buildMode && !shopMode && draggedItem !== null && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() =>
                  setDraggedItemRotation(
                    draggedItemRotation === 3 ? 0 : draggedItemRotation + 1
                  )
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            )}
            {/* CANCEL */}
            {buildMode && !shopMode && draggedItem !== null && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setDraggedItem(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {/* REMOVE ITEM */}
            {buildMode && !shopMode && draggedItem !== null && (
              <button
                className="p-4 rounded-full bg-slate-500 text-white drop-shadow-md cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => {
                  setRoomItems((prev) => {
                    const newItems = [...prev];
                    newItems.splice(draggedItem, 1);
                    return newItems;
                  });
                  setDraggedItem(null);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};
