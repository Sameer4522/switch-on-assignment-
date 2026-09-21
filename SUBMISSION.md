# Submission

## Video walkthrough

**Link:** https://drive.google.com/file/d/15a0YSZqtUBZwbhHKO18hUV9a7fMH5Qs8/view?usp=sharing

---

## How to run it

Nothing beyond `npm install && npm run dev`. Chaos is on by default and I left it
that way the whole time, so everything here was built against it rather than
turned on at the end.

One thing that will confuse you if you watch the Network tab in dev: StrictMode
double-invokes effects, so you'll see pairs of identical requests. That's React,
not a de-duplication failure. `npm run build && npm run preview` shows the real
request counts.

## Time spent

About 3 hours, spread over a few evenings. Roughly how it split:

- reading `API.md` and poking the server with a throwaway node script before
  writing any UI
- the fetch layer (errors, cancellation, retry) and search correctness
- pagination and virtualization, which took longer than I expected because of a
  CSS bug I'd inherited (defect 22 below)
- bulk actions and conflict handling
- states, offline, error boundary
- measuring and writing this up

---

## Baseline defects found

I tried to keep this precise rather than long. Everything below I actually
reproduced, either in the browser or with a node script against the server.

| #   | Defect                                                                                                                                                                                   | Where                         | Status                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------- |
| 1   | Bulk update sends every selected id in one call, so anything over 50 fails with `400 too_many_ids`                                                                                       | `App.tsx`                     | fixed                     |
| 2   | A slow earlier response overwrites a newer one. The effect resolves and calls `setState` with no ordering guarantee                                                                      | `useAssets.ts`                | fixed                     |
| 3   | No request cancellation anywhere. Superseded searches run to completion and still cost rate-limit budget                                                                                 | `client.ts`                   | fixed                     |
| 4   | Every keystroke fires a request. Nothing debounced                                                                                                                                       | `App.tsx`                     | fixed                     |
| 5   | Detail panel has the same unguarded race. Open A then B quickly and A can land last                                                                                                      | `AssetDetail.tsx`             | fixed                     |
| 6   | Pagination is dead code. `nextCursor` is stored in state and never read, so the app shows 24 of 12,400 forever                                                                           | `useAssets.ts`                | fixed                     |
| 7   | `handleSaved` is an empty function, so a successful save never reaches the grid                                                                                                          | `App.tsx`                     | fixed                     |
| 8   | Bulk clears the whole selection on any resolved response including `207`, so the failed ids are lost and there's nothing left to retry                                                   | `App.tsx`                     | fixed                     |
| 9   | `409` is sticky. The panel never refreshes `asset.version`, so every later save sends the same stale version and also 409s. Only a close and reopen recovers it                          | `AssetDetail.tsx`             | fixed                     |
| 10  | Selection survives a filter change, so the bulk bar can act on rows that are no longer on screen                                                                                         | `App.tsx`                     | fixed — selection clears  |
| 11  | No retries. ~6% of list loads and ~12% of single saves fail outright, both of which the contract marks retryable                                                                         | `client.ts`                   | fixed                     |
| 12  | Errors flattened to `` `${status}: ${detail}` ``, throwing away the documented `error.code`. No caller can tell retryable from not, and raw server text reaches the user                 | `client.ts`                   | fixed                     |
| 13  | Identical concurrent requests are not de-duplicated                                                                                                                                      | `client.ts`                   | fixed                     |
| 14  | Loading, empty and error all render as the empty state. On a failed first load the grid says "Clear the search box or widen the status filter", which is wrong advice for a 503          | `AssetGrid.tsx`               | fixed                     |
| 15  | No error boundary, so any throw below `App` blanks the page                                                                                                                              | `main.tsx`                    | fixed                     |
| 16  | No offline detection. A dropped connection surfaced `Failed to fetch`                                                                                                                    | —                             | fixed                     |
| 17  | Query state lives only in component state, so reload or sharing the URL loses the view                                                                                                   | `App.tsx`                     | fixed                     |
| 18  | No virtualization. Every row handed to the grid is rendered                                                                                                                              | `AssetGrid.tsx`               | fixed                     |
| 19  | Toggling one checkbox re-renders every card. No memo, and `selectedIds` is a fresh `Set` each time                                                                                       | `AssetGrid.tsx`               | fixed                     |
| 20  | Thumbnails requested for the 510 assets whose `hasThumbnail` is `false` — a guaranteed 404 each — with no `onError` fallback                                                             | `AssetGrid.tsx`               | fixed                     |
| 21  | No `loading="lazy"`, and the panel thumbnail reserves no space so it shifts the layout when it lands                                                                                     | `AssetGrid.tsx`, `styles.css` | fixed                     |
| 22  | `.grid` sized its rows to fit the container instead of their content, so cards were always clipped and the grid never overflowed. Not on my first pass — I only found it when I measured | `styles.css`                  | fixed                     |
| 23  | Grid is unreachable by keyboard. Cards are `div`s with `onClick`, no `tabIndex`, no `role`, no key handling                                                                              | `AssetGrid.tsx`               | knowingly left            |
| 24  | Checkbox has no accessible name, selection isn't exposed via `aria-selected`, and there's no live region for counts or bulk outcomes                                                     | `AssetGrid.tsx`               | knowingly left            |
| 25  | Detail panel does nothing about focus. Opening doesn't move into it, closing doesn't return, `Escape` doesn't close                                                                      | `AssetDetail.tsx`             | knowingly left            |
| 26  | The four statuses don't read as a progression, and `.pill--draft` has no rule at all so draft falls back to the default pill                                                             | `styles.css`                  | knowingly left            |
| 27  | Status filter is stored in click order, so ticking draft then approved produces a different cache key than approved then draft for an identical query                                    | `App.tsx`                     | knowingly left (see cuts) |

