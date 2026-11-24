# XChangeAI

**Don't write the prompt. Borrow one that works.**

Live: https://xchangeai.app.space

Getting great work out of an AI takes a great set of instructions, and as AI does more of our work, fewer people will bother writing one. But someone already has: the student who figured out how to get real essays instead of filler, the analyst whose AI builds a DCF properly, the TA whose AI explains proofs step by step.

XChangeAI is a cozy bookshop of those instructions, called **packs**, for every subject and major. A college freshman with an essay due doesn't write a prompt: they take the essay pack off the shelf, hand it to their AI, and then ask their question.

How do you know a pack is any good? You **taste-test it**. Ask it something and get two answers side by side, one with the pack and one from the plain AI, in random order. Pick the better one, then see which was which. Those blind votes are each pack's score, so the best packs rise to the top.

> A note on words: nobody can retrain ChatGPT or Claude with a file. A pack is the set of instructions you hand your AI, and that part can be shared.

## What you can do

- **Find a pack for your task** and **take it home** as a Markdown file to give your AI before your question.
- **Browse the shelves** by subject (Writing, Finance, Engineering, Math, Coding...), search, and sort by best proven, most tested or newest.
- **Run a blind test** on any pack, then vote A, B or tie.
- **Read the receipts**: the latest blind votes other readers cast.
- **Take it home**: download the pack as a Markdown file ready to paste into your AI.
- **Publish a pack**: paste it or upload a `.md`/`.txt` file.
- **See who's in the shop**: live presence shows who's browsing and who's mid-test on a pack.
- **Read the How-to**: two guided paths (borrow or share) and where to paste a pack in ChatGPT, Claude or Gemini.
- **Play the game**: points for every blind vote, more when strangers pick your pack. Ranks run from Browser to Head Librarian. Covers earn stickers (New arrival, Rising, Staff pick, Bestseller) only with enough evidence. The leaderboard ranks packs by the lower bound of a 95% confidence interval on their win rate, so one lucky vote can't top it.

## How the blind test stays blind

1. `startTrial` (a server action) calls the AI twice in parallel with the same request and the same length rule: once with the pack as a fenced system instruction, once without.
2. It flips a coin for which side gets the pack's answer and saves the trial with `answerA` and `answerB`, **but not the side**.
3. The side goes into a separate collection, `trial_keys`, which **no member can read**, create, update or delete. Only server actions touch it.
4. `castVote` checks the voter owns the trial and has not voted, reads the key, reveals the side on the trial, and updates the pack's counters.

Because permissions are enforced in DeepSpace's Durable Object, not the UI, opening dev tools or calling the API directly doesn't reveal the answer early.

## DeepSpace features used, and why

| Feature | Where | Why it earns its place |
|---|---|---|
| Auth | every page under `(protected)` | Authors own packs; votes belong to real people; points are per person. |
| Records + RBAC | `src/schemas/` | `trial_keys` is unreadable to members (the blind test depends on it). Trials are private until voted (`read: 'published'` on `status = voted`), then become public receipts. Members cannot write any collection directly. Pack text is `immutable`. Owner fields are `userBound`. |
| Server actions | `src/actions/index.ts` | All scoring rules: author-only edits, one vote per trial, authors' votes on their own packs never count, daily test allowance, cascade delete. |
| AI | `startTrial` | Two answers per test. Billed to the person running the test (their JWT), not the app owner. |
| Realtime | `useQuery` on shelves, pack page, leaderboard | A stranger's vote moves the score, receipts and leaderboard on every open screen with no polling. |
| Presence | `usePresenceRoom('shop:floor')` in `ShopPresence.tsx` | "Who's in the shop": a live strip of who's browsing, *reading now* / *testing now* dots on covers, and "Priya is running a blind test on this pack" on a pack page. Ephemeral by design, nothing stored. Identity comes from the verified sign-in; the shared activity is parsed defensively because it comes from other clients. |

**Deliberately left out**

