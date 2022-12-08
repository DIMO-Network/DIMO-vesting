import { ethers } from "hardhat";

import { DIMOVesting, MockToken } from "../typechain";

import { vestingData } from "./data/vesting_table";

const DIMO_POLYGON_ADDRESS = "0xE261D618a959aFfFd53168Cd07D12E37B26761db";
const MULTISIG = "0xCcFa7c808F5b77822e4935a7230F46681c99F4Bc";

async function createVestingSchedules(_vestingData: any) {
  const [owner] = await ethers.getSigners();

  let dimoVesting: DIMOVesting;
  const dimoToken = (await ethers.getContractAt(
    "MockToken",
    DIMO_POLYGON_ADDRESS
  )) as MockToken;

  console.log(await dimoToken.balanceOf(owner.address));

  for (const schedule of _vestingData) {
    dimoVesting = await ethers.getContractAt(
      "DIMOVesting",
      schedule["Vesting contract address"]
    );

    console.log(`Vesting schedule ${schedule["Vesting contract address"]}`);

    console.log("Executing security verifications...");
    if ((await dimoVesting.owner()) !== owner.address) {
      throw new Error("Not right owner");
    }
    if (
      (
        await dimoVesting.getVestingSchedulesTotalAmountCommitted()
      ).toString() !== "0"
    ) {
      throw new Error("There must be no committed amount");
    }
    console.log("Verifications passed\n");

    console.log("Creating vesting schedule...");
    await (
      await dimoVesting
        .connect(owner)
        .createVestingSchedule(
          schedule["Gnosis Safe"],
          schedule["Timestamp start"],
          schedule.Cliff,
          schedule.Duration,
          schedule.Amount
        )
    ).wait();
    console.log("Vesting schedule created\n");
  }
}

async function transferOwnership(_vestingData: any, _newOwner: string) {
  const [owner] = await ethers.getSigners();
  let dimoVesting: DIMOVesting;

  for (const schedule of _vestingData) {
    dimoVesting = await ethers.getContractAt(
      "DIMOVesting",
      schedule["Vesting contract address"]
    );

    console.log(`Vesting schedule ${schedule["Vesting contract address"]}`);

    console.log(`Transfering ownership to ${_newOwner}...`);
    await (
      await dimoVesting.connect(owner).transferOwnership(_newOwner)
    ).wait();
    console.log("Transferred\n");
  }
}

async function main() {
  // await createVestingSchedules(vestingData);
  await transferOwnership(vestingData, MULTISIG);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
