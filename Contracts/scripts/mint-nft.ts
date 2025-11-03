import { ethers } from "hardhat";

export async function mintNft(nftURI: string, nftArea: number, nftName: string) {
    const { deployer } = await ethers.getNamedSigners();
    const daoVerse = await ethers.getContractAt("DaoVerse", (await ethers.getContract("DaoVerse")).address);

    console.log(`Minting an NFT to ${deployer.address}...`);

    const mintTx = await daoVerse.mint(
        deployer.address,
        nftURI,
        nftArea,
        nftName
    );
    await mintTx.wait(1);
    console.log("NFT Minted!");
}

mintNft("/test1", 1234, "Test Room")
    .then(() => process.exit(0))
    .catch((error) => {
        console.log(error);
        process.exit(1);
    })