- **File storage (R2).** A pack is text under 20,000 characters. Storing it in the record keeps one permission model and lets it sync live; an uploaded file is read in the browser and saved as text. A blob store would add a second set of rules for no gain.
- **Payments.** Selling premium packs is a natural next step, but charging for something before the scoring is proven would be the wrong order.
- **Scheduled jobs.** The daily allowance is computed from timestamps, so nothing needs to run at midnight.
- **Collaborative editing.** Packs are written by one author; nothing here is co-edited.

## House collection

So the shop isn't bare on day one, `src/lib/house/` holds 31 packs across all 12 sections, each a full brief for the AI (expert role, quality bar, method, exact output format, mistakes to avoid, final self-check). When the app owner opens the shelves, any missing packs are added automatically (`stockHouseShelf`, admin-only and idempotent). An outdated house pack is replaced with the new edition only if no reader's vote has counted toward it, so real scores are never discarded. They are labelled **House collection** on the cover rather than credited to invented people, start with zero tests like any new pack, and earn no author points for anyone. Every one passes the same validation as a user-published pack (tested).

## Main tradeoff

**Pack text is final once published.** Authors can change the title, summary, shelf and sample request, but not the instructions. That makes improving a pack clunkier (you publish a new edition), but it means every vote a pack has was cast on the exact text people download. The alternative, editable packs with versioned scores, was more work than the deadline allowed and easier to get wrong.

## Design

The shop is meant to feel like a real bookshop, not a template: each subject has its own cloth binding, foil and pattern (`src/lib/genres.ts`), books stand on wooden shelves with brass plaques, stickers look like ones a bookseller would use, and the blind test is two taped manuscripts with a stamp revealing the pack. Fonts (Fraunces, DM Sans, Caveat, Courier Prime) are self-hosted through Fontsource, so no third-party font requests. Motion respects `prefers-reduced-motion`.

## Project layout

```
src/lib/xchange.ts                domain rules: validation, scoring, badges, ranks, prompts (pure, tested)
src/schemas/                      packs, trials, trial_keys and their permissions
src/actions/index.ts              server actions that enforce the rules
src/pages/(app)/(protected)/      shelves, pack/[id], publish, leaderboard
src/components/                   BookCover, ReadingCard
starter-packs/                    three real packs to publish on day one
```

## Commands

| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npx deepspace auth login` | sign in (opens a browser) |
| `npx deepspace app init` | register the app and its id |
| `npx deepspace dev start` | run locally at http://localhost:5173 |
| `npm run test:unit` | domain, server-action and schema tests |
| `npx deepspace deploy` | deploy to `xchangeai.app.space` (commit first) |

Needs Node 22.15+, 24 or 26 and npm 11.6+.

## Tests

`npm run test:unit` runs three layers:

- **Domain logic**: validation, coin flip, win/tie rules, win rate excluding ties, confidence ranking, badge thresholds, points and ranks, the UTC daily window, file export.
- **Server actions** against an in-memory fake of the action tools with the AI mocked: the trial never stores the side and the key lives apart; the coin decides the side; the daily limit holds and resets; a failed AI call or failed key write leaves nothing behind; votes are one per trial, owner-only and validated; authors can't move their own score; forged owner or counter values on publish are ignored; pack text can't be edited; delete cascades.
- **Schemas**: no SDK schema-lint warnings, no direct member writes, the key table is unreadable, pack text is immutable.

## Known limits and what I'd do next

- **Counter race.** `castVote` reads the pack, then writes the new totals. Two votes landing in the same instant could lose one. The fix is to recompute counts from trials, or a conditional write if the platform adds one.
- **First-draft packs lost.** The first house packs were short rule lists, and testers usually preferred the plain AI. Two causes: a strong base model already follows generic advice, and a 250-word cap cut the structure the packs asked for. The packs were rewritten as full briefs and the shared length rule was relaxed for both sides equally.
- **Same model on both sides.** Both answers come from the same model, so the test measures the pack, not the model. It can't tell you how a pack does on a different AI.
- **No moderation.** A pack could tell the AI to behave badly. The system prompt asks it to follow the pack only where it isn't harmful, and the blind test exposes bad packs, but there is no review queue.
- **Readers can see a voted trial's request.** That's what makes receipts work, but it means test requests are public once voted; the test form should say so more loudly.
- **Next:** editions (link a new version to the old one), creator profiles, and letting a reader test two packs against each other.
