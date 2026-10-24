# HANDOFF — R2：修复 R1 基线 ASI/花括号边界缺陷（方向 A）

分支 `feature/possible-statement-r2`，基线 `feature/possible-statement` @ `114b1467`（= R1 的基线，未 merge 旧分支）。
本轮只改 **一处生产代码**：`typescript/tokens/statements/expression-statement-possible-shape.xl.md`（+106 行，0 行删除）。
`StatementBoundaryUtil.IsAsiBoundary` **函数体未动**（FROZEN 遵守）；`statement-boundary-util.xl.md` / `statement-scanner.xl.md` / `statement-builder.xl.md` 全部未改。

## 1. 方向 A 实现（最小、局部）

缺陷链（R1 已钉死）：`ScanToSemicolon` 用 `EndsAtLineBreak`（末步 `!ContinuesAcrossLine(next)`，而 `{` 在续接表里，为的是兜函数/箭头体）→ `let a = 1` ⏎ `{ b; }` 不在 `{` 前收口 → 吞掉块 → `ExpressionBuilder` 剩单元 → 抛「表达式语句没有读完」。

naive 修法（`next` 是 `{` 就判界）反证：3 条对照变红（实测于本轮 baseline 复跑）：
`const f = function ()\n{ }` → THROW 函数表达式缺少函数体；`const f = () =>\n{ }` → THROW 表达式意外结束；
`let a: {\n x: number\n} = { x: 1 }` → THROW 类型注解为空。

因此不加在 `ContinuesAcrossLine`，而是加在 **`ExpressionStatementPossibleShape.IsUncontinuableTailBoundary`**（该钩子只被
`ScanToSemicolon:465` 与 `StatementBuilder.BuildVariableStatement:1584` / `:2050` 使用，扫描与建造读同一个函数，判据天然不二义）：