Two things I checked and decided **not** to claim as defects:

- **Text contrast already passes AA.** I ran the WCAG formula over the tokens in
  `styles.css` rather than eyeballing it: body `#1b1d21` on white is 16.88:1,
  muted `#62676f` on `#f5f6f8` is 5.26:1, accent 5.61:1, danger 6.90:1. The
  `--line` border is 1.37:1, which fails the 3:1 non-text rule, but that's a
  component boundary, not text.
- **The falsy-zero guards can't fire.** `{asset.width && …}` and
  `{asset.durationSec && …}` would render a bare `0`, but I read the generator:
  `durationSec` is `int(4,900)` and `width` comes from a non-zero list. It's a
  smell, not a live bug, so I left it.

### What I reproduced before writing any of the above

- **The race is real.** Firing `q=tra` and then `q=trail runner` 120 ms later,
  `trail runner` (569 matches) landed at +474 ms and `tra` (1,205 matches) at
  +707 ms. The earlier request finished 233 ms _after_ the newer one, so the
  baseline replaced 569 correct rows with 1,205 wrong ones.
- **The bulk cap is hard.** 50 ids returns `207`, 51 returns `400 too_many_ids`.
- **Partial failure isn't only chaos.** With `CHAOS=0` a 50-id bulk still came
  back `applied 47, failed 3`. 1,169 of the 12,400 assets (9.4%) carry
  `legal-hold`, which fails deterministically.
- **The conflict really is sticky.** Three PATCHes with the same version:
  `200`, `409`, `409`.
- **Missing thumbnails:** 510 of 12,400 (4.1%).

---

## Key decisions

**Data fetching and caching**

TanStack Query, wrapped in `useFetchQuery` / `useFetchInfiniteQuery` /
`useFetchMutation` so the defaults live in one file. I went with it mainly for
one reason: cancellation, de-duplication and retry are the same problem, and I'd
rather solve them once in a layer that's been tested by other people than
hand-roll three interacting mechanisms. The wrapper exists so that `gcTime`,
`staleTime` and the retry policy can't drift apart across call sites.

What I rejected: writing my own cache. I did start down that road and the
cancellation part was fine, but partial rollback on top of my own store was
where it got ugly.

**Stale response handling**

This is the bit I'd point at first. The query key is `["assets", filters]`, and
`filters` contains the search text. So a response for `tra` has _nowhere to
write_ once the key is `trail runner` — it isn't that I detect the stale
response and ignore it, it's that there's no slot for it. Same mechanism kills
the `stale_cursor` problem: changing a filter creates a different cache entry
which starts from `initialPageParam: undefined`, so a cursor issued for the old
query is never sent. I never handle `400 stale_cursor` because it can't happen.

**Debounce interval: 300 ms**

The rate limit is 80 requests per 10 seconds, so 8/sec. A fast typist at ~5
characters a second would produce 5 requests a second with no debounce, and
that's before pagination and thumbnails. 300 ms turns a 6-character word into
one request. I didn't go higher because past roughly 400 ms the box starts to
feel like it's lagging behind you.

**Virtualization approach**

