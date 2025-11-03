import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, Signer } from 'ethers';
import { anyValue } from"@nomicfoundation/hardhat-chai-matchers/withArgs";
import { BASE_URI, MIN_DELAY, NEW_PERCENTAGE_FEE, PROPOSAL_DESCRIPTION, VOTING_DELAY, VOTING_PERIOD } from "../helper-hardhat-config";
import { moveBlocks } from "../utils/move-blocks";
import { moveTime } from "../utils/move-time";

describe("DaoVerseDAO", function() {
  async function deployAllContractsFixture() {
    const [owner, user, account3] = await ethers.getSigners();

    const DaoVerse = await ethers.getContractFactory("DaoVerse");
    const daoVerse = await DaoVerse.connect(owner).deploy(BASE_URI);

    const TimeLock = await ethers.getContractFactory("TimeLock");
    const timeLock = await TimeLock.connect(owner).deploy(MIN_DELAY, [], [ethers.ZeroAddress], owner.address);

    const DaoVerseGovernor = await ethers.getContractFactory("DaoVerseGovernor");
    const daoVerseGovernor = await DaoVerseGovernor.connect(owner).deploy(daoVerse.getAddress(), timeLock.getAddress());

    console.log("Setting up roles...");
    const proposerRole = ethers.id("PROPOSER_ROLE");
    const executorRole = ethers.id("EXECUTOR_ROLE")
    const adminRole = ethers.id("TIMELOCK_ADMIN_ROLE");

    const proposerTx = await timeLock.getFunction("grantRole")(proposerRole, await daoVerseGovernor.getAddress());
    await proposerTx.wait(1);

    const executorTx = await timeLock.getFunction("grantRole")(executorRole, ethers.ZeroAddress);
    await executorTx.wait(1);

    const revokeTx = await timeLock.getFunction("revokeRole")(adminRole, owner.address);
    await revokeTx.wait(1);

    const RentRoom = await ethers.getContractFactory("RentRoom");
    const rentRoom = await RentRoom.connect(owner).deploy(await daoVerse.getAddress());

    const RoomMarketplace = await ethers.getContractFactory("RoomMarketplace");
    const roomMarketplace = await RoomMarketplace.connect(owner).deploy(await daoVerse.getAddress(), await rentRoom.getAddress());
    
    await rentRoom.getFunction("setMarketplaceAddress")(await roomMarketplace.getAddress());

    // Ownership is still to owner, needs to be transfered to timeLock contract

    return { daoVerse, timeLock, daoVerseGovernor, rentRoom, roomMarketplace, owner, user, account3 };
  }

  async function mintAndDelegate(daoVerse: any, owner: Signer, user: Signer, account3: Signer) {
    await daoVerse.connect(owner).getFunction("mint")("/test1", 1234, "test Room #1");
    await daoVerse.connect(owner).getFunction("delegate")(await owner.getAddress());

    await daoVerse.connect(owner).getFunction("mint")("/test2", 2345, "test Room #2");
    await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 1);
    await daoVerse.connect(user).getFunction("delegate")(await user.getAddress());

    await daoVerse.connect(owner).getFunction("mint")("/test3", 3456, "test Room #3");
    await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await account3.getAddress(), 0);
    await daoVerse.connect(account3).getFunction("delegate")(await account3.getAddress());
  }

  async function proposalFromOwner(daoVerseGovernor: any, rentRoom: any, owner: Signer, proposalDescription: string) {
    const encodedFunctionCall = rentRoom.interface.encodeFunctionData(
      "setFeePercentage",
      [10]
    );
    const proposeTx = await daoVerseGovernor.connect(owner).getFunction("propose")(
      [await rentRoom.getAddress()],
      [0],
      [encodedFunctionCall],
      proposalDescription
    );
    const proposeReceipt = await proposeTx.wait(1);
    const proposalId = proposeReceipt.logs[0].args.proposalId;
    return { proposalId, encodedFunctionCall };
  }

  async function transferOwnershipToTimelock(daoVerse: any, rentRoom: any, timeLock: any, owner: Signer) {
    // Giving ownership to timeLock
    await daoVerse.connect(owner).transferOwnership(await timeLock.getAddress());
    await rentRoom.connect(owner).transferOwnership(await timeLock.getAddress());
  }
  
  let daoVerse: any, timeLock: any, daoVerseGovernor: any, rentRoom: any, owner: Signer, user: Signer, account3: Signer;

  beforeEach(async () => {
    const fixture = await loadFixture(deployAllContractsFixture);
    daoVerse = fixture.daoVerse;
    timeLock = fixture.timeLock;
    daoVerseGovernor = fixture.daoVerseGovernor;
    rentRoom = fixture.rentRoom;
    owner = fixture.owner;
    user = fixture.user;
    account3 = fixture.account3;
  });

  describe("Proposing", async function () {
    it("Proposal should be pending before minimum delay", async function () {
      const encodedFunctionCall = rentRoom.interface.encodeFunctionData(
        "setFeePercentage",
        [10]
      );
      const proposeTx = await daoVerseGovernor.connect(owner).getFunction("propose")(
        [await rentRoom.getAddress()],
        [0],
        [encodedFunctionCall],
        "Changing fee from 5% to 10%"
      );
      const proposeReceipt = await proposeTx.wait(1);
      const proposalId = proposeReceipt.logs[0].args.proposalId;
      expect(await daoVerseGovernor.getFunction("state")(proposalId)).to.equal(0)
    })

    it("Proposal should be active after minimum delay", async function () {
      const encodedFunctionCall = rentRoom.interface.encodeFunctionData(
        "setFeePercentage",
        [10]
      );
      const proposeTx = await daoVerseGovernor.connect(owner).getFunction("propose")(
        [await rentRoom.getAddress()],
        [0],
        [encodedFunctionCall],
        "Changing fee from 5% to 10%"
      );
      const proposeReceipt = await proposeTx.wait(1);
      const proposalId = proposeReceipt.logs[0].args.proposalId;
      await moveBlocks(VOTING_DELAY + 1);
      expect(await daoVerseGovernor.getFunction("state")(proposalId)).to.equal(1)
    })
    
  })

  describe("Voting", function () {

    it("Should NOT count votes if a user has NOT a Room NFT", async function() {
      await daoVerse.connect(owner).getFunction("mint")("/test2", 2345, "test Room #2");

      const {proposalId, encodedFunctionCall} = await proposalFromOwner(daoVerseGovernor, rentRoom, owner, PROPOSAL_DESCRIPTION);
      await moveBlocks(VOTING_DELAY + 1);

      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      const expectedValues = [BigInt(0), BigInt(0), BigInt(0)];
      expect(await daoVerseGovernor.getFunction("proposalVotes")(proposalId)).to.deep.equal(expectedValues);

    });

    it("Should count votes if a user has a Room NFT and has delegated his vote", async function() {
      await daoVerse.connect(owner).getFunction("mint")("/test2", 2345, "test Room #2");
      await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 0);
      await daoVerse.connect(user).getFunction("delegate")(await user.getAddress());

      const {proposalId, encodedFunctionCall} = await proposalFromOwner(daoVerseGovernor, rentRoom, owner, PROPOSAL_DESCRIPTION);
      await moveBlocks(VOTING_DELAY + 1);

      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      const expectedValues = [BigInt(0), BigInt(1), BigInt(0)];
      expect(await daoVerseGovernor.getFunction("proposalVotes")(proposalId)).to.deep.equal(expectedValues);

    });

    it("Should NOT count votes if a user has a Room NFT and has NOT delegated his vote", async function() {
      await daoVerse.connect(owner).getFunction("mint")("/test2", 2345, "test Room #2");
      await daoVerse.connect(owner).getFunction("safeTransferFrom")(await owner.getAddress(), await user.getAddress(), 0);

      const {proposalId, encodedFunctionCall} = await proposalFromOwner(daoVerseGovernor, rentRoom, owner, PROPOSAL_DESCRIPTION);
      await moveBlocks(VOTING_DELAY + 1);

      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      const expectedValues = [BigInt(0), BigInt(0), BigInt(0)];
      expect(await daoVerseGovernor.getFunction("proposalVotes")(proposalId)).to.deep.equal(expectedValues);

    });

    it("Should pass proposal if enough votes are casted", async function () {
      // Minting and delegating nfts
      await mintAndDelegate(daoVerse, owner, user, account3);

      // Proposing
      const {proposalId, encodedFunctionCall} = await proposalFromOwner(daoVerseGovernor, rentRoom, owner, PROPOSAL_DESCRIPTION);
      await moveBlocks(VOTING_DELAY + 1);

      // Vote
      await daoVerseGovernor.connect(owner).getFunction("castVoteWithReason")(proposalId, 1, "We should collect more money for the community!");
      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      await daoVerseGovernor.connect(account3).getFunction("castVoteWithReason")(proposalId, 0, "No we should not!");

      await moveBlocks(VOTING_PERIOD + 1);

      const proposalState = await daoVerseGovernor.getFunction("state")(proposalId);

      // Proposal should pass
      expect(proposalState).to.equal(4);
    });
    
  })

  describe("Executing", async function () {
    it("Should execute a proposal once it has passed", async function() {
      // Minting and delegating nfts
      await mintAndDelegate(daoVerse, owner, user, account3);

      // Transfer ownership to Timelock
      // Should be done sooner but this is for ease of testing
      await transferOwnershipToTimelock(daoVerse, rentRoom, timeLock, owner);

      // Proposing
      const {proposalId, encodedFunctionCall} = await proposalFromOwner(daoVerseGovernor, rentRoom, owner, PROPOSAL_DESCRIPTION);
      await moveBlocks(VOTING_DELAY + 1);

      // Vote
      await daoVerseGovernor.connect(owner).getFunction("castVoteWithReason")(proposalId, 1, "We should collect more money for the community!");
      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      await daoVerseGovernor.connect(account3).getFunction("castVoteWithReason")(proposalId, 0, "No we should not!");

      await moveBlocks(VOTING_PERIOD + 1);

      // Queueing      
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(PROPOSAL_DESCRIPTION));

      const queueTx = await daoVerseGovernor.getFunction("queue")(
        [await rentRoom.getAddress()],
        [0],
        [encodedFunctionCall],
        descriptionHash,
      );
      await queueTx.wait(1);

      // Waiting minimum delay for execution
      await moveBlocks(MIN_DELAY);

      // Executing
      const executeTx = await daoVerseGovernor.getFunction("execute")(
        [await rentRoom.getAddress()],
        [0],
        [encodedFunctionCall],
        descriptionHash
      );
      await executeTx.wait(1);

      expect(await rentRoom.getFunction("getFeePercentage")()).to.equal(NEW_PERCENTAGE_FEE);
    });

    it("Should be able to mint new Room nfts after submitting proposal and community vote", async function() {
      // Minting and delegating nfts
      await mintAndDelegate(daoVerse, owner, user, account3);

      // Transfer ownership to Timelock
      // Should be done sooner but this is for ease of testing
      await transferOwnershipToTimelock(daoVerse, rentRoom, timeLock, owner);

      // Proposing minting a new Room
      const encodedFunctionCall = daoVerse.interface.encodeFunctionData(
        "mint",
        ["testTimelockMint", 10, "TimelockMint"]
      );
      const proposeTx = await daoVerseGovernor.connect(owner).getFunction("propose")(
        [await daoVerse.getAddress()],
        [0],
        [encodedFunctionCall],
        "Minting a new Room from timelock"
      );
      const proposeReceipt = await proposeTx.wait(1);
      const proposalId = proposeReceipt.logs[0].args.proposalId;
      await moveBlocks(VOTING_DELAY + 1);

      // Vote
      await daoVerseGovernor.connect(owner).getFunction("castVoteWithReason")(proposalId, 1, "We should have one more!");
      await daoVerseGovernor.connect(user).getFunction("castVoteWithReason")(proposalId, 1, "I think we should do this!");
      await daoVerseGovernor.connect(account3).getFunction("castVoteWithReason")(proposalId, 2, "I don't care");

      await moveBlocks(VOTING_PERIOD + 1);

      // Queueing      
      const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes("Minting a new Room from timelock"));

      const queueTx = await daoVerseGovernor.getFunction("queue")(
        [await daoVerse.getAddress()],
        [0],
        [encodedFunctionCall],
        descriptionHash,
      );
      await queueTx.wait(1);

      // Waiting minimum delay for execution
      await moveBlocks(MIN_DELAY);

      // Executing
      const executeTx = await daoVerseGovernor.getFunction("execute")(
        [await daoVerse.getAddress()],
        [0],
        [encodedFunctionCall],
        descriptionHash
      );
      await executeTx.wait(1);

      expect(await daoVerse.getFunction("rooms")(3)).to.deep.equal([BigInt(3), BigInt(10), "TimelockMint"]);
    });
  })

})