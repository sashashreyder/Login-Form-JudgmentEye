/**
 * Demo rules live here so the page, the check, and the tests share one source.
 * This is not a real account system. Nothing in this file is sent anywhere.
 */

// CUSTOMIZE: public test pair. The page prints these, and matchesDemo accepts them.
export const DEMO_EMAIL = "you@again.com";
export const DEMO_PASSWORD = "lookaway";

// CUSTOMIZE: incorrect guesses allowed before the fictional lock.
// The patience line and the "attempts left" text are built from this number.
// Eye reactions stay a three-step story: first miss, later misses, then the lock.
// If you set this above 3, misses 2 through the one before the lock reuse the
// second reaction. If you set it below 3, later reactions never play, and the
// locking miss uses the lockout eye instead of a miss line.
// The lockout sentence in COPY.lockPrimary still says "Three attempts" unless you edit it.
export const MAX_FAILED_ATTEMPTS = 3;

export const COPY = {
  idle: "Oh. It’s you again.",
  idleAlt: "Let’s pretend I don’t remember last time.",
  password: "Go ahead. I’m not looking.",
  empty: "Submitting nothing? Interesting strategy.",
  badEmail: "That’s not even an email. Impressive.",
  miss1: "I’ve seen better guesses.",
  miss2: "You seemed so confident.",
  lockPrimary: "Three attempts. Three disappointments. Impressive.",
  lockSecondary:
    "You’re locked out for 24 hours. Next time, consider using autofill. Or your memory. Whichever works first.",
  tryAgain: "Try again in 24 hours",
  simulated: "Simulated lock. Reset the demo whenever you want.",
  first: "Okay, impressive.",
  firstAlts: ["Wow. First try. Respect.", "You have a good memory.", "That was suspiciously competent."],
  afterOne: "OMG, finally.",
  afterTwo: "Well, that took a while.",
} as const;

export type Verdict = "empty" | "bad-email" | "wrong" | "success" | "locked" | null;
export type BlinkPace = "none" | "fast" | "dramatic";

export type AttemptSnapshot = {
  email: string;
  password: string;
  failedAttempts: number;
  cleanWins: number;
};

export type AttemptOutcome = {
  verdict: Exclude<Verdict, null>;
  failedAttempts: number;
  cleanWins: number;
  winLine: string;
  blink: BlinkPace;
  shake: boolean;
};

/** A dot is required. The ending does not have to be .com. */
export function isEmailShape(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function matchesDemo(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

export function patienceLine() {
  return `${MAX_FAILED_ATTEMPTS} attempts before I lose my patience.`;
}

export function attemptsLeftLine(failedAttempts: number) {
  const left = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);
  if (failedAttempts <= 0) return patienceLine();
  if (left === 1) return "1 attempt left";
  return `${left} attempts left`;
}

/** First miss, middle misses, then the lock. See MAX_FAILED_ATTEMPTS. */
export function failureLine(failedAttempts: number) {
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) return COPY.lockPrimary;
  if (failedAttempts <= 1) return COPY.miss1;
  return COPY.miss2;
}

export function successLine(failedAttempts: number, earlierCleanWins: number) {
  if (failedAttempts === 1) return COPY.afterOne;
  if (failedAttempts >= 2) return COPY.afterTwo;
  if (earlierCleanWins <= 0) return COPY.first;
  return COPY.firstAlts[(earlierCleanWins - 1) % COPY.firstAlts.length];
}

/**
 * One submit, one result. Empty fields and a bad email shape do not add a miss.
 * A match does not add a miss either. The caller keeps cleanWins across resets.
 */
export function evaluateSubmit(snapshot: AttemptSnapshot): AttemptOutcome {
  const held = {
    failedAttempts: snapshot.failedAttempts,
    cleanWins: snapshot.cleanWins,
    winLine: "",
    blink: "none" as const,
    shake: false,
  };
  if (snapshot.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return { ...held, verdict: "locked" };
  }
  if (snapshot.email.trim() === "" || snapshot.password === "") {
    return { ...held, verdict: "empty", shake: true };
  }
  if (!isEmailShape(snapshot.email)) {
    return { ...held, verdict: "bad-email", shake: true };
  }
  if (matchesDemo(snapshot.email, snapshot.password)) {
    const before = snapshot.failedAttempts;
    return {
      verdict: "success",
      failedAttempts: before,
      cleanWins: before === 0 ? snapshot.cleanWins + 1 : snapshot.cleanWins,
      winLine: successLine(before, snapshot.cleanWins),
      blink: before === 2 ? "dramatic" : "fast",
      shake: false,
    };
  }
  const next = snapshot.failedAttempts + 1;
  return {
    verdict: next >= MAX_FAILED_ATTEMPTS ? "locked" : "wrong",
    failedAttempts: next,
    cleanWins: snapshot.cleanWins,
    winLine: "",
    blink: "none",
    shake: true,
  };
}

/** Field values only. Filling them must not submit the form. */
export function demoAutofill() {
  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}
