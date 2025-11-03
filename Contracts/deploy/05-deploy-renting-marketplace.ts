import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const rentingMarketplace: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {getNamedAccounts, deployments, ethers} = hre;
    const {deploy, log, get} = deployments;
    const {deployer} = await getNamedAccounts();

    // This ensures the DaoVerse token is deployed first
    const daoVerseToken = await get("DaoVerse");

    log("----------------------------------------------------");
    log("05 - Deploying RentRoom & RoomMarketplace Contracts...");
    const rentRoom = await deploy("RentRoom", {
        from: deployer,
        args: [daoVerseToken.address],
        log: true,
    });
    log(`Deployed RentRoom to address ${rentRoom.address}`);

    const roomMarketplace = await deploy("RoomMarketplace", {
        from: deployer,
        args: [daoVerseToken.address, rentRoom.address],
        log: true,
    });
    log(`Deployed RoomMarketplace to address ${roomMarketplace.address}`);

    // --- Post-Deployment Setup ---
    log("----------------------------------------------------");
    log("Linking contracts and transferring ownership...");
    const rentRoomContract = await ethers.getContractAt("RentRoom", rentRoom.address);
    const setMarketplaceTx = await rentRoomContract.setMarketplaceAddress(roomMarketplace.address);
    await setMarketplaceTx.wait(1);
    log("Set marketplace address in RentRoom contract.");

    const timeLock = await ethers.getContractAt("TimeLock", (await get("TimeLock")).address);
    const roomMarketplaceContract = await ethers.getContractAt("RoomMarketplace", roomMarketplace.address);
    const transferRentRoomOwnerTx = await rentRoomContract.transferOwnership(await timeLock.getAddress());
    await transferRentRoomOwnerTx.wait(1);
    const transferMarketplaceOwnerTx = await roomMarketplaceContract.transferOwnership(await timeLock.getAddress());
    await transferMarketplaceOwnerTx.wait(1);
    log("Ownership of RentRoom and RoomMarketplace transferred to TimeLock.");
    log("----------------------------------------------------");
};

export default rentingMarketplace;
rentingMarketplace.tags = ["all", "marketplace"];