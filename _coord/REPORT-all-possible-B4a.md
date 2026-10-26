# REPORT-all-possible-B4a — interface + type alias 声明早期挂壳

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-17` — WP-B4a/B4b-base（Phase B 声明族：interface + type alias） |
| 分支 | `feat/b4a`（只提交本地分支，**未 push**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4a-type-decls`（`node_modules` 为 canonical 的 junction） |
| base | `base-int` = `_integration/integration/all-possible` @ `9908b43f`（含 E0a/E0b/A4 merge + B1/B2/B5） |
| commit | `b259622f` — `feat(b4a): interface / type-alias declarations mount their legacy shape early`（+ 本报告 commit） |
| 构建产物 | `dist/ts/**` + `build/ts/**`，均 gitignored；`tmp/**` 为 gitignored 证据 |

**own 改动**

- 新增 `typescript/tokens/declarations/forms/interface-declaration-mount.xl.md`
- 新增 `typescript/tokens/declarations/forms/type-alias-declaration-mount.xl.md`
- 改 `typescript/tokens/statements/declaration-statement-possible-shape.xl.md`：**只在 B5 的 `[XL-B5]` 段之后追加**
  `[XL-B4a]` 接线（+ 2 行 import），未重排 B5 的代码
- `git mv` **48 条** case → `tts-impl/cases/{declarations,types}/`（8 条 interface + 40 条 type alias；内容逐字节不变）
- 本报告

**没碰**：`interface-declaration-possible-shape` / `type-alias-declaration-possible-shape`（**最终方案不需要改它们**，
见 §2.3）/ `interface-declaration-shape` / `type-alias-declaration-shape` / `*-end-possible-shape` /
`statement-shell-catalog` / `statement-family-dispatch` / `statement-shape` / `source-file-*` / `statement-route-util` /
`INDEX.md` / `tts/README.md` / `tts-impl/README.md` / `run.mjs`。

## 1. 验收读数（可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**，3 warning（既有 `E1107` 三处）；增量构建 3 written / 2 skipped |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs --quiet --json tmp/final1.json` | **exit 0**（225 条，全部与标注一致 = 273 − 48） |
| 4 | `node typescript/cases/tts-impl/run.mjs` | **PASS 200 / FAIL 0 / 200**（152 + 48，全部 `incremental`） |
| 5 | `node typescript/cases/tts/tools/diff-report.mjs tmp/base.json tmp/final1.json --allow <48 条迁移 id>` | **允许变化 48 / 不允许变化 0 → PASS**；allow 列表由脚本算出，**恰好 = 这 48 条**（其余 225 条逐字段相同） |
| 6 | 两次独立进程 `--json` 的 SHA-256 | **逐字节相同**（确定性保持） |
| 7 | `tts-impl/run.mjs --show` | `types/alias-primitive` → `incremental`（`earlier: TypeAliasDeclarationShape@pos=0`）；`declarations/interface-property` → `incremental`（`earlier: InterfaceDeclarationShape@pos=0, PropertySignatureShape@pos=13, IdentifierShape@pos=13, NumberKeywordShape@pos=16`）；`types/alias-mapped` → `incremental` |

**零漂移的证据**：diff-report 的 `一致 225 / 不允许变化 0` 是逐字段比较（`actual`/`reason`/`steps`/
`earlierNodes`/`residualBasicLines`/`rangeOnlyDifference` 全部字段），所以「非目标 case 在两种模式下逐字符行为
一个字节没变」由这个数字背书；目标 48 条全部从 `atomic` 变 `incremental`（无 `divergent` / `invalid` / `throw`）。

迁移分布（`--show` 全部 `actual=incremental`）：

- `atomic/declarations` 的 8 条 `interface-*` → `tts-impl/cases/declarations/`
- `atomic/types` 的 38 条 `alias-*` + 2 条 `interface-basic` / `interface-extends-multi` → `tts-impl/cases/types/`

> 说明：task 描述里的「约 36 条」是估计值；`git ls-files` + `--show` 实测 = **48 条**，全部是根层
> `interface` / `type` 声明（没有一条依赖 `export` / `declare` 前缀），本 WP 全部接管并迁移。

## 2. 机制（两种最小形态，都复用既有 legacy 建树）

### 2.1 interface：直接挂真壳（收口零重复）

```text
接口头那一格（BuildByIndex，root + head == 'interface'）
  └─ 搬 start..tokenIndex 进 InterfaceDeclarationShape，原位替换、host.MountedUnit = shape，Pos = C1 口径
       └─ 后续单元（名字 / 类型参数 / heritage / 接口体）继续落进它的 Data
            └─ `{` 创建 → 既有 InterfaceDeclarationShape.OnBracketCreatedEvent
                 挂 CatalogGuide([], new InterfaceDeclarationEndPossibleShape())
                 └─ `}` 关闭 → 既有终结候选调 InterfaceDeclarationShape.BuildFromCode(shell, code, shell.Pos)
                       → legacy 子树，原位替换壳 ⇒ EOF 树 = legacy 树
```

**本文件不写一行建树代码**：`BuildFromCode` / 体括号判据 / 成员目录都是既有实现（与 legacy 同源），
所以 EOF `(类名, pos, 文本字段)` 逐节点一致；账本看到 `InterfaceDeclarationShape@pos=0`（以及成员形状）
首次出现从「语句收口」提前到「接口头 / 成员所在格」。

