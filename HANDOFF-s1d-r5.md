# HANDOFF — T1d r5：missing-end 根因坐实并修复（开关仍 false）

分支 `feature/possible-statement-s1d`（本目录 r5），起点 `67780f98`（r4）。

## 1. 本轮结论（一句话）

`missing-end` 24 **不是**「壳与 legacy 同格二次 SignIn」（r4 §4 假设 1 被否证）：全程**没有任何双 SignIn**。
真正的根因是 **EOF 兜底建尾语句时，对同一个 `ExpressionStatementShape` 二次 `SignOut`**：
`SourceFileEndPossibleShape.BuildByIndex` 先按「无分号」建出形状（`SourceRange.End` = 表达式末单元），
随后又 `built.SignOut(;)` 再签一次 → `SourceRange.End has already been set`。
一处修复后 true 态 ast-json 由 **6037/6167 → total cases=6167 cj-ok=6154 cj-fail=13（47 个构造）**，false 态与 Wave1 基线逐位相同。

## 2. 诊断证据（硬证据）

方法：untracked `_diag-r5.cjs`，monkeypatch `Token.prototype.SignOut/SignIn`、
`StatementEndPossibleShape.BuildByIndex`、`StatementShape.FinishShell`、
`RootExpressionStatementPossibleShape.BuildByIndex`，用 `SourceFileRunner.Parse` 跑最小用例。

第一次（也是唯一一次）双签出，三个形态同一栈：

```
### DOUBLE SignOut class=ExpressionStatementShape start=12 curEnd=13 newEnd=14 parent=null
  at SourceFileEndPossibleShape.BuildByIndex (.../source-file-end-possible-shape.js:235:31)
  at CatalogGuide.ComputePossibleShapesByIndex (.../catalog-guide.js:46:30)
  at CatalogGuide.ComputePossibleShapes (.../catalog-guide.js:23:21)
  at SourceFileShape.ComputePossibleShapes (.../unit-token.js:17:38)
  at EndOfFileTokenShape.Close (.../end-of-file-token-shape.js:19:34)
  at SourceFileShape.Process (.../source-file-shape.js:77:17)
```

- `while (a) b\nc;`、`if (a) b\nelse c\nd;`、`debugger\nc;` 三者完全同栈（尾段 `c ;`）。
- `return\nc;`（在函数体内）本轮已 OK。
- `lab: a\nc;` 是另一类：`表达式语句没有读完`（`BuildTrailingDeclaration` 把 `a\nc` 当成一条表达式），**未修**。

代码路径（`source-file-end-possible-shape.xl.md` 的 `BuildByIndex` 尾段）：`at` 是 `;`、
`BuildTrailingDeclaration` 返回 false 时，旧代码 `FromUnits(host, start, at - 1, context, false)` 建出
`ExpressionStatementShape(12..13)`，紧接 `built.SignOut(semiEnd=14)` —— 同一形状第二次签出，必抛。

## 3. 修了什么（1 个文件、1 处）

`typescript/tokens/files/source-file-end-possible-shape.xl.md`：把 `;` 一起交给
`FromUnits(..., requireSemicolon = true)`——该分支把 `;` 从表达式单元里摘掉、却用 `;` 的 `End` 收口，
一次签出就得到 TS 的 `ExpressionStatement` 区间（含 `;`）；删掉第二次 `SignOut`。

未改 `core/`、未动 `StatementScanner.AtEOF` 静态位、未改 `possible-compute` 与 token-ast 崩溃点。

## 4. 每道门读数

