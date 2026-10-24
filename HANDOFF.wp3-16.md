# HANDOFF — impl-wp3-16（WP-3 第十六波：4 条真回归中的 3 条落地消除）

STATUS: PARTIAL（**实测净正**：AST **6134 / 6167**（起点 6127，+7）、结构差 34→**27**、位置差 33→**26**、字段差 0、cj-fail 0；buffer xml **PASS 4487 / FAIL 17 / ERROR 52**（起点 4481/23/52，+6 PASS、−6 FAIL）；4 条真回归消掉 **3 条**，仅 `prefix-operand-newline` 未解）
BRANCH: impl-wp3-16 @ 94d1ec60（源码）+ 本文件
BASE: impl-wp3-15 @ 0bab0998

## 0. 一句话结论（给 Lead）

wp3-15 的「收口点在 `Alive.size === 0` 的 `before` 回退」被**证实并可修**：把「续接符属于本条 item」
的判断放在 `before` 之前/之后即可，**不需要**动 accept 分支的挂起机制（4421cd7e 仍是惰性的，但它的
`AngleJudge.CanStart` / `HasTailNew` 判据正好复用，未回滚）。本波只改
`typescript/tokens/items/root-item-rule.xl.md` 一个源码文件，三处改动、每次单独 commit 验证。

## 1. 本波提交（2 个源码 commit）

### 1.1 `1722e5b0` — instantiation 两条（decl / gap）

`Analyze` 的 `Alive.size === 0` 分支，在 `before`（收口到 at‑1）之前新增：当前格是 `>` 时，
`LastOpenAngle(code, at-1)` 找未闭合 `<`，`AngleJudge.CanStart(units, CodeAt[lt]-base)` 判它是类型实参段，
判住就**含这一格**建一次（同分支已有的 `over` 路径：End 按实际右界反推、Watermark=overAt+1）。
结果 `const f = a<b>` ⏎ `>` 的 `>` 收进 item。

### 1.2 `94d1ec60` — ex-new-variants（+ 6 条 AST 附带收益）

同一分支的 `before` 改为两条更严格的守卫：

1. `before.SourceRange.EndIndex >= code[at-1].SourceRange.EndIndex`（**真的吃掉了 at‑1** 才按它收口）；
2. `tailEmptyArgs`：`before` 的右界正好停在 `NewExpressionShape` 上（`HasTailNew`）且当前格是一个
   `StartBracketChar === "("` 的 **Bracket**（`()` 是**一个**已闭合的 basic token）→ 不按 `before` 收口，
   落到 `② over`：含 `()` 建，`ParseNew` 的 `ParseBracketArguments` 吃进空实参表。

wp3-15 §1.4 的 `lastAt=5 len=7` 由此解释清楚：停在被构造者上不是 `ParseNew` 不认空实参，而是
**收口发生在 `()` 这一格之前/这一格上**，`()` 是单个 Bracket、`before` 的右界覆盖了 `C` 却没覆盖它。

## 2. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | 875 written / 0 error / 2414 warning | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0 | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json` + `ast-json-diff` | **6167 条：一致 6134；结构差 27、位置差 26、字段差 0；cj-fail 0** | +7 vs 6127 |
| real-dts | `real-dts-ast.mjs` | **226 文件：解析成功 226、崩溃 0、AST 一致 226** | PASS |
| buffer | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **PASS 4487 / FAIL 17 / ERROR 52**；digest PASS 4379 / FAIL 125 / ERROR 52 | +6 PASS（FAIL 23→17，无新增 FAIL） |
| quick | `gates.ps1 -Tier quick` | **PASS** 5.6s（子集 1213/1214，1 条为长基线结构差） | PASS |
| standard | `gates.ps1 -Tier standard` | **PASS** 10.9s（其中 tests/gates 1/8 = 基线 KNOWN-RED） | PASS |

## 3. 4 条真回归状态

| 用例 | 状态 | 证据 |
|---|---|---|
| `decl-instantiation-line-end.ts` | **PASS**（xml 952B / tokens 20/20，与基线逐字节相同） | fix 1.1 |
| `gap-instantiation-line-end.ts` | **PASS**（952B / 20/20） | fix 1.1 |
| `ex-new-variants.ts` | **PASS**（1824B / 40/40） | fix 1.2 |
| `prefix-operand-newline.ts` | **仍 FAIL**（xml 1970B vs 4155B；87 vs 88 token） | 见 §4 |

