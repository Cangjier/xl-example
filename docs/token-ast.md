# token 语料 AST 尺子（`typescript/cases/token-ast.mjs`）

`tests/cases/token/**/*.ts` 是 1703 份**真实多行** TS 文件（basic token / possible / build / close
各层行为的探针语料）。本尺子把 `typescript/cases/ast-json.mjs` 的口径原样搬过来，逐文件对拍：

- **TS 侧真值**：`ts.createSourceFile(file, source, ScriptTarget.Latest, true, ScriptKind.TS)` 的 `sf.statements`
- **产物侧**：`SourceFileRunner.Parse(source, file)` 的 `rootShape.Data`（本仓形状树）

两侧投影、三栏对拍、配对规则与 `ast-json-diff.mjs` 完全一致。**归一表与投影实现只有一份**：
`typescript/cases/ast-compare.mjs` 导出 `TS_KIND_ALIASES` / `createAstCore(ts).tsAst` / `cjAst` /
`norm` / `flatten` / `groupByKind` / `fieldOf`，`ast-json.mjs`、`ast-json-diff.mjs`、本尺子都 import 它，
任何一处都不再单独维护归一表。改动口径只改 `ast-compare.mjs` 一处。

## 跑法

```powershell
# 全量：逐文件一行（1703 行）+ 汇总
node typescript/cases/token-ast.mjs

# 只出汇总（比对基线时用这个）
node typescript/cases/token-ast.mjs --quiet

# 只列失败（crash / diff），不列 ok / ts-invalid / gap-now-passing
node typescript/cases/token-ast.mjs --fail-only

# 按「仓库相对路径」过滤：不含通配符按子串，含 * ? [ ] 按 glob
node typescript/cases/token-ast.mjs statements/stmt-while.ts
node typescript/cases/token-ast.mjs statements/            # 整目录（343 份）
node typescript/cases/token-ast.mjs "types/type-*"         # glob（222 份）

# 写 JSON 报告（schema 与 tmp/token-ast-baseline.json 一致：generatedAt + counts + rows[]）
node typescript/cases/token-ast.mjs --json tmp/self-baseline.json

# npm 脚本
npm run ast:token -- --quiet
```

退出码：**选中的集合里有 `crash` 或 `diff` → 1，否则 0**（`ts-invalid` 不算失败），可直接当门禁：

```powershell
node typescript/cases/token-ast.mjs --quiet statements/   # 有人把它修坏就非 0
```

## 判定与口径

| result | 含义 |
| --- | --- |
| `ok` | 两侧完全一致 |
| `crash` | `SourceFileRunner.Parse` 抛异常；报告完整 `InnerException` 链（最多 12 层）与真实根消息 |
| `diff` | 结构差 / 位置差 / 字段差至少一栏非空 |
| `ts-invalid` | TS 自己 `sf.parseDiagnostics.length > 0`；**尺子不测**，只计数 |
| `gap-now-passing` | 文件头有 `// xl:known-gap`，且现在已经对上（回归守卫） |

逐文件流程：

1. 读文件，**只去 BOM**。token 语料是真实多行文件，**不做** `typescript/cases` 那种行内 `\n` 转义解码。
2. TS 侧先解析；`parseDiagnostics` 非空 → `ts-invalid`，不再调本仓解析器。
3. 本仓解析器抛异常 → `crash`。
4. 都成功则按 `ast-json-diff.mjs` 的规则三栏分开报（三栏对应三种不同修法）：
   - **结构差**：按归一 kind 计数差（`Kind+1` / `Kind-1`）。
   - **位置差**：只在「该 kind 两侧个数相同」时按前序第 n 个配第 n 个，比 `pos`/`end`。
   - **字段差**：同 kind 同个数**且区间对上**才比 `text` / `name` / `isTypeOnly`（token 尺子只比这三项；
     TS 侧取值规则照抄 `ast-json.mjs`：字面量表取 `node.text`，ImportClause/ImportSpecifier/NamespaceImport/
     ExportSpecifier/NamespaceExport 的 `name`，`importClause.isTypeOnly` 上提到 ImportDeclaration）。
5. 三栏全空 → `ok`；文件标了 known-gap 则记 `gap-now-passing`。

`kind` 归一表（`ast-compare.mjs` 里的 `TS_KIND_ALIASES`）必须存在的原因：`ts.SyntaxKind` 是数值枚举，
同一数值挂多个别名，反查 `ts.SyntaxKind[number]` 只留最后一个名字（`NumericLiteral` → `FirstLiteralToken`、
`QualifiedName` → `FirstNode`、`ImportAttributes` → `AssertClause` …），而产物侧 kind 是形状类名，
永远不会是别名。表只一份，两侧才不会各自漂移出假的「结构差」。

## 基线（2026-10-21，`feature/quick-parse` 主干 `6920174b` + 本分支）

`node typescript/cases/token-ast.mjs --quiet`：

```
summary: total=1703 ok=1501 crash=162 diff=29 ts-invalid=10 gap-now-passing=1
known-gap:     3 file(s) (diff 2, gap-now-passing 1)
non-known-gap: 1700 file(s) (ok 1501, crash 162, diff 27, ts-invalid 10)
```

- 失败面：**crash 162 + diff 29**（其中 known-gap 的 diff 2），对应 IMPORTANCE §6 的 7 类 shape 问题；
  本尺子只负责**量**，不修 shape。
- known-gap 共 3 份：2 份仍有 diff、1 份 `gap-now-passing`（`types/gap-r1244-ctor-signature-generic-return-type.ts`，回归守卫）。
- 与 Lead 在 `tmp/recon-token4.mjs` 上的基线**逐行一致**：1703 行的
  `result / gap / note / expect / msg / chain / struct / pos / fields` 全等（比对脚本见汇报）。
- 过滤示例读数：`statements/` 343 份；`types/type-*` 222 份（210 ok / 11 crash / 1 diff）。

## 与 `ast:cases` 的关系

两者是同一把尺子的两个语料面，互不替代：

- `npm run ast:cases`：`typescript/cases/*.ts`，一行一用例，量 **4622** 条；
- `npm run ast:token`：token 真实多行语料，一份文件一用例，量 **1703** 份。

共享 `ast-compare.mjs` 后，`ast:cases` 读数保持 **4622/4622 完全一致、结构差 0 / 位置差 0 / 字段差 0**。

## 副作用：生成的快照被重新归一

统一归一表后，`ast-json.mjs` 生成的 `typescript/cases/*.ts-ast.json` 里，TS 反查名改按**规范名**落盘
（`FirstLiteralToken` → `NumericLiteral`、`FirstPunctuation` → `OpenBraceToken`、`LastStatement` →
`DebuggerStatement` 等），26 份快照共 932 行 `kind` 值随之改变；diff 侧对快照 kind 再归一一次是幂等的，
所以 **对拍读数不变**（仍 4622/4622、0/0/0）。这些快照是 `ast-json.mjs` 的生成物，跟着实现走。
