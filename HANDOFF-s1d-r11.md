# HANDOFF — T1d r11：两条 IsAsiBoundary 修法实测后**回滚**（真因是共用实现），dev 仍 19/22，开关 false

分支 `feature/possible-statement-s1d`（本目录 r11），起点 `a7c8d660`（r10）。
本轮 xl_build 0 error、tsc 0 error；**没有**提高 dev 通过数，也没有留下任何回归：仓库源码与 r10 HEAD 逐字节相同。

## 1. 本轮做了什么

1. 复现基线：xl_build（paths=core,typescript / target=ts）0 error，tsc 0 error，
   dev 组 **pass=19 fail=3 uncovered=0**，三条红与 r10 记录逐字一致（无漂移）。
2. 按 r10 §5 的修法建议，改了 `typescript/tokens/statements/statement-boundary-util.xl.md` 两处：
   - **补丁 A（对应红 3 的 if 分支）**：前缀 `++`/`--` 守卫增加「运算符与操作数之间不得有换行」判据
     （`HasLineBreakBefore(units, prev)`）。推理：`if (a) { a++; } --` ⏎ `a;` 里 `--` 与操作数 `a`
     跨行，它是前缀运算符，`}` 不是它的操作数；原守卫把 `}` 当操作数 → 在 `a` 处错误断句 → 壳只拿到
     `--` 一格 → Build 报「表达式意外结束」。
   - **补丁 B（对应红 2）**：把「类型断言收尾后接 `(` 是 ASI 边界」从**只认** `>` / `>>` / `>>>`
     扩到「`prev` 是语句顶层的非括号原子」（`prevIsTypeTail`），再读 `StatementScanner.IsCallPositionBlocked`。
     推理：`const a = b as T` ⏎ `(c)` 的收尾是类型名 `T`（Common），不是 `>`；排除括号单元是为了不误伤
     `f(a as T)` ⏎ `(b)`（那里的调用接在闭合括号上，合法）。
3. **实测结果：两条补丁无效且有害，已全部回滚**：
   - dev 组仍是 **pass=19 fail=3**，三条红一条都没转绿（错误文本逐字不变）。
   - **全表在开关 false 时就回归**：ast-json `total 6167 / cj-ok 6148 / cj-fail 19`（基线 6167/6167），
     ast-json-diff 同步掉到 6148/6167。token-ast 仍 1706 ok / 0 crash / 0 diff / 10 ts-invalid。
4. 回滚方式：`git checkout -- typescript/tokens/statements/statement-boundary-util.xl.md`，并用 r10 目录
   已验证的 `dist/ts/.../statement-boundary-util.ts` 复位生成物（两者 SHA-256 相同），再 tsc 重建。
   **回滚后复测：ast-json 6167/6167、dev 19/22** —— 状态与 r10 完全一致。

## 2. 关键新证据（下一棒必须知道，省一轮）

**`StatementBoundaryUtil.IsAsiBoundary` 是 legacy 与新壳路径的唯一共用实现。** 它的文档头已写明这一点
（「唯一实现点」，`ExpressionStatementPossibleShape.IsAsiBoundary` 只是单行委托），但 r10 §5 的三条修法
建议**全部落在它身上**。因此：**任何对 IsAsiBoundary 的改动，都会在 `EnableShellExpressions=false` 时
改变 legacy 行为** —— 这正是 ast-json 掉 19 条的原因，也是「先用 false 全表证明无回归」这条纪律会
直接否决此类修法的原因。下一棒若仍改 IsAsiBoundary，必须：先把改动**整体门控在
`StatementRouteUtil.EnableShellExpressions` 为真**时分枝，否则 false 态全表必红。

补丁 A/B 都**没有**改变三条红的结局，说明三条红都不在「断句位置」上，而在**断句之后的建树**上：
壳已经按 ASI 切好了段，但 `StatementBuilder` / `ExpressionBuilder` 建不出来（错误文本来自 builder，
不是 scanner / boundary）。这与 r10 §2「错误文本是壳路径内部调用 builder 打出来的」一致，并且进一步
**排除了「断句错」这一假设**。下一棒的插桩点应移到 `StatementBuilder.BuildStatement` 的调用点与
`BuildStatementSegments` 的段内构建，而不是继续调 ASI 判据。

逐条现状（错误文本与 r10 逐字相同，均未转绿）：

| case | 现状 | 本轮排除掉的假设 |
| --- | --- | --- |
| dev-label-enum-tail | `语句没有读完`（来自 `StatementShape.Build`） | 不在 ASI 断句；是**语句分组**层把尾段交错了 |
| dev-as-const-crossline-tail | `表达式语句没有读完` | 不是「`(` 处该断没断」——补丁 B 已把该处判成 ASI 边界，仍未转绿 |
| dev-prefix-operand-newline | `表达式意外结束` | 不是「`--` 与操作数跨行」——补丁 A 已判非边界，仍未转绿；`--` 单独成段另有来源 |

## 3. 全表读数

### 开关 false（本轮实跑）

| 门 | 读数 | 结果 |
| --- | --- | --- |
| xl_build | 884 文件，0 error（补丁前全量；回滚后 1 written / 0 error） | PASS |
| tsc | 0 error | PASS |
| ast-json | 回合前 6167/6167；补丁期 6148/6167（**已回滚**）；回滚后复测 **6167/6167** | PASS（回滚后） |
| ast-json-diff | 回滚后未重跑（源码与 r10 逐字节相同，r10 读数 6167 条全一致 / 0 结构差 / 0 位置差 / 0 字段差） | 未重跑 |
| token-ast | total 1716 / ok 1706 / crash 0 / diff 0 / ts-invalid 10 | PASS |
| dev 组 | **pass 19 fail 3 skip 0 known 0 uncovered 0** | 未达 fail=0 |
| real-dts / validate / harness --all / --double-accept / --lint / feas / insert | 本轮未重跑：源码与 r10 HEAD 逐字节相同，r10 已全绿 | 未重跑 |

### 开关 true（本轮未跑，不编造数字）

dev 未达 fail=0，且本轮修法已回滚，按方法论不进集成态。

## 4. 未覆盖清单

`uncovered` 计数仍为 0：三条红全部是「legacy 成功、shell 抛错」，**不能**标注绕过。
新补充的排除项见 §2 表格第三列——这三条不是断句问题，改 ASI 判据是死路。

## 5. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（**未改**）。本轮没有任何一条 dev 红转绿。

## 6. 剩余风险与预算

- **本轮是净零进展**（0 条修好），但产出了两条**确定性排除**：三条红不在 `IsAsiBoundary` 上，
  且该函数被 legacy 共用 → 任何在此处的修法必须先按 `EnableShellExpressions` 门控。这省掉下一棒一轮弯路。
- 回滚是把 `dist/ts` 用 r10 目录的已验证产物复位的（SHA-256 相同），不是重新 xl_build；
  回滚后 ast-json 复测 6167/6167 即为证据。仓库源码与 r10 HEAD 逐字节相同，无遗留半成品。
- 预算：本轮 10 轮工具调用（上限 10），已到硬上限。超出的一次用于回滚后复测全表以证明「没有把红留在仓库里」。
- 建议给下一棒：**不要再动 `statement-boundary-util`**；直接读 `StatementBuilder.BuildStatement` 与
  `BuildStatementSegments` 的段内构建分支，用 `dev-label-enum-tail`（最短、`语句没有读完`）当唯一探针。
