import { ethers } from "hardhat";

import { DIMOVesting } from "../typechain";

const DIMO_POLYGON_ADDRESS = "0xE261D618a959aFfFd53168Cd07D12E37B26761db";

async function main() {
  const dimoVestingFactory = await ethers.getContractFactory("DIMOVesting");

  const dimoVesting = (await dimoVestingFactory.deploy(
    DIMO_POLYGON_ADDRESS
  )) as DIMOVesting;
  await dimoVesting.deployed();

  console.log("DIMOVesting deployed to:", dimoVesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
