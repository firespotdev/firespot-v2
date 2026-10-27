import { EventsGateway } from "./events.gateway";

describe("Merchant socket privacy", () => {
  afterEach(() => jest.useRealTimers());
  it("does not let anonymous clients join a merchant room", async () => {
    const gateway = new EventsGateway(
      {
        verifyAsync: jest.fn().mockRejectedValue(new Error("Unauthorized")),
      } as any,
      { get: () => "secret" } as any,
    );
    const client = { handshake: { auth: {} }, join: jest.fn(), data: {} };
    await expect(
      gateway.handleJoinRoom(client as any, "merchant"),
    ).resolves.toEqual({ status: "failed" });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("rejects a valid token belonging to a different account", async () => {
    const gateway = new EventsGateway(
      {
        verifyAsync: jest
          .fn()
          .mockResolvedValue({ type: "access", sub: "other" }),
      } as any,
      { get: () => "secret" } as any,
    );
    const client = {
      handshake: { auth: { token: "token" } },
      join: jest.fn(),
      data: {},
    };
    await expect(
      gateway.handleJoinRoom(client as any, "merchant"),
    ).resolves.toEqual({ status: "failed" });
    expect(client.join).not.toHaveBeenCalled();
  });
  it("allows the owner and ends room access when their token expires", async () => {
    jest.useFakeTimers();
    const gateway = new EventsGateway(
      {
        verifyAsync: jest
          .fn()
          .mockResolvedValue({
            type: "access",
            sub: "merchant",
            exp: Date.now() / 1000 + 60,
          }),
      } as any,
      { get: () => "secret" } as any,
    );
    const client = {
      handshake: { auth: { token: "token" } },
      join: jest.fn(),
      disconnect: jest.fn(),
      data: {},
    };
    await expect(
      gateway.handleJoinRoom(client as any, "merchant"),
    ).resolves.toMatchObject({ status: "joined" });
    expect(client.join).toHaveBeenCalledWith("merchant");
    jest.advanceTimersByTime(60000);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
