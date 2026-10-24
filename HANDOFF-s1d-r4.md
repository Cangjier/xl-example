# HANDOFF — T1d r4：AtEOF 静态位假设被实测否证（开关保持 false）

分支 `feature/possible-statement-s1d`（本目录 r4），起点 `ac827b52`（r3）。

## 1. 本轮做了什么

只做了一件事并把它证伪了：r3 §4.1 指出 `StatementScanner.AtEOF` 在块/条目层是
「本层没有后续单元」，而 `StatementEndPossibleShape` 里用
`StatementScanner.AtEOF = owner.EndIndex>=0 || NextChar(...)===""` 直接**写全局静态位**且从不复原。
假设：这个泄漏会污染后续语句 / 后续文件，是 missing-end 24 + token-ast crash 的共同原因。

改动（已实测后**回退**，见 commit）：把赋值改为局部 `atEof`，只在调用 `ScanRoot` 的两处
save/assign/restore，`ExpressionEndCode` 收局部值。

## 2. 实测：假设错了，而且改法让 true 态更差

`xl_build` 1 written / 0 error、`tsc` 0。四道 AST 门读数：

| 门 | false（最终） | true（改动后） | true（r3 基线 `ac827b52`） |
| --- | --- | --- | --- |
| ast-json | **6167/6167** | **5838/6167**（329 失败） | 6037/6167（130 失败） |
| ast-json-diff | **0/0/0** | 330 结构差 | 130 |
| token-ast | **1706 ok / 0 crash** | exit 1（崩溃级联未消） | 1692 ok / 14 crash |
| real-dts | **226/226** | 出现 161 处差异 | 226/226 |

结论：AtEOF 的「泄漏」在 r3 的实现里是**承重的**——它把「本层到顶」错误地带给下一条语句，
恰好补上了 missing-end 需要的收口语义。把静态位复原 = 抽掉了那根拐杖，329 例同时坏掉。
所以本改动不可取，已整文件回退（`git checkout`），代码与 `ac827b52` 逐位相同。

**这是本轮唯一的净结论，但它很有价值**：missing-end 的修法不能是「消除静态位」，而必须是
「给壳一个显式的『本层已关闭』信号」。`StatementScanner` 的 `AtEOF` 语义（`statement-scanner.xl.md`
:39 / :436 / :480 / :745 / :766 的 `AtEOF && code.length > 0`）本来就区分「本层没有后续单元」，
壳需要的正是这个信号，只是它现在只能从全局静态位间接拿到。

## 3. 每道门读数（最终提交状态，开关 = **false**）

`xl_build` 884/0 error、`tsc` 0。

| 门 | 读数 |
| --- | --- |
| validate | **1720/0** |
| ast-json | **6167/6167**（47 构造） |
| ast-json-diff | **0 结构 / 0 位置 / 0 字段** |
| token-ast | **ok=1706 / crash=0 / ts-invalid=10** |
| real-dts | **226/226** |
| harness `--all` | 6 组 / cases **72 pass, 0 fail, 1 known** |
| harness `--double-accept` | 冲突 **0**，91 用例 0 失败 |
| harness `--lint` | **PASS** |
| feas-operator | 6/6 |
| insert-between | 9/9 |
| perf | scale ratio(200/100)=1.09、ratio(400/200)=1.96（≈线性 2.0），无退化 |

## 4. 剩余失败类（true 态，仍是 r3 的账）

- `missing-end` **24**：全部是「ASI 收口的子语句 + 下一行新语句」形态：
  `while (a) b\nc;`、`if (a) b\nelse c\nd;`、`debugger\nc;`、`return\nc;`、`lab: a\nc;`，
  报错 `SourceRange.End has already been set`（#69-#92）。最小复现：
  `node typescript/cases/ast-json-diff.mjs missing-end`。
  两个假设候选（本轮未及验证）：
  1. 子语句在 ASI 边界被**两个候选**同时签名（同一 token 的 End 被写两次）；壳收口格与 legacy 收口格重合；
  2. `ExpressionEndCode` 的 ASI 分支返回 `codeAt[len-2]`，但 `BuildFromShell` 消费到那里之后
     `FinishShell` 又把边界 token 搬回父单元重新求值，边界 token 被二次 SignIn。
- `possible-compute` 49：补建分支过宽（r3 §4.2），建议收窄到「当前单元是延续符/操作符/开括号」。
- `dts-recovery` 7：未定位。
- 其余零星（`gaps-r1231` 1、`gaps-types` 2、`declarations` 1、`asi-import-boundary` 1、`async-arrows` 1…）。
- token-ast 14 crash（r3 数）：与 `BuildFromShell` 抛错后 `DetachShell` 兜底同源，未定位。

## 5. 下一步（按性价比）

1. **给壳显式「本层关闭」信号**（替代全局静态位）：在 `StatementShape` 上记一个
   `LayerClosedAt`/`CanCloseAt`，由父目录在签出 `}` / 到顶时置位；`ExpressionEndCode` 第 3 步
   用这个信号而不是 `atEof`。这是 missing-end 的正解方向，也能让静态位不再承重。
2. 用 untracked `.cjs` patch `StatementEndPossibleShape.ExpressionEndCode` + `RootExpressionStatementPossibleShape`
   打印「同一 token 被哪两个 shape SignIn」，直接坐实 §4 的假设 1/2。
3. possible-compute 按 r3 §4.2 收窄补建条件。
4. 全绿后再单独 commit 把 `EnableShellExpressions` 置 true，重跑全表 + harness + perf。

## 6. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（与 Wave1 基线逐位相同，所有门全绿）。
不要因为 stage1 组绿就打开它：true 态 ast-json 仍差 ≥130 例。