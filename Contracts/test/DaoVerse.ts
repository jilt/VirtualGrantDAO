import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from"@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("DaoVerseContract", function () {

  async function deployDaoVerseTokenFixture() {
    const [owner, user] = await ethers.getSigners();
    const DaoVerse = await ethers.getContractFactory("DaoVerse");
    const daoVerse = await DaoVerse.connect(owner).deploy("ipfs://test");

    return { daoVerse, owner, user };
  }

  describe("Deployment", function () {

    it("Should set the right owner address", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      expect(await daoVerse.owner()).to.equal(owner.address);
    });

    it("Should set the correct URI", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      expect(await daoVerse.baseURI()).to.equal("ipfs://test");
    });

  });

  describe("Minting", function () {

    it("Should mint an NFT with the right ID", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      await daoVerse.connect(owner).mint("123", 245, "terra");
      const newRoom = await daoVerse.rooms(0);
      expect(newRoom.id).to.equal(0);
    });

    it("Should set the right properties when minting an NFT", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      await daoVerse.connect(owner).mint("123", 999, "test");
      expect(daoVerse).to.emit(daoVerse, "NewRoom").withArgs(owner, 0, 999, "test");
    });

  });

  describe("Renting", function () {

    it("Should set the right user with the right expiry", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      await daoVerse.connect(owner).mint("123", 999, "test");
      await daoVerse.connect(owner).setUser(0, user.address, 1818226191);
      expect(await daoVerse.userOf(0)).to.equal(user.address);
      expect(await daoVerse.userExpires(0)).to.equal(1818226191);
    });

    it("Should set Zero Address as user when the time expires", async function () {
      const { daoVerse, owner, user } = await loadFixture(deployDaoVerseTokenFixture);
      await daoVerse.connect(owner).mint("123", 999, "test");
      const expiryDate = await time.latest() + 3600;
      await daoVerse.connect(owner).setUser(0, user.address, expiryDate);
      await time.increase(3601);
      expect(await daoVerse.userOf(0)).to.equal(ethers.ZeroAddress);
    });

  });

});
