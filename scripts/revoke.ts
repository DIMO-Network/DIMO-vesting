import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { DIMOVesting } from "../typechain";
import { VestingAddressToBeneficiaries } from "../types";

// eslint-disable-next-line no-unused-vars
async function revoke(
  owner: SignerWithAddress,
  contractToBenef: VestingAddressToBeneficiaries[]
) {
  for (const item of contractToBenef) {
    console.log(`\nRevoking vesting schedules of ${item.address}...\n`);

    const dimoVesting = (await ethers.getContractAt(
      "DIMOVesting",
      item.address
    )) as DIMOVesting;

    for (const benef of item.beneficiaries) {
      console.log(`Revoking vesting schedule from beneficiary ${benef}...`);
      const tx = await dimoVesting.connect(owner).revoke(benef);

      console.log(`Transaction sent ${tx.hash}. Waiting confirmation...`);
      await tx.wait();

      console.log(`Benfeciary ${benef} revoked\n`);
    }
  }
}

async function main() {
  const [owner] = await ethers.getSigners();
  await revoke(owner, [
    {
      address: "",
      beneficiaries: [""],
    },
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