TanStack Virtual over rows, with the column count from a `ResizeObserver` so the
grid stays responsive. `.grid` is now just a scroll container; a `.grid__canvas`
div holds the full virtual height and only visible rows render, positioned with
`translateY`.

The cost, and I want to be upfront about it: the virtualizer needs a predictable
row height, so `.card` is a fixed 250 px, the thumbnail is a fixed 150 px with
`object-fit: cover` instead of `aspect-ratio`, and `.card__name` truncates with
an ellipsis instead of wrapping. Variable-height rows would mean dynamic
measurement and a lot more machinery. Fixed height also happens to make the grid
easier to scan, so I'm not unhappy about it, but it was a constraint first.

**Optimistic updates and rollback**

In `useBulkStatus.ts`, and it reads in execution order on purpose:

1. remember each selected asset's current status (they're not all the same)
2. flip them all in the cache, so the grid updates immediately
3. send in chunks of 50
4. put back only the ids that failed

I deliberately didn't use `onMutate` / `onSuccess` with a context object. It's
the idiomatic pattern but it puts the rollback three callbacks away from the
thing it undoes, and I found the single top-to-bottom function much easier to
hold in my head.

Bulk uses plain `useMutation` with **no** retry, unlike the single update.
Retrying the mutation would resend chunks that had already succeeded. Failures
come back per-item instead, and the UI offers a retry for just that subset.

**`409 version_conflict` — the one with more than one right answer**

On conflict I refetch the asset and then ask. The panel says what it is now and
offers "Still set in review" or "Keep their change".

My reasoning: auto-overwriting throws away someone else's review decision, and
auto-discarding throws away this user's intent. Both are real losses and neither
is mine to pick. Status here isn't an incidental field, it's a workflow
decision, so a human should make it. "Still set" re-submits with the _fresh_
version, which is exactly what was broken in the baseline.

If this were a field where last-write-wins is obviously fine (a description,
say) I'd merge silently and not bother the user.

**Retry and backoff policy**

One predicate in `useFetchQuery.ts`:

```ts
retry: (failureCount, error) =>
  failureCount < 3 && [429, 500, 503].includes((error as ApiError).status),
retryDelay: (attempt, error) =>
  (error as ApiError).retryAfterMs ?? 500 * 2 ** attempt + Math.random() * 300,
```

It keys off the HTTP status, not the message, so `400`, `409` and `422` can
never be retried by accident. `Retry-After` wins when the server sends it,
because retries count against the rate limit and second-guessing the server
there only makes things worse. Jitter on the fallback so concurrent queries
don't line up.

I only listed the three statuses this server actually returns. I had 408, 502
and 504 in there at one point and took them out, because carrying codes for
cases that can't occur is just noise.

**State placement and URL sync**

`useUrlFilters` treats the URL as the single source of truth. `apply()` writes
to history and then _re-reads_ the URL to set state, so the two can't disagree.

Search uses `replaceState` and filters use `pushState`, which is why typing a
5-character word leaves one history entry instead of five.

One subtlety worth knowing: only the URL and query key get trimmed, never the
input. Trimming the input looked right until I realised that pausing on
`"trail "` would eat the space and the next keystrokes would give you
`"trailrunner"`.

---

## Performance

Measured on Windows 11, Chrome 153, against the dev server with chaos on.
Because it's dev, StrictMode is double-invoking, so if anything these are
pessimistic. Bundle is from the production build.

| Metric                                          | Before                                                                                  | After                                                                        | How measured                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendered DOM nodes at 5,000 rows loaded         | baseline couldn't reach 5,000 — pagination was dead and it capped at 24 rows / 24 cards | **40 cards, 321 total DOM nodes** (virtual canvas 262,000 px, JS heap 24 MB) | scrolled to exactly `5000 of 12,400 shown`, then `document.getElementsByTagName("*").length` via a puppeteer script                                                                                      |
| Cards re-rendered when toggling one selection   | all of them — no memo, and a new `Set` identity on every toggle                         | **1**                                                                        | temporary counter incremented in the `AssetCard` body, zeroed, one checkbox clicked, then read back. Reported 2 in dev because StrictMode renders twice; the other 34 mounted cards didn't render at all |
| Longest task during sustained scroll            | n/a — the grid never overflowed, so it couldn't be scrolled (defect 22)                 | **0 tasks over 50 ms**                                                       | `PerformanceObserver` on `longtask` across 120 scroll steps with 5,000 rows loaded                                                                                                                       |
| Requests fired while typing a 6-character query | 6 (one per keystroke)                                                                   | **1**                                                                        | counted `/api/assets` requests in puppeteer while typing `runner` at 90 ms/char                                                                                                                          |
| Production bundle, gzipped                      | 48 kB (per the README)                                                                  | **71.4 kB JS + 1.3 kB CSS**                                                  | `npm run build`                                                                                                                                                                                          |

