# Pocket Shuffle Chess UX audit and Codex fix instructions

Audited on 2026-05-12 against both the production site (`https://chess.alphaden.club`) and the local Vite app (`http://127.0.0.1:5173`). Production currently requires `ignoreHTTPSErrors: true` in Playwright because Chromium reports `ERR_CERT_AUTHORITY_INVALID`; treat that as a deployment/certificate bug in addition to the UI issues below.

## Scope covered

- Home page, live leaderboard chip, leaderboard dialog, daily/random shuffle toggle, Play AI, Find Match, Invite Friend, More Options, Choose Date, Custom Seed, How It Works, setup preview/help text, and copy seed.
- Game page at `/daily`, including board, move selection, move execution, bot reply, move history, draw/resign/restart controls, confirmation modal, and result/end screen.
- Viewports tested: `320x568`, `360x740`, `390x844`, `768x1024`, `1024x768`, `1366x768`, plus a production spot check at `390x844` and `1366x768`.
- Interaction details tested: selecting a white pawn, attempting/performing a legal move, waiting for the bot move, resign confirmation, and the post-resign result panel.

## Overall rating

| Area | Rating | Notes |
| --- | ---: | --- |
| Visual identity | 8/10 | Strong toy-like chess identity, good palette, nice piece art, and memorable branding. |
| Home navigation | 6/10 | Fun, but primary tasks can sit below the first viewport on small phones and the desktop More card is hidden/inaccessible by pointer automation. |
| Responsive layout | 5/10 | No horizontal overflow in tested sizes, but vertical clipping/scroll positioning is heavy; desktop game board can extend below the viewport. |
| Gameplay clarity | 6/10 | Board is readable, but legal-move feedback was too subtle/incomplete during pawn selection and the page retains lots of controls behind modals. |
| Animation/effects | 7/10 | Piece spawn/land effects are polished; some motion is visually nice but not always paired with clear state feedback. |
| End screen | 5/10 | Result panel content is useful, but it appears after a large scroll jump on mobile and leaves the full game UI visually active behind it. |
| Accessibility | 5/10 | ARIA labels exist on board squares and dialogs, but modal focus/inert behavior, small tap targets, and visible focus need a full pass. |

## Priority 0: production certificate/deployment

1. Fix the TLS certificate chain for `https://chess.alphaden.club`.
   - Playwright Chromium rejected the production URL with `ERR_CERT_AUTHORITY_INVALID` unless `ignoreHTTPSErrors` was enabled.
   - Acceptance criteria: `await page.goto('https://chess.alphaden.club/', { waitUntil: 'domcontentloaded' })` succeeds without `ignoreHTTPSErrors` on a fresh Chromium profile.

## Priority 1: fix home page task access and clipping

### Findings

- On `320x568` production/local, the home page has no horizontal overflow, but the first viewport cuts through the action cards. Play AI and Find Match begin at the bottom edge, while Invite Friend and More Options are below the fold.
- On `390x844`, core actions are reachable, but the page still requires substantial vertical scrolling before the setup preview/help text is fully consumed.
- On `1366x768`, Playwright could not click `.home-action-more` because it resolves as not visible. The secondary buttons are visible, but this creates a split interaction model: mobile users use the More card, desktop users use secondary inline buttons. That makes the requested “More Options” route fragile and confusing.
- The home action grid and secondary actions are rendered separately, so the same tasks are duplicated and hidden at different breakpoints.

### Codex instructions

1. Refactor home option access in `src/pages/HomePage.tsx` so Choose Date, Custom Seed, and How It Works are always reachable through one consistent pattern.
   - Keep the large action card only if it is visible and pointer-clickable at desktop and mobile breakpoints.
   - Otherwise remove the card on all breakpoints and promote `secondary-home-actions` into the canonical “More” row with equal visual weight.
   - Ensure there is no invisible `.home-action-more` in the DOM that Playwright or assistive tech can target.
