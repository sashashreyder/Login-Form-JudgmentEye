import { useEffect, useId, useRef, useState } from "react";
import "./JudgmentalEye.css";

export type EyeMood =
  | "idle"
  | "watch"
  | "privacy"
  | "sideeye"
  | "cocky"
  | "locked"
  | "unimpressed"
  | "badmail"
  | "impressed"
  | "sarcastic"
  | "disbelief";

type Gaze = { x: number; y: number };
type Pace = "fast" | "dramatic";

type Props = {
  mood: EyeMood;
  blinkTick: number;
  blinkPace: Pace;
};

type Pose = {
  upper: number;
  lower: number;
  ry: number;
  brow: number;
  tilt: number;
  pupil: number;
  x: number;
  y: number;
};

type MoodSpec = {
  upper: number;
  lower: number;
  ry: number;
  brow: number;
  tilt: number;
  pupil: number;
  ix: number;
  iy: number;
  influence: number;
};

const MOODS: Record<EyeMood, MoodSpec> = {
  idle: { upper: 0.1, lower: 0.04, ry: 62, brow: 0, tilt: 3, pupil: 1, ix: 0, iy: 0, influence: 1 },
  watch: { upper: 0.02, lower: 0, ry: 66, brow: -1, tilt: -7, pupil: 1.08, ix: 0, iy: 0, influence: 1 },
  privacy: { upper: 1, lower: 1, ry: 62, brow: 0.15, tilt: 0, pupil: 1, ix: 0, iy: 0, influence: 0 },
  sideeye: { upper: 0.1, lower: 0.04, ry: 62, brow: -0.4, tilt: 12, pupil: 0.9, ix: 0.9, iy: -0.08, influence: 0 },
  cocky: { upper: 0.22, lower: 0.1, ry: 58, brow: 0.1, tilt: -22, pupil: 0.8, ix: 1, iy: 0.06, influence: 0 },
  locked: { upper: 0.28, lower: 0.12, ry: 56, brow: 0.5, tilt: 8, pupil: 0.72, ix: 0.1, iy: 0.08, influence: 0 },
  unimpressed: { upper: 0.22, lower: 0.08, ry: 58, brow: 0.45, tilt: 9, pupil: 0.9, ix: 0.82, iy: -0.05, influence: 0 },
  badmail: { upper: 0.08, lower: 0, ry: 64, brow: -0.55, tilt: -16, pupil: 1.05, ix: 0.35, iy: -0.2, influence: 0.12 },
  impressed: { upper: 0, lower: 0, ry: 78, brow: -1.2, tilt: -6, pupil: 1.42, ix: 0, iy: -0.2, influence: 0.35 },
  sarcastic: { upper: 0.02, lower: 0, ry: 72, brow: -0.65, tilt: -18, pupil: 1.12, ix: 0.4, iy: -0.12, influence: 0.15 },
  disbelief: { upper: 0, lower: 0, ry: 84, brow: -1.15, tilt: 4, pupil: 1.55, ix: 0, iy: -0.28, influence: 0.15 },
};

const BROW =
  "M 46 70 L 86 46 L 142 34 L 196 44 L 262 32 L 278 46 L 210 58 L 148 52 L 90 64 L 48 84 Z";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function changed(a: Pose, b: Pose) {
  return (Object.keys(a) as (keyof Pose)[]).some((key) => a[key] !== b[key]);
}

function damp(current: number, target: number, k: number) {
  // Ease toward the target instead of jumping. A larger k finishes sooner.
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 0.0035 ? target : next;
}

function eyePath(ry: number) {
  const cy = 124;
  const top = cy - ry;
  const bot = cy + ry * 0.92;
  return [
    `M 52 ${cy + 4}`,
    `C 78 ${top + 16}, 120 ${top - 10}, 176 ${top + 4}`,
    `C 236 ${top + 16}, 292 ${top + 34}, 306 ${cy - 6}`,
    `C 314 ${bot - 26}, 250 ${bot + 8}, 174 ${bot - 2}`,
    `C 98 ${bot - 8}, 40 ${bot - 28}, 52 ${cy + 4}`,
    "Z",
  ].join(" ");
}