**What the actual bottleneck was, and how I found it**

Honestly, not what I expected. I assumed render cost and went looking for it.
What I actually hit was a layout bug: `.grid` was sizing rows to fit the
container rather than their content, so 50 cards got 65 px each, the name and
status were clipped away by `overflow: hidden`, and `scrollHeight` equalled
`clientHeight` so the grid never scrolled and pagination never fired.

I'd guessed at it twice from reading the code and been wrong both times. What
found it was driving headless Chrome and printing `getComputedStyle`, then
running the same measurement against the stashed baseline to see whether I'd
caused it. I hadn't: the baseline did the same thing at 24 rows (143 px rows
holding a 164 px thumbnail), it was just subtle enough to look like a design
choice. Raising the page size from 24 to 50 doubled the rows and halved their
height, which is what made it obvious.

The lesson I'd take from it is the one this brief is making: I should have
measured before I theorised.

**On the bundle**

+13 kB React Query, +5 kB TanStack Virtual, the rest app code. I think it earns
it: 40 DOM nodes instead of 12,400, one request per word instead of six, and
retry/cancellation/de-dup I didn't have to write or maintain. If a 48 kB ceiling
were a hard requirement I'd drop TanStack Virtual first — with a fixed row
height it's about 15 lines of arithmetic to replace.

---

## Accessibility

**I didn't do this task.** There's no `aria-`, `role=` or `tabIndex` anywhere in
`src/`, so the honest summary is: the grid is still mouse-only, the checkboxes
are still unnamed, and nothing is announced.

**I did not run a screen reader.** I'm not going to claim a pass I didn't
observe.

What I'd build, in the order I'd build it:

1. Roving tabindex on the cards, `role="grid"` / `row` / `gridcell`, arrow keys
   for movement, `Enter` to open, `Space` to toggle, `Shift+arrow` to extend the
   range I already have the logic for
2. Focus into the panel on open and back to the originating card on close, plus
   `Escape`. This one worries me most in combination with virtualization —
   focus can land on a node that gets unmounted when the row scrolls out, and
   I'd want to test that properly rather than assume
3. `aria-selected` on the cells and accessible names on the checkboxes, which is
   cheap and I should probably have just done
4. A polite live region for result counts and bulk outcomes, debounced so it
   doesn't fire on every keystroke

Why it got cut: I chose to finish tasks 1 to 4 properly instead of starting 5
and 6 shallowly, on the basis that the brief says depth beats coverage. I think
that was the right call but I'm aware it leaves the one non-optional person in
the brief unserved, and I'd do this first with another day.

---

## Interface decisions

**Also largely not done.** It still looks like the wireframe you sent, and I'd
rather say that than dress up four CSS tweaks as a visual system.

What did change, because the engineering tasks demanded it:

- **States.** Loading, empty, error, offline and partial failure are now five
  distinct things rather than one. The grid renders exactly one of loading,
  error or empty, decided by three ordered early returns instead of an
  `assets.length === 0` check standing in for all three. Loading is skeleton
  cards at the real card height, so nothing shifts when data lands.
- **Copy.** I rewrote every message a user can see. `429: Too many requests in
the last 10 seconds.` became "You are offline. MediaVault will pick up where
  it left off once the connection is back" or "These results could not be
  loaded. MediaVault did not answer. Nothing has been lost", depending on what
  happened. Bulk failures are named per asset with a reason in plain words:
  "Winter Coat Unretouched MV-02948 — on legal hold" rather than a code.
- **Contrast.** Checked, not estimated — numbers in the defects section. The
  inherited palette already passes AA for text, which is why I left it alone
  instead of changing colours for the sake of it.

Not done: the token system, status reading as a progression, status surviving
colour-blindness, and the narrow-window pass. Defect 26 is the specific thing
I'd fix first — `.pill--draft` has no rule at all, so the four statuses are
currently three colours and an accident.

---

## Trade-offs and cuts

- **Tasks 5 and 6.** Deliberate, for the reason above. Biggest gap in the
  submission.
