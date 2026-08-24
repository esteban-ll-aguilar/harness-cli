## 1. Zero-dependency glob matching

- [x] 1.1 Add `matchGlob(pattern, filePath)` to `src/utils/fileUtils.js` (`*`, `**`,
      literal segments; normalizes `\` to `/`)
- [x] 1.2 Tests in `tests/runner.js`: `src/pages/**` matches `src/pages/foo/bar.tsx` and
      not `src/api/foo.ts`; `**/*.sql` matches `db/migrations/001.sql`

## 2. Rule scoping (glob field)

- [x] 2.1 Extend `parseArgs()` in `src/commands/rules.js` to accept `--glob=<pattern>`
- [x] 2.2 Persist `glob` in the rule's `.harnessrc` entry and `brain/rules/<id>.md`
      frontmatter (`addRule` + `applyPreset`); omit the key when not provided
- [x] 2.3 Add `rulesForFile(rc, filePath)` to `rules.js`: returns enabled rules with no
      glob OR a glob matching `filePath`
- [x] 2.4 Wire `harness context --for-file=<path>` (`src/commands/context.js`) to print the
      scoped rule list for that file
- [x] 2.5 `harness rules list` shows the glob (if any) next to each rule
- [x] 2.6 Tests: adding a rule with `--glob` persists it; `rulesForFile` filters correctly;
      unscoped rules always included

## 3. Spec drift detection (Guardian)

- [x] 3.1 Add `extractTaskPaths(tasksMdContent)` to `src/commands/review.js`
- [x] 3.2 Add `diffFilesForSpec(cwd)` (git diff working tree + staged, deduped; graceful
      "not a git repo" / "git not found" handling)
- [x] 3.3 New Guardian check in `review.js`: WARN listing diffed files not covered by any
      extracted task path; no check emitted if `tasks.md` has zero extractable paths
- [x] 3.4 Tests: flags an unexpected file; stays silent (PASS) when all changes are
      covered; graceful no-git-repo case

## 4. AGENTS.md template alignment

- [x] 4.1 Update `src/templates/brain/AGENTS.md` section 2 with explicit build/test/lint
      command placeholders and a PR/commit convention line
- [x] 4.2 Manually verify `harness init --auto` in a tmp dir still produces valid
      AGENTS.md (no automated test needed — template content only)

## 5. Wrap-up

- [x] 5.1 Run the full test suite, confirm 0 regressions
- [x] 5.2 Update `README.md` rules section with a one-line mention of `--glob`
- [x] 5.3 Commit
