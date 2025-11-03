// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC4907.sol";
import "./RentRoom.sol";

error RoomMarketplace__PriceMustBeAboveZero();
error RoomMarketplace__NotApprovedForMarketplace();
error RoomMarketplace__NotOwner();
error RoomMarketplace__AlreadyListed(uint256 tokenId);
error RoomMarketplace__isForRent(uint256 tokenId);
error RoomMarketplace__isRented(uint256 tokenId, address user);
error RoomMarketplace__NotListed(uint256 tokenId);
error RoomMarketplace__PriceNotMet(uint256 tokenId, uint256 price);
error RoomMarketplace__NoProceeds();
error RoomMarketplace__NoFees();
error RoomMarketplace__FeeNotInRange();

contract RoomMarketplace is ReentrancyGuard, Ownable {
    address public roomTokenContractAddress;
    address public RentRoomContractAddress;
    IERC20 public immutable musdToken;

    uint8 private _listingFeePercentage = 5;
    uint256 private totalFees = 0;

    struct Listing {
        uint256 price;
        address seller;
    }

    mapping(uint256 => Listing) private listings;
    mapping(address => uint256) proceeds;

    event NewRoomListed(address indexed seller, uint256 indexed tokenId, uint256 price);
    event ListingUpdated(address indexed seller, uint256 indexed tokenId, uint256 newPrice);
    event ListingCanceled(address indexed seller, uint256 indexed tokenId);
    event RoomBought(address indexed buyer, uint256 indexed tokenId, uint256 price);
    event NewFee(uint256 newFeePercentage);
   
    constructor(address _roomTokenContractAddress, address _RentRoomContractAddress) {
        roomTokenContractAddress = _roomTokenContractAddress;
        RentRoomContractAddress = _RentRoomContractAddress;
        musdToken = IERC20(0x637e22A1EBbca50EA2d34027c238317fD10003eB);
    }

    // Function modifiers
   modifier notListed(
        uint256 tokenId,
        address owner
   ) {
        Listing memory listing = listings[tokenId];
        if (listing.price > 0) {
            revert RoomMarketplace__AlreadyListed(tokenId);
        }
        _;
    }

    modifier isOwner(
        uint256 _tokenId,
        address _spender
    ) {
        IERC721 Room = IERC721(roomTokenContractAddress);
        address owner = Room.ownerOf(_tokenId);
        if (_spender != owner) {
            revert RoomMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(uint256 _tokenId) {
        Listing memory listing = listings[_tokenId];
        if (listing.price <= 0) {
            revert RoomMarketplace__NotListed(_tokenId);
        }
        _;
    }

    modifier isNotForRent(uint256 _tokenId) {
        if (RentRoom(RentRoomContractAddress).getListing(_tokenId).owner != address(0)) {
            revert RoomMarketplace__isForRent(_tokenId);
        }
        _;
    }

    modifier isNotRented(uint256 _tokenId) {
        if (IERC4907(roomTokenContractAddress).userOf(_tokenId) != address(0)) {
            revert RoomMarketplace__isRented(_tokenId, IERC4907(roomTokenContractAddress).userOf(_tokenId));
        }
        _;
    }

    function listItem(uint256 _tokenId, uint256 _price) 
        external 
        notListed(_tokenId, msg.sender)
        isOwner(_tokenId, msg.sender)
        isNotForRent(_tokenId)
        isNotRented(_tokenId)
    {
        if(_price <= 0) {
            revert RoomMarketplace__PriceMustBeAboveZero();
        }
        IERC721 roomNft = IERC721(roomTokenContractAddress);
        if(roomNft.getApproved(_tokenId) != address(this)) {
            revert RoomMarketplace__NotApprovedForMarketplace();
        }

        listings[_tokenId] = Listing(_price, msg.sender);
        emit NewRoomListed(msg.sender, _tokenId, _price);
    }

    function cancelListing(uint256 _tokenId) 
        external 
        isOwner(_tokenId, msg.sender)
        isListed(_tokenId)
    {
        delete(listings[_tokenId]);
        emit ListingCanceled(msg.sender, _tokenId);
    }

    function buyItem(uint256 _tokenId) 
        external
        isListed(_tokenId)
        isNotForRent(_tokenId)
        isNotRented(_tokenId)
        nonReentrant()
    {
        Listing memory listedItem = listings[_tokenId];
        uint256 price = listedItem.price;

        // Pull MUSD from buyer to this contract
        require(musdToken.transferFrom(msg.sender, address(this), price), "MUSD transfer failed");

        uint256 fee = (price * _listingFeePercentage) / 100;
        if (fee > 0) {
            totalFees += fee;
        }
        proceeds[listedItem.seller] += (price - fee);
        delete(listings[_tokenId]);
        IERC721(roomTokenContractAddress).safeTransferFrom(listedItem.seller, msg.sender, _tokenId);
        emit RoomBought(msg.sender, _tokenId, listedItem.price);
    }

    function updateListing(uint256 _tokenId, uint256 _newPrice)
        external
        isListed(_tokenId)
        isOwner(_tokenId, msg.sender)
        nonReentrant
    {
        if(_newPrice == 0){
            revert RoomMarketplace__PriceMustBeAboveZero();
        }
        listings[_tokenId].price = _newPrice;
        emit ListingUpdated(msg.sender, _tokenId, _newPrice);
    }

    function withdrawProceeds() external {
        uint256 _proceeds = proceeds[msg.sender];
        if(_proceeds <= 0) {
            revert RoomMarketplace__NoProceeds();
        }
        proceeds[msg.sender] = 0;
        require(musdToken.transfer(msg.sender, _proceeds), "Withdrawal failed");
    }

    function withdrawFees() external onlyOwner {
        uint256 _totalFees = totalFees;
        if(_totalFees <= 0) {
            revert RoomMarketplace__NoFees();
        }
        totalFees = 0;
        bool success = musdToken.transfer(owner(), _totalFees);
        require(success, "Fee withdrawal failed");
    }

    function getListing(uint256 _tokenId) 
        external
        view
        returns(Listing memory)
    {
        return listings[_tokenId];
    }

    function getProceeds(address _seller) external view returns(uint256) {
        return proceeds[_seller];
    }

    function getFeePercentage() external view returns(uint256) {
        return _listingFeePercentage;
    }

    function setFeePercentage(uint8 _newFeePercentage) external onlyOwner() {
        if(_newFeePercentage < 0 || _newFeePercentage > 100){
            revert RoomMarketplace__FeeNotInRange();
        }
        _listingFeePercentage = _newFeePercentage;
        emit NewFee(_listingFeePercentage);
    }

}