2. In `src/styles/app.css`, rework the home hero vertical rhythm for narrow screens.
   - For `max-width: 380px`, reduce hero title/brand vertical space, reduce action-card min-height, and show primary action controls before decorative preview content.
   - Make the action grid one column or a compact 2x2 grid only when all four cards can fit with readable labels.
   - Acceptance target: at `320x568`, the first viewport should show the shuffle pill, Daily/Random toggle, and at least the full Play AI card; by one short scroll, all primary actions should be fully visible.
3. Keep the leaderboard chip from monopolizing the top of small screens.
   - Collapse it to a single-line “Live Scores” pill or dock it after the hero title on `max-width: 380px`.
   - The chip should remain a `button` with `aria-label="Open leaderboards"`, but its list should not consume ~120px above the hero on the smallest screens.
4. Remove duplicate high-score rendering in the shuffle panel; the same `today-high-score-chip` is rendered inside and immediately after the pill.
5. Add regression checks with Playwright for these flows:
   - `320x568 /` can click Play AI, Random Shuffle, Open leaderboards, More/Choose Date, Custom Seed, and How It Works.
   - `1366x768 /` can reach all the same tasks with the same accessible names.

## Priority 2: make modals truly modal and mobile-safe

### Findings

- Leaderboard, More Options, Custom Seed, How It Works, Date picker, Confirm, and Result all leave lots of underlying controls measurable/click-targetable in the DOM. Some are offscreen due to scroll positioning, but they are still present and visually noisy in screenshots/body text.
- Close buttons in several utility modals measured at `36x36`, below the preferred 44px mobile target.
- Date modal created many small day buttons; this is expected for calendars, but the modal needs better spacing at `320x568`.

### Codex instructions

1. Implement a shared modal shell component for home utility modals and game confirmation/result modals.
   - Apply `aria-modal="true"`, set initial focus to the dialog title or first action, trap focus, close on Escape, and restore focus to the opener.
   - Set the app root outside the dialog to `inert` while any modal is open.
2. Update modal CSS so every close button and actionable control is at least `44x44` CSS pixels on touch layouts.
3. For the Date modal:
   - Keep the calendar scrollable inside the modal, not the full page behind it.
   - Use a compact month header and day grid on `320x568`.
4. For the leaderboard dialog:
   - Keep tabs sticky at the top of the dialog body if the list scrolls.
   - Preserve long names with ellipsis, but include full names in `title` or `aria-label`.

## Priority 3: improve game board fit and active-state feedback

### Findings

- On `1366x768`, the game page reports no document overflow, but the board frame extends below the viewport by roughly 14px. This makes the bottom coordinates feel clipped on laptop-sized screens.
- On `320x568` and `390x844`, the page scrolls heavily; the board is playable, but the player must scroll through header/meta, board, move history, and controls as one long document.
- Selecting a pawn produced a selected-square state, but legal destination cues were not obvious in the body/DOM dump. The yellow dot/capture rings should be unmistakable at phone sizes.

### Codex instructions

1. Revisit game layout sizing in `src/styles/app.css` and board sizing in `src/styles/board.css`.
   - Make the board width clamp against real available height including header, status, and action bars.
   - Acceptance target: at `1366x768`, the entire board frame including coordinates fits inside the viewport without clipping.
   - Acceptance target: at `390x844`, the board and the current-turn status are visible together after a minimal scroll, not separated by large metadata blocks.
2. On narrow screens, collapse match metadata into a details/summary card below the board or into a compact horizontal chip row.
   - Keep seed/back-rank/date accessible, but do not let them push the board out of the initial gameplay viewport.
3. Strengthen legal move indicators.
   - Increase dot size/contrast for empty legal targets on mobile.
   - Add a visible label/tooltip/announcement such as “2 legal moves” after selecting a piece.
   - Keep capture rings visually distinct from empty move dots.
4. Add a reduced-motion audit.
   - Existing board animations are good, but ensure every animation has a `prefers-reduced-motion: reduce` override.
   - Verify spawn/land/capture effects do not replay repeatedly when reviewing history.

## Priority 4: improve game interaction, controls, and end screen

### Findings

