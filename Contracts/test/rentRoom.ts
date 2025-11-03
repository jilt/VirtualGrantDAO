import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from"@nomicfoundation/hardhat-chai-matchers/withArgs";
import { BASE_URI } from "../helper-hardhat-config";

describe("rentRoom", function() {
  async function deployContractsFixture() {
    const [owner, user, account3] = await ethers.getSigners();

    const DaoVerse = await ethers.getContractFactory("DaoVerse");
    const daoVerse = await DaoVerse.connect(owner).deploy(BASE_URI);

    const RentRoom = await ethers.getContractFactory("RentRoom");
    const rentRoom = await RentRoom.connect(owner).deploy(await daoVerse.getAddress());

    const RoomMarketplace = await ethers.getContractFactory("RoomMarketplace");
    const roomMarketplace = await RoomMarketplace.connect(owner).deploy(await daoVerse.getAddress(), await rentRoom.getAddress());
    
    await rentRoom.getFunction("setMarketplaceAddress")(await roomMarketplace.getAddress());

    // For ease of testing ownership is not transferred to the timelock and no governor is deployed

    return { daoVerse, rentRoom, roomMarketplace, owner, user, account3};
  }

  describe("Listing an Nft for rent", function () {

    it("Should list a rentable NFT", async function () {
      const { daoVerse, rentRoom, owner, user, account3 } = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await rentRoom.connect(owner).listItem(0, 310, 3);

      const listingOwner = (await rentRoom.getListing(0)).owner;
      expect(listingOwner).to.equal(owner.address);
    });

    it("Should unlist a rentable NFT", async function () {
      const { daoVerse, rentRoom, owner, user, account3 } = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await rentRoom.connect(owner).listItem(0, 310, 3);

      await rentRoom.connect(owner).cancelListing(0);
      expect(await rentRoom.getListing(0)).to.deep.equal([ethers.ZeroAddress.toString(), ethers.ZeroAddress.toString(), "0", "0"]);
    });

    it("Should not allow listing a room Nft that is already listed for sale", async function () {
      const { daoVerse, rentRoom, roomMarketplace, owner, user, account3 } = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).setApprovalForAll(await rentRoom.getAddress(), true);
      await daoVerse.connect(owner).setApprovalForAll(await roomMarketplace.getAddress(), true);
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);
      
      await roomMarketplace.connect(owner).listItem(0, 10);

      await expect(rentRoom.connect(owner).listItem(0, 310, 3)).to.be.revertedWithCustomError(rentRoom, "RentRoom__isForSale").withArgs(0);
    });
  })

  describe("Nft renting", function () {
    
    it("Should allow renting an NFT", async function () {
      const { daoVerse, rentRoom, owner, user} = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).setApprovalForAll(rentRoom, true);

      await rentRoom.connect(owner).listItem(0, 310, 3);
      await rentRoom.connect(user).rentNFT(0, 310, {value: ethers.parseEther("3")});

      expect(await daoVerse.userOf(0)).to.equal(user.address);
    });

    it("Should not allow renting if NFT already has a user", async function () {
      const { daoVerse, rentRoom, owner, user, account3} = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).setApprovalForAll(rentRoom, true);

      await rentRoom.connect(owner).listItem(0, 310, 3);
      await rentRoom.connect(user).rentNFT(0, 310, {value: ethers.parseEther("3")});

      await expect(rentRoom.connect(account3).rentNFT(0, 310, {value: ethers.parseEther("3")})).to.be.revertedWithCustomError(rentRoom, "RentRoom__NotListed").withArgs(0);
    });
  })

  describe("Withdrawal of funds", function () {

    it("Should allow owner to withdraw due proceeds", async function () {
      const { daoVerse, rentRoom, owner, user} = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).setApprovalForAll(rentRoom, true);

      await rentRoom.connect(owner).listItem(0, 310, 3);
      await rentRoom.connect(user).rentNFT(0, 310, {value: ethers.parseEther("3")});

      await expect(rentRoom.connect(owner).withdrawProceeds()).to.changeEtherBalance(owner.address, ethers.parseEther("2.85"))
    });

    it("Should allow rentRoom owner to withdraw collected fees", async function () {
      const { daoVerse, rentRoom, owner, user, account3} = await loadFixture(deployContractsFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");

      await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 0);
      await daoVerse.connect(user).setApprovalForAll(await rentRoom.getAddress(), true);

      await rentRoom.connect(user).listItem(0, 310, 3);
      await rentRoom.connect(account3).rentNFT(0, 310, {value: ethers.parseEther("3")});

      await expect(rentRoom.connect(owner).withdrawFees()).to.changeEtherBalance(owner.address, ethers.parseEther("0.15"))
    });
  })
  
})