# cover5-missing-end：§6「缺少 end」类别的探针、修复与用例

本文件记录 `cover5-missing-end` 这一轮的全部读数、真红清单、归类与根因、修复点、新增用例与遗留。
只改 `typescript/` 层（2 个规范页 + 1 个 case 文件），**未碰 `core/**`、未改 `typescript/IMPORTANCE.md`、未动其它类别的 case 文件**。

## 1. 任务边界

本轮只负责 IMPORTANCE §6 里的 **「缺少 end」**：某形态**根本没有终结候选 / 没有无分号 ASI 收口通道**，
导致整条语句/声明丢失、被兜底成别的形状、或抛「没有读完」类错误。
**不属于**本类别（遇到即记录、不入用例）：

- 「终结候选存在但 ComputeByIndex 判错」（end compute）；
- 「Accept 对了但 BuildByIndex/close 取错 End」（end build）；
- 「缺少 possible / possible compute」（`@dec` 前缀等）。

## 2. 读数

| 项 | 基线（HEAD `5362a38`） | 本分支 |
| --- | --- | --- |
| `ast-json.mjs` 全量 | 5335 例 / 5335 cj-ok / 0 cj-fail（47 构造） | **5382 / 5382 / 0（47 构造）** |
| `ast-json-diff.mjs` 全量 | 5335/5335 完全一致；结构 0 / 位置 0 / 字段 0 | **5382/5382；结构 0 / 位置 0 / 字段 0** |
| `missing-end` stem | 68 / 68 | **115 / 115** |
| `token-ast.mjs --quiet` | known-gap 0；non-known-gap 1704（ok 1694、ts-invalid 10） | **同左，未变** |
| `real-dts-ast.mjs` | 226 文件 / 解析 226 / 崩溃 0 / AST 一致 226 | **同左，未变** |
| `tsc -p tsconfig.json` | 0 error | 0 error |
| `xl_check`（改动的 2 个文件） | 0 error（仅既有 W3102/W3103 + 3 个 E2004 孤儿产物） | 0 error（同上） |

用例增量：**+47**（5335 → 5382；`missing-end.ts` 68 → 115），全部是「修复前 CRASH/形状错、修复后完全一致」的真红。

## 3. 探针与判定口径（硬性）

- TS 真值：`ts.createSourceFile(..., ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)` 的 `statements` + `parseDiagnostics`；
- 本仓：`build/ts/typescript/run/source-file-runner.js` 的 `SourceFileRunner.Parse`，形状树按
  `typescript/cases/ast-compare.mjs` 的 `cjAst` 投影；
- 三栏比较（结构 / 位置 / 字段）与 `ast-json-diff.mjs` 同一口径（`/tmp/probe-missing-end.mjs`）；
- **只有 TS `parseDiagnostics.length === 0` 且（CRASH 或三栏任一不一致）才算真红**，TS 自己非法的形态一律不测。

探针文件（`tmp/` 不进 git）：`probe-missing-end.mjs`（对拍）、`trace.mjs`（包装 `CatalogGuide.ComputePossibleShapesByIndex`
打印候选存活 / BUILDABLE / BUILD / TRAILING 记录）、`candidates*.json` 候选池、`reds-missing-end.json` 结论。

候选池三轮共 **301 条**（208 + 108 + 85，去重前）；其中 TS 非法 9 条（`module M` / `namespace N` / `export default enum` 等，尺子不测）。
最终收录的 48 条候选：**基线 47 红 / 1 绿**（绿的那条 `export import x = A.B` ⏎ `class C {}` 基线已通过，按规范不收录），修复后 **48 绿 / 0 红**。

## 4. 真红清单（47 条，4 组）

完整逐条数据见 `tmp/reds-missing-end.json`（input / 本仓现象 / TS 语句 / 本仓语句 / 正确收口点）。

### 4.1 A 组：语句体 / 语句自身的换行收口通道缺失（19 条）

| 形态 | 现象 |
| --- | --- |
| `while (a) b` ⏎ `c;`、`if (a) b` ⏎ `c;`、`for (;;) b` ⏎ `c;`、`for await (const x of y) b` ⏎ `c;`、`with (a) b` ⏎ `c;` | CRASH「语句没有读完」 |
| 同族 trivia / 重复形（行尾注释、块注释、空行、体换行、链式 else、两条循环连排） | 同上 |
| `lab: a` ⏎ `c;`、`lbl: while (a) b` ⏎ `c;` | CRASH「终结候选与其它候选同时成立（宿主 SourceFileShape）」 |
| `debugger` ⏎ `c;`（含空行 / 行尾注释 / 前置语句 / 前置 class） | **形状错**：`ExpressionStatement` 整条丢失，本仓只剩 `DebuggerStatement` |

