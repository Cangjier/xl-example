# HANDOFF — impl-wp3-33（WP-3 第三十三波：#86 + #81 全部修好，AST 6165 → 6167/6167）

STATUS: **COMPLETE / 净正（AST +2）**。6165 → **6167 / 6167**（结构差 2→**0**、位置差 1→**0**、字段差 0、cj-fail 0）。
剩余两条结构差全部消掉：**#86（BOM）**在外层 core `item-list` 的 `Feed` 修好，**#81（`type T = A` 续行）**在
`root-item-rule` 的声明边界收口修好。本波**没有**改 `KindOf` 探针（实测对该条无影响，见 §3）。

BRANCH: impl-wp3-33
BASE: impl-wp3-32 @ c698a932
COMMIT: f3ead6b1（#86，core）+ 4f3fc483（#81）+ 本 HANDOFF 的文档提交

## 0. 读数（本分支实测，2026-10-24）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| 起点复现 | xl_build 全量 + tsc + ast-json + diff | 6165/6167；结构 2 / 位置 1 / 字段 0；cj-fail 0 | 与 wp3-32 逐项相同 |
| 本波终值 | 同上 | **6167/6167**；结构 **0** / 位置 **0** / 字段 0；cj-fail 0 | **+2，全部用例一致** |
| real-dts | `node typescript/cases/real-dts-ast.mjs`（full 档内） | 226 解析成功 / 226 AST 一致 / 崩溃 0 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS 5.7s | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | PASS 10.6s；AST 全量 6167 一致、body-guide 全量绿、tests/gates 1/8（基线 KNOWN-RED） | PASS |
| full | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | 42.3s；**real-dts PASS、parse-perf PASS**；3 项红：buffer-equivalence、class-scaling(measure)、class-scaling --base | AST 硬门 PASS |
| buffer | 同上 | xml **PASS 4488 / FAIL 16 / ERROR 52**；digest **PASS 4384 / FAIL 120 / ERROR 52** | 相对 wp3-32（4489/15/52）**多 1 个 FAIL，是本波修好的 #86 用例**（见 §4） |
| xl_check | 两个改动文件 | **0 error** / 1 warning（`item-list` 的 `constructor` 缺描述，**既有**） | PASS |

## 1. #86 `const\uFEFFb8 = 3;` —— 真根因在**批次起点**，不在 `Flush`

wp3-32 的结论（「BOM 关闭触发 CloseBatch→Flush，把 `[0,2)` 记 raw」）**实测不成立**：
本波打点（`build/ts` 临时 console.error，未进提交）显示**整条解析过程中 `Flush` 一次都没被调用**
（最后的 `FlushBatch` 因 `BatchSink === null` 提前返回），而 `const` 这条 item 的 `Feed` **根本没发生**：

```
[CLOSED] Bom            ← 第一个 OnBasicTokenClosed 就是 BOM，const 的关闭从未发生
[FEED] from=1 to=2 start=-1 checked=-1 rule=-1 data=2   ← 批次从 1 开始，Data[0]=const 被跳过
[FINISH] data=0:Common* 1:BomT. 2:Common. ...           ← const 到 FinishBody 仍是 *未关闭*
```

机制：`Common.Transit` 才是关 `const` 的唯一路径（`last.TryToClose`）；BOM 字符被 `Bom.Transit`
抢走，`Bom` 自己 `SignIn/SignOut/TryToClose` 后直接入 `Data`，于是 `const` 一直开着、永远等不到关闭。
宿主给批次的起点是「刚关闭的那个 unit」（`batch.Reset(this, last, …)`，`last = Data.length - 1`），
**这个前提被打破**：`const` 之前的 unit 没人喂，而批次从 BOM 那一格开始 ⇒ item 从起点就丢了，
`type`/`b8` 只能从第二段重新开始，`const` 落到 raw 段被尾巴建成空声明列表的 `VariableStatement[0,5]`。

修法（`core/syntax/batch/item-list.xl.md`，`Feed`，契约 ⑦）：引擎**从未消费过任何 unit**
（`Start < 0 && Checked < 0`）时，把 `from` 往前推到最近的形状 unit 之后，把这些「没人喂」的 unit 并进本批：

```ts
let from = batch.Cursor;
if (from > 0 && this.State.Start < 0 && this.State.Checked < 0) {
  let back = from;
  while (back > 0 && !(host.Data[back - 1] instanceof ShapeToken)) {
    back = back - 1;
  }
  from = back;
}
```

已消费过时不动（那时 `Checked` 是权威边界）。结果：`const\uFEFFb8 = 3;` 建成
`VariableStatement[0,13] / VariableDeclarationList[0,12] / VariableDeclaration[6,12]`，与 TS 逐节点一致。
**`BatchMode=0` legacy 不经过 `ItemListEngine`（`unit-token.xl.md` 第一行就分流），逐字不变。**

