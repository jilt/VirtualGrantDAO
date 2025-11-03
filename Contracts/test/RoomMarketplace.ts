import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, Signer } from 'ethers';
import { BASE_URI, MIN_DELAY, NEW_PERCENTAGE_FEE, PROPOSAL_DESCRIPTION, VOTING_DELAY, VOTING_PERIOD } from "../helper-hardhat-config";
import { moveBlocks } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";

describe("RoomMarketplace", function() {
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

    return { daoVerse, rentRoom, roomMarketplace, owner, user, account3 };
  }
  
  let daoVerse: any, rentRoom: any, roomMarketplace: any, owner: Signer, user: Signer, account3: Signer;

  beforeEach(async () => {
    const fixture = await loadFixture(deployContractsFixture);
    daoVerse = fixture.daoVerse;
    rentRoom = fixture.rentRoom;
    roomMarketplace = fixture.roomMarketplace;
    owner = fixture.owner;
    user = fixture.user;
    account3 = fixture.account3;
  });

  describe("Listing an Nft for sale", async function () {

    it("Should list a room for sale", async function () {
        await daoVerse.connect(owner).mint("123", 245, "terra");
        await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

        await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("1"));
        
        const listingOwner = (await roomMarketplace.getListing(0)).seller;
        expect(listingOwner).to.equal(await owner.getAddress());
    })

    it("Should unlist a room for sale", async function () {
        await daoVerse.connect(owner).mint("123", 245, "terra");
        await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

        await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("1"));

        await roomMarketplace.connect(owner).cancelListing(0);

        expect(await roomMarketplace.getListing(0)).to.deep.equal([ethers.parseEther("0"), ethers.ZeroAddress.toString()]);
    })

    it("Should update a listing", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

      await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("1"));

      await roomMarketplace.connect(owner).updateListing(0, ethers.parseEther("4"));

      expect(await roomMarketplace.getListing(0)).to.deep.equal([ethers.parseEther("4"), await owner.getAddress()]);
  })

    it("Should not allow listing if seller is not the owner of the room nft", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);      
      
      await expect(roomMarketplace.connect(user).listItem(0, ethers.parseEther("1"))).to.be.revertedWithCustomError(roomMarketplace, "RoomMarketplace__NotOwner");
  })

    it("Should not allow listing a room Nft if it is already listed for rent", async function () {
        await daoVerse.connect(owner).mint("123", 245, "terra");
        await daoVerse.connect(owner).setApprovalForAll(await rentRoom.getAddress(), true);
        await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);
        await daoVerse.connect(owner).setApprovalForAll(await roomMarketplace.getAddress(), true);

        await rentRoom.connect(owner).listItem(0, 310, 3);

        await expect(roomMarketplace.connect(owner).listItem(0, ethers.parseEther("1"))).to.be.revertedWithCustomError(roomMarketplace, "RoomMarketplace__isForRent").withArgs(0);
    })

    it("Should not allow listing a room Nft if it is rented", async function () {
        await daoVerse.connect(owner).mint("123", 245, "terra");
        await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);
        await daoVerse.connect(owner).setApprovalForAll(await roomMarketplace.getAddress(), true);
        await daoVerse.connect(owner).setApprovalForAll(rentRoom, true);

        await rentRoom.connect(owner).listItem(0, 310, 3);
        await rentRoom.connect(user).rentNFT(0, 310, {value: ethers.parseEther("3")});

        await expect(roomMarketplace.connect(owner).listItem(0, ethers.parseEther("1"))).to.be.revertedWithCustomError(roomMarketplace, "RoomMarketplace__isRented").withArgs(0, await user.getAddress());
    })
  })

  describe("Buying", async function () {

    it("Should allow a user to buy a room nft", async function () {
        await daoVerse.connect(owner).mint("123", 245, "terra");
        await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

        await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("3"));

        await roomMarketplace.connect(user).buyItem(0, {value: ethers.parseEther("3")})

        expect(await daoVerse.ownerOf(0)).to.equal(await user.getAddress());
    })

    it("Should delete listing after a user buys it", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

      await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("3"));

      await roomMarketplace.connect(user).buyItem(0, {value: ethers.parseEther("3")})

      expect(await roomMarketplace.getListing(0).seller).to.be.undefined;
  })

    it("Should not allow a user to buy a room nft if price is not met", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

      await roomMarketplace.connect(owner).listItem(0, ethers.parseEther("3"));

      await expect(roomMarketplace.connect(user).buyItem(0, {value: ethers.parseEther("1")})).to.be.revertedWithCustomError(roomMarketplace, "RoomMarketplace__PriceNotMet").withArgs(0, ethers.parseEther("3"));
    })
  })

  describe("Withdrawal of funds", async function () {

    it("Should allow user to withdraw due proceeds", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

      await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 0);
      await daoVerse.connect(user).approve(await roomMarketplace.getAddress(), 0);

      await roomMarketplace.connect(user).listItem(0, ethers.parseEther("3"));
      await roomMarketplace.connect(account3).buyItem(0, {value: ethers.parseEther("3")});

      await expect(roomMarketplace.connect(user).withdrawProceeds()).to.changeEtherBalance(await user.getAddress(), ethers.parseEther("2.85"));
    })

    it("Should allow marketplace owner to withdraw collected fees", async function () {
      await daoVerse.connect(owner).mint("123", 245, "terra");
      await daoVerse.connect(owner).approve(await roomMarketplace.getAddress(), 0);

      await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 0);
      await daoVerse.connect(user).approve(await roomMarketplace.getAddress(), 0);

      await roomMarketplace.connect(user).listItem(0, ethers.parseEther("3"));
      await roomMarketplace.connect(account3).buyItem(0, {value: ethers.parseEther("3")});

      await expect(roomMarketplace.connect(owner).withdrawFees()).to.changeEtherBalance(await owner.getAddress(), ethers.parseEther("0.15"));
    })
  })

})