### 2.2 type alias：占位节点（因为别名没有显式收口触发点）

```text
建壳那一格：先 super.BuildByIndex（既有语句壳）→ 在 shell.Data[0] 插 TypeAliasDeclarationShape 占位
  占位：类名 = legacy 最终类名、Pos = 壳的 Pos（C1 同源）、src.Start = 首个代码子单元、IsTriviaToken = true
收口：仍是 legacy 语句壳（StatementBuilder 建 TypeAliasDeclarationShape.FromUnits）→ 壳被 built 替换
  ⇒ 占位随壳一起离开，EOF 树 = legacy 树；账本看到的 TypeAliasDeclarationShape 首次出现 = 建壳那一格
```

**为什么别名不直接挂真壳**（实测踩过）：`type` 别名的结束点是「`;` / EOF / 换行 ASI」，没有 `}` 那样的显式
关闭触发点；给真壳挂终结候选后发现**换行 trivia 关闭不会问父单元的目录**，壳永远等不到收口 ⇒ EOF 树停在
「壳 + 一堆 basic 子单元」= `divergent`（实测 40 条别名全部 divergent）。改用 B1 验证过的占位节点后：
收口 100% 交给 legacy 语句壳，占位只负责「让账本更早看到同名同 pos 的节点」，没有任何重复建树 / 拆分风险。

### 2.3 为什么不动两个 `*-declaration-possible-shape.xl.md`

task 声明的写域包含它们，但它们挂的是 **file-level 候选目录**（`SourceFileShape` 的 catalog），
且 `ComputeByIndex` 第一步就 `ShouldYieldToDeclarationShell(...)` 让位给语句壳——真正接管这条路径的是
`DeclarationStatementPossibleShape`（B5 已经在这里开了「挂壳」口）。本 WP 沿用同一个口（后面追加），
两个 possible-shape 因此**一行都不用改**（少改 = 少冲突）。

## 3. 门控 / 未支持 / 风险

1. **门控**：`InterfaceDeclarationMount.TryBuild` / `TypeAliasDeclarationMount.ShouldMount` 第一步都是
   `StatementRouteUtil.IsIncrementalShapesEnabled()`；false 时前者返回 `null`、后者返回 false，
   调用方逐字落回 `super.BuildByIndex` ⇒ 开关 false 时**没有任何新代码被执行**（legacy 逐字节不变；
   §1#5 的 225 条逐字段一致是它的机械证据）。
2. **范围**：只认根层（`host.Parent === null`）且首代码单元就是 `interface` / `type`。
   `export interface` / `declare type` / 装饰器前缀形、模块体 / 块体里的同名声明**不接管**（返回 null 走既有声明壳），
   留给 B3/B5；本轮 48 条目标全是这种根层裸头形态，没有漏收。
3. **未支持显式 throw**：本 WP 不新增任何「静默退回」路径——不接管就返回 `null`（走既有路径，该路径自己有
   C10 抛错/建树），接管后收口全走 legacy 建树。没有新增文案，也没有吞掉任何形态。
4. **风险 / 边界**：
   - 占位节点依赖 B1 的既有前提：`IsTriviaToken = true` 且放在 `Data[0]`（`StatementBuilder.Load` / 扫描器 /
     `ItemUtil` 都会跳过它；若有人把它改成非 trivia 或挪到末尾，会污染 legacy 建树）。
   - interface 的真壳收口依赖 `InterfaceDeclarationShape.OnBracketCreatedEvent` 的「体括号」判据
     （`extends` / `implements` / `,` 之后不算体）；接口体第一个 `{` 之前若出现对象/映射类型字面量需要复核，
     本轮 10 条 interface case（含 extends-several / 泛型方法 / 索引签名）全部通过。
   - 别名的占位把「首次出现」提前到建壳格，但**子节点（IdentifierShape / 类型形状）仍由 legacy 在收口时建**
     （`earlier` 只有 `TypeAliasDeclarationShape@pos=0`）。若后续 B4b 要把类型子形状也做成增量，需要给别名挂
     真壳 + 类型目录（那时建议直接复用 `TypeAliasDeclarationShape.FromUnits` 的切片逻辑，别复制）。
5. **未跑既有 gates**（纪律）；**未 push**；工作目录保留。

## 4. 未竟项 / 交接

1. **`INDEX.md` / 两处 README 计数未重生成**：按 `PLAN-all-possible.md` §5.1，`tts/INDEX.md` 只由 A7/B7 重生成；
   迁移契约要求的两处 `--write-index` 留给 A7（本 WP 只做 `git mv`，case 内容逐字节不变）。
2. **`export interface` / `declare type` / 带装饰器前缀形**（B5 让出的那部分）仍走既有声明壳，属 B3/B5 的写域；
   若 B3 接管，用同一个 `DeclarationStatementPossibleShape` 追加口 + 同样的「接口挂真壳 / 别名挂占位」分工即可。
3. **类型子形状的逐单元增量**（B4b-i / B4b-ii）需要类型目录（`TypeBuilder` 侧的候选化）；本 WP 只做到
   「声明节点 + interface 成员」这一层，别名类型体仍是 legacy 收口时建。
4. 本轮实测的「换行 trivia 关闭不触发父目录」是一个值得写进 E-base 契约的事实：任何依赖「换行/ASI 收口」的
   候选都不能指望目录被问一次，必须走占位或显式 `Process` 钩子。
