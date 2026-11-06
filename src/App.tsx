import { useEffect, useRef, useState, type FormEvent } from "react";
import "./App.css";
import { JudgmentalEye, type EyeMood } from "./components/JudgmentalEye";
import {
  COPY,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  MAX_FAILED_ATTEMPTS,
  attemptsLeftLine,
  demoAutofill,
  evaluateSubmit,
  failureLine,
  type BlinkPace,
  type Verdict,
} from "./login";

type Field = "email" | "password" | null;

/**
 * Password focus wins over a wrong guess so the eye can still shut while typing.
 * Success and the lock stay put, or the reaction would vanish on the next click.
 */
function moodFor(verdict: Verdict, focus: Field, failedAttempts: number): EyeMood {
  if (verdict === "success") {
    if (failedAttempts === 0) return "impressed";
    if (failedAttempts === 1) return "sarcastic";
    return "disbelief";
  }
  if (verdict === "locked") return "locked";
  if (focus === "password") return "privacy";
  if (verdict === "wrong") return failedAttempts <= 1 ? "sideeye" : "cocky";
  if (verdict === "bad-email") return "badmail";
  if (verdict === "empty") return "unimpressed";
  if (focus === "email") return "watch";
  return "idle";
}

function lineFor(
  verdict: Verdict,
  focus: Field,
  failedAttempts: number,
  winLine: string,
  idleAlt: boolean,
) {
  if (verdict === "success") return winLine;
  if (verdict === "locked") return COPY.lockPrimary;
  if (focus === "password") return COPY.password;
  if (verdict === "wrong") return failureLine(failedAttempts);
  if (verdict === "bad-email") return COPY.badEmail;
  if (verdict === "empty") return COPY.empty;
  return idleAlt ? COPY.idleAlt : COPY.idle;
}

function Facepalm() {
  return (
    <svg className="facepalm" viewBox="0 0 78 70" aria-hidden="true">
      <rect x="40" y="4" width="22" height="22" fill="#F9E84B" stroke="#251B28" strokeWidth="3" />
      <circle cx="51" cy="15" r="5" fill="#251B28" />
      <rect x="46" y="8" width="4" height="4" fill="#FFF7E8" />
      <path d="M18 28 H58 V36 H64 V62 H14 V36 H18 Z" fill="#F071B5" stroke="#251B28" strokeWidth="3" />
      <path d="M22 28 V14 H30 V28" fill="#FFF7E8" stroke="#251B28" strokeWidth="3" />
      <path d="M32 28 V8 H40 V28" fill="#FFF7E8" stroke="#251B28" strokeWidth="3" />
      <path d="M42 28 V16 H50 V28" fill="#FFF7E8" stroke="#251B28" strokeWidth="3" />
      <path d="M24 44 H48" fill="none" stroke="#251B28" strokeWidth="3" />
    </svg>
  );
}

