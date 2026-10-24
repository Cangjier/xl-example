# HANDOFF — impl-wp3-14（WP-3 第十四波：表达式建造诊断）

STATUS: PARTIAL（**没有源码改动**；AST 仍 **6127 / 6167**、cj-fail 0、real-dts 226/226、buffer 与起点逐项相同）
BRANCH: impl-wp3-14 @ 0d4578bb（起点 impl-wp3-13 @ 0d4578bb；只新增本 HANDOFF 文件）
BASE: impl-wp3-13 @ 4e30f941（6127 态）

## 0. 一句话结论（给 Lead）

本波把 4 条「真回归」**全部定位到同一层**（新 item 引擎的**收口早一格**），但没能在本波内改成
可验证的补丁（详见 §3 的三层证据链）。**树可编译、零倒退**：`xl_build` 875/0 error，`tsc` exit 0，
AST / buffer 读数与 wp3-13 **逐项相同**。下一波按 §5 的顺序做，不用再重跑本波的定位实验。

## 1. 门禁读数（本分支实测，2026-10-24）

| 项 | 命令 | 读数 | 判定 |
|---|---|---|---|
| xl_build | core+typescript → dist | **875 written / 0 error / 2414 warning** | PASS |
| tsc | `tsc -p tsconfig.json` | exit 0（`TSC=0`） | PASS |
| xl_check | core+typescript | **0 error / 2414 warning** | PASS |
| AST 全量 | `ast-json.mjs` + `ast-json-diff.mjs` | **6167 条：完全一致 6127；结构差 34、位置差 33、字段差 0；cj-fail 0** | 与 wp3-13 相同 |
| quick 门禁 | `..\tools\gates.ps1 -Tier quick` | **PASS 5.8s**（tsc 4.10s / ast-json 0.88s / ast-json-diff 0.20s〔子集 1213/1214，1 条结构差是 34 条之一〕/ body-guide interface PASS） | PASS |
| buffer 等价 | `--mode both --base ..\baseline-build\build --new build --dts 8 --quiet` | xml **PASS 4481 / FAIL 23 / ERROR 52**；digest PASS 4373 / FAIL 131 / ERROR 52 | 与 wp3-13 **完全相同** |

## 2. 本波没有提交源码改动的原因（如实记录）

- 4 条真回归经三层探针确认是**同一个架构机制**（§3），不是 `ExpressionBuilder` 的局部 bug；
  任何一处的「收口晚一格」补丁都会波及全部 6167 条语料与 4556 个 buffer 文件，
  在剩余轮次里无法把「不倒退」证明完 —— 按 TEAM §8.1「树必须可编译 + 不倒退」优先**不动树**。
- 轮次预算在定位阶段被用尽（多次 xl_build/tsc 循环 + 多轮探针）；此处如实说明。

## 3. 4 条真回归的定位（**下一波可直接用**）

全部在 `tests/cases/**`（不在 AST 6167 语料里），buffer 现在把它们记成 **FAIL（不是 ERROR）**：
本分支两侧都能 Parse，只是我们的 XML 少了内容 / 多出 raw 单元。

### 3.1 关键事实：`typescript/tokens/expressions/expression-builder.js` 与基线**逐字节相同**

```
(Get-FileHash ..\baseline-build\build\ts\typescript\tokens\expressions\expression-builder.js).Hash
(Get-FileHash build\ts\typescript\tokens\expressions\expression-builder.js).Hash
=> 38DDA759…（两边一样）
```
→ **不要再在 ExpressionBuilder 里找差异**。基线之所以对，是因为 main 走的是 **legacy 逐 token 候选**
（`UnitToken.Process`）路径，而我们的 `build/ts` 只有新 `ItemListEngine` 路径（baseline 里根本没有
`core/syntax/batch/**`、`typescript/tokens/items/**`，见 §3.3 的文件清单）。差异在「**item 什么时候收口**」。

### 3.2 逐条现象（探针输出原文）

探针（可直接重建）：
```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp3-14
# 写一个 probe.cjs（.cjs！仓库 package.json 是 type:module，.mjs 里没有 require）：
#   const m=require(path.resolve(dir,"ts/typescript/run/source-file-runner.js"));
#   m.SourceFileRunner.Parse(text, "t.ts").ToString().replace(/></g,">\n<")
# dir 取 "../baseline-build/build"（BASE）与 "build"（NEW）
```

| 文件 | 基线 | 我们 |
|---|---|---|
| `decl-instantiation-line-end.ts`（`const f = a<b>` ⏎ `const g = a.b.c<string>`） | 2 条 `VariableStatement`；`initializer = ExpressionWithTypeArgumentsShape(Identifier a, TypeReference b)` | 只有第 1 条，且只到 `a<b`；**第 2 条整条消失**，尾部只有一个 raw `<Symbol>&gt;</Symbol>`（digest：基线 20 token / 我们 10） |
| `gap-instantiation-line-end.ts` | 同上（952 B） | 同上（434 B） |
| `ex-new-variants.ts` | 5 条 `VariableStatement`；`new A()` / `new a.b.C()` 的 `NewExpressionShape` **只有被构造者**（空的 `()` 被吃掉、不进 children） | 前 4 条一致，**末尾多一个 `<Bracket StartBracketChar="(" EndBracketChar=")">`** —— 最后一条 `const e = new a.b.C()` 的 `()` 没被收进语句 |
| `prefix-operand-newline.ts` | `let a = 1; a++; --` ⏎ `a;` → `PostfixUnary(a++)` + `ExpressionStatement(PrefixUnaryExpression(--a))` | `a++` 后语句在 `--` 处收口，`--` / `a` / `;` 全成 raw |

