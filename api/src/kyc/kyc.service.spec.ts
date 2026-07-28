import { KycService } from "./kyc.service";

describe("KycService resumable hosted sessions", () => {
  const merchantId = "507f1f77bcf86cd799439011";

  const makeService = (user: Record<string, any>, jobStatus: any) => {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      }),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      }),
    };
    const smileIdService = {
      getJobStatus: jest.fn().mockResolvedValue(jobStatus),
      isPendingResult: jest.fn().mockReturnValue(false),
      isSuccessfulResult: jest.fn(),
      describeResult: jest.fn(),
    };

    return {
      service: new KycService(
        userModel as any,
        smileIdService as any,
        {
          reevaluateReferrer: jest.fn().mockResolvedValue(0),
        } as any,
      ),
      userModel,
      smileIdService,
    };
  };

  const merchant = (bvn: Record<string, any>) => ({
    _id: { toString: () => merchantId },
    planTier: "PRO",
    planStatus: "paid",
    kyc: {
      nin: {
        status: "passed",
        product: "enhanced_kyc",
      },
      bvn,
    },
  });

  it("makes a created but unsubmitted session resumable", async () => {
    const { service } = makeService(
      merchant({
        status: "pending",
        product: "biometric_kyc",
        jobId: `bvn-${merchantId}-old`,
        smileUserId: `${merchantId}-bvn-biometric_kyc`,
        checkedAt: new Date(0),
      }),
      null,
    );

    const status = await service.getStatus(merchantId);
    const bvn = status.steps.find((step) => step.key === "bvn");

    expect(bvn).toMatchObject({
      isVerifying: false,
      isResumable: true,
    });
  });

  it("keeps a submitted session in the loader state", async () => {
    const { service } = makeService(
      merchant({
        status: "pending",
        product: "biometric_kyc",
        jobId: `bvn-${merchantId}-active`,
        smileUserId: `${merchantId}-bvn-biometric_kyc`,
        checkedAt: new Date(0),
        submittedAt: new Date(),
      }),
      { job_complete: false },
    );

    const status = await service.getStatus(merchantId);
    const bvn = status.steps.find((step) => step.key === "bvn");

    expect(bvn).toMatchObject({
      isVerifying: true,
      isResumable: false,
    });
  });

  it("ignores a callback from an attempt superseded by a retry", async () => {
    const activeJobId = `bvn-${merchantId}-new`;
    const { service, userModel } = makeService(
      merchant({
        status: "pending",
        product: "biometric_kyc",
        jobId: activeJobId,
      }),
      null,
    );

    const result = await service.handleCallback({
      PartnerParams: {
        user_id: `${merchantId}-bvn-biometric_kyc`,
        job_id: `bvn-${merchantId}-old`,
      },
      status: "block",
    });

    expect(result).toEqual({ received: true, stale: true });
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it("keeps a provisional callback pending and heals a transient failure", async () => {
    const activeJobId = `bvn-${merchantId}-active`;
    const { service, userModel, smileIdService } = makeService(
      merchant({
        status: "failed",
        reason: "Provisional Enroll - Under Review",
        product: "biometric_kyc",
        jobId: activeJobId,
      }),
      null,
    );
    smileIdService.isPendingResult.mockReturnValue(true);

    const result = await service.handleCallback({
      PartnerParams: {
        user_id: `${merchantId}-bvn-biometric_kyc`,
        job_id: activeJobId,
      },
      ResultCode: "0814",
      ResultText: "Provisional Enroll - Under Review",
    });

    expect(result).toEqual({ received: true, pending: true });
    expect(smileIdService.isSuccessfulResult).not.toHaveBeenCalled();
    expect(userModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        [`kyc.bvn.jobId`]: activeJobId,
        [`kyc.bvn.status`]: { $in: ["pending", "failed"] },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "kyc.bvn.status": "pending",
          "kyc.bvn.submittedAt": expect.any(Date),
          "kyc.bvn.reason": null,
        }),
      }),
    );
  });
});
