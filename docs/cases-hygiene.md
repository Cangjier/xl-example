# Cases hygiene: dedupe record (task-309)

- Commit `f62fca13` "chore(cases): dedupe exact duplicate case lines" removed exact duplicate case lines from `typescript/cases/*.ts`.
- Evidence (from git): `git diff --numstat f62fca13^ f62fca13 -- 'typescript/cases/*.ts'` = **+0 / -162** across 11 stem files,
  i.e. 162 exact duplicate case lines removed; the distinct case set is unchanged, new baseline **4087 distinct cases**
  (later chunks keep accumulating on top of 4087).
- Effect: ast-json / ast-json-diff total cases drop because of the dedupe, while structural/positional/field diffs stay at 0;
  snapshots are regenerated with the cases.
- This record changes no token / shape behaviour.