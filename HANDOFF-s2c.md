# HANDOFF — Stage 2c：build 路径 O(n²) 热点（表达式体结构文本每格渲染）

分支 `feature/possible-statement-s2c`，基线 `feature/possible-statement` @ 0f2e8982。

## 1. 结论

**s2b 的推测（热点在 `SourceFileEndPossibleShape.BuildByIndex` 的 `ItemUtil.ItemStart`）被 CPU 采样证伪。**
`node --cpu-prof` 对 scale n=400（`a1+a2+…+a400;` 单条长表达式语句）采样，473 个样本 self time 第一名是：

```
38.9%  184  Render @ statements/statement-operator-body.js:262
 4.7%   22  IngestAll @ statements/statement-operator-body.js:72
 3.2%   15  ComputeByIndex @ statements/statement-end-possible-shape.js:26
```

`IngestAll` 是**逐格**调的（每来一个 basic token 一次），每格都 `this.Text()` → `Render` 递归整棵形状树，
单条表达式总代价 O(n²)。`ItemStart` 在这条曲线上只被调用一次（单条语句），不可能解释 100→400 的 3.5×。

## 2. 改动（2 个文件）

1. `typescript/tokens/statements/statement-operator-body.xl.md`：`IngestAll` 不再每格求结构文本；
   新增 `Finish()`，只在语句收口时求一次并 `Publish`（`!Nested && !Incomplete && IsComplete()`）。
2. `typescript/tokens/statements/statement-shape.xl.md`：`BuildFromShell` 喂完最后一格后调 `OperatorBody.Finish()`。

等价性论证：`ShapeTexts` 的语义是「每体一个槽位、写最终结构」，中间格的 `Publish` 必被后一格覆盖，
唯一消费者是收口后的 `ShapeTexts` / `LastText`；槽位按**语句建树顺序**首次分配，而 Finish 恰在每条语句建树前调用，
所以槽位内容与顺序逐字不变。`Fail` 的撤槽位条件（`Slot === length-1`）在延迟发布下 `Slot` 仍为 -1，行为不变。

**未改** `StatementBoundaryUtil.IsAsiBoundary`、未改 `core/`、未改任何候选判定。

## 3. perf 前后（同机同 `perf.mjs`，reps=5，中位数）

改前（基线 0f2e8982）：

```
[perf] long n=300 median=19.40ms tokens=599 candidateCalls=30 callsPerToken=0.05
[perf] many statements=2000 median=28.84ms tokens=2000 candidateCalls=30015 callsPerToken=15.01
[perf] scale n=100 1.47ms / n=200 4.80ms / n=400 17.28ms
[perf] scale ratio(200/100)=3.25 ratio(400/200)=3.60  → WARN
```

改后：

```
[perf] long n=300 median=7.13ms tokens=599 candidateCalls=30 callsPerToken=0.05
[perf] many statements=2000 median=34.24ms tokens=2000 candidateCalls=30015 callsPerToken=15.01
[perf] scale n=100 median=0.75ms tokens=199 candidateCalls=30
[perf] scale n=200 median=1.84ms tokens=399 candidateCalls=30
[perf] scale n=400 median=4.89ms tokens=799 candidateCalls=30
[perf] scale ratio(200/100)=2.46 ratio(400/200)=2.65（线性≈2.0；>2.5 视为退化告警，不判失败）
```

`candidateCalls` 不变（long=30、many=30015），说明判定路径未变，只去掉渲染。

## 4. 等价证据（本机实跑）

| 关卡 | 结果 |
| --- | --- |
| `tsc -p tsconfig.json` | 0 error |
| 四步 ast-json：重生成 → `git status --short typescript/cases` | statuslines = 0 |
| ast-json-diff / token-ast / real-dts | exit code 见下 |
| dev / op 组、`--all` / `--double-accept` / `--lint`、parse/validate | exit code 见下 |
| op-ast-proof / op-proof（本次改动主要判据） | exit code 见下 |
| feas-operator harness / insert-between | exit code 见下 |

逐门 exit code：`dev=0 op=0 opast=0 opproof=0 all=0 double=0 lint=0 validate=0 astjson=0 astdiff=0 tokenast=0 realdts=0 feas=0 insert=0`，ALLGREEN=True。

## 5. 风险与剩余

- `LastText` / `LastComplete` 现在只在收口时刷新（原来每格）。测试脚本只在用例开始时复位、不读中间值，
  但若将来有代码在**解析中途**读 `LastText`，会拿到上一条语句的值。
- 若将来出现「壳建树不走 `BuildFromShell`」的新路径，`Finish` 不被调用、该语句槽位会缺失——表现为 op-proof 变红
  （可见失败，不是静默错值）。
- 产物 `dist/ts` 是**手工同步**的（本机无独立 `xl` 可执行文件，生成器只以工具形式提供）；`.xl.md` 与产物逐语句一致，
  下一次 `xl build` 应从 `.xl.md` 生成同样内容。
- **过程事故（留档）**：一次 `[IO.File]::WriteAllText` 的参数因相对路径解析失败而为 null，导致两个 `.xl.md` 被截成
  0 字节；已用 `git checkout --` 完整还原并在写前加了长度/锚点断言。`dist/ts` 未被截断。
- 剩余二次项：`HasTypeArgumentCall` 每格仍 O(units) 扫 `<`（本用例无 `<`，贡献很小）；`statement-end` /
  `statement-shape` 的每格判定在采样里合计约 5%。

## 6. 回滚

    git checkout feature/possible-statement-s2c
    git reset --hard 0f2e8982