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
  //--------------------------------------------------------------------------------------------------//
  // Setup/Deployment//
  before(async function(){
    // get accounts (10) for test suit
    let accounts:any = await ethers.getSigners()
    // take first five addresses for whitelist//
    whitelisted = accounts.slice(0, 5)
    // the next five addresses for non-whitelisted accounts
    nonWhitelisted = accounts.slice(5, 10)
    // hash whitelist addresses for creating leaf nodes 
    console.log("Creating MerkleTree for whitelist")
    const leaves = accounts.map(function(account:any){
      return keccak256(account.address)
    })
    //create MerkleTree for whitelisted addresses 
    merkletree = new MerkleTree(leaves, keccak256, {sortPairs: true})
    const rootHash = merkletree.getHexRoot()
    //deploy the contract with root hash for whitelisted MerkleTree
    console.log("Deploying BlackGlove with root hash for whitelist merkletree")
    const BlackGlove = await ethers.getContractFactory("BlackGlove")
    blackglove = await BlackGlove.deploy(rootHash, "dummy-uri")
  })
  
  it("A whitelisted address can mint the BlackGlove", async () => {
    const merkleproof = await merkletree.getHexProof(whitelisted[0].address)
    await blackglove.connect(whitelisted[0]).mint(merkleproof)
  })
})