**TS 侧**（diag=0）：`while (a) b` ⏎ `c;` = `WhileStatement[0,11]` + `ExpressionStatement(c;)[12,14]`；
`debugger` ⏎ `c;` = `DebuggerStatement[0,8]` + `ExpressionStatement[9,11]`；`lab: a` ⏎ `c;` = `LabeledStatement[0,6]`。

**归类**：**缺少 end**——控制语句的**体**、`debugger`、被标语句的体都没有「换行处收口」这条通道，
不是终结候选判错（这几种根本没有终结候选）。

**根因（file:line）**

1. `typescript/tokens/statements/statement-scanner.xl.md:521` `ScanExpressionBody`（原 :507）：循环只认 `;` 与 EOF，
   **没有 ASI 判据**。`while (a) b` ⏎ `c;` 的体扫描在 `b` 之后接着吃 `c`，最后在 `;` 处 `Complete`，
   `StatementPossibleShape.BuildByIndex`（`statement-possible-shape.xl.md:107`）按 `start..end` 切出整段，
   `builder.At !== builder.Units.length` → 抛「语句没有读完」。
   同一条通道也被 `if` / `for` / `with` / 被标语句的体复用（`ScanBody` 的默认分支），所以是一条通道缺一整族。
2. `statement-scanner.xl.md:454` `ScanSimpleSemicolon`（原 :448）：`debugger` 之后只认 `;` / EOF，
   换行后到 `c` 时 `Mismatch` → 整段 leftover 拖到 EOF 哨兵，`BuildTrailingDeclaration` 的 `isSimpleStatement`
   分支（`source-file-end-possible-shape.xl.md:551` 起）把 `debugger … ;` **整段**交给 `StatementBuilder`
   建一条语句，后面的语句被吞掉。
3. `source-file-end-possible-shape.xl.md:75`（`ComputeByIndex`）：`IsAsiBoundary` 在 `lab: a` ⏎ `c` 处为真
   （语句头 `lab` 不是 `IsStatementWord`），终结候选 `Accept` 时 `StatementPossibleShape` 还活着
   → `core` 的 `CatalogGuide` 抛「终结候选与其它候选同时成立」。被标语句不是表达式语句，
   它的收口只能由 `StatementPossibleShape` 完成，需要终结候选让位。

**四问**

- **正确的应该什么时候 build**：`while/if/for/with/do` 的体、被标语句的体、`debugger` 在
  **换行处的 ASI 边界**就结束（`EndsAtLineBreak`：前一个代码单元能收尾 + 中间有换行 + 当前单元不是续接符），
  由 `StatementPossibleShape` 在那一格 `BuildByIndex` 建整条语句。
- **build 时应该提取哪些信息**：语句头（`WhileKeyword` / `IfKeyword` / 标签标识符 / `DebuggerKeyword`）+
  条件/体括号单元（`(…)`、闭合的 `{…}`）+ 体语句自身的子形状；语句 `End` = **最后一个代码单元**的
  `SourceRange.End`（`;` 不算，除非它属于本语句）。
- **什么时候 close**：三条边界——`;`（原本就有）、**ASI（本轮补）**、EOF（原本就有）。
  ASI 的判定复用扫描器里已有的 `EndsAtLineBreak`（与 `ScanToSemicolon` 同一张续接符表）。
- **close 时应该提取哪些信息**：`End` 停在体最后一个代码单元；**边界单元（下一条语句的第一个代码单元）不归本语句**，
  留在 `host.Data` 里给下一条语句（`StatementPossibleShape` 只 `splice(start..state.End)`）。
  被标语句由 `HasLabelPrefix` 让终结候选吐 `Uncertain`，不抢边界、不 `Accept`。

**修法**：`ScanExpressionBody` 在 `stopAtWhile` 特例之后、`;` 分支之前加一条
「当前单元不是 `;` 且 `EndsAtLineBreak(prev, current)` → `Complete(cursor-1)`」；
`ScanSimpleSemicolon` 在 `;`/EOF 之后加同一条 ASI 收口；
`SourceFileEndPossibleShape` 新增 `HasLabelPrefix`（语句头是 `标识符 :` 时返回 true），
`ComputeByIndex` 在 `HasDecoratorPrefix` 之后让位（`Uncertain`）。

