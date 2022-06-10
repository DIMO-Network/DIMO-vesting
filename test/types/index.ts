import { BigNumber } from "ethers";

export type VestingSchedule = {
  beneficiary: String;
  cliff: BigNumber;
  start: BigNumber;
  duration: BigNumber;
  amountTotal: BigNumber;
  released: BigNumber;
  revoked: boolean;
};
