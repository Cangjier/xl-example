# cases 去重记录（cases-hygiene）

- **task-309 / commit `f62fca13`**（"chore(cases): dedupe exact duplicate case lines"）：删除 `typescript/cases/*.ts` 中的精确重复用例行。
- 证据（git 推导）：`git diff --numstat f62fca13^ f62fca13 -- 'typescript/cases/*.ts'` = **+0 / -162**（11 个 stem 文件），
  即删除 162 行精确重复用例；distinct 用例集合不变，去重后基线 **4087 条 distinct**（后续 chunk 在 4087 上继续累加）。
- 影响：ast-json / ast-json-diff 的 total cases 因去重下降，但结构差 / 位置差 / 字段差保持全 0；快照随用例同步重生成。
- 本记录不改变任何 token / shape 行为。