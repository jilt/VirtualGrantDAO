import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const deployGovernorContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {getNamedAccounts, deployments, network} = hre;
    const {deploy, log, get} = deployments;
    const {deployer} = await getNamedAccounts();

    const daoVerseToken = await get("DaoVerse"); // This ensures DaoVerse is deployed first
    const timeLock = await get("TimeLock"); // This ensures TimeLock is deployed first

    log("----------------------------------------------------");
    log("03 - Deploying Governor Contract...");

    const governorContract = await deploy("DaoVerseGovernor", {
        from: deployer,
        args: [daoVerseToken.address, timeLock.address],
        log: true,
    });
    log(`Deployed Governor Contract to address ${governorContract.address}`)
};

export default deployGovernorContract;
deployGovernorContract.tags = ["all", "governor"];