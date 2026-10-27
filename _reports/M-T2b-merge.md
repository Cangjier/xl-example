# M-T2b merge report

## Merge

| item | value |
|---|---|
| target branch | `feature/all-possible-1027` |
| pre-merge HEAD | `e74fbc5c` (clean worktree) |
| merged ref | `refs/merge/t2b` → `ebc8a882` (`feature/all-possible-1027-t2b`) |
| merge base | `08a87d15` |
| merge commit | `84c003d4` (parents `e74fbc5c` `ebc8a882`, `--no-ff`) |
| conflicts | **0** (clean auto-merge; `statement-route-util.xl.md` auto-merged) |

Message: `merge(t2b): remove static bracket-create hook`

## Content carried by T2b

- deleted `typescript/tokens/statements/bracket-create-possible-hook.xl.md`
- deleted core `BracketCreatePossibleHook` interface / `Current` / abstract method
- deleted `BracketCreatePossibleTrigger.EnsureInstalled()` from `source-file-shape`
- trigger moved onto `BracketRoleCatalogHook.OnBracketCreated` → `TriggerBracketCreatePossible`
- narrow trigger now asks `BracketRoleHook.HandlesBracketCreatePossible()`

Verified in the merged tree:

- `TriggerBracketCreatePossible` in `bracket-role-catalog-hook.xl.md`: 4 occurrences
- `HandlesBracketCreatePossible` in `bracket-role-catalog-hook.xl.md` + `bracket.xl.md`: 4 occurrences
- the deleted `.xl.md` is absent
- `source-file-shape.xl.md` still calls `ContainerShapeCatalog.EnsureInstalled()` and
  `BracketRoleCatalogHook.EnsureInstalled()` — those are different hooks; only the
  `BracketCreatePossibleTrigger.EnsureInstalled()` line is gone.

## Verification (no gates run)

| check | result |
|---|---|
| `xl_build` (ts) | **0 errors** — 4 written, 634 skipped, 4 warnings |
| `tsc -p .` | **exit 0** |
| `node tmp/target-cases.mjs` (OFF) | **cases=30 ok=29 moved=0 diff=0 error=0 fallback=1** (29/1/0/0) |
| `node tmp/target-on.mjs` (ON) | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**, `pin-miss=1` |
| grep `BracketCreatePossibleHook` in `core` + `typescript` + `build` + `dist` | **0** |

### Warnings

- 3 × `E1107` duplicate-type warnings — pre-existing, unrelated to T2b.
- 1 × `E2004` orphan: `dist/ts/typescript/tokens/statements/bracket-create-possible-hook.ts`
  generated from the now-deleted source. Pruned with `xl_orphans {prune:true}`.
- A stale compiled `build/ts/typescript/tokens/statements/bracket-create-possible-hook.js`
  survived `tsc` (tsc never deletes outputs whose source vanished). It was untracked and
  gitignored; removed so the `build` grep is a real 0 rather than a false positive.

### ON reading — deviation from the expected 29/1, and why

The task expected ON `29/1` on the assumption that T3's ON fix was **not** in the tree.
It is: `7ff97547 merge(t3): member-name atom yields for control heads` (commit `0fd34c59`)
is already an ancestor of `e74fbc5c`. Measured on this tree, ON is therefore **30/0**:
026 no longer whole-file-falls-back, its AST is byte-identical, and
`pin-miss=1` is exactly case 026, whose table entry is pinned to `expect: "fallback"`.
Under OFF, 026 still falls back, so the OFF pin hits and OFF reads 29/1 as expected.

So ON `30 ok / 0 fallback / pin-miss=1` is the T3-already-merged reading of case 026, not a
regression and not a T2b interaction. This is the same reading the T3 merge produced.

## Cleanup

- T2b worktree (`xl-example-set/all-possible-1027-t2b`) junctions released and directory removed.
- `git update-ref -d refs/merge/t2b`.
- Final `git status --porcelain`: empty.
