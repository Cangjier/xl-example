# composite-probes — 复合 case 的结构异常复现（不入账）

2026-10 复合 case 压力测试中新增 7 条「自圆其说」的 case。其中 4 条仍是 `throw`，已进入
`typescript/cases/tts/cases/throw/composite/` 作为新缺口；`async-pipeline` 判为 `incremental`，
按 `tts` 的账本契约移除，不在此保留。

以下两条是**合法 TS**（`ts.parseDiagnostics` 为 0），但触发 `tts` 判据的结构异常
（`divergent` / `invalid`）。按 `typescript/cases/tts/README.md` 的契约，它们不能放进 `cases/`
（会让 `run.mjs` FAIL），因此作为**复现文件**保存在这里，供后续实现修复时使用：

| 文件 | 判据 | 实测 reason |
| --- | --- | --- |
| `class-inheritance.ts` | `divergent` | 两种模式的 EOF shape 树不同（结构 / pos / 起点） |
| `namespace-store.ts` | `invalid` | legacy 解析即抛错：不支持的表达式起点 |

## 复算方式

把它们临时复制回 `typescript/cases/tts/cases/throw/composite/`，再跑：

```powershell
node typescript/cases/tts/run.mjs --show throw/composite/class-inheritance
node typescript/cases/tts/run.mjs --show throw/composite/namespace-store
```

预期分别得到 `actual=divergent` 与 `actual=invalid`；验证完请从 `cases/` 删除，保持账本只含
`throw` 条目。

## 备注

- `class-inheritance.ts`：abstract class / extends / super / override / private 参数属性 / 数组 / for-of。
- `namespace-store.ts`：namespace / interface / enum / type alias / function / class / 参数属性。
- `async-pipeline.ts`（已移除）：type alias union / async-await / try-catch / fetch / for-of / 三元；
  实测 `actual=incremental`，说明该组合已在增量路径下自洽。