### 4.2 B 组：`return` 的受限产生式没有收口（5 条）

| 形态 | 现象 |
| --- | --- |
| `return` ⏎ `c;`、`return // c` ⏎ `c2;` | CRASH「语句没有读完」 |
| `while (a) return` ⏎ `c;`、`if (a) return` ⏎ `c;`、`lbl: return` ⏎ `c;` | CRASH「语句没有读完」 |

**TS 侧**（diag=0）：`return` ⏎ `c;` = `ReturnStatement[0,6]` + `ExpressionStatement(c;)[7,9]`
（`return [no LineTerminator here] Expression? ;` 是受限产生式）。

**归类**：**缺少 end**——`return` 语句没有「关键字后换行」这条收口通道（只有 `throw` 有）。

**根因**：`typescript/tokens/statements/statement-scanner.xl.md:429` `ScanReturnOrThrow`：
受限产生式只对 `throw` 生效（`IsKeyword(code[keywordAt], "throw")`），`return` 落到
`ScanToSemicolon(code, keywordAt + 1)`，从**关键字之后**开始扫，一路吃到下一条语句的 `;`。

**四问**

- 何时 build：`return` 之后到达的代码单元与本关键字之间有换行（块注释里的换行也算）时，语句在关键字上结束；
- build 提取：`ReturnKeyword` + （有操作数时）表达式子形状；无操作数时 children 只有关键字；
- 何时 close：受限产生式的换行边界；换行后的 `;` 仍归本条（`End` 含分号）；同一行有操作数时走 `ScanToSemicolon`（原路径）；
- close 提取：`End` = 关键字右边界（或换行后 `;` 的右边界）。

**修法**：把 `ScanReturnOrThrow` 的受限产生式条件从「`throw`」放宽到「`return` / `throw` 都算」，
关键字后换行时 `Complete(keywordAt)`（下一个代码单元是 `;` 时收在 `;` 上）。`throw` 的既有行为与
`throw` ⏎ `;` 的零宽 `Identifier` 恢复形不受影响。

### 4.3 C 组：无分号声明 + 后续语句，EOF 兜底的后缀建不出来（3 条）

| 形态 | 现象 |
| --- | --- |
| `import x = require("m")` ⏎ `z;` | CRASH「表达式语句没有读完」 |
| `declare module "m"` ⏎ `z;` | CRASH「表达式语句没有读完」 |
| `export as namespace A` ⏎ `z;` | CRASH「表达式语句没有读完」 |

**TS 侧**（diag=0）：声明 + `ExpressionStatement[z;]` 两条。

**归类**：**缺少 end**——`import =` / 无体 ambient module / `export as namespace` 都只能靠 EOF 兜底收口，
而兜底的**前缀/后缀递归**在后缀以 `;` 结尾时没有收口路径。

**根因**：`typescript/tokens/files/source-file-end-possible-shape.xl.md:483`（`BuildTrailingDeclaration` 的后缀兜底）：
`ExpressionStatementShape.FromUnits(host, cursor, suffixAt, context, false)` 把 `;` 当成表达式单元 →
`ExpressionBuilder` 报「表达式语句没有读完」（trace 实测：`TRAILING start=2 at=3 code=[z ;] => false` → THROW）。
先按 `false` 建完再 `SignOut(semiEnd)` 也不行：`FromUnits` 已经签过 End，再签抛 `SourceRange.End has been setted`。

**四问**

- 何时 build：EOF 时 leftovers 里「声明前缀 + 表达式语句后缀」按最后一条语句起点切分，前缀递归建声明，
  后缀在第一格建表达式语句；
- build 提取：前缀按各自的声明形状提取字段；后缀只取表达式子形状；
- 何时 close：后缀的 `End` = 最后一个代码单元；**以 `;` 结尾时用 `requireSemicolon = true` 的入口**，
  `;` 从表达式单元里切掉、`End` 停在 `;` 右边界；
- close 提取：`End` 含分号（TS 的 `ExpressionStatement` End 含 `;`），trivia 不参与。

**修法**：后缀兜底先找后缀的最后一个代码单元；是 `;` 时用 `ExpressionStatementShape.FromUnits(..., true)`
（要求末尾 `;`、把它切掉），否则维持 `false`。

