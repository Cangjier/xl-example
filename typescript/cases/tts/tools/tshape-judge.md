# tshape-judge — 独立 tts 两段式判据工具

**不读 legacy、不比较 legacy。** legacy 不是标准，可能自身有错；比较它只会把错误合法化。

判据只有两段：

1. **逐字 AST line**：TS 没有官方的逐字打印/比较方案。工具导出 incremental 的逐字符 trace，
   并把 `docs/expected-token-time-shapes.md`（`let x = 2*3+1` 的 14 步范本）直接注入诊断包；
   由 LLM 只按范本诊断，**不提供 DSH 编写的“要求列表”**；有诊断再由 DSH 决策。
2. **增量 EOF 树**：逐字符增量到 EOF 的最终 shape 树与 `ts.createSourceFile` 对拍。
   默认完整解析（`SourceFileRunner.Parse`）只作辅助，不是本工具的标准。

## 命令

```powershell
# 第一段：逐字 trace（trace.json / trace-steps.jsonl / trace.md）
node typescript/cases/tts/tools/tshape-judge.mjs trace <case.ts>

# 查某几步的完整快照（step == 字符下标）
node typescript/cases/tts/tools/tshape-judge.mjs steps <case.ts> --from 10 --to 20

# 第二段：增量 EOF 树 vs ts.createSourceFile
node typescript/cases/tts/tools/tshape-judge.mjs ts <case.ts>

# 诊断包：范本 + 源码 + 逐字 trace + TS 结果（交给 LLM）
node typescript/cases/tts/tools/tshape-judge.mjs bundle <case.ts>

# 全量第二段：tts + tts-impl 所有 case
node typescript/cases/tts/tools/tshape-judge.mjs ts-all

# 全量 triage：逐字 trace 的成批补建/残留/抛错扫描（不代替 LLM 诊断）
node typescript/cases/tts/tools/tshape-judge.mjs scan-all
```

输出默认在 `tmp/tshape-judge/<case>/`：

| 文件 | 内容 |
| --- | --- |
| `trace.json` | 完整逐字符 JSON |
| `trace-steps.jsonl` | 一行一个 step，便于按步查询 |
| `trace.md` | 首见形状表 + shape 集合变化摘要（**不是**每字符全量） |
| `ts.json` | 增量 EOF 树 vs TS AST 的结构/位置/字段差异；`status` 为 `ok` / `diff` / `incremental-error` / `ts-invalid` |
| `judge-prompt.md` | 含范本、源码、trace、TS 结果的独立诊断包 |

## 退出码

- `ts`：0 = 与 `ts.createSourceFile` 一致；1 = 不一致 / TS 非法 / 解析抛错。
- `ts-all`：输出 `ok` / `diff` / `incremental-error` / `ts-invalid` 分类；有 diff、error 或 invalid 时 exit 1。
  当前基线（2026-10，默认 true 下 `tshape-judge ts-all`）：**426 条 `ok`、0 条 `moved`、3 条 `incremental-error`**；
  `structural` / `fields` 均为 0。
- `trace` / `steps` / `bundle`：正常 0；缺参/环境错误 2。

## 注意

- **驱动与开关必须和 `tts/run.mjs` 一致**：`EnableIncrementalShapes` + `EnableIncrementalVariableShapes`
  两个都打开。`tests/parse/token-time-shapes.mjs` 只开变量开关，不能用于本工具的全场景 trace。
- `trace.md` 只列 shape 集合变化；basic token 的逐步挂载用 `steps` 或 `trace-steps.jsonl` 查。
- `scan-all` 的 `maxConcreteBatch` 排除了变量语句骨架（范本 char 5 本来同刻出现三层 + 绑定名），
  只统计 concrete shape；它只是 triage，**是否合规仍由 LLM 按范本诊断**。
- 逐字 trace 的抛错信息来自真实驱动；个别异常会序列化成 `[object Object]`，诊断时以最后一步的树为准。
- 工具不修改 `tts/run.mjs`；后者仍是旧的 legacy 对拍账本，本工具是独立的第二套判据。