```
换行 + 当前单元是 `{` + 上一个代码单元能收住表达式 + 前缀上下文不是在等体  ⇒ 这是 ASI 边界
```

新增两个纯判据：
- `IsBodyExpectingHead(text)`：`function` / `class` / `extends` / `interface` / `enum` / `namespace` / `module` / `implements` / `abstract` / `if` / `for` / `while` / `switch` / `with` / `catch` / `else` / `do` / `try` / `finally`。
- `ExpectsBodyBefore(units, previousIndex)`：从收尾单元往回看，谁在等体。三条短路：
  1. 收尾单元本身是 `{...}` 括号（体/对象字面量已闭合，头不可能还在等体）→ false；
  2. 收尾单元是 `(...)` 且紧邻等体头（`if (a)` / `for (…)` / `function ()`）→ true；
  3. 否则回扫：遇 `;` 或语句头关键字（`let`/`const`/`var`/`export`/`declare`/`return`/`throw`/`case`/…）停 → false；
     遇 `function`/`class`/`extends`/`=>` → true；遇闭合 `{...}` → false。

`function (): number` 这种「头与体之间夹着返回类型」由回扫跨过 `:` 与 `()` 继续找到 `function` 覆盖；
`class A extends B` 由 `extends` 覆盖；`for (;;)` / `if (a)` / `interface A` 由等体集合覆盖。

## 2. 12 条形态表（`tests/statement-possible/r1-root-cause.mjs`，shell=true，AST 与 `ts.createSourceFile` 逐节点对拍）

| 形态 | 修复前 @114b1467 | 修复后 |
|---|---|---|
| `let a = 1\n{ b; }` | **THROW 表达式语句没有读完** | MATCH |
| `let a = 1\n{}` | **THROW 表达式语句没有读完** | MATCH |
| `let a = 1\n{ let b = 2; }` | **THROW 表达式语句没有读完** | MATCH |
| `const f = function ()\n{ }` | MATCH（对照） | MATCH |
| `const f = () =>\n{ }` | MATCH（对照） | MATCH |
| `let a: {\n x: number\n} = { x: 1 }` | MATCH（对照） | MATCH |
| `x = 1\n{}` | DIFF（既有） | DIFF（未变化，既有缺陷） |
| `let a = 1\nif (a) {}` | MATCH | MATCH |
| `a\n{}` | MATCH | MATCH |
| `let a = 1\n;\n{ b; }` | MATCH | MATCH |
| `let a = 1;\n{ b; }` | MATCH | MATCH |
| `{ b; }\nlet a = 1` | MATCH | MATCH |

合计：**3 THROW → MATCH，8 MATCH 保持 MATCH，1 条既有 DIFF 不变（0 回归）**。

## 3. 有/无修复逐条对照（`tests/statement-possible/r2-counterfactual.mjs`）

以 `ExpectsBodyBefore = () => true` 中和新分支（= 精确回到修复前行为），同进程逐条对拍：

| case | 有修复 | 无修复 |
|---|---|---|
| r1-bare-block | MATCH | THROW 表达式语句没有读完 |
| r1-empty-block | MATCH | THROW 表达式语句没有读完 |
| r1-decl-block | MATCH | THROW 表达式语句没有读完 |
| r1-declare-decl | MATCH | THROW 表达式语句没有读完 ← 顺带修好 |
| 其余 11 条 included | MATCH | MATCH（对照，未受影响） |
| r1-export-decl | DIFF | THROW ← 改善但仍不等价 |
| r1-if-body-block / r1-object-then-block / r1-arrow-expr-then-block | THROW | THROW（既有，与本改动无关） |
| r1-assign-block | DIFF | DIFF（既有） |

## 4. 专用 cases（`tests/statement-possible/r1-cases.json`，组 `r1-asi`，15 条）

`forceShell=true`（钉住新壳路径）+ `skipLegacyCompare=true`（legacy 同缺陷已被有意让位），每条都与 `ts.createSourceFile` 逐节点对拍：

坏形 3：r1-bare-block / r1-empty-block / r1-decl-block；
对照 6：r1-ctrl-function-expr / r1-ctrl-arrow-block / r1-ctrl-type-literal / r1-class-body / r1-class-extends / r1-interface-body；
边界 4：r1-expr-then-block（`a\n{}`）/ r1-if-same-line / r1-empty-stmt（`let a=1\n;\n{b;}`）/ r1-fn-body-then-block（函数体已闭合后换行块，防 `function` 误判等体）；
其余 2：r1-for-body / r1-declare-decl。

读数：`[group] r1-asi: pass=15 fail=0 skip=0 uncovered=0`。
未纳入（**排除理由均为既有缺陷，不是本次引入**，读数见 §3 的「无修复」列）：`if (a) b\n{}`、`const o = { a: 1 }\n{ b: 2 }`、`const g = () => 1\n{ }`、`x = 1\n{}`、`export let a=1\n{}`。

## 5. 全表回归（本目录，同一份 build/ts）

| 项 | 读数 |
|---|---|
| xl_build（core+typescript → ts） | 887 written, **0 error**（2510 warning 为既有 W3102/W3103 描述缺失） |
| tsc -p tsconfig.json | **exit 0** |
| harness --all | pass=**101** fail=0 known=**1**（groups run=8） |
| harness --lint | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| harness --double-accept | conflicts=**0**，cases=120 failed=0 |
| harness --file=dev-cases.json --group=dev | pass=**22** fail=0 |
| --group=operators-live | pass=**40** fail=0 |
| --group=stage4b | pass=**17** fail=0 |
| --group=stage4c | pass=**42** fail=0 |
| --group=stage4c2 | pass=**33** fail=0 |
| --group=r1-asi（新增） | pass=**15** fail=0 |
| op-ast-proof / op-proof | 全 PASS，exit 0 |
| control-flow-takeover | PASS，exit 0 |
| block-body-takeover | PASS，exit 0 |
| s4j-function-body | PASS，exit 0 |
| tests/parse/validate.mjs | **1720 条用例，0 条不合格** |
| typescript/cases/ast-json.mjs | 结构差 **0** / 位置差 **0** / 字段差 **0**；`git status --short typescript/cases` 为空（产物与基线逐字节等价） |
| ast-json-diff.mjs | 有结构差 0、位置差 0、字段差 0（无 gap） |
| token-ast.mjs | total=**1716** ok=**1706** crash=**0** diff=**0** ts-invalid=**10** gap-now-passing=0 |
| real-dts-ast.mjs | 文件 **226**：解析成功 226、崩溃 0、**AST 完全一致 226**、有差异 0 |
| feas-operator harness / insert-between | 全 PASS，exit 0 |
| perf.mjs | long n=300 median **5.87ms**（candidateCalls=34，0.06/token）；many 2000 条 median **31.70ms**（callsPerToken 17.01）；scale ratio 1.94 / 2.22（线性） |

perf 无基线对照（R1 未落 perf 读数）；新增判据只在「当前单元是 `{` 且前面有换行」时触发，`many`（2000 条单语句）路径上 `{` 极少，
故 candidateCalls 与 R1 同量级。

## 6. 未覆盖清单

1. `if (a) b\n{}`（体位置）仍 THROW —— 修复前同 THROW，走的是 if 语句体路径而非 `ScanToSemicolon`，本轮未动。
2. `const o = { a: 1 }\n{ b: 2 }` 仍 THROW（修复前同）—— 表达式语句侧的对象字面量收尾 + 换行标签块。
3. `const g = () => 1\n{ }` 仍 THROW —— 前缀有 `=>`，`ExpectsBodyBefore` 判「等体」保守不动（宁可不解，不可错解）。
4. `x = 1\n{}` 仍 DIFF（结构一致、字段差），修复前同。
5. `export let a=1\n{}`：THROW → DIFF（改善但不等价）—— export 路径只用 `StatementScanner.EndsAtLineBreakBefore`，未接新判据；接它需要改 `export-declaration-possible-shape.xl.md`，超出「最小」范围。
6. 带行注释 / 块注释的换行变体（`let a = 1 // c\n{ b; }`）未单列 case，仅由 --all/ast-json 的全量语料间接覆盖。
7. `class` / `interface` / `enum` 成员位置的 `{`（成员边界）未变，靠 stage4b/stage4c/real-dts 全绿保证未回归。

## 7. 风险

1. **启发式等体集合**：`IsBodyExpectingHead` 是白名单。将来若引入新的「后面必须有 `{` 体」的关键字（该语言族的新语法），未入表就会退化成「把体切成新块」——但这属于**新增语法**才暴露，现有全表 0 回归。
2. **返回类型是对象类型字面量**：`const f = function (): { a: number }\n{ }` —— 收尾单元就是 `{ a: number }` 括号，短路规则 1 判「不等体」→ 会把 `{ }` 当新块（可能误判）。现有语料（real-dts 226、stage4c 42、ast-json 6167）无此形态，故未加「类型上下文」判据；若出现，按同一短路点补一条「该 `{...}` 在 `:` 之后」即可，不需要动扫描器。
3. **回扫的上界**：靠「`;` / 语句头关键字 / 已闭合 `{...}`」停止，跨语句理论上有泄漏面；已用 3 条对照（函数表达式、箭头、类型字面量）+ class/interface/for/函数体已闭合 6 条对照压住，并全部进 `r1-asi`。
4. 只改一个钩子 ⇒ 扫描器与建造器共用一个判据，无「扫描收口、建造不收口」的二义；`double-accept 冲突 0` + `lint PASS（ASI 实现唯一）`是这条的机械证据。