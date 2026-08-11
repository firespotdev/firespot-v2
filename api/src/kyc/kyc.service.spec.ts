import { KycService } from "./kyc.service";

describe("KycService resumable hosted sessions", () => {
  const merchantId = "507f1f77bcf86cd799439011";

  const makeService = (
    user: Record<string, any>,
    jobStatus: any,
    nodeEnv = "production",
  ) => {
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
      isSuccessfulBusinessResult: jest.fn(),
      getBusinessVerificationDetails: jest.fn(),
      describeResult: jest.fn(),
      buildJobId: jest.fn().mockReturnValue(`cac-${merchantId}-new`),
      buildUserId: jest.fn().mockReturnValue(`${merchantId}-cac-kyb`),
      verifyBusinessCac: jest.fn().mockResolvedValue({ success: true }),
    };

    return {
      service: new KycService(
        userModel as any,
        smileIdService as any,
        {
          reevaluateReferrer: jest.fn().mockResolvedValue(0),
        } as any,
        {
          get: jest.fn().mockImplementation((key: string) =>
            key === "NODE_ENV" ? nodeEnv : undefined,
          ),
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

  const promaxMerchant = (cac: Record<string, any>) => ({
    _id: { toString: () => merchantId },
    businessName: "Firespot Foods",
    planTier: "PROMAX",
    planStatus: "verifying",
    save: jest.fn().mockResolvedValue(undefined),
    kyc: {
      nin: { status: "passed", product: "enhanced_kyc" },
      bvn: { status: "passed", product: "biometric_kyc" },
      cac,
    },
  });

  it("submits the current CAC step once using the server-owned defaults", async () => {
    const user = promaxMerchant({ status: "failed" });
    const { service, userModel, smileIdService } = makeService(user, null);

    const result = await service.verifyCac(merchantId, {
      rcNumber: " BN 123456 ",
    });

    expect(result).toEqual({ check: "cac", status: "pending" });
    expect(userModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: merchantId,
        "kyc.cac.status": { $ne: "pending" },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "kyc.cac.registrationNumber": "BN 123456",
          "kyc.cac.businessType": "bn",
          "kyc.cac.submittedBusinessName": "Firespot Foods",
        }),
      }),
    );
    expect(smileIdService.verifyBusinessCac).toHaveBeenCalledWith({
      userId: `${merchantId}-cac-kyb`,
      jobId: `cac-${merchantId}-new`,
      rcNumber: "BN 123456",
    });
  });

  it("requires the CAC registration to match the merchant name in production", async () => {
    const jobId = `cac-${merchantId}-active`;
    const user = promaxMerchant({
      status: "pending",
      product: "kyb",
      jobId,
      registrationNumber: "BN123456",
      submittedBusinessName: "Firespot Foods",
    });
    const { service, userModel, smileIdService } = makeService(user, null);
    smileIdService.isSuccessfulBusinessResult.mockReturnValue(true);
    smileIdService.getBusinessVerificationDetails.mockReturnValue({
      resultCode: "1012",
      verifyBusiness: "Verified",
      returnedBusinessInfo: "Returned",
      legalName: "Another Business",
      registrationNumber: "123456",
      searchNumber: "123456",
      smileJobId: "smile-job-1",
    });

    await service.handleCallback({
      PartnerParams: {
        user_id: `${merchantId}-cac-kyb`,
        job_id: jobId,
        job_type: 7,
      },
      ResultCode: "1012",
    });

    expect(userModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ "kyc.cac.jobId": jobId }),
      expect.objectContaining({
        $set: expect.objectContaining({
          "kyc.cac.status": "failed",
          "kyc.cac.reason":
            "This CAC registration does not match your business name. Check the number and try again.",
          "kyc.cac.verifiedBusinessName": "Another Business",
          "kyc.cac.resultCode": "1012",
        }),
      }),
    );
  });

  it("skips only the business-name comparison in development", async () => {
    const jobId = `cac-${merchantId}-active`;
    const user = promaxMerchant({
      status: "pending",
      product: "kyb",
      jobId,
      registrationNumber: "BN123456",
      submittedBusinessName: "Firespot Foods",
    });
    const { service, userModel, smileIdService } = makeService(
      user,
      null,
      "development",
    );
    smileIdService.isSuccessfulBusinessResult.mockReturnValue(true);
    smileIdService.getBusinessVerificationDetails.mockReturnValue({
      resultCode: "1012",
      verifyBusiness: "Verified",
      returnedBusinessInfo: "Returned",
      legalName: "Another Business",
      registrationNumber: "123456",
      searchNumber: "123456",
      smileJobId: "smile-job-1",
    });

    await service.handleCallback({
      PartnerParams: {
        user_id: `${merchantId}-cac-kyb`,
        job_id: jobId,
        job_type: 7,
      },
      ResultCode: "1012",
    });

    expect(userModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ "kyc.cac.jobId": jobId }),
      expect.objectContaining({
        $set: expect.objectContaining({ "kyc.cac.status": "passed" }),
      }),
    );
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
