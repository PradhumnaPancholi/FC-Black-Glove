import { ethers } from "hardhat";

async function main() {


  const BlackGlove = await ethers.getContractFactory("BlackGlove");
  const blackglove = await Lock.deploy();

  await blackglove.deployed();

  console.log(`BlackGlove deployed to ${blackglove.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
