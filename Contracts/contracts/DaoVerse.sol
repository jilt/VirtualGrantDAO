// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC4907.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DaoVerse is ERC4907, Ownable{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    string public baseURI;

    struct Room{
        uint256 id;
        uint32 area; //in square meters
        string name;
    }

    Room[] public rooms;

    mapping(uint256 => address) public roomToOwner;

    event NewRoom(address indexed owner, uint256 indexed id, uint32 area, string name);
    event DestroyedRoom(address owner, uint256 id);

    constructor(string memory _initBaseURI) ERC4907("DaoVerse", "FM") {
        setBaseURI(_initBaseURI);
    }

    function mint(string memory _tokenURI, uint32 _area, string memory _name) public onlyOwner {
        uint256 newTokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        Room memory newRoom = Room(newTokenId, _area, _name);
        rooms.push(newRoom);
        roomToOwner[newTokenId] = msg.sender;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        emit NewRoom(msg.sender, newTokenId, _area, _name);
    }

    function burn(uint256 _tokenId) public onlyOwner {
        _burn(_tokenId);
        emit DestroyedRoom(msg.sender, _tokenId);
    }

    // Setters
    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

}