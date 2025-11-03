import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const setupContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {getNamedAccounts, deployments, ethers} = hre;
    const {log, get} = deployments;
    const {deployer} = await getNamedAccounts();

    const timeLock = await ethers.getContractAt("TimeLock", (await get("TimeLock")).address);
    const governor = await ethers.getContractAt("DaoVerseGovernor", (await get("DaoVerseGovernor")).address);

    log("----------------------------------------------------");
    log("04 - Setting up governance roles...");
    const proposerRole = ethers.id("PROPOSER_ROLE");
    const executorRole = ethers.id("EXECUTOR_ROLE")
    const adminRole = ethers.id("TIMELOCK_ADMIN_ROLE");

    const proposerTx = await timeLock.grantRole(proposerRole, await governor.getAddress());
    await proposerTx.wait(1);
    const executorTx = await timeLock.grantRole(executorRole, ethers.ZeroAddress); // Anyone can execute
    await executorTx.wait(1);
    const revokeProposerTx = await timeLock.revokeRole(proposerRole, deployer); // Revoke temporary role
    await revokeProposerTx.wait(1);
    const revokeAdminTx = await timeLock.revokeRole(adminRole, deployer); // Revoke admin role
    await revokeAdminTx.wait(1);
    log("Roles configured and deployer's admin role revoked.");
};

export default setupContracts;
setupContracts.tags = ["all", "setup"];