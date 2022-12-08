import { BigNumber } from "ethers";

export type VestingSchedule = {
  initialized: boolean;
  cliffEnd: BigNumber;
  start: BigNumber;
  duration: BigNumber;
  amountTotal: BigNumber;
  released: BigNumber;
  revoked: boolean;
};

export interface VestingAddressToBeneficiaries {
  address: string;
  beneficiaries: string[];
}
