# Judgment.exe

**A fake door with a real opinion.**

### Live Demo

[Try Judgment.exe](https://loginformjudgmenteye.vercel.app)

No signup required. Just bring your credentials. And your dignity.

Judgment.exe is a playful login screen with one illustrated eye. It watches the pointer, shuts when you reach for the password, and comments on how the attempt goes. After three wrong guesses it pretends to lock you out. The whole thing is a local UI demo for a portfolio, not a sign-in system.

Nothing you type is sent to a server. The only accepted pair is a public test login shown on the page.

## Features

- The pupil follows the pointer, with a little bias that depends on the eye’s mood.
- Focusing the email field lifts the eyebrow and keeps the pupil tracking.
- Focusing the password field closes the eye completely and pauses tracking.
- The eye blinks on its own every few seconds. That idle blink is skipped while the eye is shut, locked, or celebrating.
- Commentary appears in a comic speech bubble. The idle line alternates with “Let’s pretend I don’t remember last time.”
- Empty email or password shows “Submitting nothing? Interesting strategy.” beside the empty field. This does not spend an attempt.
- A value that is not shaped like an email shows “That’s not even an email. Impressive.” A `.com` ending is not required. This does not spend an attempt.
- A syntactically valid email plus any other password spends one of three attempts. The card shakes.
  - First miss: side-eye, a slightly raised brow, “I’ve seen better guesses.”, then “2 attempts left.”
  - Second miss: a harder side-eye and a cocked brow, “You seemed so confident.”, then “1 attempt left.”
  - Third miss: the eye rolls, then settles into a resigned look. The form locks.
- The lock screen says you are locked out for 24 hours and shows a small drawn facepalm. There is no real timer. **Reset demo** clears it immediately.
- **Use demo credentials** fills both fields and does not submit.
- A matching pair before the lock counts as success and does not spend an attempt. The success line depends on how many misses came first:
  - Zero misses: “Okay, impressive.” Later first-try successes in the same browser tab rotate through three other compliments. Refreshing the page starts that rotation over, because it is not stored.
  - One miss: “OMG, finally.” The eye looks surprised and a little sarcastic.
  - Two misses: “Well, that took a while.” The eye gives a slower blink, then opens wide.
- Success stays on screen, with the form disabled, until **Reset demo**.
- Before the first miss, the form says “3 attempts before I lose my patience.”

## Tech stack

| Piece | Role |
| --- | --- |
| [React 19](https://react.dev/) | UI and all demo state. |
| [TypeScript](https://www.typescriptlang.org/) | Types for moods, copy, and form state. The build runs `tsc -b` before bundling. |
| [Vite 8](https://vite.dev/) | Dev server, production build, and preview. |
| CSS | Theme variables, layout, the speech bubble, and motion. No utility framework. |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) | `npm run lint`. |

There is no backend, database, or authentication library.

## Installation and setup

You need Node.js and npm. This project was built with Node 22.

1. Clone the repository.

   ```bash
   git clone https://github.com/sashashreyder/Login-Form-JudgmentEye.git
   cd Login-Form-JudgmentEye
   ```

2. Install dependencies. `package-lock.json` is part of the repo, so npm can reproduce the same install.

   ```bash
   npm install
   ```

3. Start the dev server. Vite is configured to use port **4731**.

   ```bash
   npm run dev
   ```

4. Open [http://localhost:4731](http://localhost:4731).

5. Create a production build. This typechecks, then writes `dist/`.

   ```bash
   npm run build
   ```

6. Preview that build locally, again on port 4731.

   ```bash
   npm run preview
   ```

Lint the project with:

```bash
npm run lint
```

Run the logic tests (empty fields, the demo pair, the attempt count, lockout, reset, and the three success lines):

```bash
npm test
```

That typechecks `src/login.ts` and `src/login.test.ts`, then runs them with Node’s built-in test runner. No extra test library is installed.

## Demo credentials

These are fictional values used only by the in-browser check.

| Field | Value |
| --- | --- |
| Email | `you@again.com` |
| Password | `lookaway` |

Email matching ignores capitalization and surrounding spaces. The password must match exactly. They are also printed in the page under **Demo credentials**.

## How it works

All of the behavior lives in React state in the browser. Refreshing the page starts over. Nothing is written to `localStorage`, cookies, or a server.

`src/App.tsx` owns the form and which line the bubble shows. `src/login.ts` holds the copy, the attempt limit, the email-shape test, and `evaluateSubmit`, which decides what one submit does. `src/components/JudgmentalEye.tsx` draws the eye and animates it. The eye listens for the pointer itself, so moving the mouse does not rerender the form.

A submit goes through these checks, in order:

1. If the form is already in success or lockout, the submit is ignored.
2. If either field is empty, the empty-submit line appears. `failedAttempts` stays the same.
3. If the email does not match `isEmailShape`, the bad-email line appears. `failedAttempts` stays the same.
4. If `matchesDemo` is true, the success line is chosen from how many failures already happened, the eye reacts, and the form locks in that success until reset.
5. Otherwise the failure count goes up by one. With the default of three, the first miss and the second miss stay on the form, and the third becomes `locked`.

The count is also kept in a ref so two submits in a row cannot both read the same number and increment twice. Shake timers are cancelled on reset and when the card unmounts, so a shake cannot start after the demo has already been cleared. Blink timers share one “open the eye again” timeout, which is cleared on unmount, so an idle blink cannot cut a success blink short.

**Reset demo** clears the fields, the verdict, the count, focus, and the blink pace. It does not clear the in-memory tally of first-try wins, so the next clean success in that tab can show a different compliment.

While the password field is focused, and the form is not already celebrating or locked, the mood switches to `privacy`: both lids go to fully closed and the pupil stops following the pointer. The bubble says “Go ahead. I’m not looking.”

On the third miss, the eye rolls for about 1.4 seconds, then rests in the resigned `locked` pose. People who prefer reduced motion skip that roll and see the resigned pose immediately.

## Customization guide

You do not need a build step to try a copy or color change. Save the file and the Vite dev server will reload.

### Colors and visual theme

The shared palette is in `src/index.css`:

```css
:root {
  --ink: #251b28;
  --cream: #fff7e8;
  --yellow: #f9e84b;
  --pink: #f071b5;
  --lilac: #b8a1f2;
}
```

`--ink` is text and outlines. `--cream` is the page and card. `--yellow` is the speech bubble and a few shadows. `--pink` is the eye plate, error chips, and the lockout panel. `--lilac` is focus rings and the attempt chip.

A few colors are still written out in components, so a full recolor needs those too:

- `src/App.css` uses `#fffdf8` and `#efe6d4` on inputs, `#5c4e63` for placeholders, and `#d9d0c4` on disabled buttons.
- `src/components/JudgmentalEye.tsx` paints the sclera, iris, pupil, lids, and brow with hex values in the SVG (`#FFF7E8`, `#F071B5`, `#F9E84B`, `#251B28`, `#B8A1F2`).
- `src/App.tsx` has the same ink, pink, yellow, and cream values inside the `Facepalm` SVG.
- `public/favicon.svg` repeats the palette.

### Typography

Also in `src/index.css`:

```css
--display: "Arial Black", "Arial Bold", Impact, sans-serif;
--ui: "Trebuchet MS", "Segoe UI", sans-serif;
```

`--display` is used for the title, buttons, the attempt chip, and the lock stamp. `--ui` is the body font. The bubble is bold `--ui`, not a serif and not italic. Change those two variables, or override `.bubble` and `.kicker` in `src/App.css`.

### Layout and dimensions

`src/App.css` controls the card. The width is `min(460px, 100%)`, the border is 4px, and the offset shadow is `10px 10px 0`. Corners are uneven on purpose (`border-radius: 28px 6px 22px 10px`).

The speech bubble’s minimum height is `.bubble { min-height: 4.6rem; }`, so short and long lines do not jump the form around as much. The tail is the `.bubble::before` square, rotated 45 degrees.

Below 720px, the decorative corner squares (`.pixel`) hide. Below 560px, the card padding, radius, and shadow get smaller.

### Eye appearance and animations

`src/components/JudgmentalEye.tsx` is the drawing. Each mood is one entry in `MOODS`:

| Field | What it does |
| --- | --- |
| `upper`, `lower` | `0` is open, `1` is shut. `privacy` uses `1` for both. |
| `ry` | How tall the eye outline is. Success moods use a larger value. |
| `brow` | Negative lifts the brow. Positive lowers it. |
| `tilt` | Rotates the brow around its left side, in degrees. |
| `pupil` | Scale of the iris group. |
| `ix`, `iy` | A resting glance, from -1 to 1, added before the pointer. |
| `influence` | How much the pointer still moves the pupil. `0` means it holds the glance. |

The brow outline is the `BROW` path. `eyePath(ry)` builds the lopsided almond. Lids are pink shapes clipped to that almond, so a full close fills the eye instead of only squinting.

Pose changes are eased in the animation loop inside the same file. Password close uses a lid rate of `0.11`. A normal blink is faster (`0.48`) and lasts about 150ms. The two-miss success uses `blinkPace` `"dramatic"`, which closes more slowly and holds for about 720ms. Idle blinks are scheduled every few seconds in a `useEffect` in that file.

The roll on lockout lasts while `performance.now() - lockStart < 1400`. After that, the `locked` entry in `MOODS` is what remains.

### Cursor-tracking behavior

`JudgmentalEye` listens for `pointermove` and stores the result on a ref. The animation loop reads that ref. The form does not rerender just because the pointer moved. The measurement is against the eye’s own SVG, clamped to `-1…1`:

```tsx
const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 1.25);
const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 1.6);
```

Make the `1.25` or `1.6` larger if you want the pupil to move less for the same pointer travel. Changes smaller than `0.012` are ignored so tiny mouse jitter does not replace the target.

The eye turns that into pixels near the bottom of `JudgmentalEye`:

```tsx
const gazeX = pose.x * 40;
const gazeY = pose.y * 18;
```

`40` and `18` are the maximum travel in SVG units. Moods with `influence: 0` ignore the pointer and use only `ix` and `iy`.

### Sarcastic messages, errors, and lockout copy

Every sarcastic line the bubble can show is in the `COPY` object in `src/login.ts`. The patience sentence and the “attempts left” lines are built by `attemptsLeftLine`, so they stay tied to the attempt limit.

```ts
export const COPY = {
  idle: "Oh. It’s you again.",
  miss1: "I’ve seen better guesses.",
  // ...
};
```

Change the string, keep the key, and the bubble updates. The bad-email and empty-submit strings are reused next to the inputs, so you only edit them once.

`attemptsLeftLine(0)` is the patience sentence. After that it reports how many tries are left.

### Demo credentials

At the top of `src/login.ts`:

```ts
export const DEMO_EMAIL = "you@again.com";
export const DEMO_PASSWORD = "lookaway";
```

`matchesDemo` compares the trimmed, lowercased email with `DEMO_EMAIL` and the password with `DEMO_PASSWORD` exactly. The on-page list reads the same constants, so the printed pair and the check stay in sync.

### Maximum number of attempts

Change one constant in `src/login.ts`:

```ts
export const MAX_FAILED_ATTEMPTS = 3;
```

`evaluateSubmit`, `attemptsLeftLine`, and the patience sentence all read it. The default story is three steps: the first miss uses `COPY.miss1` and the `sideeye` mood, a later miss uses `COPY.miss2` and `cocky`, and the miss that reaches the limit locks the form. If you raise the limit, the extra misses before the lock repeat that second reaction. If you lower it, the lock replaces whichever step never gets to play. `COPY.lockPrimary` still says “Three attempts” until you edit that sentence yourself.

### Success states

`successLine(failedAttempts, earlierCleanWins)` in `src/login.ts` picks the line:

- `failedAttempts === 1` → `COPY.afterOne`
- `failedAttempts >= 2` → `COPY.afterTwo`
- otherwise the first clean win uses `COPY.first`, and later ones walk through `COPY.firstAlts`

`src/App.tsx` maps that same count to an eye mood: `impressed`, `sarcastic`, or `disbelief`. The in-tab clean-win tally is the `cleanWins` ref in `App`. It is not reset by **Reset demo**.

### Button labels

Visible labels are the button text in `src/App.tsx`:

- `Enter`
- `Use demo credentials`
- `Reset demo`

The title “Judgment.exe” is the `.kicker` in that same file. `index.html` sets the browser tab title and the meta description.

### Other UI behavior

- Shake distance and timing: the `shake` keyframes and `.card.shake` in `src/App.css`. `triggerShake` in `src/App.tsx` removes the class after 560ms.
- Lock stamp and pink shadow: `.stamp` and `.card[data-locked="true"]` in `src/App.css`.
- Facepalm drawing: the `Facepalm` function in `src/App.tsx`.
- Dev and preview port: `server.port` and `preview.port` in `vite.config.ts`.

## Project structure

```text
Login-Form-JudgmentEye/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tsconfig.test.json
├── .oxlintrc.json
├── .gitignore
├── LICENSE
├── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── index.css
    ├── App.tsx
    ├── App.css
    ├── login.ts
    ├── login.test.ts
    └── components/
        ├── JudgmentalEye.tsx
        └── JudgmentalEye.css
```

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell, tab title, and the script tag for Vite. |
| `package.json` | Dependencies and the `dev`, `build`, `lint`, and `preview` scripts. |
| `package-lock.json` | Locked dependency tree for `npm install`. |
| `vite.config.ts` | React plugin, dev server, and preview port. |
| `tsconfig.json` | Project references for the app and for the Vite config. |
| `tsconfig.app.json` | TypeScript settings for `src/`. |
| `tsconfig.node.json` | TypeScript settings for `vite.config.ts`. |
| `tsconfig.test.json` | Typecheck for the Node tests. Not part of the app build. |
| `.oxlintrc.json` | Oxlint plugins and the React hooks rules. |
| `LICENSE` | MIT license. |
| `public/favicon.svg` | Tab icon. Files in `public/` are served from the site root. |
| `src/main.tsx` | Mounts `<App />` inside React `StrictMode`. |
| `src/index.css` | Palette, fonts, and the page background. |
| `src/App.tsx` | Form, attempt count, success and lockout, demo buttons, and the facepalm. |
| `src/App.css` | Card, bubble, fields, buttons, lockout panel, and small-screen layout. |
| `src/login.ts` | Copy, demo pair, attempt limit, and `evaluateSubmit`. |
| `src/login.test.ts` | Node tests for validation, counting, lockout, reset, and success lines. |
| `src/components/JudgmentalEye.tsx` | SVG eye, moods, blinking, and the lockout roll. |
| `src/components/JudgmentalEye.css` | Stroke widths for the eye outline, lids, and brow. |

`node_modules/` and `dist/` are created locally and are not part of the source tree.

## Accessibility and responsive design

These are the pieces actually in the source. This README does not claim a formal accessibility audit.

- Email and password have visible `<label>` elements tied to the inputs with `htmlFor` / `id`.
- The inputs use `type="email"` and `type="password"`, plus `autoComplete="username"` and `autoComplete="current-password"`.
- Invalid or empty fields set `aria-invalid` and `aria-describedby` only when that field’s message is actually on the page. If both fields are empty, the sentence is attached to the email field, not duplicated under the password.
- The bubble, the attempt line, and the lockout copy sit in one `aria-live="polite"` region.
- The page section is named with `aria-labelledby`. The eye, facepalm, and corner squares are `aria-hidden` because the text already carries the meaning.
- Buttons and inputs show a lilac `focus-visible` outline.
- Success and lockout disable the fields, **Enter**, and **Use demo credentials**. **Reset demo** stays available.
- Enter in a field submits the form, because it is a real `<form>`.
- `@media (prefers-reduced-motion: reduce)` turns off the bubble pop, the card shake, and the button nudge. The eye code snaps to the next pose instead of easing, skips idle blinks, and skips the lockout roll.
- The card uses the viewport width up to 460px. Corner decorations hide from 720px down. Padding and the offset shadow shrink from 560px down.

## Security and limitations

This is not authentication.

- The demo pair is checked in the browser with `matchesDemo`. Anyone can read it in the source, and the page prints it on purpose.
- The application’s demo logic does not send email or password to a server. There is no login API in this repo.
- The “24 hours” lock is a label. **Reset demo**, or a refresh, clears it. Do not describe it as a security control.
- Do not use this project as a production sign-in. A real login needs a server, a hashed secret that never ships to the browser, session handling, and the rest of a normal auth design.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Author

[Sasha](https://github.com/sashashreyder)

## Future improvements

None of the items below exist yet. They are ideas, not current behavior.

- A small gallery of stills for the README, once screenshots are taken.
- A hosted demo link, once there is a public URL.
- More than one illustrated reaction, such as a second character, without turning this into a real account system.
- Extracting the remaining hardcoded SVG colors into the CSS variables so a recolor touches one file.
