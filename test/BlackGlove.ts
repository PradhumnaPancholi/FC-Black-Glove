import {expect} from "chai"
import {ethers} from "hardhat"
import {Contract} from "ethers"
import {MerkleTree} from "merkletreejs"
import keccak256 from "keccak256"

describe("BlackGlove Public Mint Tests", function() {

  //Global variables //
  //values will be set inside "before" during setup//
  let blackglove: Contract
  let mockMatic: Contract
  let merkletree: any  
  let whitelisted: any 
  let nonWhitelisted: any
  //function ro process addresses for leaf nodes //
  const padBuffer = (addr: any) => {
    return Buffer.from(addr.substr(2).padStart(32*2, 0), 'hex')
  }
  //--------------------------------------------------------------------------------------------------//
  // Setup/Deployment//
  before(async function(){

    //--------------------------------------//
    //----------Mock MATIC------------------//
    //--------------------------------------//
    console.log("Deploying Mock Matic ERC-20 token")
    const MockMatic = await ethers.getContractFactory("MockMatic")
    mockMatic = await MockMatic.deploy()
    console.log("Mock MATIC deployed at: ", mockMatic.address)
    // get accounts (10) for test suit
    let accounts:any = await ethers.getSigners()
    //distribute mock token to test accounts //
    console.log("Sending 2000 Mock Matic to each test account.....")
    accounts.forEach(async function(account:any) {
        mockMatic.transfer(account.address, 2000)
    })
    //-------------------------------------//
    // ---------Whitelist-----------------//
    // -----------------------------------//
    // take first five addresses for whitelist//
    whitelisted = accounts.slice(0, 5)
    // the next five addresses for non-whitelisted accounts
    nonWhitelisted = accounts.slice(6, 10)
    // hash whitelist addresses for creating leaf nodes 
    console.log("Creating MerkleTree for whitelist")
    const leaves = whitelisted.map(function(account:any){
      return padBuffer(account.address)
    })
    //create MerkleTree for whitelisted addresses 
    merkletree = new MerkleTree(leaves, keccak256, {sortPairs: true})
    const rootHash = await merkletree.getHexRoot()
    //-----------------------------------------//
    //---------BlackGlove----------------------//
    //-----------------------------------------//
    //deploy the contract with root hash for whitelisted MerkleTree
    console.log("Deploying BlackGlove with root hash :", rootHash)
    const BlackGlove = await ethers.getContractFactory("BlackGlove")
    blackglove = await BlackGlove.deploy(rootHash, mockMatic.address)
  })
  it("A whitelisted address can mint the BlackGlove with a discount within the discount period", async () => { 
    const merkleproof = await merkletree.getHexProof(padBuffer(whitelisted[0].address))
    console.log("merkle proof", merkleproof)
    await mockMatic.approve(blackglove.address, 600);
    // ToDo: Need to create and expect and test for "Transfer" event "
    await expect (blackglove.connect(whitelisted[0]).mint(merkleproof)).to.emit(blackglove, "Transfer");
  })
  it("A non-whitelisted address can not mint the BlackGlove with a discount", async () => {
    const merkleproof = await merkletree.getHexProof(padBuffer(nonWhitelisted[0].address))
    await mockMatic.connect(nonWhitelisted[0]).approve(blackglove.address, 600);
    await expect(blackglove.connect(nonWhitelisted[0]).mint(merkleproof)).to.be.revertedWith("ERC20: insufficient allowance");
  })
  it("A non-whitelisted address can mint the BlackGlove with a regular price", async() => {
    const merkleproof = await merkletree.getHexProof(padBuffer(nonWhitelisted[0].address))
    await mockMatic.connect(nonWhitelisted[0]).approve(blackglove.address, 650);
    await expect(blackglove.connect(nonWhitelisted[0]).mint(merkleproof)).to.emit(blackglove, "Transfer");
  })
  it("A whitelisted address can not mint again", async() => {
    const merkleproof = await merkletree.getHexProof(padBuffer(whitelisted[0].address))
    await mockMatic.connect(whitelisted[0]).approve(blackglove.address, 600)
    await expect(blackglove.connect(whitelisted[0]).mint(merkleproof)).to.be.revertedWith("A wallet can not mint more than 1 Black Glove")
  })
  it("Minted NFT have the correct URI", async () => {
    expect(await blackglove.tokenURI(1)).to.be.equal(await blackglove.TOKEN_URI())
  })
  //non whitelisted address can not mint at discount price with a valid proof of whitelisted address
  // whitelisted can not mint again//
  // non-whitelisted can not mint again//
  // image uri//
  // name//
  // symbol//
  // transfer//
  // token id increaments//
  // can not mint more than 100//
})

