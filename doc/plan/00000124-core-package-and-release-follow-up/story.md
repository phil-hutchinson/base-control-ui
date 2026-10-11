# Story 00000124 — Core package and release: follow-up

## Summary

Story 122 was merged before its release workflow had been run, because
GitHub only lets a hand-run workflow start once the workflow file is on
`main`. The owner then ran the first release, `core-a9d534e`, from `main`
by hand, and it passed every check. This story brings story 122's records
and the contributor documentation in line with what actually happened, and
with how releases are run from now on.

Nothing changes for a player, and no code changes.

## What changes

### Story 122's records

- Its plan's last open step, the release workflow, is marked done, with
  the result of the run from `main`: the release tag, both runs, and what
  was checked.
- Its "After merging" work, which was to run the first release from `main`
  and add the core's details to the online-play design doc, is recorded as
  done.
- Its story says, as it was built:
  - A release can be run on `main`, or on a branch that contains the
    workflow file, not on any branch.
  - The release workflow's check ran on `main` after the merge, not on the
    story branch.

### How a core release is run

`CONTRIBUTING.md` says:

- A core release can be run on `main`, or on a branch made from `main`
  since the workflow arrived, and on no other branch.
- **This repository runs every core release.** The online-play server
  repository downloads and pins a release, and never starts, reruns or
  changes anything here.
- **For now the owner starts a release by hand**, from the Actions tab.
  Running it from the dev container is a later piece of work.

## What does not change

- **The workflow, the core and the app.** This is a documentation change
  only.
- **The ruleset.** No rules-version bump and no changelog entry.
- **When both sides can neither move nor attack.** The game currently
  cannot go on in that case. Ending such a game is a separate story.

## Verification

- Story 122's plan has no step left open, and its records match the
  release that was published.
- `CONTRIBUTING.md` describes who runs a core release, and where it can be
  run.