## 4. 唯一未解：`prefix-operand-newline`（下一波从这里开始，省探针）

本波已经用打点定位到**真实的触发条件**（与 wp3-14 的「item 在 `--` 收口」假设不同）：

1. `let a = 1; a++; --` ⏎ `a;` **单独解析是正确的**（`PostfixUnary` + `PrefixUnary`），字节一致；
2. 按行二分（去掉 `// xl:` 头的 body 行）：
   `n=1` 出 1 个 raw `--`；`n=2` **raw=0、4 条 ExpressionStatement（正确）**；
   只要把第 3 行 `let b = 1; b++; --//c` 加进来，**从第 1 条语句起全部退化为 raw**（raw=2、stmts=2）；
3. ⇒ 触发点是 **`--` 后面紧跟行注释（`--//c`）**，不是 `--` 本身、也不是换行；完整文件里
   `let b = 1; b++; --//c` ⏎ `b;` 这一行让整段前缀运算族塌成 raw；
4. 塌陷形态：item 起点在 `--`（host 20），`Alive` 从 13 降到 1 后**再也不收口**，一路扫到 EOF
   （`Winner=-1` → 整段 raw 回退）。`stmts=2` 说明连前面的 `a++`/`--a` 也没建出来 —— 疑似
   `StatementBuilder` 的 ASI 边界（`IsAsiBoundary` / `EndsAtLineBreak`）在「`--` + 行注释」这一格
   吃掉了下一行，或行注释的 trivia 让 `HasLineBreakBefore` 判断反了。
5. 建议落点：`typescript/tokens/statements/statement-builder.xl.md` 的 `BuildExpressionStatement`
   （`asiEnd` 循环）与 `ExpressionStatementPossibleShape.IsAsiBoundary` 的「`x++` ⏎ `++y`」分支，
   判据「上一格是 `++`/`--` 且**下一格是另一个 `++`/`--`**」时**不得**在注释行处提前收口；
   可用 `n=2` / `n=3` 两段语料做最小回归（`tests/cases/token/statements/prefix-operand-newline.ts`
   本波未改）。

## 5. 仍未动的类（与 wp3-14/15 §4 一致）

C 类 4（`core/syntax/batch/item-list.xl.md` 的 `RecordBuild` 向前看 `;`）、D 类 4（`StatementBuilder` /
`ExportAssignmentShape` 表达式终点）、F 类 5（装饰器变量声明）、G 类 2（module `{}` 边界）、
H 类 3、I 类 13：**一步没动**。本波把 wp3-15 的「`Alive.size===0` 收口点」假设吃干榨尽，
剩余类的形状与 HANDOFF.wp3-14 §4 / wp3-13 §4 完全一致。

## 6. 踩过的坑（新增）

1. **`Set-Content`/`Get-Content -Raw` 读写 `build/ts/*.js` 会把 UTF‑8 中文注释读成 ANSI**，偶尔吃掉
   换行 → 改完的 JS 语法错。探针一律 `[IO.File]::ReadAllText/WriteAllText + UTF8Encoding($false)`。
2. 手改 `build/ts` 后 `xl_build` 单文件会 `skipped (up to date)`（`.xl.md` 指纹没变）——要恢复生成物：
   `Remove-Item build/ts/<file>.js` 再 `tsc`（HANDOFF.wp3-15 §5.3 同款）。
3. 打点一定要**打在 `state.Complete = true` 的每个落点**（我用分割替换给 9 个落点编号打印 `[CLOSE#i]`），
   只打 accept 分支会误判「没进去」与「进去了但建不出」。
4. `TempToString()` 对 Bracket/Shape 不可靠（打印出相邻 token 的文本），探针里用
   `constructor.name + SourceRange` 区分单元类型。
5. 编辑大块代码时**先数括号**：本波 1.2 的第一次编辑多开了一个 `if`，xl_build 不报错、tsc 报
   `TS1128`——`.xl.md` 的代码块不做括号平衡检查，靠 tsc 兜底。

## 7. 交付状态

- 分支 tip：`impl-wp3-16`（`1722e5b0` + `94d1ec60` + 本 HANDOFF 提交）。
- 树可编译：`xl_build` 0 error、`tsc` exit 0、`xl_check` 0 error。
- 改动源码文件：**1 个** `typescript/tokens/items/root-item-rule.xl.md`（+ HANDOFF）。
- 未 merge、未 push；`dist/`、`build/`、`typescript/cases` 快照未提交（已 `git checkout --`）。
