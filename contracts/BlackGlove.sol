//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

///@title Contract to deploy BlackGlove to OpenSea

contract BlackGlove is ERC721Enumerable, Ownable{
   using Strings for uint256;


    //URI to read metadata of images to be deployed
    string public baseURI;

    //file extension to be contained in URI
    string public baseExtension = ".json";

    //maximum supply of NFTs 
    uint256 public maxSupply = 1000;


    bool public paused = false;
    address payable commissions = payable(0x3Eb231C0513eE1F07306c2919FF5F9Ee9308407F);

    mapping(address => uint256) public addressMintedBalance;

    //For root hash of the merkle tree that stores whitelist address 
    bytes32 public root;

    //For tracking claimed addresses from whitelist//
    mapping(address => bool) public claimed;

    uint256 public constant duration = 86400;
    uint256 public immutable end;

    constructor(
        bytes32 _root,
        string memory _initBaseURI
    ) ERC721 ("Fight Club Black Glove", "FGBG") {
        root = _root;
        setBaseURI(_initBaseURI);
        end = block.timestamp + duration;
    }

    // URI which contains  created images like a PINATA CID
    function _baseURI() internal view virtual override returns(string memory) {
        return baseURI;
    }

    function isValid(bytes32[] memory proof, bytes32 leaf) public view returns(bool) {
        return MerkleProof.verify(proof, root , leaf);
    }

    ///@dev create tokens of token type `id` and assigns them to `to`
    /// `to` cannot be a zero address

    function mint(bytes32[] memory proof) public payable {
       require(!paused, "Black Glove is paused");
        uint256 supply = totalSupply();
       require ( supply + 1 <= maxSupply, "Max NFT Limit exceeded");
       bool whitelistedMint = isValid(proof, bytes32(uint256(uint160(msg.sender)) << 96));
       require( whitelistedMint || block.timestamp >= end, "Invalid mint");
        uint cost = whitelistedMint ? 600 ether : 650 ether;

       if (msg.sender != owner()) {
            uint256 ownerMintedCount = addressMintedBalance[msg.sender];
            require(ownerMintedCount == 0, "Already minted");
            addressMintedBalance[msg.sender]++;
            require(msg.value >= cost, "Insufficient funds");
       }

        _safeMint(msg.sender, supply++);

       (bool success, ) = payable(commissions).call{value: msg.value * 10 /100}("");
       require (success);
    }
    

    //Access Control Function 
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(
            _exists(tokenId), "ERC721metadata: URI query for nonexistent token"
        ); 
        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI))
        : "";

    }

    //Only Owner Functions

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function pause() public onlyOwner {
        paused = true;
    }

    function unpause() public onlyOwner {
        paused =false;
    }

    function withdraw() public payable onlyOwner{
        //This will pay the developer 3% of the initial sale
        (bool hs, ) = payable(0x3Eb231C0513eE1F07306c2919FF5F9Ee9308407F).call {
            value: (address(this).balance * 97)/100}("");
        require(hs);

        //This will payout the owner 97% of the contract balance
        //Do not remove this otherwise you will not be able to withdraw the funds.
        (bool os, ) = payable(owner()).call{value: address(this).balance} ("");
        require(os);
    }
}
