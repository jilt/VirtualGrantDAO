import { atom } from "jotai";

// This atom will hold the wallet client (signer) for the connected user.
// Components can use this to interact with smart contracts.
export const signerAtom = atom(null);