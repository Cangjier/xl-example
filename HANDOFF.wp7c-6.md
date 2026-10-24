# HANDOFF — impl-wp7c-6 (WP-7 D-1, second wave)

STATUS: PARTIAL — batch 0 (root -> RootRuleTable) and batch 1 (2 classes migrated) done and green;
batches 2..N not started (round budget).
BRANCH: impl-wp7c-6 @ 46a02c81
BASE: impl-wp7c-5 @ b8b056b4

## Done
- Batch 0 (commit 6916e388): `typescript/tokens/items/root-item-rule.xl.md` switches from `CatalogGuide`
  to `RootRuleTable`: 9 edit points (imports 15-17, field 67, constructor 117-122, Count 133, Reset 143,
  Cache 191, At(index) 246, shape 379, CreateRules 1351). No candidate class touched.
- Batch 1 (commit 46a02c81):
  - `declarations/namespace-export-declaration-possible-shape.xl.md` -> `namespace-export-declaration-rule.xl.md`,
    class `NamespaceExportDeclarationRule extends RootRule`; judgement bodies byte-identical.
  - `declarations/export-assignment-possible-shape.xl.md` -> `export-assignment-rule.xl.md`,
    class `ExportAssignmentRule extends RootRule`; judgement bodies byte-identical.
  - `BuildByIndex` kept (root never calls it) but `catalog:CatalogGuide` -> `table:RootRuleTable`
    and `catalog.PossibleShapesComputeCache` -> `table.Cache`.
  - `files/source-file-shape.xl.md`: `CreatePossibleShapesCache` / `CreatePossibleShapes` typed
    `Array<IRootRule>` (required for the mixed state), imports/call sites renamed.
  - `items/root-rule-contract.xl.md`: new `RootRule.SlotBase = 100000` (see finding below).

## DECISIVE FINDING (corrects HANDOFF.wp7c-5 §2.1)
`PossibleShape.Slots` and `RootRule.Slots` are two independent counters, both from 0, and both feed the
SAME `PossibleShapeCache`, whose `Values` is an ARRAY indexed by slot. In the mixed state (2 rules +
11 possible candidates) they collide: `ExportAssignmentRule` (root slot 0) would read the state object of
`ImportDeclarationPossibleShape` (possible slot 0). Fix: `RootRule.SlotOf` now numbers from 100000.
The array is sparse but only a handful of slots are ever used. D-2 removes SlotBase when only one
numbering remains.

## Gate readings (this branch, force rebuild then tsc)
| item | reading | verdict |
|---|---|---|
| xl_build(force) | 512 written / 0 error / 1277 warning | PASS |
| tsc | exit 0 | PASS |
| ast-json (all) | 6167/6167 | PASS |
| ast-json-diff (all) | 6167/6167; structure 0 / position 0 / field 0 | PASS |
| real-dts-ast | 226 files / 226 ok / 0 crash | PASS |
| gates.ps1 -Tier standard | RESULT: PASS (tests/gates 1/8 known red) | PASS |
| xl_check | 0 error / 1277 warning | PASS |

## Not done
- Batches 2..N (import-declaration, class-declaration, interface, enum, module, import-equals,
  function, type-alias, export-declaration) — zero classes beyond the two above.
- `git ls-files '*possible*.xl.md'`: 20 -> 18 (the two renamed files are no longer possible shapes).
- 2 stale xl cache entries for the deleted dist products; `xl_orphans(prune:true)` clears them.
- `CreatePossibleShapes()` -> `CreateRules()` rename deferred until all 13 are migrated.

## Next (exact)
Same four steps as wp7c-5 §4, plus: every new `XxxRule extends RootRule` automatically gets a
collision-free slot (RootRule.SlotBase) — do NOT give them a PossibleShape-style slot.

## Pitfalls hit
1. Renaming a .xl.md leaves stale `dist/ts/**/*.ts` and `build/ts/**/*.js`; delete them BEFORE tsc or
   tsc compiles the old class too (false green). This round deleted both pairs up front.
2. `xl_check` reports E2004 for the two removed products until `xl_orphans --prune`.
3. gates.ps1 prints through Write-Host, so `2>&1 | Select-String` captures nothing — use $LASTEXITCODE.