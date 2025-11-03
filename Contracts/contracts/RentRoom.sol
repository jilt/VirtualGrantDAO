// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./IERC4907.sol";
import "./RoomMarketplace.sol";

error RentRoom__PriceMustBeAboveZero();
error RentRoom__PeriodNotInRange();
error RentRoom__FeeNotInRange();
error RentRoom__NotOwner();
error RentRoom__NotListed(uint256 tokenId);
error RentRoom__AlreadyListed(uint256 tokenId);
error RentRoom__isForSale(uint256 tokenId);
error RentRoom__AlreadyRented(uint256 tokenId, address user);
error RentRoom__NoProceeds();
error RentRoom__NoFees();
error RentRoom__PriceNotMet(uint256 tokenId, uint256 totalPrice);

contract RentRoom is ReentrancyGuard, Ownable {
    address public roomTokenContractAddress;
    address public RoomMarketplaceContractAddress;
    IERC20 public immutable musdToken;

    uint256 minimumPeriod = 15;
    uint256 maximumPeriod = 365;
    uint8 private _rentingFeePercentage = 5;
    uint256 private totalFees = 0;

    struct Listing{
        address owner;
        address user;
        uint256 pricePerDay;
        uint64 periodInDays;
    }

    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) proceeds;

    event NewRoomListed(address owner, address user, uint256 tokenId, uint256 pricePerDay, uint256 periodInDays);
    event ListingCanceled(address owner, uint256 tokenId);
    event ListingUpdated(address owner, uint256 tokenId, uint256 newPricePerDay);
    event RoomRented(address renter, uint256 tokenId, uint256 totalPrice);
    event NewFee(uint256 newFeePercentage);

    constructor(address _roomTokenContractAddress) {
        roomTokenContractAddress = _roomTokenContractAddress;
        musdToken = IERC20(0x637e22A1EBbca50EA2d34027c238317fD10003eB);
    }

    modifier isOwner(uint256 _tokenId, address _spender) {
        IERC721 nft = IERC721(roomTokenContractAddress);
        address owner = nft.ownerOf(_tokenId);
        if (_spender != owner) {
            revert RentRoom__NotOwner();
        }
        _;
    }

    modifier isListed(uint256 _tokenId) {
        Listing memory listing = listings[_tokenId];
        if (listing.pricePerDay <= 0) {
            revert RentRoom__NotListed(_tokenId);
        }
        _;
    }

    modifier notListed(uint256 _tokenId) {
        Listing memory listing = listings[_tokenId];
        if (listing.pricePerDay > 0) {
            revert RentRoom__AlreadyListed(_tokenId);
        }
        _;
    }

    modifier isNotForSale(uint256 _tokenId) {
        if (RoomMarketplace(RoomMarketplaceContractAddress).getListing(_tokenId).seller != address(0)) {
            revert RentRoom__isForSale(_tokenId);
        }
        _;
    }

    modifier isNotRented(uint256 _tokenId) {
        if(IERC4907(roomTokenContractAddress).userOf(_tokenId) != address(0)) {
            revert RentRoom__AlreadyRented(_tokenId, IERC4907(roomTokenContractAddress).userOf(_tokenId));
        }
        _;
    }

    function listItem(uint256 _tokenId, uint64 _periodInDays, uint256 _pricePerDay)
        external
        isOwner(_tokenId, msg.sender)
        notListed(_tokenId)
        isNotForSale(_tokenId)
        isNotRented(_tokenId)
        nonReentrant
    {  
        if(_pricePerDay <= 0) {
            revert RentRoom__PriceMustBeAboveZero();
        }
        if(_periodInDays < minimumPeriod || _periodInDays > maximumPeriod) {
            revert RentRoom__PeriodNotInRange();
        }

        listings[_tokenId] = Listing(
            msg.sender,
            address(0),
            _pricePerDay,
            _periodInDays
        );

        emit NewRoomListed(
            IERC721(roomTokenContractAddress).ownerOf(_tokenId),
            IERC4907(roomTokenContractAddress).userOf(_tokenId),
            _tokenId,
            _pricePerDay,
            _periodInDays
        );

    }

    function cancelListing(uint256 _tokenId) 
        external 
        isOwner(_tokenId, msg.sender)
        isListed(_tokenId)
    {
        delete(listings[_tokenId]);
        emit ListingCanceled(msg.sender, _tokenId);
    }

    function updateListingPricePerDay(uint256 _tokenId, uint256 _newPricePerDay) 
        external 
        isOwner(_tokenId, msg.sender)
        isListed(_tokenId)
    {
        if(_newPricePerDay == 0){
            revert RentRoom__PriceMustBeAboveZero();
        }
        listings[_tokenId].pricePerDay = _newPricePerDay;
        emit ListingUpdated(msg.sender, _tokenId, _newPricePerDay);
    }

    function rentNFT(uint256 _tokenId, uint64 _periodInDays) 
        external
        isListed(_tokenId)
        isNotRented(_tokenId)
        isNotForSale(_tokenId)
        nonReentrant()
    {
        Listing memory roomNft = listings[_tokenId];
        uint256 totalPrice = roomNft.pricePerDay * _periodInDays;

        if(_periodInDays > roomNft.periodInDays || _periodInDays < minimumPeriod) {
            revert RentRoom__PeriodNotInRange();
        }

        // Pull MUSD from renter to this contract
        require(musdToken.transferFrom(msg.sender, address(this), totalPrice), "MUSD transfer failed");

        uint64 period = daysToUnix(_periodInDays);
        uint256 fee = (totalPrice * _rentingFeePercentage) / 100;
        totalFees += fee;
        proceeds[roomNft.owner] += (totalPrice - fee);
        delete(listings[_tokenId]);
        IERC4907(roomTokenContractAddress).setUser(_tokenId, msg.sender, period);
        emit RoomRented(msg.sender, _tokenId, roomNft.pricePerDay * _periodInDays);
    }

    function withdrawProceeds() external {
        uint256 _proceeds = proceeds[msg.sender];
        if(_proceeds <= 0) {
            revert RentRoom__NoProceeds();
        }
        proceeds[msg.sender] = 0;
        require(musdToken.transfer(msg.sender, _proceeds), "Withdrawal failed");
    }

    function withdrawFees() external onlyOwner {
        uint256 _totalFees = totalFees;
        if(_totalFees <= 0) {
            revert RentRoom__NoFees();
        }
        totalFees = 0;
        bool success = musdToken.transfer(owner(), _totalFees);
        require(success, "Fee withdrawal failed");
    }

    function daysToUnix(uint64 _periodInDays) 
        internal
        view
        returns(uint64 unixDate)
    {
        return uint64(block.timestamp + (_periodInDays * 1 days));
    }

    function getListing(uint256 _tokenId) 
        external 
        view 
        returns(Listing memory) 
    {
        return listings[_tokenId];
    }

    function getProceeds(address _seller) 
        external 
        view 
        returns(uint256)
    {
        return proceeds[_seller];
    }

    function getFeePercentage() external view returns(uint256) {
        return _rentingFeePercentage;
    }
    
    function getMarketplaceAddress() public view returns (address) {
        return RoomMarketplaceContractAddress;
    }

    function setFeePercentage(uint8 _newFeePercentage) external onlyOwner {
        if(_newFeePercentage < 0 || _newFeePercentage > 100){
            revert RentRoom__FeeNotInRange();
        }
        _rentingFeePercentage = _newFeePercentage;
        emit NewFee(_rentingFeePercentage);
    }

    function setMarketplaceAddress(address _RoomMarketplaceContractAddress) external onlyOwner {
        RoomMarketplaceContractAddress = _RoomMarketplaceContractAddress;
    }

    function isRentableRoom(address _nftAddress) public view returns (bool) {
        bool _isRentable = false;
        bool _isNFT = false;
        try IERC165(_nftAddress).supportsInterface(type(IERC4907).interfaceId) returns (bool rentable) {
            _isRentable = rentable;
        } catch {
            return false;
        }
        try IERC165(_nftAddress).supportsInterface(type(IERC721).interfaceId) returns (bool nft) {
            _isNFT = nft;
        } catch {
            return false;
        }
        return _isRentable && _isNFT;
    }
    
}