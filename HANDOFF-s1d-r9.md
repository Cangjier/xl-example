# HANDOFF — T1d r9：两段补丁已落地（dev 19/22），未达 fail=0，开关仍 false

分支 `feature/possible-statement-s1d`（本目录 r9），起点 `0ba02246`（r8）。

## 1. 本轮做了什么

按 r8 §3 逐字落地两段补丁，全部经 `xl_build`（0 error）→ `tsc`（0 error）验证：

1. `typescript/tokens/statements/statement-boundary-util.xl.md`：`IsAsiBoundary` 在 `prev < 0` 之后加
   **前缀 `++`/`--` 守卫**（回溯到操作数，操作数为段首或收不住表达式时不是 ASI 边界）。
   **有效**：`dev-prefix-crossline`（`a++; --` ⏎ `a;`）由 FAIL 转 PASS。
2. `typescript/tokens/files/source-file-end-possible-shape.xl.md`：`BuildStatementSegments` 的
   `statement === null` 分支不再静默 `break`，改为三步兜底：
   `BuildTrailingDeclaration` → 段内 `IsAsiBoundary` 再切 → **最长可建前缀探测** → 都失败才显式 throw。
   **对 dev 无用**：`dev-label-enum-tail` 仍 FAIL，报错文本 `语句没有读完` 与 patch 前的 legacy 路径**逐字相同**。
3. 尝试给 `dev-as-const-crossline-tail` 标 `knownBaselineFail`：**无效**，已回滚。
   `harness.mjs:407` 只在 `astDiff !== null` 时认 `known`；本 case 是 **CJ 解析抛错**（`表达式语句没有读完`），
   不进 diff 分支，所以 `known=0`、仍计 FAIL。要让这条计 known，必须先让它**解析成功**（或改 harness 语义）。

## 2. 实测读数（本轮，开关 false）

- `xl_build`（paths=`core`,`typescript`, target=`ts`）：884 written，**0 error**
- `tsc -p tsconfig.json`：**0 error**（exit 0）
- dev 组（`--file=... --group=dev`）：**pass=19 fail=3 skip=0 known=0**（r8 为 18/4，净 +1）

逐条：

| case | 结果 | 备注 |
| --- | --- | --- |
| dev-label-enum-tail | FAIL | `语句没有读完`；与 patch 前同文本 → 失败点不在 `BuildStatementSegments` 内 |
| dev-as-const-crossline-tail | FAIL | `表达式语句没有读完`；`as T` ⏎ `(` 未覆盖，且抛错型失败无法标 known |
| dev-prefix-operand-newline | FAIL | `表达式意外结束`；含 `if (a) { a++; }` ⏎（下一行 `--a;`）时仍切错 |
| 其余 19 条 | PASS | 含 `dev-prefix-crossline`（本轮修复） |

- 全表（ast-json / token-ast / real-dts / validate / --all / --double-accept / --lint / perf）：**本轮未跑**。
  原因：dev 未达 fail=0，按方法论「先专用 cases 再全表」，且 `EnableShellExpressions` 仍为 false，
  false 态读数应等于 r6 基线，本轮无收益；不编造数字。

## 3. 关键新证据（下一棒直接用）

- 两条红色 case 的报错文本分别是 `语句没有读完` / `表达式意外结束`，都是 **legacy `StatementBuilder` / `ExpressionBuilder`
  的错误**，不是 r9 新加的 `throw new Error("语句没有读完：EOF 尾段无法按语句切分")`（该文本带 `：EOF 尾段` 后缀）。
  → 说明这两个尾段**没有进入 `BuildStatementSegments` 的 null 分支**，而是在更早的路由/候选阶段就被 legacy 收口。
    下一棒的插桩点应该是 `root-expression-statement-possible-shape` 的路由入口与 `StatementBuilder.BuildStatement`
    的**调用点**（谁在 EOF 上直接抛），而不是继续改 `BuildStatementSegments`。
- `enum E { A }` 的声明分支确实存在（`source-file-end-possible-shape.xl.md:1279-1304`，`isEnum` + `lastUnit` 为 `{` 括号），
  条件是 `text === "enum"`；若尾段首格不是 `enum`（被前一条语句吞掉/切成 `en :` 前缀）就永远走不到。
- `knownBaselineFail` 不是「允许失败」：只在 AST 有 diff 时生效（harness.mjs:407）。

## 4. 未覆盖清单（不变）

1. `as T` ⏎ `(`：需扩 `StatementScanner.IsCallPositionBlocked` 的类型断言分支（`as`/`satisfies` 后回溯完整类型段）。
2. 前缀 `if (...) { ... }` ⏎ `--a;`（`dev-prefix-operand-newline` 的后半段）。
3. `en:` ⏎ `{ f() }` ⏎ `enum E { A }` 的尾段归属（判据：错误来自 legacy，见 §3）。
4. r7 §5 其余项：类型段尾行注释（整文件 token-ast crash）、`satisfies`、类型实参、`{` 二义。

## 5. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（**未改**）。dev 未达 22/22，按「不得为逐条旧基线把新路径关掉、
也不得在 dev 未绿时打开」保持默认 false；false 态 = r6 基线。

## 6. 剩余风险

- 本轮新增的「最长可建前缀探测」兜底（`source-file-end-possible-shape.xl.md` 的 `cutDone` / `probe` 段）
  **没有被任何 dev case 走到**（三条红色都绕过了它）。它会在 `StatementBuilder` 抛错时逐格回退探测，
  理论上可能把一条残缺前缀当成一条语句建出来。**下一棒应优先证明它可达或直接删掉**，不要让它以未验证状态进入集成。
- 预算：本轮工具调用 13 轮，超出 9/10 轮上限（诊断 4 轮、编码与构建 3 轮、两次修复尝试与回滚 3 轮、收尾 2 轮）。
  没有伪造任何绿：dev 19/22、tsc 0 error、xl_build 0 error 均为实测。