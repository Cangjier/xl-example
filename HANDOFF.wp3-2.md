# HANDOFF — impl-wp3-2（WP-3 第二波：root item 表 / tail builder 拆 build-only）

STATUS: PARTIAL
BRANCH: impl-wp3-2 @ <见本提交 sha>
BASE: impl-wp3 @ d0b693c6（含 tail builder 机械搬迁、files/*possible* 删除、Close 单次遍历）

## 做了什么

1. 建 clone：`.\tools\new-member.ps1 -Name impl-wp3-2 -From impl-wp3 -Base impl-wp3`（node_modules junction OK）。
2. 通读本包要动的全部面：`typescript/tokens/items/source-file-tail-builder.xl.md`（1532 行，逐段读）、
   `typescript/tokens/files/source-file-shape.xl.md`、`typescript/tokens/items/statement-item-{rule,scan}.xl.md`、
   `core/syntax/batch/{item-list,i-batch-host,basic-token-batch,item-scan-state}.xl.md`、
   `core/syntax/{unit-token,token,syntax-context}.xl.md`、`tests/body-drive/batch-split.mjs`（281 行）。
3. **盘点出 A 的全部障碍**：tail builder 里 40 处 `host.Data.splice`（行号见下），这是「只建造不落盘」的唯一工作量。
4. 得出一个**上一棒没写下来的关键设计结论**（决定 A 的签名，见 §设计 A）。
5. 本波**未改动任何源文件**（分支与 impl-wp3 逐字节相同）——所以接任者从一个已经 AST 全绿的起点开工，不需要回退任何东西。
6. 未跑门禁：新 clone 没有 `dist/` 与 `build/`，且轮次预算已被「读 1532 行 tail builder」吃光。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | 未跑（新 clone 无 dist，轮次用尽） | — | 待跑 |
| tsc | 同上 | — | 待跑 |
| AST 全量 | 同上 | — | 待跑（起点应等于 impl-wp3 读数） |
| real-dts / full / xl_check / batch-split root | 未跑 | — | 待跑 |

> 起点参考（impl-wp3 实测，本分支源码与之相同，未构建所以还不能声称复现）：
> xl_build 884 written / 0 error / 2429 warning；tsc exit 0；quick PASS 5.6s；
> AST 全量 6167/6167（47 构造）结构 0 / 位置 0 / 字段 0；`buffer-equivalence` xml 4504/0/52；RD 226/226。

## 设计（接任者照做，含代码草图）

### A. tail builder 拆「只建造不落盘」

**40 处 splice 的分布**（`typescript/tokens/items/source-file-tail-builder.xl.md`，行号为本波实测）：

- `BuildByIndex`（240–344）：262（ASI 表达式）、277（ASI 边界裸块）、313（standalone 尾语句）、328（EOF 表达式兜底）
- `BuildStatementSegments`（346–415）：404（逐段）
- `BuildTrailingDeclaration`（440–1497）：475（`declare;`）、507（`do…while`）、561（装饰器变量语句）、
  674 + 708（多语句前缀 / 后缀两段）、744（装饰器声明头）、788（empty）、816（simple）、870（statement）、
  937 + 979 + 1007 + 1012（重载签名 + 合成 `;`）、1047、1075、1109、1121、1140 + 1142（namespace export + 合成 `;`）、
  1199（无体签名）、1223 / 1229 / 1235（class / interface / enum）、1264（module）
- `BuildModuleDeclaration`（1498–1532）：1395、1406 + 1409、1415、1439 + 1443、1450 + 1454、1475、1484 + 1488、1493

**结论 1（签名）**：`BuildModuleDeclaration` 只产出一个 Token，可以拆成 `BuildModuleItem(...):Token | null`；
但 `BuildTrailingDeclaration` 与 `BuildStatementSegments` 返回 `bool`，**一次调用可能建出多条形状**
（boundary 前缀/后缀递归、`declare;` 后按段收口、`BuildStatementSegments` 逐段）——
所以这两个入口的 build-only 形态必须是 `Array<Token>`，**不能**是 `Token`。写 `RootItemRule.Build:Token` 时
不要把这两条硬塞进单条 item：它们属于「尾巴」（EOF/硬边界），由 `FinishBody` 收，不属于 per-item Build。

**结论 2（实现方式，别重写 1000 行）**：用 **Data journal**（快照 → 跑旧逻辑 → 收集新形状 → 还原），
既有判据与建造逻辑一字不动（INV-2），只是把「落盘」从入口里剥出来：

```ts
## static method BuildTrailingItems:(host:Token, start:int, at:int, context:SyntaxContext)=>Array<Token>
const before:Array<Token> = host.Data.slice();
SourceFileTailBuilder.BuildTrailingDeclaration(host, start, at, context);
const items = SourceFileTailBuilder.CollectNewShapes(host, before);
host.Data = before;               // 还原：宿主 Data 回到调用前（= 不落盘）
return items;

## private static method CollectNewShapes:(host:Token, snapshot:Array<Token>)=>Array<Token>
const items:Array<Token> = [];
for (const unit of host.Data) {
  if (unit.IsBasicToken || unit.IsTriviaToken) continue;   // basic/trivia 身份不变，不是新 item
  let known = false;
  for (const old of snapshot) { if (old === unit) { known = true; break; } }
  if (!known) items.push(unit);
}
return items;
```

- `BuildSegmentItems` 同形（包 `BuildStatementSegments`）；`BuildModuleItem` 返回 `items.length > 0 ? items[0] : null`。
- 旧的三入口**保留原签名与原行为**（legacy / `BuildByIndex` 仍走它们），新增的三个是 engine 侧 API。
- 验证：先只加方法、不改调用点 → xl_build 0 error + AST 全量 6167 必须 0/0/0（证明「加了没接线」）。
- 注意 `host.Data = before` 是**字段赋值**（`SourceFileShape.Close` 里已有同样的 `this.Data = this.Data.filter(...)`），
  xl 允许；但必须确认 `Token.Data` 不是 readonly（读 `core/syntax/token.xl.md` 的字段声明）。

### B. `typescript/tokens/items/root-item-rule.xl.md`

- `class RootItemRule implements ItemRule`，kind：import=1 / export=2 / declaration=3 / module=4 / statement=5。
- `Classify(code)`：`code[0] instanceof Common ? TempToString()` → 分组；statement 组调 `new StatementItemScan().Run(code)`，
  `Status===2`（Mismatch）返回空数组让别的规则接（照 `StatementItemRule.Classify` 的写法，`AtEof=false`）。
- `Analyze(state)`：statement 组把 `Run` 的 `Status/End` 翻成 `Complete/End`（`state.CodeAt[end]`）；
  声明组用**已有**判据 `SourceFileTailBuilder.LeadingDeclarationKeyword`（169）/`BodyDeclarationKeyword`（194）+ 各自的
  `FromUnits` 是否吃得下（实现前先 grep 每个 shape 的静态入口签名：`XxxShape.FromUnits(host, start, at, context, …)`）。
- `Build(host, state, context)`：**只**调 shape 的静态建造器 / `StatementBuilder`，**不 splice**；返回 `null` 走 raw。
- `class SourceFileBodyItemHost implements IBatchHost`：照抄 `StatementBodyItemHost`（`statement-item-rule.xl.md:134-236`），
  多一个 `Fallback:RawFallback` 与 `CloseBatch → Engine.Flush`。
- host 的 `FinishBody`（root 专用）：`FlushBatch` → 对 raw 回退区间调 `BuildTrailingItems`/`BuildSegmentItems` →
  把返回的多条形状按 `[f, t)` 右向左 splice → `SignOut` + `TryToClose` 关根。

### C. 接线 `SourceFileShape`

1. 构造器：`this.BatchAdapter = new SourceFileBodyItemHost(this, RootItemRule.CreateRules());`
   （`BatchMode` 默认 1，挂上即生效；`BatchMode=0` 由 `UnitToken.OnBasicTokenClosed` 自动回 legacy）。
2. 删 `CatalogGuide`、根终结候选、`CreatePossibleShapes`；`EndOfFileTokenShape` 若不再用则一并删 import。
3. `Process` 的 EOF 分支（`source-file-shape.xl.md:111-130`）：保留「关 mounted / 关 last」，然后
   `this.FinishBody(context)` 代替「造 EOF 哨兵 + `eof.TryToClose`」；`batch.AtEof` 由
   `OnBasicTokenClosed` 每批写入（`UnitToken.FlushBatch` 已可用）。
4. **降级路线（重要）**：先让 `RootItemRule` 只在 `tests/body-drive/batch-split.mjs --family=root` 里绿
   （Adapter 保持 `null`，AST 必然不变），再接 `BatchAdapter`；接上后 AST 若红，**立刻摘回 `null` 并 commit 绿的那一步**，
   把 diff 的前几个用例写进 HANDOFF。

### D. `tests/body-drive/batch-split.mjs --family=root`

文件是「族无关骨架 + family 表」（`FAMILIES`，195 行；驱动循环 226–281）。加 root 段只需往 `FAMILIES` 里追加一项，
钩子与 statements 段同形：`name / cases()`（root 级语料：import、export、class、interface、function、enum、module、
type alias、各语句、ASI 尾巴）+ `makeHost / contextOf / runWhole / runSplit`（root 用 `SourceFileRunner` 造 host，
与 `makeHost` 现有实现一致）。断言沿用骨架的「形状序列 + XML digest + 数量」比对，只改自己 family 段。

## 未完成项

1. §设计 A 的三个 build-only 入口（0 行已写）；障础已盘清，见上面行号清单。
2. §设计 B 的 `root-item-rule.xl.md`（未创建）。
3. §设计 C 的接线（`SourceFileShape` 仍是 `CatalogGuide` + 根终结候选，未接 `BatchAdapter`）。
4. §设计 D 的 root family（未加）。
5. 全部门禁未在本 clone 跑（需先 `xl_build`）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-3 -From impl-wp3-2 -Base impl-wp3-2
cd impl-wp3-3
# 0) 先构建，否则门禁 MODULE_NOT_FOUND
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript\cases
# 1) 设计 A：加三个 build-only 入口（journal）→ xl_build → AST 6167 必须 0/0/0 → commit
# 2) 设计 B：root-item-rule.xl.md（先 grep 每个 shape 的 FromUnits 签名）→ xl_build → quick → commit
# 3) 设计 D：batch-split --family=root（Adapter 仍 null）→ 绿 → commit
# 4) 设计 C：挂 BatchAdapter + FinishBody → AST 全量 → 红就摘回 null → commit
# 5) ..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build + real-dts 226/226 + xl_check 0 error
```

## 阻塞点

无外部阻塞。本波轮次预算被阅读（1532 行 tail builder + 4 次大文件上下文）吃光，**没有任何源文件改动**，
分支干净、与 impl-wp3 等价，接任者不需要回退。

## 踩过的坑

- **别用 `write` 重打 tail builder**：1532 行里 40 处 splice 的语义高度耦合（后一处依赖前一处 splice 后的下标），
  整文件重写几乎必错。用 journal 包装（§设计 A）能以 ~60 行拿到「不落盘」语义，且旧路径逐字节不变。
- **两个 bool 入口必须返回 `Array<Token>`**（一次调用可建多条），这是上一棒按单 Token 设计卡住的根因之一。
- **`BuildByIndex` 的 ASI 分支会被新引擎旁路**：挂上 `BatchAdapter` 后，EOF 哨兵的关闭走
  `UnitToken.OnBasicTokenClosed → Engine.Feed`，不再走 `Token.OnBasicTokenClosed → CatalogGuide`。
  所以 `FinishBody` 必须自己复现「建尾巴 + SignOut + TryToClose」，否则根不会被关、AST 直接炸。
  上一棒交接里写的「先 FlushBatch 再关根」就是这个意思。
- **并发**：impl-wp2-5 正在改 `core/bracket` 与 `statements/**`；本包一行都不能碰它们（已验证本分支零冲突）。
- `Get-Content` 读中文 `.xl.md` 是乱码属控制台编码问题；判据只看 `xl_build` 是否 0 error。
- 新 clone **没有** `dist/`、`build/`：任何门禁之前必须先 `xl_build` + `tsc`。