### 3.3 定位证据：语句（item）在最后一个单元**之前**就收口了

在 `build/ts/typescript/tokens/expressions/expression-builder.js` 的 `Load` 里打一行 `console.error`
（只改生成物、验证完 `xl_build` 覆盖回来即可），对 `const f = a<b>` 得到：

```
[LOAD] a|<|b :: at StatementBuilder.BuildExpressionRange (statement-builder.js:145)
[LOAD] >    :: at StatementBuilder.BuildExpressionRange (statement-builder.js:145)
[LOAD] >    :: at ExpressionStatementShape.FromUnits (expression-statement-shape.js:49)
```

即：`StatementBuilder.BuildVariableStatement` 拿到的 `this.Units` **只有 `const f = a < b` 六个单元，
`>` 根本不在这一条 item 里**（否则 `ParsePostfixSuffix` 的实例化分支会命中：
`!CanStartTypeArgumentCall && CanStartTypeArguments` 对 `a<b>` 是真）。
`const e = new a.b.C()` 同理：item 在 `C` 收口，`()` 留给下一格（`ParseNew` 第 1171-1179 行本来会吃它）。

所以补丁位置**不在表达式层**，而在「候选判定 → root accept」这一层（写范围内可改）：
- `typescript/tokens/items/root-item-rule.xl.md`（`Analyze` 的 accept 点）
- `typescript/tokens/items/statement-item-rule.xl.md` / `statement-item-scan.xl.md`
- 或 `typescript/tokens/expressions/expression-statement-possible-shape.xl.md` 的 End 计算

候选判据（TS 语义，`canFollowTypeArgumentsInExpression`）：`<…>` 的 `>` 之后若不是「表达式的起点」，
`<…>` 就是**类型实参**、`>` 必须属于本轮 item；`(` / 模板 / `[` / `.` / `?.` 是继续后缀。
`(()` 空实参 `()` 也属于被调用者（基线的空参数列表进 NewExpression 但**不进 children**，只是被吃掉）。
但这正是 wp3-12 §1-C 记的「推迟一格 = 净负（6122→6117）」的雷区：
**别用「最后可用单元且非 EOF 就先不收口」**；要用**具体续接符集合**（`(` / `)` / `<` / `>` / `--` / `++` / `.`）
在 accept 点判一次，并且逐类跑全量 AST + buffer 复核。

## 4. 其余类的状态（未动，按 HANDOFF.wp3-13 §4 原样保留）

C 类 4 / D 类 4 / F 类 5 / G 类 2 / H 类 3 / I 类 13：全部**未做**。
wp3-13 已确认：F 类的判据只能放 root 的 accept 点（`BuildVariableStatement` 抛错 = cj-fail 8→18，净负）；
C 类可在 `core/syntax/batch/item-list.xl.md` 的 `RecordBuild` 建成功后再向前看一格 `;`（本波没时间做）。

## 5. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-15 -From impl-wp3-14 -Base impl-wp3-14
cd impl-wp3-15
# 先建基线对比（本波已确认 baseline-build 可用）：..\baseline-build\build
# 0) 复现：xl_build(core,typescript→dist) → tsc → ast-json(+diff) → git checkout -- typescript/cases
# 1) 先做 ex-new-variants（最可能是**单点**）：item 收口时把紧随的 `()` Bracket 吸进 NewExpression
#    验证：node tests/bench/buffer-equivalence.mjs --mode both --dts 0 --base ..\baseline-build\build --new build --only ex-new-variants
# 2) 再做 instantiation（decl/gap 两条例同源）：accept 点用 AngleJudge.CanStart 把 `<…>` 的 `>` 包进 item
# 3) 最后做 prefix-operand-newline（前缀运算符跨行）：别动 ParseUnary，动 item 边界
# 每步都要跑：ast-json-diff 全量（6127 不许掉）+ buffer 全量（PASS 4481 / FAIL 23 / ERROR 52 不许变差）
```

## 6. 踩过的坑（本波新增）

1. **`build/ts` 里 `expression-builder.js` 与基线逐字节相同** —— 找表达式差异先对 hash，别读代码猜。
2. **探针脚本必须 `.cjs`**：仓库 `package.json` 是 `type: module`，`probe.mjs` 里 `require` 直接报
   `ReferenceError: require is not defined in ES module scope`。
3. **`console.error` 打点只能改生成物**：验证后必须 `xl_build` 覆盖并 `git status` 确认干净；
   `.xl.md` 才是提交内容。
4. buffer 现在把 wp3-13 说的 4 条 ERROR 记成 **FAIL**（两侧都能 Parse，只是 XML 不同）——
   **FILTER/计数口径已变**，报数时以 `--mode both` 的汇总行为准：`PASS 4481 / FAIL 23 / ERROR 52`。
5. `xl_check` 的 2414 warning 全是 `W3102/W3103`（缺 description），不阻塞，别去补。

## 7. 交付状态

- 分支 tip：`impl-wp3-14 @ <本文件提交>`，树可编译（`xl_build` 0 error / `tsc` exit 0）。
- 改动文件：**只有** `HANDOFF.wp3-14.md`（+0 源码改动）。
- 未 merge、未 push；`dist/`、`build/` 未提交。
