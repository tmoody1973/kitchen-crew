import { describe, expect, it } from "vitest";
import { DEMO_USER_ID, LIMITS, limitMessage, limitName } from "./ai-limits";

describe("limitName", () => {
  it("gives the shared demo login its own, bigger allowance", () => {
    expect(limitName("chat", DEMO_USER_ID)).toBe("chatDemo");
    expect(LIMITS.chatDemo.rate).toBeGreaterThan(LIMITS.chat.rate);
  });

  it("gives everyone else the regular allowance", () => {
    expect(limitName("chat", "user_someoneElse")).toBe("chat");
    expect(limitName("photo", "user_someoneElse")).toBe("photo");
    expect(limitName("recipe", "user_someoneElse")).toBe("recipe");
  });

  it("names a defined limit for every kind and account", () => {
    for (const kind of ["chat", "photo", "recipe"] as const) {
      for (const user of [DEMO_USER_ID, "user_x"]) expect(LIMITS[limitName(kind, user)]).toBeDefined();
    }
  });
});

describe("limitMessage", () => {
  const HOUR = 60 * 60 * 1000;

  it("says which allowance ran out and when it comes back, in hours", () => {
    expect(limitMessage("chat", 5 * HOUR)).toBe("You've used today's crew chats. More in about 5 hours.");
  });

  it("rounds up, so it never promises too early", () => {
    expect(limitMessage("photo", 1.2 * HOUR)).toBe("You've used today's photo reads. More in about 2 hours.");
  });

  it("uses minutes under an hour", () => {
    expect(limitMessage("recipe", 10 * 60 * 1000)).toBe("You've used today's recipe reads. More in about 10 minutes.");
  });

  it("never says zero", () => {
    expect(limitMessage("chat", 0)).toBe("You've used today's crew chats. More in about 1 minute.");
  });
});