function curve(y0: number, y1: number, control: number) {
  return `M 28 ${y0} C 110 ${control}, 236 ${control + 6}, 322 ${y1}`;
}

function lidShape(y0: number, y1: number, control: number, cover: number) {
  return `${curve(y0, y1, control)} L 322 ${cover} L 28 ${cover} Z`;
}

function desiredPose(mood: EyeMood, gaze: Gaze, shut: boolean): Pose {
  const preset = MOODS[mood];
  // A closed lid, or the password mood, ignores the pointer so the pupil does not swim under the lid.
  const tracking = mood === "privacy" || shut ? 0 : preset.influence;
  return {
    upper: shut || mood === "privacy" ? 1 : preset.upper,
    lower: shut || mood === "privacy" ? 1 : preset.lower,
    ry: preset.ry,
    brow: preset.brow,
    tilt: preset.tilt,
    pupil: preset.pupil,
    x: clamp(gaze.x * tracking + preset.ix, -1, 1),
    y: clamp(gaze.y * tracking + preset.iy, -1, 1),
  };
}

export function JudgmentalEye({ mood, blinkTick, blinkPace }: Props) {
  const rawId = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  // Pointer updates stay in a ref. Writing React state here would rerender the whole login form.
  const gazeRef = useRef<Gaze>({ x: 0, y: 0 });
  const [shut, setShut] = useState(false);
  const reducedRef = useRef(false);
  const [reduced, setReduced] = useState(false);
  const paceRef = useRef<Pace>("fast");
  const inputRef = useRef({ mood, shut });
  const lockStart = useRef(0);
  const openTimer = useRef(0);
  const [pose, setPose] = useState(() => desiredPose(mood, { x: 0, y: 0 }, false));
  const poseRef = useRef(pose);
  const seenBlink = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    if (mood === "locked" && inputRef.current.mood !== "locked") {
      lockStart.current = performance.now();
    }
    inputRef.current = { mood, shut };
  }, [mood, shut]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const node = svgRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 1.25);
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 1.6);
      const x = clamp(nx, -1, 1);
      const y = clamp(ny, -1, 1);
      const prev = gazeRef.current;
      // Skip tiny jitter so the damp target is not replaced on every pixel.
      if (Math.abs(prev.x - x) < 0.012 && Math.abs(prev.y - y) < 0.012) return;
      gazeRef.current = { x, y };
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedRef.current = media.matches;
      setReduced(media.matches);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let frame = 0;
    let stop = false;

    const tick = () => {
      if (stop) return;
      const input = inputRef.current;
      const desired = desiredPose(input.mood, gazeRef.current, input.shut);
      const rolling =
        input.mood === "locked" &&
        !input.shut &&
        !reducedRef.current &&
        performance.now() - lockStart.current < 1400;
      if (rolling) {
        const turn = (performance.now() - lockStart.current) / 170;
        desired.x = Math.sin(turn);
        desired.y = -Math.cos(turn) * 0.9;
        desired.upper = 0.02;
        desired.lower = 0;
        desired.brow = 0.55;
        desired.pupil = 0.84;
      }
      const current = poseRef.current;
      let next: Pose;
      if (reducedRef.current) {
        next = desired;
      } else {
        const dramatic = paceRef.current === "dramatic" && (input.shut || current.upper > 0.35);
        const lidRate =
          input.mood === "privacy" && !input.shut ? 0.11 : dramatic ? 0.09 : input.shut ? 0.48 : 0.16;
        next = {
          upper: damp(current.upper, desired.upper, lidRate),
          lower: damp(current.lower, desired.lower, lidRate),
          ry: damp(current.ry, desired.ry, 0.14),
          brow: damp(current.brow, desired.brow, 0.16),
          tilt: damp(current.tilt, desired.tilt, 0.16),
          pupil: damp(current.pupil, desired.pupil, 0.12),
          x: damp(current.x, desired.x, rolling ? 0.4 : 0.22),
          y: damp(current.y, desired.y, rolling ? 0.4 : 0.22),
        };
      }
      if (changed(current, next)) {
        poseRef.current = next;
        if (mounted.current) setPose(next);
      }
      if (!stop) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  function closeFor(hold: number) {
    window.clearTimeout(openTimer.current);
    setShut(true);
    // Idle blinks and success blinks share this timer, so one cannot reopen the other early.
    openTimer.current = window.setTimeout(() => {
      if (mounted.current) setShut(false);
    }, hold);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(openTimer.current);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let outer = 0;
    let inner = 0;
    const quietMood = (value: EyeMood) =>
      value === "privacy" ||
      value === "locked" ||
      value === "impressed" ||
      value === "sarcastic" ||
      value === "disbelief";

    const schedule = () => {
      const wait = 2800 + Math.random() * 3400;
      outer = window.setTimeout(() => {
        if (cancelled) return;
        if (quietMood(inputRef.current.mood)) {
          schedule();
          return;
        }
        paceRef.current = "fast";
        closeFor(140);
        if (Math.random() < 0.18) {
          inner = window.setTimeout(() => {
            if (cancelled || quietMood(inputRef.current.mood)) return;
            paceRef.current = "fast";
            closeFor(120);
          }, 300);
        }
        schedule();
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
  }, [reduced]);

  useEffect(() => {
    if (blinkTick === 0 || blinkTick === seenBlink.current) return;
    seenBlink.current = blinkTick;
    paceRef.current = blinkPace;
    const hold = blinkPace === "dramatic" ? 720 : reducedRef.current ? 80 : 150;
    closeFor(hold);
  }, [blinkTick, blinkPace]);

  const cy = 124;
  const outline = eyePath(pose.ry);
  const topOpen = cy - pose.ry - 16;
  const botOpen = cy + pose.ry + 18;
  const topControl = topOpen + pose.upper * (cy + 14 - topOpen);
  const bottomControl = botOpen - pose.lower * (botOpen - (cy - 14));
  const gazeX = pose.x * 40;
  const gazeY = pose.y * 18;
  const iris = `translate(${gazeX} ${gazeY}) translate(176 124) scale(${pose.pupil}) translate(-176 -124)`;
  const brow = `translate(0 ${pose.brow * 20}) translate(64 52) rotate(${pose.tilt}) translate(-64 -52)`;
  const clipId = `clip-${rawId}`;

  return (
    <svg className="eye" ref={svgRef} viewBox="0 -56 348 302" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <path d={outline} fill="#FFF7E8" />
        <path d="M58 132 L86 118 L78 146 Z" fill="#B8A1F2" />
        <g transform={iris}>
          <circle cx="176" cy="124" r="42" fill="#F071B5" stroke="#251B28" strokeWidth="4" />
          <circle cx="176" cy="124" r="20" fill="#F9E84B" stroke="#251B28" strokeWidth="3" />
          <circle cx="176" cy="124" r="10" fill="#251B28" />
          <rect x="166" y="114" width="8" height="8" fill="#FFF7E8" />
        </g>
        <path className="lid" d={lidShape(118, 112, topControl, -20)} />
        <path className="lid" d={lidShape(118, 112, bottomControl, 260)} />
      </g>

      <path className="outline" d={outline} />
      <path className="crease" d={curve(118, 112, topControl)} />
      <path className="crease lower" d={curve(118, 112, bottomControl)} />
      <path className="brow shadow" d={BROW} transform={`${brow} translate(5 5)`} />
      <path className="brow" d={BROW} transform={brow} />
    </svg>
  );
}
