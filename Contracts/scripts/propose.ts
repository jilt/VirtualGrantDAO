import { ethers, network } from "hardhat";
import { NEW_PERCENTAGE_FEE, FUNC, PROPOSAL_DESCRIPTION, developmentChains, VOTING_DELAY, proposalsFile, MIN_DELAY} from "../helper-hardhat-config";
import * as fs from "fs";
import { moveTime } from "../utils/move-time";
import { moveBlocks } from "../utils/move-blocks";

export async function propose(args: any[], functionToCall: string, proposalDescription: string) {
    const governor = await ethers.getContractAt("DaoVerseGovernor", (await ethers.getContract("DaoVerseGovernor")).address);
    const rentRoom = await ethers.getContractAt("RentRoom", (await ethers.getContract("RentRoom")).address);

    const encodedFunctionCall = rentRoom.interface.encodeFunctionData(
        functionToCall,
        args
    );
    
    console.log(`Proposing ${functionToCall} on ${await rentRoom.getAddress()} with ${args}`);
    console.log(`Proposal Description: \n ${proposalDescription}`);
    const proposeTx = await governor.getFunction("propose")(
        [await rentRoom.getAddress()],
        [0],
        [encodedFunctionCall],
        proposalDescription
    )
    const proposeReceipt = await proposeTx.wait(1)

    if(developmentChains.includes(network.name)){
        await moveBlocks(VOTING_DELAY + 1);
    }

    const proposalId = proposeReceipt.logs[0].args.proposalId;
    let proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
    proposals[network.config.chainId!.toString()].push(proposalId.toString());
    fs.writeFileSync(proposalsFile, JSON.stringify(proposals));
}

propose([NEW_PERCENTAGE_FEE], FUNC, PROPOSAL_DESCRIPTION)
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    })