export default function App() {
  // The ref is the count evaluateSubmit reads. State can lag by a render,
  // and a second Enter in that gap would otherwise spend two attempts at once.
  const failsRef = useRef(0);
  // Survives Reset demo on purpose, so the next first-try line can rotate.
  const cleanWins = useRef(0);
  const shakeTimer = useRef(0);
  const shakeFrame = useRef(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focus, setFocus] = useState<Field>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [winLine, setWinLine] = useState<string>(COPY.first);
  const [idleAlt, setIdleAlt] = useState(false);
  const [shake, setShake] = useState(false);
  const [blinkTick, setBlinkTick] = useState(0);
  const [blinkPace, setBlinkPace] = useState<Exclude<BlinkPace, "none">>("fast");

  const locked = verdict === "locked";
  const signedIn = verdict === "success";
  const settled = locked || signedIn;
  const mood = moodFor(verdict, focus, failedAttempts);
  const line = lineFor(verdict, focus, failedAttempts, winLine, idleAlt);
  const emailInvalid = verdict === "bad-email";
  // One empty message, on the first empty field, so the two inputs never announce the same sentence.
  const emailEmpty = verdict === "empty" && email.trim() === "";
  const passwordEmpty = verdict === "empty" && password === "" && email.trim() !== "";
  const attemptNote = signedIn ? null : attemptsLeftLine(failedAttempts);

  useEffect(() => {
    const id = window.setInterval(() => setIdleAlt((value) => !value), 7000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(shakeFrame.current);
      window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  function triggerShake() {
    window.cancelAnimationFrame(shakeFrame.current);
    window.clearTimeout(shakeTimer.current);
    setShake(false);
    // Restarting the class on the next frame replays the CSS animation.
    shakeFrame.current = window.requestAnimationFrame(() => {
      setShake(true);
      shakeTimer.current = window.setTimeout(() => setShake(false), 560);
    });
  }

  function pokeBlink(pace: Exclude<BlinkPace, "none">) {
    setBlinkPace(pace);
    setBlinkTick((tick) => tick + 1);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (settled || failsRef.current >= MAX_FAILED_ATTEMPTS) return;
    const outcome = evaluateSubmit({
      email,
      password,
      failedAttempts: failsRef.current,
      cleanWins: cleanWins.current,
    });
    failsRef.current = outcome.failedAttempts;
    cleanWins.current = outcome.cleanWins;
    setFailedAttempts(outcome.failedAttempts);
    setVerdict(outcome.verdict);
    if (outcome.verdict === "success") setWinLine(outcome.winLine);
    if (outcome.blink !== "none") pokeBlink(outcome.blink);
    if (outcome.shake) triggerShake();
  }

  function edit(field: "email" | "password", value: string) {
    if (settled) return;
    if (field === "email") setEmail(value);
    else setPassword(value);
    // Hide the last hint while they fix it. The miss count stays.
    if (verdict === "empty" || verdict === "bad-email" || verdict === "wrong") setVerdict(null);
  }

  function fillDemo() {
    if (settled) return;
    const next = demoAutofill();
    setEmail(next.email);
    setPassword(next.password);
    if (verdict === "empty" || verdict === "bad-email") setVerdict(null);
  }

  function resetDemo() {
    window.cancelAnimationFrame(shakeFrame.current);
    window.clearTimeout(shakeTimer.current);
    failsRef.current = 0;
    setShake(false);
    setEmail("");
    setPassword("");
    setVerdict(null);
    setFailedAttempts(0);
    setWinLine(COPY.first);
    setFocus(null);
    setIdleAlt(false);
    setBlinkPace("fast");
  }

  return (
    <main className="stage">
      <span className="pixel pixel-a" aria-hidden="true" />
      <span className="pixel pixel-b" aria-hidden="true" />
      <span className="pixel pixel-c" aria-hidden="true" />

      <section
        className={shake ? "card shake" : "card"}
        data-mood={mood}
        data-locked={locked ? "true" : "false"}
        aria-labelledby="door-kicker"
      >
        {locked ? <p className="stamp">Locked</p> : null}
        <p className="kicker" id="door-kicker">
          Judgment.exe
        </p>
        <p className="deck">A fake door with a real opinion.</p>

        <div className="eye-anchor">
          <JudgmentalEye mood={mood} blinkTick={blinkTick} blinkPace={blinkPace} />
        </div>

        <div className="speak" aria-live="polite">
          <p className="bubble" key={line}>
            {line}
          </p>
          {attemptNote ? (
            <p className={failedAttempts === 0 ? "attempts" : "attempts chip"}>{attemptNote}</p>
          ) : null}
          {locked ? (
            <div className="lockout">
              <Facepalm />
              <div>
                <p className="lock-title">{COPY.tryAgain}</p>
                <p>{COPY.lockSecondary}</p>
                <p className="lock-note">{COPY.simulated}</p>
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              placeholder="name@place.com"
              value={email}
              disabled={settled}
              aria-invalid={emailInvalid || emailEmpty}
              aria-describedby={emailInvalid ? "email-error" : emailEmpty ? "email-empty" : undefined}
              onChange={(event) => edit("email", event.target.value)}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus((current) => (current === "email" ? null : current))}
            />
            {emailInvalid ? (
              <p className="field-error" id="email-error">
                {COPY.badEmail}
              </p>
            ) : null}
            {emailEmpty ? (
              <p className="field-error" id="email-empty">
                {COPY.empty}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="password"
              value={password}
              disabled={settled}
              aria-invalid={passwordEmpty}
              aria-describedby={passwordEmpty ? "password-empty" : undefined}
              onChange={(event) => edit("password", event.target.value)}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus((current) => (current === "password" ? null : current))}
            />
            {passwordEmpty ? (
              <p className="field-error" id="password-empty">
                {COPY.empty}
              </p>
            ) : null}
          </div>

          <button type="submit" className="submit" disabled={settled}>
            Enter
          </button>
        </form>

        <div className="demo" role="group" aria-label="Demo credentials. This is not a real login.">
          <p className="demo-kicker">Demo credentials</p>
          <p className="demo-note">Demo only. Nothing you type is saved or sent.</p>
          <dl>
            <dt>Email</dt>
            <dd>{DEMO_EMAIL}</dd>
            <dt>Password</dt>
            <dd>{DEMO_PASSWORD}</dd>
          </dl>
          <div className="demo-actions">
            <button type="button" className="demo-win" onClick={fillDemo} disabled={settled}>
              Use demo credentials
            </button>
            <button type="button" className="demo-reset" onClick={resetDemo}>
              Reset demo
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