- The move flow works: selecting `White pawn at c2`, moving to `c3`, and waiting for the bot produced a black knight reply from `d6` to `e4` and populated move history.
- Resign opens a confirmation modal, then the result panel. The panel content is good, but on mobile the page scroll position jumps so the board/header are offscreen above the result panel. This feels like the app moved unexpectedly.
- The post-resign result says “Checkmate - Black wins this game!” even though the user resigned. That is incorrect and should be fixed.
- “Request Draw” remains visible in bot/single-player mode, where it is confusing.

### Codex instructions

1. Fix result reasons.
   - Add an explicit resignation result reason to the game status/result model.
   - When a player resigns, the result panel should say “You resigned” / “Black wins by resignation,” not “Checkmate.”
2. Result panel presentation:
   - Treat the result panel as the primary focus after game completion: scroll it into view intentionally or show it as a centered modal/sheet.
   - Keep the board visible in the background only if it is dimmed and inert.
   - Make “Next Game,” “Restart Match,” and “Submit Score” at least 44px high and stack cleanly on `320x568`.
3. Bot mode controls:
   - Hide “Request Draw” for bot games or replace it with “Offer Draw” only if the bot can actually respond meaningfully.
   - Keep “Resign” and “Restart Match” behind confirmations, but give the confirm modal specific copy (“Resign this game?” is good; “This action can change or reset…” is too generic).
4. Move history and review controls:
   - Keep review buttons accessible, but reduce visual priority before any moves exist.
   - After a move, ensure Live/previous/next buttons do not crowd mobile action controls.

## Priority 5: leaderboard and score submission polish

### Findings

- Production leaderboard returns rows, while local/dev without Supabase data shows “No scores yet.” Both states render.
- The live leaderboard chip animates fake/new-score pulses locally. This is visually fun but can make production/local audits misleading.
- Score submission on the result screen has a bare `NAME` label and no visible placeholder guidance in the body text dump.

### Codex instructions

1. Make leaderboard loading/empty/error states explicit.
   - Distinguish “No scores yet” from “Could not load scores.”
   - Add a visible loading state while fetching.
2. Ensure the live-score pulse uses real data when available and clearly labels mock/demo entries in development if they are synthetic.
3. Improve result score submission.
   - Label the name input as “Display name.”
   - Add helper copy explaining max length and leaderboard visibility.
   - Disable Submit Score until the name is valid and show inline validation.

## Suggested automated regression script

After implementing fixes, add a Playwright test file with this minimum matrix:

```ts
const viewports = [
  { width: 320, height: 568, name: 'small-phone' },
  { width: 390, height: 844, name: 'modern-phone' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1366, height: 768, name: 'laptop' },
];
```

For each viewport:

1. Visit `/` and assert `document.documentElement.scrollWidth <= window.innerWidth`.
2. Click Open leaderboards, switch all tabs, close.
3. Toggle Daily Shuffle and Random Shuffle.
4. Open Choose Date, Custom Seed, and How It Works; assert each dialog title is visible and close works.
5. Start `/daily`, select a legal piece, assert legal target UI appears, make one move, wait for bot response, and assert move history has both moves.
6. Open Resign, cancel, open Resign, continue, and assert the result reason is resignation-specific.
7. At `1366x768`, assert the board frame bottom is within the viewport.
8. At `320x568`, assert every visible button has a hit target of at least `40x40`, with goal `44x44` for primary controls.

## Manual QA checklist after fixes

- Check iPhone SE (`320x568`): no horizontal scroll; Play AI is obvious; More/Date/Seed/Rules are reachable; dialogs do not exceed viewport height without internal scroll.
- Check iPhone 12/13 (`390x844`): home looks balanced; setup preview does not crowd CTAs; game board is readable and legal move dots are obvious.
- Check tablet portrait (`768x1024`): home preview and CTAs do not feel overly stretched; modals have comfortable width.
- Check laptop (`1366x768`): full board including bottom coordinates fits; desktop path to Date/Seed/Rules is not hidden.
- Play one full interaction loop: daily game start, move, bot reply, history review, resign, result, submit score validation, next/restart.
- Test `prefers-reduced-motion: reduce` and keyboard-only navigation through home, modals, board squares, and result actions.
