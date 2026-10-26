# D3b · 表达式·二元/条件目录族

| 项 | 值 |
| --- | --- |
| 状态 | **检查点已提交**（未合并 / 未 push / 未删目录） |
| 分支 | `feature/d3b-expr-binary` |
| 目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\d3b-expr-binary` |
| base | `8b3aa933` `merge(d2): typed declaration close and ASI boundary` |
| 交付 | `typescript/tokens/expressions/right-operand-possible-shape.xl.md`（+243 行）、`typescript/tokens/expressions/expression-shape-catalog.xl.md`（±23 行） |
| 开关 | **未翻**。`EnableIncrementalShapes` / `EnableIncrementalVariableShapes` 仍为 `false` |
| 构建 | `xl_build` **1 written / 627 skipped / 0 error / 3 warning**（3 条 E1107 base 已有）；`tsc -p .` **exit 0** |

**结论先说：目标「崩溃 −33」没达到。本波拿到 −3（121 → 118），0 条回归；剩余 30 条按子族逐条给了最小复现（§5）。**
最重要的产出不是 −3，而是**把「表达式候选目录只有一格候选」这条结构性病因钉死并量到了边界**（§2 的六次实验），
以及一条已在目录里落地、可继续加形态的机制（§3）。

---

## 1. 读数（与 D3 triage 逐位一致，同一语料 / 同一口径）

驱动 `tmp/snap.mjs`（`tmp/wide-on.mjs` 的口径 + 首跳探针 + 逐文件 diff 计数，一次跑完）：

```powershell
node tmp/snap.mjs tmp/snap-before.json     # base 8b3aa933（同一构建，未改源码）
node tmp/snap.mjs tmp/snap-a3.json         # 本提交
node tmp/cmp.mjs tmp/snap-before.json tmp/snap-a3.json
```

| 指标 | base | 本提交 | 差 |
| --- | --- | --- | --- |
| 语料 / 跳过 TS 非法 | 2573 / 11 | 2573 / 11 | 0 |
| 解析成功（含 fallback） | 2339 + 102 diff = 2441 | 2340 + 104 diff = 2444 | +3 |
| **崩溃** | **121** | **118** | **−3** |
| AST 完全一致 | 2339 | **2340** | +1 |
| 有差异 | 102 | 104 | +2 |
| `FileFallbackCount` | 167 | 167 | 0 |
| 缺 range / 越界 / 字段名 | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| **「原来通过现在失败」** | — | **0** | — |

逐文件三向比对（`tmp/cmp.mjs`）：`ok→crash` **0**、`ok→diff` **0**、`diff→crash` **0**、`diff→ok` 0。
`crash→ok` **1**、`crash→diff` **2**（成因见 §4，两条都证明了是**被崩溃掩盖的既有增量缺陷**，不是本提交造出来的错树）。

---

## 2. 根因：表达式子目录只有**一格**候选，且那一格只认 `Common`

三处宿主挂的都是「一格候选 + `endPossible === null`」：

| 宿主 | 挂的目录 | 单一候选认什么 | 崩溃族 |
| --- | --- | --- | --- |
| `BinaryExpressionShape` | `RightOperandPossibleShape.Catalog()` | `Common` 里的数字 / 标识符 | 12 |
| `ConditionalExpressionShape` | `[ConditionalMemberPossibleShape]` | `Common` | 3 |
| `ArrowFunctionShape` | `[ArrowBodyPossibleShape]` | `Common` | 1 |

`CatalogGuide`（`core/syntax/catalog-guide.xl.md:102-107`）在「候选全灭 + `EndPossible === null`」时**抛错**，
于是右操作数 / 三元分支 / 箭头体只要**不是** `Common`，就是硬崩溃。用 `tmp/dbgall.mjs`（把
`CatalogGuide.ComputePossibleShapesByIndex` 包起来，在抛出的那一格打印宿主、下标、活着的候选、`host.Data` 全表）
把 16 条逐条量到「宿主 + 下标 + 那一格的单元类」：

```
const a2 = x + (y);          host=BinaryExpressionShape idx=3 units=[IdentifierShape, PlusTokenShape, WrapSymbol, Bracket"("]
const a  = f() + "x" + "y";  host=BinaryExpressionShape idx=3 units=[…, PlusTokenShape, WrapSymbol, String]
const a  = b instanceof C<D> + e;  host=BinaryExpressionShape idx=3 units=[…, GreaterThanTokenShape, WrapSymbol, Symbol"+"]
const v  = a in { b: 1 };    host=BinaryExpressionShape idx=3 units=[…, InKeywordShape, WrapSymbol, Bracket"{"]
const f  = a => ({ x: 1 });  host=ArrowFunctionShape     idx=3 units=[ParameterShape, EqualsGreaterThanTokenShape, WrapSymbol, Bracket"("]
const d  = flag ? (a: number) => a + 1 : …  host=ConditionalExpressionShape idx=3 units=[IdentifierShape, QuestionTokenShape, WrapSymbol, Bracket"("]
```

**十六次实测（必须写下来，因为最直觉的那条修法是错的）**：把
`RightOperandPossibleShape.Catalog()` 直接换成既有的 `ExpressionShapeCatalog.CreateRightOperand()`
（= `CreatePrimary() + CreateOperators()`，文件头写着就是干这个的），全局读数**变差**：

| 挂什么目录 | 崩溃 | 差异 | 救回 |
| --- | --- | --- | --- |
| 现状（一格） | 121 | 102 | — |
| 整份 `CreateRightOperand()` | **131** | 100 | **0** |
| 本提交（原子 + 4 条形态） | **118** | 104 | 1 |

原因两条，都在 `tmp/snap-full.json` / `tmp/cmp.mjs` 里看得到：

1. **双 Accept**：`NumericLiteralPossibleShape` 与 `RightOperandPossibleShape` 在数字格上同时 `Accept`
   （`x + 1`），`CallPossibleShape` 与 `ParenthesizedPossibleShape` 在 `x + (y)` 的 `(` 格上同时 `Accept`
   ⇒ `CatalogGuide` 永远 `Waiting` ⇒ 下一格两个都被拒 ⇒ 在 `下标+1` 处崩（实测 7 条 `ok→crash`）。
2. **`IsBuildable` 恒假**：那批 primary 候选的 `IsBuildable` 都带 `PrimaryAtomGuard.IsLoneAtom`
   （「初始化器 = 单个原子、之后只剩收口」）。右操作数位后面通常还有东西（`a + "x" + "y"` 的第二个 `+`），
   于是「Accept 但不建」⇒ 目录永远等 ⇒ 二元永不封口。

⇒ **右操作数位要的是「操作数态的形态」，不是整份表达式目录**：既不能有续接态（`Call` / `MemberAccess` /
`ElementAccess` / `OptionalChain` …），也不能有与既有候选同格重复的原子候选，还不能继承 `IsLoneAtom`。

---

## 3. 改动（2 个 `.xl.md`，全部是增量路径）

### 3.1 `right-operand-possible-shape.xl.md`（主改，+243 行）

新增 `RightOperandFormPossibleShape` —— **一个候选类、四个 `Kind`**，挂在 `RightOperandPossibleShape.Catalog()`
的 `RightOperandPossibleShape` 之后：

| 项 | 内容 |
| --- | --- |
| 判据 1 | **前一个代码单元是运算符形状**（`IsOperatorLike`：`*TokenShape` 或 `InKeywordShape` / `InstanceofKeywordShape`） |
| 判据 2 | **当前格是那种形态**（`Claims`）：闭合的 `(` 括号 / 非内插 `String` / 内插 `String` / `true\|false\|null` |
| 窄化 | `AcceptsPrevious`：`template` **不认 `<` / `>`**（理由见下） |
| `IsBuildable` | 自己写：trivia 不建；`paren` 另要 `ParenthesizedPossibleShape.CanParseInside`（既有判据，只调不抄） |
| `BuildByIndex` | **转调既有候选的 `BuildByIndex`**（`ParenthesizedPossibleShape` / `StringLiteralPrimaryPossibleShape` / `TemplatePrimaryPossibleShape` / `KeywordLiteralPrimaryPossibleShape`），再替 `BinaryExpressionShape` 宿主 `SealRightOperand`（已封口就不封第二次） |

**判据 1 同时是「不抢初始化器起始格」的保证**：初始化器起始格的前驱是 `=`（`Symbol`，不是形状），
所以 `let x = (1)` / `let x = "a"` 仍原样走 A4b / A1——默认路径与本目录的既有账本一个字节都不改。

**为什么 `template` 不认 `<` / `>`**：`f<T>`t`` 这一族在 token 层被折成 `f < T > `（`declaration 符号 <`，
D3a 那一族），前驱因此是 `GreaterThanTokenShape`。在这里建**裸模板**会把 TS 的 `TaggedTemplateExpression`
读成 `BinaryExpression((f < T) > `t`)`——崩掉的对，树错了：`gap-r977-inst-tagged.ts` 实测
`TaggedTemplateExpression −1 / BinaryReference +1 / BinaryExpression +2`。**先把这条实测到、再按 C10 关掉**，
而不是留着一条「崩是没了、树是错的」的绿：这一格等尖括号配对（类型面）修好之后前驱不再是 `>`，本候选自然接手。

### 3.2 `expression-shape-catalog.xl.md`（一致性）

`CreateRightOperand()` 原来自己拼 `CreatePrimary() + CreateOperators()`，与
`RightOperandPossibleShape.Catalog()`（**唯一一份定义**）说的不是同一件事，本波把两者统一：
`CreateRightOperand()` **转调** `RightOperandPossibleShape.Catalog()`。文件头写的「只有这一份定义」现在是事实。

### 3.3 为什么不是「让 fallback 兜住」

这 33 条在**第二跳也抛**（`SourceFileRunner.ParseCore(shell=false)` 仍抛同一条 `CatalogGuide` 消息，
实测 `tmp/shelltest.mjs`）：`ParseCore` 只切 `EnableShellExpressions`，**不动**
`EnableIncrementalVariableShapes` ⇒ 所谓「legacy 重解析」在变量声明这一族上仍然走增量目录。
把它修掉是 `statement-route-util` / `source-file-runner` 的事，不在本 WP 所有权内（triage §6.2 已点名
「一次只许一个 WP 改」），**本波一行未动**。

---

## 4. `crash→diff` 的两条：都是既有缺陷，不是本提交的错树

| 文件 | 差 | 最小复现（与改动无关，`tmp/exp.mjs`） |
| --- | --- | --- |
| `expressions/ex-call-plus-string-chain.ts` | structural=6 moved=1 | `function f(): number { return 1; }` ⏎ `const a = 1;` ⇒ **DIFF**（`VariableStatement −1 / ExpressionStatement +1 / EqualsToken +1`）。把 `function` 那一行去掉、只留两条 `const … + "x"` 的两行版本 ⇒ **OK**。⇒ 缺陷在「函数声明（带返回类型）之后那条 `const` 被当成表达式语句」，与本波改的右操作数目录无关 |
| `expressions/expr-as-then-value-operator.ts` | structural=3 moved=2 | `declare const a: any;` ⏎ `const eq = a as number === 1;` ⇒ **DIFF**（structural=3 moved=2，数字逐项相同）；`const q = 1 === 1;` ⇒ **OK**。⇒ 缺陷在「`as` 表达式的值位二元收尾」，与右操作数目录无关 |

两条在 base 上都是**硬崩溃**，只在本波把崩溃修掉之后才**测得出来**（与 D1 §4 的 `expr-tagged-template-nested-tag`
同一类：修掉遮挡之后露出的既有增量缺陷）。要清零它们需要另开 WP（函数声明收口 / `as` 值位二元），
**不属本波 ownership**。

---

## 5. 子族前后计数 + 剩余 30 条的最小复现

### 5.1 表达式 ownership 的 33 条（首跳口径）

| 子族（首跳原文） | 前 | 后 | 说明 |
| --- | --- | --- | --- |
| `CatalogGuide 没有候选形状可以构成（宿主 BinaryExpressionShape，下标 3）` | **6** | **3** | 修的 3 条：`(y)` / `"x"` / `(a as number)` |
| `CatalogGuide 没有候选形状可以构成（宿主 BinaryExpressionShape，下标 2）` | **6** | **6** | 全是「前驱 `>` 的类型实参族」，按 §3.1 的 C10 理由**故意不接** |
| `CatalogGuide 没有候选形状可以构成（宿主 ConditionalExpressionShape，下标 3）` | 3 | 3 | 分支是箭头 / 对象字面量 |
| `CatalogGuide 没有候选形状可以构成（宿主 ArrowFunctionShape，下标 3）` | 1 | 1 | 箭头体是 `({ … })` |
| `expression 前缀一元操作数` | 4 | 4 | 不在本目录族 |
| `expression 运算符 .` | 3 | 3 | P1 成员链 |
| `expression 条件表达式问号` | 3 | 3 | 见 §5.3 |
| `表达式没有读完` | 3 | 3 | 见 §5.3 |
| `不支持的表达式起点` | 2 | 2 | 见 §5.3 |
| `expression new 关键字` | 1 | 1 | P2 `new` |
| `表达式意外结束` | 1 | 1 | 尖括号断言族 |
| **合计** | **33** | **30** | 崩溃总数 121 → **118** |

### 5.2 已修的 3 条（逐条）

| 文件 | 改动前 | 改动后 |
| --- | --- | --- |
| `expressions/expr-paren-operand.ts`（`const a2 = x + (y);`） | CRASH `BinaryExpressionShape idx 3` | **OK**（AST 逐节点一致） |
| `expressions/ex-call-plus-string-chain.ts`（`f() + "x" + "y"`） | CRASH 同上 | DIFF（既有缺陷 §4，非本提交） |
| `expressions/expr-as-then-value-operator.ts`（`1 + (a as number)`） | CRASH 同上 | DIFF（既有缺陷 §4，非本提交） |

另：`a + "x"` / `a + `t`` / `a + true` / `a + (b)` 的最小片段单独跑都是 **OK**（`tmp/cases/s1..s3.ts`），
说明这四种形态本身建的树是对的；它们所在的整文件之所以还是 DIFF，是文件里**别的**既有缺陷。

### 5.3 剩余 30 条的交接（按「差什么」分组）

| 组 | 条数 | 最小复现 | 缺什么 / 归谁 |
| --- | --- | --- | --- |
| 前驱 `>` 的类型实参族 | 6 | `const a = f<T>`t`` / `b instanceof C<D>` / `typeof f<T>` | 前驱是 `GreaterThanTokenShape` ⇒ 正确树是 `TaggedTemplateExpression` / `ExpressionWithTypeArguments`，**必须先有尖括号配对**（D3c / D3a 的 `符号 <`）。本波按 C10 关掉模板形态，宁可继续显式失败 |
| 前缀一元 / 一元 `+` 操作数 | 2（`Binary` idx3） | `const a = f<number> + 1` | 右操作数是 `Symbol "+"`（一元正号）。要 `PrefixUnaryPossibleShape` 进右操作数目录，且它的操作数建完要**替祖父二元封口**——`PrefixUnaryPossibleShape` 没有这条钩子（`binary-expression-shape` 的所有权），本波未做 |
| 对象字面量操作数 | 1（`Binary` idx3） | `const v = a in { b: 1 };` | 右操作数是闭合 `{` 括号，要 `CompositeInitializerFormsPossibleShape` 那一族的建树；它的 `Family` / `IsBuildable` 是「初始化器整条长完」口径，接进右操作数位要把那套判据也放宽（A4b/A4c 写域） |
| 条件分支是箭头 / 对象 | 3 | `const add = flag ? (a: number) => a + 1 : (a: number) => a - 1;` | `ConditionalMemberPossibleShape` 只认 `Common`。`(a: number)` **不能**当括号表达式建（它是箭头形参表）⇒ 要 `ArrowPossibleShape` / `CompositeInitializer*` 进三元目录 |
| 箭头体是 `({ … })` | 1 | `const f = a => ({ x: 1 });` | 同一格，但宿主是 `ArrowFunctionShape`（`arrow-possible-shape.xl.md`，**不在本波 ownership**） |
| `expression 前缀一元操作数` | 4 | `expr-unary-not-paren.ts` / `expr-void-literal-operand.ts` | `PrefixUnaryPossibleShape` 自己的操作数目录（P3a 写域） |
| `expression 运算符 .` | 3 | `expr-typeof-import-meta.ts` / `lex-number-method-call.ts` | P1 成员链 |
| `expression 条件表达式问号` | 3 | `const x = a ? b : c ? d : e` | **根因已量到**：`ConditionalPossibleShape.ComputeByIndex` 在 `Family` 命中但对当前格不是 `?` 时返回 `Uncertain`，于是它在**下一个操作数格**成为唯一幸存者、`IsBuildable`（基类默认 `true`）放行、`BuildByIndex` 抛「缺问号」。最小修法是给它加 `IsBuildable`：当前格不是 `?` 就 `false`；但随后这一格会落到「终结候选与其它候选同时成立」，要连带改 `VariableDeclarationEndPossibleShape` 的 `?` 分支 ⇒ 跨 ownership，未做 |
| `表达式没有读完` / `不支持的表达式起点` / `表达式意外结束` | 6 | `expr-r1228-array-tag.ts` / `ex-template-nested.ts` / `gap-r937-angle-assertion-newline.ts` | 分散在标签模板 / 模板嵌套 / 尖括号断言，无共同根因 |

---

## 6. 默认关的四道门（与 base 逐项一致）

| 命令 | 读数 |
| --- | --- |
| `node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final.json` | **exit 0**；total **429**；`counts = { incremental: 426, throw: 3, atomic: 0, partial: 0 }`，`failures 0` |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 / 426 ok / 3 err**（exit 1，3 条既有 `throw` case） |
| `node tests/gates/run.mjs` | **4 PASS / 0 FAIL / 7 N/A**（`wide-ast` PASS、`real-dts-ast` PASS、`cases:check` 1720 条 0 不合格、`direct:lint` 0 违反） |
| `xl_build {paths:["core","typescript"]}` | 628 页，**0 error**，3 条 E1107（base 已有） |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

默认开关仍是 `false`，本波改的两份文件只在 `EnableIncrementalVariableShapes` 为真时被调用，
所以默认路径与 base 逐字节一致——四道门读数逐项不变即是证据。

---

## 7. 可复算命令

```powershell
$d="C:\Users\Admin\Documents\GitHub\xl-example-set\d3b-expr-binary"; Set-Location $d
git log --oneline -1                                   # 检查点 SHA
xl_build { paths:["core","typescript"]; targets:["ts"] }   # 628 / 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .              # exit 0 -> build/ts

node tmp/snap.mjs tmp/snap-before.json                 # 改前：crash 121 / diff 102 / fallback 167
node tmp/snap.mjs tmp/snap-a3.json                     # 改后：crash 118 / diff 104 / fallback 167
node tmp/cmp.mjs tmp/snap-before.json tmp/snap-a3.json  # 逐文件三向回归比对
node tmp/bucket.mjs tmp/snap-a3.json                    # 40 族（首跳口径）
node tmp/dbgall.mjs <file>                              # 单文件：最小前缀 + 抛出格的候选/Data 全表
node tmp/exp.mjs narrow <file...>                       # 单文件 AST 对拍（含最小复现）
node tmp/mini.mjs <file...>                             # 最小失败前缀（只最小化行，不最小化字符）

node typescript/cases/tts/run.mjs --quiet --json tmp/tts-final.json
node typescript/cases/tts/tools/tshape-judge.mjs ts-all
node tests/gates/run.mjs
```

`tmp/` 全部 gitignored，不提交。本波新增的探针：`tmp/snap.mjs`（状态 + 首跳 + diff 计数一次跑完）、
`tmp/cmp.mjs`（逐文件三向比对）、`tmp/dbgall.mjs`（最小前缀 + `CatalogGuide` 抛出格的候选表）、
`tmp/exp.mjs`（单文件 AST 对拍）、`tmp/mini.mjs`（最小失败前缀）、`tmp/shelltest.mjs`（两跳对照）。
