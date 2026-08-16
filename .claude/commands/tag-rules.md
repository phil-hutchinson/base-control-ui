Tag the current ruleset version on `main` and push the tag to origin.

This runs **after** the owner has merged a rules change to `main`, outside the
`/implement-story` pipeline. A tag is what makes an old ruleset recoverable:
this project keeps no backwards compatibility, so `git checkout rules-0.3` is
the only way to replay a game played under version 0.3.

## Procedure

1. Confirm the current branch is `main` and the working tree is clean. If
   either is false, stop and say so.
2. Run `git fetch` and confirm `main` is up to date with `origin/main`. If it
   is behind or has diverged, stop and report.
3. Read the version from the heading of `doc/ruleset/rules.md`, and the
   `RULES_VERSION` constant from the code. **They must match** — if they do
   not, stop and report both values; something was merged half-done.
4. Check `doc/ruleset/changelog.md` has an entry for that version. If not,
   stop and report.
5. Check whether the tag `rules-<version>` already exists, locally or on
   origin. If it does, stop and report — either the version was not bumped, or
   this has already been run.
6. Show the owner what you are about to tag: the version, the commit
   (`git log -1 --oneline`), and the changelog entry. Ask them to confirm.
   **[gate]**
7. Create an annotated tag `rules-<version>` on `HEAD`, with a message naming
   the version and summarizing the changelog entry in a line or two.
8. Push the tag: `git push origin rules-<version>`.
9. Report the tag name, the commit it points at, and confirmation that the
   push succeeded.

Never create the tag on anything but `main`, and never force-move an existing
tag — an already-published ruleset tag is permanent.
