import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { MIN_DELAY } from '../helper-hardhat-config';

const deployTimeLock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {getNamedAccounts, deployments, network, ethers} = hre;
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    log("----------------------------------------------------");
    log("02 - Deploying Timelock Contract...");

    const timelockContract = await deploy("TimeLock", {
        from: deployer,
        args: [MIN_DELAY, [deployer], [ethers.ZeroAddress], deployer],
        log: true,
    });
    log(`Deployed TimeLock contract to address ${timelockContract.address}`)
};

export default deployTimeLock;
deployTimeLock.tags = ["all", "timelock"];