### 4.4 D 组：EOF 兜底的声明族没有分支（20 条）

| 形态族 | 现象 |
| --- | --- |
| `export import x = A.B` / `= require("m")` / `type x = A.B` / `type x = require("m")` / 尾注释 | CRASH「表达式语句没有读完」 |
| `class C {}` ⏎ `export import x = A.B` | CRASH「表达式语句没有读完」 |
| `module "m"` / `module "m";` / `module "m"` ⏎ `class C {}` | CRASH「表达式语句没有读完」 |
| `async function f(): void` / `declare async function f(): void` / `async function f(): void` ⏎ `class C {}` | CRASH「函数表达式缺少函数体」/「表达式语句没有读完」 |
| `export default function f(): void`（含 `f(a: A): B` / `function* g(): void` / `async function` / `;` / 尾注释 / 尾换行） | CRASH「函数表达式缺少函数体」/「函数表达式的返回类型没有读完」 |
| `export = a` ⏎ `export import x = A.B` | CRASH「表达式语句没有读完」 |

**TS 侧**（diag=0，逐条核对过 AST）：

- `export import x = A.B` → `ImportEqualsDeclaration`（children: `ExportKeyword[0,6]`, `Identifier`, `QualifiedName`）；
- `module "m"` → 无体 `ModuleDeclaration`（children 只有 `StringLiteral`）；`module "m";` 的 End 含分号；
- `async function f(): void` → `FunctionDeclaration`（children: `AsyncKeyword`, `Identifier`, `VoidKeyword`，无函数体）；
- `export default function f(): void` → `FunctionDeclaration`（children: `ExportKeyword` → `DefaultKeyword` → `AsyncKeyword?` → 名字 → 返回类型）。

**归类**：**缺少 end**——这四族在 EOF / 无分号时都没有收口与建树通道，落进
`ExpressionStatement` 兜底后按表达式解析整个声明。

**根因**

1. `source-file-end-possible-shape.xl.md:964` `isExportImportEquals` 不存在：
   `text === "export"` 一律被 `isExportClause` 接走，`ExportDeclarationShape.FromUnits` 抛错后兜底成表达式；
2. `source-file-end-possible-shape.xl.md:822` `isBodylessAmbientModule` 只认 `declare module`，
   不认不带 `declare` 的字符串名模块（TS 只是语义层报错，parse 合法）；
3. `source-file-end-possible-shape.xl.md:977` `isFunction` 只认 `function` / `declare function`，
   不认 `async function` / `declare async function`；
4. `source-file-end-possible-shape.xl.md:680` `isExportDefaultFunction` 不存在：
   `export default …` 一律走 `isExportDefault` 的 `ExpressionBuilder` 路径，无体函数被当函数表达式解析。

**四问**

- 何时 build：EOF 兜底（`EndOfFileTokenShape` 触发的那一次 `BuildTrailingDeclaration`）；
  多语句连排时它是前缀/后缀递归里的一段；
- build 提取：各声明形状自己的 `FromUnits` 提取字段（`ImportEqualsDeclarationShape` / `ModuleDeclarationShape` /
  `FunctionDeclarationShape`）；`export` / `default` 不在形状的入参里，建完再把
  `ExportKeyword` / `DefaultKeyword` 插回 `Data` 最前（顺序与 TS 的 modifiers 一致），并改写 `Pos`；
- 何时 close：EOF（无 `;` 时补一个零宽合成 `Symbol ";"` 再走 `FromUnits`；已有真实 `;` 时直接用它，
  `End` 要含分号）；有函数体/模块体时 `tokenIndex` 落在闭合 `}` 上，不补 `;`；
- close 提取：`End` = 最后一个代码单元（`;` / `}` / 返回类型）的 `SourceRange.End`；`Pos` = 前一个非 trivia 单元 `End.Index + 1`。

**修法**：`source-file-end-possible-shape.xl.md` 增加/放宽 4 个分支（见 §5）。

## 5. 修复清单（2 个文件、5 个修点）

