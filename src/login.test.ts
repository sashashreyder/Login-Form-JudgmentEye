import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  MAX_FAILED_ATTEMPTS,
  COPY,
  attemptsLeftLine,
  demoAutofill,
  evaluateSubmit,
  patienceLine,
  type AttemptSnapshot,
} from "./login.ts";

function snap(partial: Partial<AttemptSnapshot> = {}): AttemptSnapshot {
  return {
    email: "",
    password: "",
    failedAttempts: 0,
    cleanWins: 0,
    ...partial,
  };
}

describe("validation does not spend an attempt", () => {
  it("rejects an empty email", () => {
    const outcome = evaluateSubmit(snap({ email: "   ", password: "something" }));
    assert.equal(outcome.verdict, "empty");
    assert.equal(outcome.failedAttempts, 0);
    assert.equal(outcome.shake, true);
  });

  it("rejects an empty password", () => {
    const outcome = evaluateSubmit(snap({ email: "ada@studio.test", password: "" }));
    assert.equal(outcome.verdict, "empty");
    assert.equal(outcome.failedAttempts, 0);
  });

  it("rejects an email that is not an email", () => {
    const outcome = evaluateSubmit(snap({ email: "not-an-email", password: "secret" }));
    assert.equal(outcome.verdict, "bad-email");
    assert.equal(outcome.failedAttempts, 0);
  });
});

describe("demo pair", () => {
  it("accepts the public test pair, including a differently cased email", () => {
    const outcome = evaluateSubmit(
      snap({ email: "  You@Again.com  ", password: DEMO_PASSWORD }),
    );
    assert.equal(outcome.verdict, "success");
    assert.equal(outcome.failedAttempts, 0);
    assert.equal(outcome.winLine, COPY.first);
    assert.equal(outcome.blink, "fast");
    assert.equal(outcome.cleanWins, 1);
  });

  it("rejects a real-looking email with the wrong password", () => {
    const outcome = evaluateSubmit(snap({ email: "ada@studio.test", password: "nope" }));
    assert.equal(outcome.verdict, "wrong");
    assert.equal(outcome.failedAttempts, 1);
    assert.equal(outcome.winLine, "");
  });

  it("fills both fields and does not itself submit", () => {
    const filled = demoAutofill();
    assert.deepEqual(filled, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
    assert.equal("verdict" in filled, false);
    const before = snap();
    assert.equal(before.failedAttempts, 0);
    assert.equal(
      evaluateSubmit({ ...before, ...filled }).verdict,
      "success",
    );
  });
});

describe("attempt budget", () => {
  it("counts only wrong passwords and locks on the last one", () => {
    let failedAttempts = 0;
    for (let miss = 1; miss <= MAX_FAILED_ATTEMPTS; miss += 1) {
      const outcome = evaluateSubmit(
        snap({ email: "ada@studio.test", password: `guess-${miss}`, failedAttempts }),
      );
      failedAttempts = outcome.failedAttempts;
      assert.equal(outcome.failedAttempts, miss);
      assert.equal(outcome.verdict, miss === MAX_FAILED_ATTEMPTS ? "locked" : "wrong");
    }
    assert.equal(attemptsLeftLine(0), patienceLine());
    assert.equal(attemptsLeftLine(1), `${MAX_FAILED_ATTEMPTS - 1} attempts left`);
    assert.equal(attemptsLeftLine(MAX_FAILED_ATTEMPTS - 1), "1 attempt left");
    assert.equal(attemptsLeftLine(MAX_FAILED_ATTEMPTS), "0 attempts left");
  });

  it("does not count another miss after the lock", () => {
    const outcome = evaluateSubmit(
      snap({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        failedAttempts: MAX_FAILED_ATTEMPTS,
      }),
    );
    assert.equal(outcome.verdict, "locked");
    assert.equal(outcome.failedAttempts, MAX_FAILED_ATTEMPTS);
  });

  it("allows a success again after the count is cleared", () => {
    let failedAttempts = MAX_FAILED_ATTEMPTS;
    failedAttempts = 0;
    const outcome = evaluateSubmit(
      snap({ email: DEMO_EMAIL, password: DEMO_PASSWORD, failedAttempts }),
    );
    assert.equal(outcome.verdict, "success");
    assert.equal(outcome.failedAttempts, 0);
  });
});

describe("success depends on earlier misses", () => {
  it("is pleasantly impressed on the first try", () => {
    const outcome = evaluateSubmit(snap({ email: DEMO_EMAIL, password: DEMO_PASSWORD }));
    assert.equal(outcome.winLine, "Okay, impressive.");
    assert.equal(outcome.blink, "fast");
  });

  it("is sarcastic after one miss", () => {
    const outcome = evaluateSubmit(
      snap({ email: DEMO_EMAIL, password: DEMO_PASSWORD, failedAttempts: 1 }),
    );
    assert.equal(outcome.verdict, "success");
    assert.equal(outcome.failedAttempts, 1);
    assert.equal(outcome.winLine, COPY.afterOne);
    assert.equal(outcome.blink, "fast");
    assert.equal(outcome.cleanWins, 0);
  });

  it("blinks more slowly after two misses", () => {
    const outcome = evaluateSubmit(
      snap({ email: DEMO_EMAIL, password: DEMO_PASSWORD, failedAttempts: 2 }),
    );
    assert.equal(outcome.verdict, "success");
    assert.equal(outcome.failedAttempts, 2);
    assert.equal(outcome.winLine, COPY.afterTwo);
    assert.equal(outcome.blink, "dramatic");
  });

  it("rotates the first-try line only after a previous clean win", () => {
    const again = evaluateSubmit(
      snap({ email: DEMO_EMAIL, password: DEMO_PASSWORD, cleanWins: 1 }),
    );
    assert.equal(again.winLine, COPY.firstAlts[0]);
  });
});