## 2. #81 `import x from "m"` ⏎ `type T = A;` —— 修在**声明边界收口**，不是 `KindOf`

实测打点证明 KindOf 不是这条的瓶颈：

```
[AN] start=0 ... code="import","x","from","\"m\"","type" kind=1 alive=1
[AN] start=0 ... code="import",...,"type","T","="      kind=1 alive=0   ← ① 分支：End=CodeAt[at-1]="T"
[REC] start=0 to=11   ← import 的 item 区间把 `type`、`T` 一起吃掉了；类型别名再也起不来
```

即：`IsDeclarationBoundary` 在 `type` 那一格**已经**返回 true，但边界建（`BuildByKind(1, …, closeEnd=6)`）
**失败**——`ImportDeclarationShape.FromUnits` 要求末单元是 `;`，而 `import x from "m"` 是 ASI 收口、没有分号。
建不出来就继续扫，扫到 `=` 时候选全灭，① 分支按 `CodeAt[at-1]`（=`T`）收口 ⇒ `type`/`T` 被 splice 掉。

修法（`typescript/tokens/items/root-item-rule.xl.md`，`Analyze` 的边界块）：边界建不出来、
且**下一格是 `type`** 时，在边界处 **raw 收口**（`End = CodeAt[at-1]`、`Pending = null`）。
raw 段交给 `SourceFileTailBuilder.BuildTrailingItems` 逐段重建：它建得出无分号的 import，
也建得出 `TypeAliasDeclaration`。结果与 TS 一致：`ImportDeclaration[0,17] + TypeAliasDeclaration[18,29]`。

**限定只对 `type` 开这一格**：放开到全部声明词（只要边界建不出就 raw 收口）实测**净负 62 条**
（6166→6104，结构差 63 / 位置差 44），因为其它声明词的边界在「建不出来」时继续扫仍能收敛到正确切点。

## 3. 为什么没改 `KindOf` 的 `TextOf(...)=="="` → `IsSymbolAt`

按任务书顺序先做了实验（`build/ts` 直改，未进提交）：把 `KindOf` 的 type 分支两处
（`while` 的探测条件与 `if` 判定）换成 `IsSymbolAt(code, probe, "=")`，**#81 的 AST 一个字都没变**
（CJ 仍是 `Common "type" / Common "T" / Symbol "=" / ExpressionStatement "A;"`）。
原因正是 §2 的第 2 行：`type` 从来不是新 item 的首格，`KindOf` 拿到的是 `import` 开头 ⇒ 恒返回 1。
所以该改动对 #81 无益（wp3-30 的净负 13 仍然成立），**本波没有落进源码**。

## 4. buffer 的 +1 FAIL 是**预期内**的

xml `PASS 4489→4488 / FAIL 15→16`、digest `FAIL 119→120`。多出来的那一条是
`tests/cases/token/lexical/lex-bom-midcode.ts`（#86 的 BOM 语料）。buffer 是拿**未修的基线 build**
逐字节比 XML，而 #86 的 AST 本波已按 TS 修正 ⇒ 这一份 XML 必然与基线不同。
这不是回归，是修复的代价；merger 若要「XML 逐字节不变」，那两条 AST 就永远是差的（二者不可兼得）。

## 5. 未完成项

无（WP-3 的 AST 目标 6167/6167 **达成**）。仍红的三项都是**既存/非 AST**：
`tests/gates/run.mjs`（基线 1/8 KNOWN-RED）、`class-scaling(measure)`（计时噪声，档 A 2.73 vs 2.6）、
`class-scaling --base`（`same-line` 早期错误恢复口径差异，wp3-31/32 同红）。

## 6. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name merge-<x> -From impl-wp3-33 -Base impl-wp3-33
cd merge-<x>
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
```

## 7. 踩过的坑（本波新增）

1. **`git commit -m "...\"m\"..."` 在 PowerShell 里会炸**：`\"` 不是转义（PS 用反引号），
   整条 `-m` 被截断，git 报 `fatal: /: '/' is outside repository` 且**不产生提交**（但 `git add` 已生效）。
   含引号的提交信息用**单引号**字符串。
2. `xl_build` 单文件增量 ~1s；全量输出 360KB+，**只传改动文件**。
3. 打点一律写 `build/ts/**`（用 Node 以 utf8 读写），`tsc` 会覆盖；**不要**用 PowerShell 读写 JS。
4. 判断「引擎有没有喂过某个 unit」，看 `ItemScanState`（`Start/Checked`），不要看 `host.Data` 长度——
   `Data` 里的 unit 完全可以从未进入任何批次（本波的 `const`）。
