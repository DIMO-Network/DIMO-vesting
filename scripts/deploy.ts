import { ethers } from "hardhat";

import { DIMOVesting } from "../typechain";

const DIMO_TOKEN = "";

async function main() {
  const dimoVestingFactory = await ethers.getContractFactory("DIMOVesting");

  const dimoVesting = (await dimoVestingFactory.deploy(
    DIMO_TOKEN
  )) as DIMOVesting;
  await dimoVesting.deployed();

  console.log("DIMOVesting deployed to:", dimoVesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
