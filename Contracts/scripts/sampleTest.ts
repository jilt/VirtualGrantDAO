import { ethers } from "hardhat";
import { mintNft } from "./mint-nft";

async function sampleTest() {
  const [nftOwner, nftUser, account3] = await ethers.getSigners();
  
  mintNft("/testroom1", 12, "Kitchen");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
sampleTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
