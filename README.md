# VirtualGrant
Project for the mezo hackathon on encode.
This is a governance virtual shared space created to serve the needs for a deep knowledge of each proposal's background and the understanding of a virtual decentralized ecosystem.

Spaces are organized to allow meetings, chat audio and video streaming (TO-DO) using a buying/renting mechanic (erc4907) built to maintain the governance team's effort using a fee and to filter proposals based on contribution and team to team trust.

Each room is an ERC4907 NFT token allowing the owner /renter to submit a proposal for the DAO to vote.
The room's marketplace contract allows rooms to be bought and rented using MUSD and each team that owns or rents a room is allowed to customize it using javascript 3D objects that allow web3 DeFi interactions, like the liquidation bot that we included in the repo along with many other interchain trading bots that we may add in the future.

This is a way for each proposing team to see their investment bring forward DeFi earnings even during the phase of discussing their proposal with the DAO governance team, allowing for a quieter and more clear communication.

## Contract deployment addresses on testnet: 
----------------------------------------------------
01 - Deploying DaoVerse Token...
Deployed DaoVerse token to address 0x9D4aae734b1721985A00616737Bc5fcf21Fa3077
Delegating to 0x0E7B7b373E7A1CbEbD6d7e4A4D570408f5948971
Delegated!
----------------------------------------------------
02 - Deploying Timelock Contract...
deploying "TimeLock" (tx: 0x011d112dd0b88520c9fc718655cf448af54cc9ca1dcde98880a9255f6c773431)...: deployed at 0xc0a95a37330e84dFBA13baFA083fa5c3A0e6a32C with 1981619 gas
Deployed TimeLock contract to address 0xc0a95a37330e84dFBA13baFA083fa5c3A0e6a32C
----------------------------------------------------
03 - Deploying Governor Contract...
deploying "DaoVerseGovernor" (tx: 0xe09e8255a30a4ee248f24a10bdb074bf98e4f16526be9334565ee57597d59ca0)...: deployed at 0x2Ab6f5670C299d6F704E7CD24c56526e5482c449 with 4193918 gas
Deployed Governor Contract to address 0x2Ab6f5670C299d6F704E7CD24c56526e5482c449
----------------------------------------------------
04 - Setting up governance roles...
Roles configured and deployer's admin role revoked.
----------------------------------------------------
05 - Deploying RentRoom & RoomMarketplace Contracts...
Deployed RentRoom to address 0x4b24FB006418DD4999eeb52aADb486575D152552
Deployed RoomMarketplace to address 0x9420467929c216d7181b2542026d4Ad353E1B216
----------------------------------------------------
Linking contracts and transferring ownership...
Set marketplace address in RentRoom contract.
Ownership of RentRoom and RoomMarketplace transferred to TimeLock.
