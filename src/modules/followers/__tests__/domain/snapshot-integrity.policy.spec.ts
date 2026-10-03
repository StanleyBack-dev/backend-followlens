import { SnapshotIntegrityPolicy } from "@/modules/followers/domain/policies/snapshot-integrity.policy";

const policy = new SnapshotIntegrityPolicy({
  maxLossRatio: 0.3,
  lossRatioFloor: 5,
});

describe("SnapshotIntegrityPolicy", () => {
  it("accepts a normal update", () => {
    expect(
      policy.assess({ isBaseline: false, activeCount: 100, lostCount: 2 }),
    ).toEqual({ accepted: true });
  });

  it("rejects a mass loss that looks like the wrong file", () => {
    expect(
      policy.assess({ isBaseline: false, activeCount: 100, lostCount: 50 })
        .accepted,
    ).toBe(false);
  });

  it("allows a few losses on small accounts (absolute floor)", () => {
    expect(
      policy.assess({ isBaseline: false, activeCount: 10, lostCount: 4 })
        .accepted,
    ).toBe(true);
  });

  it("never rejects the baseline", () => {
    expect(
      policy.assess({ isBaseline: true, activeCount: 0, lostCount: 0 })
        .accepted,
    ).toBe(true);
  });
});
