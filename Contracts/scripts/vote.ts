import { ethers, network } from "hardhat";
import { VOTING_PERIOD, developmentChains, proposalsFile} from "../helper-hardhat-config";
import * as fs from "fs";
import { moveBlocks } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";

const index = 0;

async function vote(proposalIndex: number) {
    const proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"));
    const proposalId = proposals[network.config.chainId!][proposalIndex];
    // 0 = Against, 1 = For, 2 = Abstain
    const voteWay = 1;
    const governor = await ethers.getContractAt("DaoVerseGovernor", (await ethers.getContract("DaoVerseGovernor")).address);
    const reason = "We need more funds";
    const voteTxResponse = await governor.castVoteWithReason(
        proposalId,
        voteWay,
        reason
    );
    
    await voteTxResponse.wait(1);

    console.log("Voted!");

    if(developmentChains.includes(network.name)){
        await moveBlocks(VOTING_PERIOD + 1)
    }    
    console.log("Proposal state:" + await governor.state(proposalId));
}

vote(index)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })