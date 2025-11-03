import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { ethers as Ethers } from 'ethers';
import { BASE_URI } from '../helper-hardhat-config';  
  
const deployDaoVerseToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // Note: `ethers` is injected into the Hardhat Runtime Environment
    const {getNamedAccounts, deployments, ethers} = hre;
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    log("----------------------------------------------------");
    log("01 - Deploying DaoVerse Token...");

    const daoverseToken = await deploy("DaoVerse", {
        from: deployer,
        args: [BASE_URI],
        log: true,
    })
    log(`Deployed DaoVerse token to address ${daoverseToken.address}`)

    log(`Delegating to ${deployer}`)
    await delegate(daoverseToken.address, deployer, ethers)
    log("Delegated to deployer!")

    // --- Hardcode voter with 10 tokens ---
    const hardcodedVoter = "0x0E7B7b373E7A1CbEbD6d7e4A4D570408f5948971";
    const tokenAmount = ethers.parseUnits("10", 18); // 10 tokens with 18 decimals
    const daoVerseContract = await ethers.getContractAt("DaoVerse", daoverseToken.address);
    log(`Minting ${ethers.formatUnits(tokenAmount, 18)} tokens to ${hardcodedVoter}...`);
    const mintTx = await daoVerseContract.mint(hardcodedVoter, tokenAmount);
    await mintTx.wait(1);
    log(`Delegating for ${hardcodedVoter}...`);
    await delegate(daoverseToken.address, hardcodedVoter, ethers);
    log("Hardcoded voter setup complete!");
};

const delegate = async (daoverseTokenAddress: string, delegatedAccount: string, ethers: Ethers.Eip1193Provider) => {
    const daoverseToken = await ethers.getContractAt("DaoVerse", daoverseTokenAddress)
    const transactionResponse = await daoverseToken.delegate(delegatedAccount)
    await transactionResponse.wait(1)
}

export default deployDaoVerseToken;
deployDaoVerseToken.tags = ["all", "daoverse"];