| # | 文件 | 修点 | 对应组 |
| --- | --- | --- | --- |
| 1 | `typescript/tokens/statements/statement-scanner.xl.md:521` `ScanExpressionBody` | 体表达式在换行 ASI 边界收口（当前单元不是 `;` 时） | A |
| 2 | `typescript/tokens/statements/statement-scanner.xl.md:454` `ScanSimpleSemicolon` | `debugger` 等简单语句在换行处 ASI 收口 | A |
| 3 | `typescript/tokens/statements/statement-scanner.xl.md:429` `ScanReturnOrThrow` | 受限产生式从 `throw` 扩到 `return` | B |
| 4 | `typescript/tokens/files/source-file-end-possible-shape.xl.md:75/83` `ComputeByIndex` + 新 `HasLabelPrefix` | 被标语句的边界让给 `StatementPossibleShape` | A |
| 5 | `typescript/tokens/files/source-file-end-possible-shape.xl.md:483` 后缀兜底 | 后缀以 `;` 结尾时用 `requireSemicolon = true` 入口 | C |
| 6 | `typescript/tokens/files/source-file-end-possible-shape.xl.md:680/822/964/977` | 新增 `isExportDefaultFunction`；放宽 `isBodylessAmbientModule` / `isFunction`；新增 `isExportImportEquals` | D |

约束遵守情况：未改 `core/**`；未改 `typescript/IMPORTANCE.md`；未在「普通候选还活着」时 `Accept`
（被标语句是**让位**成 `Uncertain`，不是抢边界）；共用 `PossibleShapeCache` 的既有槽位未动；
没有覆盖 `ExitOrPre` / `ComputePossibleShapes`。

## 6. 新增用例

`typescript/cases/missing-end.ts` **append-only**（68 → 115，+47；快照同步更新）：
末尾新段落 `// ══ cover5 round5（missing end）…`，四组 + 每组 base 先行、trivia / 重复形在后，
一行一例、`\n` 转义；**基线已通过的那条候选（`export import x = A.B` ⏎ `class C {}`）未收录**。

## 7. 需裁定 / 遗留

1. **类型别名的跨行收口（2 条，交 end-compute 类作者）**：`type T = A` ⏎ `z;` 与 `export type T = A` ⏎ `z;`
   仍红：`TypeAliasDeclarationPossibleShape.IsAsiBoundary`
   （`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:262`）只认
   `[` 与语句/声明关键字，**普通标识符开头的新语句不收口**，候选继续把 `z` 当类型的一部分、
   在 `;` 上 `Accept` 后 `BuildByIndex` 抛「类型别名声明的类型没有读完」。
   这不是「没有终结候选」——终结判定存在但判据太保守，属 **end compute**，本轮按规定不动，
   已从 `missing-end.ts` 排除（探针里保留）。
2. **装饰器前缀只支持 class（3 条，交 missing-possible / possible-compute 类）**：
   `@dec` ⏎ `function f() {}`、`@dec` ⏎ `enum E { A }` 在 TS 侧 `parseDiagnostics = 0`，
   本仓 CRASH「不支持的表达式起点」：装饰器表达式只在类声明候选里被吃，`function` / `enum` 前缀没有装饰器通道。
   属「缺少 possible」，不入本类。
3. **TS 非法（9 条，尺子不测，不建用例）**：`module M` / `module M;` / `declare module M` / `declare module M;` /
   `namespace N` / `namespace N;`（`'{' expected`）、`export default enum E { A }`（`Expression expected`）、
   `export default namespace N {}`（`';' expected`）、`if (a) b` ⏎ `else c` ⏎ `else d;`（`Declaration or statement expected`）。
4. **`a` ⏎ `import b from "m";` 已在本分支上验证不再抛「终结候选与其它候选同时成立」**（历史 chunk 1 的通用边界），
   与本次改动无关；未新增用例（既有 `asi-import-boundary` stem 已覆盖切分模型）。
5. **`export default async function f(): void` 的 `DefaultKeyword` 是构造出来的**（`DefaultKeywordShape` 没有
   `FromBasicToken`）：按 `class-declaration-shape` §modifiers 的既有写法 `new + SignInToken + SignOutToken` 处理；
   若后续给该关键字补工厂方法，这里可以简化。

## 8. 复跑命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover5-missing-end
# 重建（改过 .xl.md 之后）
# xl_build(cwd=<本目录>, paths=["typescript/tokens/files/source-file-end-possible-shape.xl.md",
#          "typescript/tokens/statements/statement-scanner.xl.md"], targets=["ts"], out="dist")
.\node_modules\.bin\tsc.cmd -p tsconfig.json
node typescript/cases/ast-json.mjs missing-end
node typescript/cases/ast-json-diff.mjs missing-end
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
# 探针（tmp/，不进 git）
node tmp/probe-missing-end.mjs candidates-final.json      # 期望：48 绿 / 0 红
```