- **Bulk chunks go sequentially, not three at a time.** A plain `for` loop with
  an `await` is much easier to read than wave-batching with `Promise.all`, and
  one at a time is bounded by definition so it can't contribute to a retry
  storm. The cost is speed: 500 assets is 10 sequential requests, roughly 3 to 4
  seconds behind an "Updating assets…" indicator. If that felt slow in real use
  I'd put concurrency back; it's a two-line change.
- **`ids.includes()` inside a loop in `useBulkStatus`.** At 500 selected against
  1,750 loaded that's ~875k string comparisons. A `Set` makes it O(1) and I
  should just do it. It doesn't show up in the numbers, which is the only reason
  it's still there.
- **Bulk keeps the optimistic status but discards the server's fresh `version`**
  (`applied` is `string[]`, not `Asset[]`). The list carries a stale version
  number afterwards. It's recovered because the panel refetches on open and the
  `409` flow handles a mismatch, but it is a shortcut.
- **The `catch` in `useBulkStatus` rolls back the UI, not the server.** If chunk
  1 succeeds and chunk 2 throws, everything goes back on screen including
  chunk 1, which the server really did apply. UI and server disagree until the
  next refetch. `invalidateQueries` there instead of a blind rollback is the
  right fix and it's one line — I ran out of time to test it properly and
  didn't want to ship it unverified.
- **No offline write queue.** The brief calls it a bonus. Skipped.
- **Defect 27** (status filter stored in click order) is unfixed. Same filters
  in a different order produce a different cache key, so you pay for one
  duplicate request. `readList`-style canonical ordering fixes it, it just
  didn't make the cut.
- **No tests.** Optional per the brief, and with the time left I judged a sharp
  test of the chunk-and-rollback logic wouldn't get written well enough to be
  worth more than the measurements above. If I wrote one it would be that, not
  markup snapshots.

With another day: task 5 in full, then the `Set` and the `invalidateQueries`
fixes, then the status progression from task 6.

---

## Critique of the API

- **Bulk doesn't take `version`, but `PATCH` requires it.** So the same
  conceptual operation has optimistic concurrency in one place and none in the
  other. A bulk action can silently clobber an edit someone made a second
  earlier, and there's no way for me to prevent it from the client. I'd either
  accept `{id, version}` pairs and return `conflict` per item, or drop the
  requirement from `PATCH` for consistency.
- **Two different error shapes for the same thing.** Bulk reports per-item
  failures inside a `207` body; single `PATCH` reports the same conditions
  (`legal_hold`, conflict) as a top-level `4xx`. I ended up with two code paths
  for one domain concept. A `207` on single writes, or per-item codes shaped
  like the top-level envelope, would collapse them.
- **`400 stale_cursor` puts the burden in the wrong place.** Binding a cursor to
  its query is correct, but making it a hard error means every client has to
  remember to drop the cursor. I got this for free from how React Query keys
  things, but that's luck rather than the API helping. Returning the first page
  of the new query, or including the query fingerprint in the error so the
  client can recover, would be kinder.
- **No way to cheaply refresh versions.** After a bulk update I'd like to know
  the new `version` for 200 ids. `batch` caps at 25 and a bulk response only
  gives me assets for the ones that succeeded. That's the direct cause of the
  shortcut I listed in the cuts.
- **No rate-limit headers.** The limit is documented and retries count towards
  it, which is fair, but without something like `X-RateLimit-Remaining` I can
  only find the ceiling by hitting it. Proactive backoff is impossible; all I
  can do is react to a `429`.
- **Small one:** I can see `total` for the current filters but not how many of
  those are on legal hold. If I knew, I could warn before a bulk action instead
  of reporting 37 failures after it.

---

## Anything you would like us to look at

**`src/features/assets/useBulkStatus.ts`** is the file I'd most like to talk
about. It's the densest thing here and I rewrote it three times getting it
simple enough that the rollback is obvious from reading top to bottom.

**The `409` decision** in `AssetDetail.tsx`. You said there's more than one
defensible answer and I'd genuinely like to hear whether you'd have merged
silently instead of asking.

**Two things I'm unsure about:**

1. The fixed 250 px card height. It's a real constraint imposed by
   virtualization on a responsive grid, and I took the simple route. I'd like to
   know if you'd have paid for dynamic measurement instead.
2. Whether sequential chunking is a defensible reading of "bounded concurrency"
   or whether you'd read it as a cop-out.

And the honest one: I found defect 22 by measuring after guessing wrong twice.
If there's a habit I took away from this brief, it's that one.
