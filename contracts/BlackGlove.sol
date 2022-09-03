//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

///@title Fight Club's Black Glove

contract BlackGlove is ERC721URIStorage, Ownable{
    using Counters for Counters.Counter;
    using Strings for uint256;

    /// @notice To keep track of token ids
    Counters.Counter private _tokenIds;

    ///@notice For MATIC token interface
    IERC20 MATIC;

    /// @notice discounted cost for NFT in MATIC//
    uint16 public discountedPrice = 600;

    /// @notice regular cost for NFT in MATIC//
    uint16 public price = 650;

    //URI to read metadata of images to be deployed
    string constant public TOKEN_URI = "ipfs://QmWPhrAFNjS3JkyEMZSKe4zWGSjXHncUyFiJiSDWyU3qnW";

    ///@notice Maximum supply of NFTs 
    uint16 constant public MAX_SUPPLY = 1000;

    ///@notice For managing "Pause" state //
    bool public paused = false;

    //ToDo: Need to update for FC//
    address payable commissions = payable(0x3Eb231C0513eE1F07306c2919FF5F9Ee9308407F);
    

    ///@notice For root hash of the merkle tree that stores whitelist address 
    bytes32 public root;

    ///@notice List of holders//
    mapping(address => uint256) public holders;

    //ToDO : need to work on this //
    //For tracking claimed addresses from whitelist//
    mapping(address => bool) public claimed;

    uint256 public constant duration = 86400;
    uint256 public immutable end;

    constructor(
        bytes32 _root,
        address _tokenAddress
    ) ERC721 ("Fight Club Black Glove", "FCBG") {
        root = _root;
        end = block.timestamp + duration;
        // set address for MATIC token //
        MATIC = IERC20(_tokenAddress);
    }





    ///@notice A unitly function to convert address into bytes32 to verify merkle proof//
    function toBytes32(address addr) pure internal returns (bytes32) {
       return bytes32(uint256(uint160(addr))); 
    }

    ///@dev create tokens of token type `id` and assigns them to `to`
    /// `to` cannot be a zero address

    function mint(bytes32[] calldata proof) public payable {
        require(!paused, "Black Glove is paused");
        require(holders[msg.sender] == 0, "A wallet can not mint more than 1 Black Glove");
        holders[msg.sender] = 1;
        // if not, add addr to the holders list with token id//
        // the logic will be required for _safeMint too. Hence, performing it here is optimization
        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        holders[msg.sender] == id;
        //check if totalSupply is reached//
        uint256 supply = _tokenIds.current();
        require ( supply + 1 <= MAX_SUPPLY, "Max NFT Limit exceeded");
        // check if the merkle proof is valid //
        bool whitelisted = MerkleProof.verify(proof, root, toBytes32(msg.sender)) == true;
        // if the caller is a whitelisted address and under discoount duration, then set cost to 600 MATIC //
        // otherwise 650 MATIC //
        uint16 cost = whitelisted && block.timestamp < end ? discountedPrice : price; 
        require(IERC20(MATIC).transferFrom(msg.sender, address(this), cost), "MATIC transfer failed"); 
        // safemint and transfer//
        _safeMint(msg.sender, id);
        _setTokenURI(id, TOKEN_URI);

///       (bool success, ) = payable(commissions).call{value: msg.value * 10 /100}("");
 //      require (success);
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