| 门 | false（最终提交） | true（本轮修复后） | true（r3/r4 基线） |
| --- | --- | --- | --- |
| ast-json | total cases=6167 cj-ok=6167 cj-fail=0（47 个构造） | total cases=6167 cj-ok=6154 cj-fail=13（47 个构造） | 6037/6167 |
| ast-json-diff | 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 | 合计 6167 条：完全一致 6154 / 6167；有结构差 13 条、有位置差 0 条、有字段差 0 条 | 130 结构差 |
| missing-end | 142/142 | total cases=142 cj-ok=139 cj-fail=3（1 个构造） | 118/142（24 失败） |
| possible-compute | 205/205 | total cases=205 cj-ok=202 cj-fail=3（1 个构造） | 156/205（49 失败） |
| token-ast | known-gap:     0 file(s) (none) / non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10) | non-known-gap: 1716 file(s) (ok 1696, crash 10, ts-invalid 10) /  | ok=1692 crash=14 |
| real-dts | 226/226 | 真实 .d.ts 全量解析成功且 AST 逐节点一致 | 226/226 |
| validate | 1720 条用例，0 条不合格 | 同 | 1720/0 |
| harness `--all` | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=6 skipped=2 | cases pass=72 fail=0 skip=0 known=1 | 未单测 | 72/0/1known |
| harness `--double-accept` | [statement-possible] double-accept 冲突: 0 / [statement-possible] double-accept: cases=91 failed=0 | 未单测 | 0 冲突 |
| harness `--lint` | [lint] OperatorTable 数字优先级条目=12 / [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） | 未单测 | PASS |
| perf | [perf] scale n=400 median=1.14ms tokens=799 candidateCalls=829 | [perf] scale ratio(200/100)=1.31 ratio(400/200)=1.76（线性≈2.0；>2.5 视为退化告警，不判失败） | [perf] done | 未单测 | 线性≈2.0 |

true 态 13 条结构差的分布（per-stem）：有结构差 3 条、有位置差 0 条、有字段差 0 条 | 有结构差 4 条、有位置差 0 条、有字段差 0 条 | 有结构差 3 条、有位置差 0 条、有字段差 0 条 | 有结构差 3 条、有位置差 0 条、有字段差 0 条 | 合计 6167 条：完全一致 6154 / 6167；有结构差 13 条、有位置差 0 条、有字段差 0 条

## 5. 剩余失败类（true 态）

1. **13 条结构差**（由 130 降下来）：与尾段多语句 / `lab: a\nc;` 同族，未逐条定位。
   `missing-end` 组已 total cases=142 cj-ok=139 cj-fail=3（1 个构造）。
2. `possible-compute` **49** 未动：需按 r3 §4.2 收窄 `RootExpressionStatementPossibleShape` 的补建条件
   （只在「当前单元是延续符/操作符/开括号」时补建）。
3. `token-ast` **crash 14** 未动（true 态），仍是 `BuildFromShell` 抛错后 `DetachShell` 兜底同源。
4. `dts-recovery` 7 本轮未单列（real-dts 全量已绿）。

## 6. 开关最终值

`StatementRouteUtil.EnableShellExpressions = **false**`（未改）。修复本身与开关无关，
false 态所有门与 Wave1 基线一致；true 态仍差 13 条结构差 + 49 possible-compute + 14 crash，
**不要**在此时打开开关。

## 7. 下一步（按性价比）

1. 先看 13 条结构差（`ast-json-diff.mjs` per-stem），大概率同属「EOF 尾段多语句」，
   与 `BuildTrailingDeclaration` 的返回 false 条件有关，而不是壳。
2. possible-compute 49：收窄补建条件，逐组校准。
3. token-ast crash 14：按崩溃栈定位（`BuildFromShell` / `DetachShell`）。
4. 全绿后单独一个 commit 把开关置 true，再跑最终全表 + harness + perf。

诊断脚本手法可直接复用：`node --require ./_enable-true.cjs tests...`（预载里把开关置 true），
比改源码再 build 快得多；注意 `ast-json.mjs` 会写 `<构造>.cj-ast.json`，**必须**
「ast-json → ast-json-diff」成对跑同一状态，否则 diff 读到的是另一状态的快照（本轮踩过）。