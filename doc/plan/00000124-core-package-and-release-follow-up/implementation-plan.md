# Implementation Plan — Story 00000124, Core package and release: follow-up

## What this story does

This story brings story 122's documents and `CONTRIBUTING.md` up to date,
now that the first core release has run. Story 122 was merged with its
release workflow (Step 9) not yet run. GitHub only offers a
`workflow_dispatch` workflow once its file is on the default branch, so it
could not be run on the story branch. The owner then ran it from `main`,
and it passed. This story records that, and corrects what the documents
say about where a release can be run and who runs it. No code, workflow or
ruleset changes.

`story.md` in this folder is the owner's statement of the change.

## Process

The owner asked for this story to be done inline in the main session, not
through the `/implement-story` pipeline, and left uncommitted until the
owner had reviewed the changes in the editor. The owner then approved
skipping the peer review (see `peer-review.md`), and the whole story was
committed as one commit.

## The release that was run

These facts come from the server repository's report on the online-play
design doc (a comment on its "Handover" section, 2026-10-11). The owner
started both runs by hand from `main`; the server repository's Claude only
checked them.

- Release `core-a9d534e`, a prerelease on `a9d534e`, story 122's merge
  commit on `main`.
- First run, 38183438060: passed in 1m49s.
- Second run on the same commit, 38183793157: passed in 11s and changed
  nothing.
- The notes read `branch: main`, then `commit: <full commit>`.
- The only asset is `core-a9d534e.tgz`, and its sha256 matches GitHub's
  digest.
- It installs on Node 22, with `CORE_BUILD` `a9d534e` and version
  `0.0.0-a9d534e`.
- Its exports match the agreed boundary, and `DesyncError` is an `Error`
  subclass.

## Decisions

- **Correct story 122 in place.** The owner's standing rule is that
  `story.md` is corrected to what was actually built, not left stale with
  a note elsewhere. Story 122's `story.md` said a release runs "on any
  branch" and that its verification ran on the story branch. Both are
  corrected to what happened.
- **Story 122's plan keeps Step 9's original verification text.** Only its
  Status and Notes change. The Notes say the manual check ran from `main`
  after the merge rather than on the branch, and why: that is a deviation,
  and deviations are recorded in Notes.
- **Who runs a release is written in `CONTRIBUTING.md`.** The owner has
  ruled that the server repository never changes this repository, and
  starting the workflow publishes a release here. So this repository owns
  every release. Today the owner starts it by hand from the Actions tab,
  and there is no `gh` in the dev container. Setting that up is later,
  unscheduled work, so the document says it is done by hand without
  promising more.
- **The design doc is already updated.** Its handover section was reworked
  in the session that planned this story, so no step touches it.
- **Out of scope:** the core cannot go on when both sides can neither move
  nor attack (peer-review item 2 of story 122). Ending such a game is its
  own story.

## Steps

### Step 1 — Story 122's records

Status: committed

Notes: Implemented as planned. Step 9's Notes keep the branch-side work
and add the run from `main`; story 122's peer review is unchanged.

In `doc/plan/00000122-core-package-and-release/`:

- `implementation-plan.md`, Step 9: set Status to `committed`. Add to its
  Notes that the manual verification ran from `main` after the merge, why,
  and its result (the facts under "The release that was run"). Leave the
  step's own verification text as written.
- `implementation-plan.md`, "After merging": record that the first
  release ran (`core-a9d534e`) and that the listed points were added to
  the design doc.
- `story.md`, "The release workflow" item 1: a release runs on `main`, or
  on a branch that contains the workflow file.
- `story.md`, "After merging" and "Verification": say the release was run
  and checked from `main` after the merge, with the release tag.

Depends on: nothing.

Verification (automated): `npm run format:check` passes. A read-through
confirms no step in story 122's plan is left open, and each fact matches
"The release that was run".

### Step 2 — Who runs a core release

Status: committed

Notes: Rewrote the "Running a core release" bullet in `CONTRIBUTING.md`
as planned.

In `CONTRIBUTING.md`, "Running a core release": replace "on any branch"
and the sentence saying no branch can run until the file is on `main`. It
should say a release runs on `main`, or on a branch made from `main` since
the workflow arrived. Then say this repository runs every release: the
owner starts it by hand from the Actions tab, and the online-play server
repository only downloads and pins a release, never starting or changing
anything here.

Depends on: nothing.

Verification (automated): `npm run format:check` passes, and the bullet
matches the Decisions above.

### Step 3 — README check

Status: committed

Notes: `README.md` does not mention the core or its releases, so it needs
no update. This was checked directly, since the diff touches only planning
documents and `CONTRIBUTING.md`.

Confirm `README.md` needs no change. It is written for players and is not
expected to describe the core release.

Depends on: Steps 1 and 2.

Verification (automated): the README either needs no change or is updated
to match.
