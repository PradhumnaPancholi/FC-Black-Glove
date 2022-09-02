import {expect} from "chai"
import {ethers} from "hardhat"
import {Contract} from "ethers"
import {MerkleTree} from "merkletreejs"
import keccak256 from "keccak256"

describe("BlackGlove Public Mint Tests", function() {

  //Global variables //
  //values will be set inside "before" during setup//
  let blackglove: Contract
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
    const mockMatic = await MockMatic.deploy()
    console.log("Mock MATIC deployed at: ", mockMatic.address)
    // get accounts (10) for test suit
    let accounts:any = await ethers.getSigners()
    //distribute mock token to test accounts //
    console.log("Sending 2000 Mock Matic to each test account.....")
    accounts.forEach(async function(account:any) {
        mockMatic.transfer(account.address, 2000)
        console.log(await mockMatic.balanceOf(account.address))
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
    blackglove = await BlackGlove.deploy(rootHash, "dummy-uri", mockMatic.address)
  })
 //ToDo: Need to refactor as whitelist can mint at discounted price under dealine// 
  it("A whitelisted address can mint the BlackGlove", async () => {
    
    expect( await blackglove.totalSupply()).to.equal(0);
    const merkleproof = await merkletree.getHexProof(padBuffer(whitelisted[0].address))
    // ToDo: Need to create and expect and test for "Transfer" event "
    await expect (blackglove.connect(whitelisted[0]).mint(merkleproof)).to.emit(blackglove, "Transfer");
    expect( await blackglove.totalSupply()).to.equal(1);
  })

  it("A non-whitelisted address can not mint the BlackGlove", async () => {
    const merkleproof = await merkletree.getHexProof(padBuffer(nonWhitelisted[0].address))
    await expect(blackglove.connect(nonWhitelisted[0]).mint(merkleproof)).to.be.revertedWith("Invalid merkle proof")
  })
})

