import chai, { expect } from "chai";
import { ethers, waffle } from "hardhat";

import { DIMOVesting, MockToken } from "../typechain";
import { createSnapshot, revertToSnapshot } from "./helpers/snapshot";
import { VestingSchedule } from "../types";

const { solidity } = waffle;
const provider = waffle.provider;

chai.use(solidity);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("dimoVesting", function () {
  let snapshot: string;
  let mockToken: MockToken;
  let dimoVesting: DIMOVesting;

  const [owner, nonOwner, newOwner, addr1, addr2] = provider.getWallets();

  const beneficiary1 = addr1.address;
  const beneficiary2 = addr2.address;
  const startTime = (+new Date() / 1000) | 0; // Truncate 3 decimals
  const cliff = 60 * 60 * 24 * 365; // 1 year
  const duration = 60 * 60 * 24 * 365 * 4; // 4 years
  const amount = 9408471;

  before(async function () {
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const dimoVestingFactory = await ethers.getContractFactory("DIMOVesting");
    mockToken = await MockTokenFactory.deploy(
      "Mock Token",
      "MT",
      ethers.utils.parseEther("1000000000")
    );
    await mockToken.deployed();

    dimoVesting = await dimoVestingFactory.deploy(mockToken.address);
    await dimoVesting.deployed();
  });

  beforeEach(async () => {
    snapshot = await createSnapshot();
  });

  afterEach(async () => {
    await revertToSnapshot(snapshot);
  });

  describe("constructor", () => {
    it("Should revert if token is zero address", async () => {
      const dimoVestingFactory = await ethers.getContractFactory("DIMOVesting");
      await expect(dimoVestingFactory.deploy(ZERO_ADDRESS)).to.be.revertedWith(
        "Token cannot be zero address"
      );
    });
    it("Should correctly set token address", async () => {
      expect((await dimoVesting.getToken()).toString()).to.equal(
        mockToken.address
      );
    });
    it("Should correctly set owner", async () => {
      expect(await dimoVesting.owner()).to.equal(owner.address);
    });
  });

  describe("transferOwnership", async () => {
    it("Should revert if caller is not the owner", async () => {
      await expect(
        dimoVesting.connect(nonOwner).transferOwnership(nonOwner.address)
      ).to.be.revertedWith("Only callable by owner");
    });
  });

  describe("acceptOwnership", async () => {
    it("Should revert if caller is not the pending owner", async () => {
      await dimoVesting.connect(owner).transferOwnership(newOwner.address);

      await expect(
        dimoVesting.connect(nonOwner).acceptOwnership()
      ).to.be.revertedWith("Must be proposed owner");
    });
    it("Should correctly transfer ownership", async () => {
      await dimoVesting.connect(owner).transferOwnership(newOwner.address);

      await dimoVesting.connect(newOwner).acceptOwnership();

      expect(await dimoVesting.owner()).to.equal(newOwner.address);
    });
    it("Should emit OwnershipTransferred event with correct params", async () => {
      await dimoVesting.connect(owner).transferOwnership(newOwner.address);

      await expect(dimoVesting.connect(newOwner).acceptOwnership())
        .to.emit(dimoVesting, "OwnershipTransferred")
        .withArgs(owner.address, newOwner.address);
    });
  });

  describe("createVestingSchedule", function () {
    it("Should revert if caller is not the owner", async () => {
      await expect(
        dimoVesting
          .connect(nonOwner)
          .createVestingSchedule(
            beneficiary1,
            startTime,
            cliff,
            duration,
            amount
          )
      ).to.be.revertedWith("Only callable by owner");
    });
    it("Should revert if vesting schedule is already initialized", async () => {
      await mockToken.transfer(dimoVesting.address, amount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );

      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          cliff,
          duration,
          amount
        )
      ).to.be.revertedWith("Already initialized");
    });
    it("Should revert if duration is not greater than zero", async () => {
      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          cliff,
          0,
          amount
        )
      ).to.be.revertedWith("Duration must be > 0");
    });
    it("Should revert if amount is not greater than zero", async () => {
      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          cliff,
          duration,
          0
        )
      ).to.be.revertedWith("Amount must be > 0");
    });
    it("Should revert if cliff is not less than the duration", async () => {
      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          duration * 2,
          duration,
          amount
        )
      ).to.be.revertedWith("Cliff must be <= duration");
    });
    it("Should vest tokens gradually", async () => {
      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          cliff,
          duration,
          amount
        )
      ).to.be.revertedWith("Not sufficient tokens");
    });
    it("Should correctly update vesting schedules total amount", async () => {
      await mockToken.transfer(dimoVesting.address, amount);

      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
      expect(
        await dimoVesting.getVestingSchedulesTotalAmountCommitted()
      ).to.equal(amount);
    });
    it("Should emit VestingScheduleCreated event with correct params", async () => {
      await mockToken.transfer(dimoVesting.address, amount);

      await expect(
        dimoVesting.createVestingSchedule(
          beneficiary1,
          startTime,
          cliff,
          duration,
          amount
        )
      )
        .to.emit(dimoVesting, "VestingScheduleCreated")
        .withArgs(beneficiary1, amount);
    });
  });

  describe("revoke", () => {
    beforeEach(async () => {
      await mockToken.transfer(dimoVesting.address, amount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
    });

    it("Should revert if caller is not the owner", async () => {
      await expect(
        dimoVesting.connect(nonOwner).revoke(beneficiary1)
      ).to.be.revertedWith("Only callable by owner");
    });
    it("Should revert if beneficiary is already revoked", async () => {
      await dimoVesting.revoke(beneficiary1);

      await expect(dimoVesting.revoke(beneficiary1)).to.be.revertedWith(
        "Vesting schedule was revoked"
      );
    });
    it("Should set vesting schedule as not initialized", async () => {
      const vestingScheduleBefore: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      // eslint-disable-next-line no-unused-expressions
      expect(vestingScheduleBefore.initialized).to.be.true;

      await dimoVesting.revoke(beneficiary1);

      const vestingScheduleAfter: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      // eslint-disable-next-line no-unused-expressions
      expect(vestingScheduleAfter.initialized).to.be.false;
    });
    it("Should set vesting schedule as revoked", async () => {
      const vestingScheduleBefore: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      // eslint-disable-next-line no-unused-expressions
      expect(vestingScheduleBefore.revoked).to.be.false;

      await dimoVesting.revoke(beneficiary1);

      const vestingScheduleAfter: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      // eslint-disable-next-line no-unused-expressions
      expect(vestingScheduleAfter.revoked).to.be.true;
    });

    context("When cliff is not reached", () => {
      it("Should transfer unreleased tokens to the owner", async () => {
        await expect(() =>
          dimoVesting.revoke(beneficiary1)
        ).to.changeTokenBalance(mockToken, owner, amount);
      });
      it("Should correctly update vesting schedules total amount", async () => {
        await dimoVesting.revoke(beneficiary1);

        expect(
          await dimoVesting.getVestingSchedulesTotalAmountCommitted()
        ).to.equal(0);
      });
      it("Should emit Revoked event with correct params", async () => {
        await expect(dimoVesting.revoke(beneficiary1))
          .to.emit(dimoVesting, "Revoked")
          .withArgs(beneficiary1, amount);
      });
    });

    context("When cliff is reached", () => {
      const amountToVestCliff = ((amount * cliff) / duration) | 0;

      beforeEach(async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + 10]);
        await dimoVesting.release(beneficiary1, amountToVestCliff);
      });

      it("Should transfer unreleased tokens to the owner", async () => {
        await expect(() =>
          dimoVesting.revoke(beneficiary1)
        ).to.changeTokenBalance(mockToken, owner, amount - amountToVestCliff);
      });
      it("Should correctly update vesting schedules total amount", async () => {
        await dimoVesting.revoke(beneficiary1);

        expect(
          await dimoVesting.getVestingSchedulesTotalAmountCommitted()
        ).to.equal(0);
      });
      it("Should emit Revoked event with correct params", async () => {
        await expect(dimoVesting.revoke(beneficiary1))
          .to.emit(dimoVesting, "Revoked")
          .withArgs(beneficiary1, amount - amountToVestCliff);
      });
    });

    context("When all vesting duration has passed", () => {
      beforeEach(async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + duration + 10]);
        await dimoVesting.release(beneficiary1, amount);
      });

      it("Should transfer unreleased tokens to the owner", async () => {
        await expect(() =>
          dimoVesting.revoke(beneficiary1)
        ).to.changeTokenBalance(mockToken, owner, 0);
      });
      it("Should emit Revoked event with correct params", async () => {
        await expect(dimoVesting.revoke(beneficiary1))
          .to.emit(dimoVesting, "Revoked")
          .withArgs(beneficiary1, 0);
      });
    });
  });

  describe("release", () => {
    beforeEach(async () => {
      await mockToken.transfer(dimoVesting.address, amount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
    });

    it("Should revert if beneficiary was revoked", async () => {
      await dimoVesting.revoke(beneficiary1);

      await expect(
        dimoVesting.release(beneficiary1, amount)
      ).to.be.revertedWith("Vesting schedule was revoked");
    });
    it("Should revert if caller is not the beneficiary or the owner", async () => {
      await expect(
        dimoVesting.connect(nonOwner).release(beneficiary1, amount)
      ).to.be.revertedWith(
        "Only beneficiary and owner can release vested tokens"
      );
    });
    it("Should revert if amount requested is greater than releasable amount", async () => {
      await expect(
        dimoVesting.release(beneficiary1, amount * 2)
      ).to.be.revertedWith("Amount is too high");
    });

    context("When only the cliff amount is released", () => {
      const amountToVestCliff = ((amount * cliff) / duration) | 0;

      it("Should update vesting schedule released amount", async () => {
        const vestingScheduleBefore: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleBefore.released).to.equal(0);

        await ethers.provider.send("evm_increaseTime", [cliff + 10]);

        await dimoVesting.release(beneficiary1, amountToVestCliff);

        const vestingScheduleAfter: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleAfter.released).to.equal(amountToVestCliff);
      });
      it("Should transfer released tokens to beneficiary", async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + 10]);

        await expect(() =>
          dimoVesting.release(beneficiary1, amountToVestCliff)
        ).to.changeTokenBalance(mockToken, addr1, amountToVestCliff);
      });
      it("Should emit Released event with correct params", async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + 10]);

        await expect(dimoVesting.release(beneficiary1, amountToVestCliff))
          .to.emit(dimoVesting, "Released")
          .withArgs(beneficiary1, amountToVestCliff);
      });
    });

    context("When more than the cliff amount is released", () => {
      const periodAfterCliff = 60 * 60 * 24 * 365;
      const amountToVestCliff =
        ((amount * (cliff + periodAfterCliff)) / duration) | 0;

      it("Should update vesting schedule released amount", async () => {
        const vestingScheduleBefore: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleBefore.released).to.equal(0);

        await ethers.provider.send("evm_increaseTime", [
          cliff + periodAfterCliff + 10,
        ]);

        await dimoVesting.release(beneficiary1, amountToVestCliff);

        const vestingScheduleAfter: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleAfter.released).to.equal(amountToVestCliff);
      });
      it("Should transfer released tokens to beneficiary", async () => {
        await ethers.provider.send("evm_increaseTime", [
          cliff + periodAfterCliff + 10,
        ]);

        await expect(() =>
          dimoVesting.release(beneficiary1, amountToVestCliff)
        ).to.changeTokenBalance(mockToken, addr1, amountToVestCliff);
      });
      it("Should emit Released event with correct params", async () => {
        await ethers.provider.send("evm_increaseTime", [
          cliff + periodAfterCliff + 10,
        ]);

        await expect(dimoVesting.release(beneficiary1, amountToVestCliff))
          .to.emit(dimoVesting, "Released")
          .withArgs(beneficiary1, amountToVestCliff);
      });
    });

    context("When all vesting duration has passed", () => {
      it("Should update vesting schedule released amount", async () => {
        const vestingScheduleBefore: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleBefore.released).to.equal(0);

        await ethers.provider.send("evm_increaseTime", [cliff + duration + 10]);

        await dimoVesting.release(beneficiary1, amount);

        const vestingScheduleAfter: VestingSchedule =
          await dimoVesting.getVestingSchedule(beneficiary1);

        // eslint-disable-next-line no-unused-expressions
        expect(vestingScheduleAfter.released).to.equal(amount);
      });
      it("Should transfer released tokens to beneficiary", async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + duration + 10]);

        await expect(() =>
          dimoVesting.release(beneficiary1, amount)
        ).to.changeTokenBalance(mockToken, addr1, amount);
      });
      it("Should emit Released event with correct params", async () => {
        await ethers.provider.send("evm_increaseTime", [cliff + duration + 10]);

        await expect(dimoVesting.release(beneficiary1, amount))
          .to.emit(dimoVesting, "Released")
          .withArgs(beneficiary1, amount);
      });
    });
  });

  describe("withdraw", () => {
    it("Should revert if caller is not the owner", async () => {
      await expect(
        dimoVesting.connect(nonOwner).withdraw(100)
      ).to.be.revertedWith("Only callable by owner");
    });
    it("Should revert amount is greater than withdrawable amount", async () => {
      await expect(dimoVesting.connect(owner).withdraw(100)).to.be.revertedWith(
        "Not enough withdrawable funds"
      );
    });
    it("Should correctly withdraw available funds when no vesting schedule was created", async () => {
      await mockToken.transfer(dimoVesting.address, amount);

      await expect(() => dimoVesting.withdraw(amount)).to.changeTokenBalance(
        mockToken,
        owner,
        amount
      );
    });
    it("Should correctly withdraw available funds when vesting schedules were created", async () => {
      const excessAmount = 100;

      await mockToken.transfer(dimoVesting.address, amount * 2 + excessAmount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
      await dimoVesting.createVestingSchedule(
        beneficiary2,
        startTime,
        cliff,
        duration,
        amount
      );

      await expect(() =>
        dimoVesting.withdraw(excessAmount)
      ).to.changeTokenBalance(mockToken, owner, excessAmount);
    });
  });

  describe("getVestingSchedulesTotalAmountCommitted", () => {
    it("Should return 0 if no vesting schedule was created", async () => {
      await mockToken.transfer(dimoVesting.address, amount);

      expect(
        await dimoVesting.getVestingSchedulesTotalAmountCommitted()
      ).to.equal(0);
    });
    it("Should return correct amount after vesting schedules creation", async () => {
      await mockToken.transfer(dimoVesting.address, amount * 2 + 10);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
      await dimoVesting.createVestingSchedule(
        beneficiary2,
        startTime,
        cliff,
        duration,
        amount
      );

      expect(
        await dimoVesting.getVestingSchedulesTotalAmountCommitted()
      ).to.equal(amount * 2);
    });
  });

  describe("getVestingSchedule", () => {
    it("Should return an empty struct if beneficiary does not have a vesting schedule", async () => {
      const vestingSchedule: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      expect(vestingSchedule.initialized).to.be.false;
      expect(vestingSchedule.cliffEnd).to.equal(0);
      expect(vestingSchedule.start).to.equal(0);
      expect(vestingSchedule.duration).to.equal(0);
      expect(vestingSchedule.amountTotal).to.equal(0);
      expect(vestingSchedule.released).to.equal(0);
      // eslint-disable-next-line no-unused-expressions
      expect(vestingSchedule.revoked).to.be.false;
    });
    it("Should return correct information", async () => {
      await mockToken.transfer(dimoVesting.address, amount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );

      const vestingSchedule: VestingSchedule =
        await dimoVesting.getVestingSchedule(beneficiary1);

      expect(vestingSchedule.initialized).to.be.true;
      expect(vestingSchedule.cliffEnd).to.equal(startTime + cliff);
      expect(vestingSchedule.start).to.equal(startTime);
      expect(vestingSchedule.duration).to.equal(duration);
      expect(vestingSchedule.amountTotal).to.equal(amount);
      expect(vestingSchedule.released).to.equal(0);
      // eslint-disable-next-line no-unused-expressions
      expect(vestingSchedule.revoked).to.be.false;
    });
  });

  describe("computeReleasableAmount", () => {
    beforeEach(async () => {
      await mockToken.transfer(dimoVesting.address, amount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
    });

    it("Should return 0 if address is not a beneficiary", async () => {
      expect(await dimoVesting.computeReleasableAmount(beneficiary2)).to.equal(
        0
      );
    });
    it("Should return 0 if the cliff was not reached", async () => {
      expect(await dimoVesting.computeReleasableAmount(beneficiary1)).to.equal(
        0
      );
    });
    it("Should return 0 if beneficiary was revoked", async () => {
      await dimoVesting.revoke(beneficiary1);

      expect(await dimoVesting.computeReleasableAmount(beneficiary1)).to.equal(
        0
      );
    });
    it("Should return correct amount after cliff", async () => {
      const periodAfterCliff = 60 * 60 * 24 * 365;
      const releasableAmount = (amount * (cliff + periodAfterCliff)) / duration;

      await ethers.provider.send("evm_increaseTime", [
        cliff + periodAfterCliff,
      ]);
      await ethers.provider.send("evm_mine", []);

      expect(
        (await dimoVesting.computeReleasableAmount(beneficiary1)).toNumber()
      ).to.be.lessThanOrEqual(releasableAmount);
    });
    it("Should return all amount if all vesting duration has passed", async () => {
      await ethers.provider.send("evm_increaseTime", [cliff + duration + 10]);
      await ethers.provider.send("evm_mine", []);

      expect(await dimoVesting.computeReleasableAmount(beneficiary1)).to.equal(
        amount
      );
    });
    it("Should return correct amount after release", async () => {
      const periodAfterCliff = 60 * 60 * 24 * 365;
      const releasableAmount =
        ((amount * (cliff + periodAfterCliff)) / duration) | 0;
      const cliffAmount = ((amount * cliff) / duration) | 0;

      await ethers.provider.send("evm_increaseTime", [
        cliff + periodAfterCliff,
      ]);
      await ethers.provider.send("evm_mine", []);

      await dimoVesting.release(beneficiary1, cliffAmount);

      expect(
        (await dimoVesting.computeReleasableAmount(beneficiary1)).toNumber()
      ).to.be.lessThanOrEqual(releasableAmount - cliffAmount);
    });
  });

  describe("getWithdrawableAmount", () => {
    it("Should return 0 if no funding has been made", async () => {
      expect(await dimoVesting.getWithdrawableAmount()).to.equal(0);
    });
    it("Should return correct amount after vesting schedules creation", async () => {
      const excessAmount = 100;

      await mockToken.transfer(dimoVesting.address, amount * 2 + excessAmount);
      await dimoVesting.createVestingSchedule(
        beneficiary1,
        startTime,
        cliff,
        duration,
        amount
      );
      await dimoVesting.createVestingSchedule(
        beneficiary2,
        startTime,
        cliff,
        duration,
        amount
      );

      expect(await dimoVesting.getWithdrawableAmount()).to.equal(excessAmount);
    });
  });
});
