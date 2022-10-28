import { ethers } from "hardhat";

async function main() {
  const MockToken = await ethers.getContractFactory("MockToken");
  const dimoVestingFactory = await ethers.getContractFactory("DIMOVesting");

  const mockToken = await MockToken.deploy(
    "Mock Token",
    "MT",
    ethers.utils.parseEther("1000000000")
  );
  await mockToken.deployed();

  console.log("MockToken deployed to:", mockToken.address);

  const dimoVesting = await dimoVestingFactory.deploy(mockToken.address);
  await dimoVesting.deployed();

  console.log("DimoVesting deployed to:", dimoVesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
