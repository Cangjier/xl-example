# body guide 成员候选合同（enum / class 及后续 shape 的落地手册）

> 任务：SHAPE-CACHE / T3（`body-foundation`）。分支 `body-foundation`，起点 `integration-1` @ `e6e749e3`。
> 读者：T5 `body-enum`、T6 `body-class`、后续 T7/T8，以及合并 / 复验成员。
> 配套源码：`typescript/tokens/declarations/body-guide-util.xl.md`（`BodyGuideUtil`，本分支只新增、不改任何现有 shape）。
> 设计依据：`docs/body-shape-generalization-design.md` §2 / §6 / §8；对象类型成员候选合同见 `docs/member-possible-design.md`。

---

## 0. 一句话架构

任何一个带 body 的声明要吃到 `OnBracketCreatedEvent`，必须先变成**壳**：
在声明关键字格提前 `Accept`、把已攒下的单元搬进壳并 `host.MountedUnit = 壳`；壳随后的 `OnBracketCreatedEvent` 认领 body 括号，
body 括号挂 `CatalogGuide(本族成员候选)`；body `}` 闭合时壳的终结候选收口，用 `BuildFromCode` 建完整形状并原地顶替壳。

`BodyGuideUtil` 把这条管线里**与声明族无关**的五步抽成静态方法：

| 方法 | 取代的 interface 实现 | 调用时机 |
|---|---|---|
| `BasePos(host, start)` | `InterfaceDeclarationPossibleShape.BuildByIndex` 的 `pos` 循环 | 建壳 / 建成员时算 `Pos` |
| `IsBodyBracket(shell, bracket, blocked)` | `InterfaceDeclarationShape.IsDefinitelyBodyBracket` | 壳的 `OnBracketCreatedEvent` |
| `MountBodyGuide(bracket, shapes)` | `bracket.CatalogGuide = new CatalogGuide(...)` | 认领 body 括号后 |
| `MountShell(host, start, tokenIndex, shell, context)` | `InterfaceDeclarationPossibleShape.BuildByIndex` 的建壳段 | 关键字格 `BuildByIndex` |
| `CollectBodyMembers(host, bracket, context, rawFallback)` | `InterfaceDeclarationShape.CollectBodyMembers` | 壳收口（`BuildFromCode`） |
| `FinishShell(host, shell, built)` | `InterfaceDeclarationEndPossibleShape.BuildByIndex` 的顶替段 | 终结候选 `BuildByIndex` |
| `CreateShapesCache(cacheRef, factory)` | `InterfaceDeclarationShape.CreateBodyPossibleShapes` 的缓存段 | `CreateBodyPossibleShapes` |

**刻意不抽、各族自己保留**：成员判型（对象类型用 `MemberPossibleUtil`；class 需独立 `ClassMemberPossibleUtil`；enum 极简）、
壳的头部语义（名字 / 类型参数 / heritage / 修饰词，各族的 `BuildFromCode`）、每族的 `blocked` 单词表与 `CreateBodyPossibleShapes` 名单。

### 0.1 引用方式（xl import 行）

`BodyGuideUtil` 在 `typescript/tokens/declarations/` 下。从声明族文件（同目录或 `../members/`、`../types/`）引用：

```xl
import { BodyGuideUtil } from "./body-guide-util.xl.md"          # declarations/ 同目录（enum / class 声明壳）
import { BodyGuideUtil } from "../declarations/body-guide-util.xl.md"  # types/、members/、statements/ 下
```

**不要**在 `body-guide-util.xl.md` 里 import 任何具体声明形状（本文件只 import `core/` 与 `AngleJudge`），
否则 interface / enum / class 之间会形成 require 环。需要本族的形状 / 候选 / `BuildMembers` 时，全部由调用方以参数或返回值传入。

---

## 1. 「壳化七件套」（缺一项就退化成「事件收了但用不上」或「AST 不一致」）

| # | 配套 | interface 样板 | 推广注意点 |
|---|---|---|---|
| 1 | **提前 `Accept`**：声明关键字格就认定「这是我的声明」 | `interface-declaration-possible-shape.xl.md:204-207` | 保留 ASI / 换行守卫与装饰器前缀状态机（`declare` ⏎ `class` 是两条语句）；提前 `Accept` 后本候选**不再扫描 body** |
| 2 | **壳 `OnBracketCreatedEvent`**：认领 body 括号 | `interface-declaration-shape.xl.md:68-96` | 用 `BodyGuideUtil.IsBodyBracket(壳, 括号, blocked)`，不要自己抄判据；壳已有 `BodyBracket` 就忽略 |
| 3 | **body 挂 `CatalogGuide(成员候选)`** | `interface-declaration-shape.xl.md:94` | 用 `BodyGuideUtil.MountBodyGuide`；目录只建一份、静态缓存、所有 body 括号共用；判定状态在各 `CatalogGuide` 自己的缓存里 |
| 4 | **壳的终结候选 `*-end-possible-shape`** | `interface-declaration-end-possible-shape.xl.md` | 只在 body 括号创建后装到**壳**上（`new CatalogGuide([], new XxxEndPossibleShape())`）；`BuildByIndex` 用 `BodyGuideUtil.FinishShell` 顶替壳 |
| 5 | **`BuildFromCode(host, code, pos, context)`** | `interface-declaration-shape.xl.md:174-346` | `FromUnits`（原子路径）与壳收口共用；**壳 `Data` 里没有 trivia、host `Data` 里有**，下标口径必须按「已排好的 code 数组」 |
| 6 | **`MountedUnit` 挂载 / 卸载** | 挂：possible `:253`；卸：end possible `:61-63` | 挂用 `MountShell`，卸用 `FinishShell`；**splice 顶替必须手动清 `MountedUnit`**（`Token.Replace` 才自动转交） |
| 7 | **`Pos` 口径 + ASI / 换行守卫** | `Pos`：possible `:239-250`；ASI：`:53-70`、`:112-126` | `Pos = BasePos`（前一个非 trivia 单元 `End.Index + 1`，没有则 `0`）；壳建时定、收口沿用；ASI 必须在**提前 Accept 之前**判完 |

**额外一条（不属七件套但决定成败）**：成员候选目录对任意合法成员头都必须给出**非空 `Kinds`**——见 §3.1。

---

## 2. 成员候选三元组合同（`ComputeByIndex` / `IsBuildable` / `BuildByIndex`）

与 `docs/member-possible-design.md` §1 相同，这里只列 body guide 语境下的硬要求。

### 2.1 `ComputeByIndex(units, tokenIndex, cache) => ShapeStates`

- `units` 是 body 括号的 `Data`，`tokenIndex` 是刚关闭的单元下标（可能是 trivia）；
- **只判当前条目**：条目起点 = `ItemUtil.ItemStart(units)`（前面已建好的成员形状之后），不跨条目存状态；
- `Reject` = 当前条目前缀不可能再长成我这类；`Uncertain` = 还可能 / 信息不足（空条目、纯 trivia、纯分隔符一律 `Uncertain`）；`Accept` = 已是完整成员且成员边界确定；
- **不建形状、不跑 `TypeBuilder`**（拿不到 `Template` / `Context`，且每格会被多个候选各调一次）；真正解析留给 `BuildByIndex`；
- 公共扫描结论写进 `cache`（键按形状名分槽），多个候选共享，不要各写一份。

### 2.2 `IsBuildable(units, tokenIndex, cache, context) => bool`

只有「成员边界已确定」的 `Accept` 才返回 true；`false` = 继续等后面的单元。`CatalogGuide` 只在**只剩一个候选**时才问，所以迟一点建安全、早一点建会切错边界。

### 2.3 `BuildByIndex(host, tokenIndex, catalog, context) => Token`

- 从缓存取起点 / 终点，消费范围 = `host.Data.slice(start, end + 1)`：**包含**成员自己的 `;` / `,`（与 TS 成员区间同口径），**不包含**成员之后的 trivia；
- `basePos = BodyGuideUtil.BasePos(host, start)`；
- 用本族建造器建成员（对象类型是 `TypeBuilder.ParseTypeMember`），**先判整段是否恰好读完**（`MemberParsedWhole` 式：`builder.At === builder.Units.length` 且消费范围一致）：不成立 ⇒ **不建、不 splice**，raw 原样留给收口兜底；成立后再断言产出类型就是自己这一类，不对直接 `throw`；
- 建出后 `host.Data.splice(start, consumed.length, built)`、`built.Parent = host`、返回 `built`。

**REST API 只写这一份模板**：enum/class 的候选各自按自己的成员语法改判型与建造器，但「起点 / 终点 / 区间 / 顶替」这套骨架不变。

---

## 3. 两个「必须照抄」的硬约束

### 3.1 `CatalogGuide` 0 候选抛错 ⇒ 判型必须全函数性

`CatalogGuide.ComputePossibleShapesByIndex` 在「候选 0 个且没有终结候选」时直接**抛错**（`catalog-guide.xl.md:102-107`）。
body 目录只挂普通候选、没有终结候选（终结候选在壳上），所以：

- **任意合法成员头都必须让至少一个候选的 `Kinds` 非空**；没有把握的形态返回 `Property|Method` 两可（`Uncertain`），不要 `Reject` 干净；
- **恢复形**（非法 / 残缺源码）同样不能让目录抛「没有候选形状」：解析不清的列不要靠候选硬判，交给 `BuildByIndex` 的「整段没读完 ⇒ 不建」+ 收口 raw 兜底（§3.2），最终由 `BuildMembers` 按一次性口径恢复；
- 每族的 `CreateBodyPossibleShapes` 名单必须覆盖本族**全部**成员语法；新增语法忘了加候选，第一个这样的成员就会在 body 中途炸。

设计文档 §8.1 把这个列为风险登记第 1 条：**判型函数保持全函数性是 T5/T6 的验收项，不是建议**。

### 3.2 body 最后一个成员靠「下一个字符是容器收口」提前 Accept；raw 尾巴兜底

body 的 `}` 闭合**不会**触发 body 自己的目录（`Bracket.Close` 只问父单元 = 壳），所以候选必须靠三条边界证据提前 `Accept`
（`docs/member-possible-design.md:68-77`）：

1. `FindTypeMemberBoundary(code, 0) < code.length`：找到了下一个成员起点；
2. 最后一个代码单元是 `;` / `,`：显式分隔符，等它自己被 token 化后**吃进成员区间**再建（下个字符是 `;`/`,` 时**不要**提前 `Accept`）；
3. 最后一个代码单元之后的下一个字符是容器收口字符 `}` / `]` / `)` / `>` / EOF：本层不会再有代码单元，立即收口。

三条**只在角括号深度为 0 时生效**（`>>` / `>>>` 按层拆）。class/enum 候选必须照抄这条，不能等 `}`。

**raw 尾巴兜底**：`BuildByIndex` 判不完整的成员不建、不 splice，raw 代码原样留在 `bracket.Data` 里；
壳收口时 `BodyGuideUtil.CollectBodyMembers` 会「收集已建成员 → 把剩余的 raw 尾巴包成括号视图 → 交 `rawFallback`」逐成员建。
代价是同一文件里「增量路径」与「raw 路径」两条路，因此：

- `rawFallback` 必须是本族**一次性构建用的同一个 `BuildMembers`**（不是另写一份）；两条路径的成员都由同一建造器产出，AST 才能逐节点一致；
- 不完整的判定要**宽**：宁可回落 raw（结果正确、只是慢一点），不可硬建（切错区间 = AST 差异 + 恢复回归）。
  `fix/invalid-recovery` 的教训见 `docs/member-possible-design.md:310-328`：`interface A { a: number b: string }` 曾经因为把整段当一条成员而在 `Parse` 里抛异常。

### 3.3 `Pos` 口径

- 壳的 `Pos`：`BodyGuideUtil.MountShell` 里按 `BasePos` 定（前一个非 trivia 单元 `End.Index + 1`，没有则 `0`，含前导 trivia）；
- 收口：`BuildFromCode(shell, code, shell.Pos, context)` 直接沿用壳的 `Pos`，**不要重算**——收口时壳已经是父单元最后一个单元，重算会得到壳自己的右边界；
- 成员形状的 `Pos`：`BodyGuideUtil.BasePos(host, start)`，与整段 `BuildMembers` 里 `builder.Load(..., bracket.SourceRange.Start.Index + 1)` 同口径；
- `BuildFromCode` 内部各子形状的 `Pos` 仍按「同层前一个非 trivia 单元」算；module 体首成员「Pos 算成 0、由上层重锚」的既有经验（`module-block-shape.xl.md:579-595`）在壳化后要逐条核对，因为壳 `Data` 里没有 trivia、host 里有。

---

## 4. `PossibleShapeCache.Share` 在 body guide 里的推荐用法

`Share` 是「**Shape 生命周期内长期复用、不受 `Reset`**」的数据槽（`core/syntax/possible-shape-cache.xl.md`）。
body guide 里它是「同一份 body 目录反复判定时不必每次重建」的缓存，不是判定状态本身。**推荐用法**：

1. **只放长生命周期数据**：例如 body 目录的扫描锚点（当前条目起点）、`CodeAt` 映射的已建前缀、宿主壳的 `BodyBracket` 指针。
   **不要**把「当前条目」的判定状态放进 `Share`——那是 `Values`（`GetState` / `SetState`）的职责，`Reset` 必须清掉。
2. **每条 `Share` 数据必须自带新鲜度判据**：`Share` 不随 `Reset` 清，换条目后旧数据可能还指着上一条目的结论。
   最低限度要带 `Start`（条目起点）与「宿主长度 / 版本」两项；使用前逐项校验，任一不符就**原地重建并写回**。
   判据字段与结论字段放在同一个对象里，避免两处不同步。
3. **只在 Build 阶段读、缺了就地建、建完写回**：`BuildByIndex`（普通候选与终结候选都算）与 `BuildFromCode` 里读写
   `catalog.PossibleShapesComputeCache.GetShare` / `SetShare`；`Compute` / `ComputeByIndex` **不假定** `Share` 里已经有东西，
   更不要在 `Compute` 里建它（每格被多个候选调用，会重复建）。
4. **Build 时更新**：成员建出、`splice` 顶替之后，把新的扫描锚点（下一条目起点 / 已建成员数）写回 `Share`；
   这样下一次 `Compute` 直接从锚点续扫，避免 `ItemUtil.ItemStart` 从尾部倒扫与 `CodeAt` 重建。
5. **键仍按形状名分槽**：`cache.GetShare<XxxShared>(this.constructor.name)`；一个形状一份，不要给多类候选共用同一个键。
6. **Shape 收尾时 `ClearShare()`**：`Share` 的生命周期 = 持有这份缓存的宿主 Shape（`CatalogGuide`）的生命周期。
   普通 `Reset` **不**清 `Share`；宿主 shape 关闭、结束生命周期、要把这部分内存还回去时显式调 `PossibleShapeCache.ClearShare()`。
   body 目录的 `CatalogGuide` 随 body 括号走，因此「body 括号收口 / 被丢弃」就是清 `Share` 的时机。
7. **不进 AST 口径**：`Share` 里的数据只允许影响「什么时候建」，不允许影响「建成什么」；任何 `Share` 命中与否都必须产出逐节点一致的 AST
   （7 项门禁的 `ast-json-diff` 0/0/0 是这条的硬检验）。

> 注意：本分支是**纯基础设施**，`Share` 的实际接入由 T4（interface 性能）与 T5/T6 的 body guide 实现；上面的用法是给他们统一的契约，
> 不是本分支的运行时代码。

---

## 5. 隔离测试：`tests/body-guide/harness.mjs`

以 `tests/member-possible/harness.mjs` 为底改造，**运行时 monkeypatch** 目标 shape 的静态目录缓存来裁剪候选，不改源码、不改提交。

```bash
# interface（默认 target）全量候选：与 member-possible 的 --all 同一套分组
node tests/body-guide/harness.mjs --all

# 只留一个候选（默认就是 PropertySignaturePossibleShape）
node tests/body-guide/harness.mjs --only=PropertySignaturePossibleShape
node tests/body-guide/harness.mjs --only=PropertySignaturePossibleShape,MethodSignaturePossibleShape

# 走 typescript/cases/*.ts 自动挑「只含属性签名接口」的用例
node tests/body-guide/harness.mjs --from-cases

# 预留：enum / class body 候选（T5/T6 落地后自动生效；当前分支没有它们，报 SKIPPED）
node tests/body-guide/harness.mjs --target=enum --all
node tests/body-guide/harness.mjs --target=class --only=PropertyDeclarationPossibleShape
node tests/body-guide/harness.mjs --target=all --all
```

分组与 member-possible 相同：`cases`（默认用例）、`generic-boundary`、`member-start`、`recovery`；另加 `util`（`BodyGuideUtil` 冒烟：
7 个静态方法都存在、`CreateShapesCache` 的「空则建、非空复用」语义）。`--no-generic` 跳过泛型 / 成员起点 / 恢复三组。

**裁剪点**（`BODY_TARGETS`，按形状名 → 模块 → 静态缓存字段）：

| target | shape 模块 | 静态缓存字段 | 当前分支 |
|---|---|---|---|
| `interface` | `typescript/tokens/declarations/interface-declaration-shape.js` | `CreateBodyPossibleShapesCache` | ✅ 7 候选全量 |
| `enum` | `typescript/tokens/declarations/enum-declaration-shape.js` | `CreateBodyPossibleShapesCache` | 预留（T5 新增后生效） |
| `class` | `typescript/tokens/declarations/class-declaration-shape.js` | `CreateBodyPossibleShapesCache` | 预留（T6 新增后生效） |

**验收口径**：target 存在时，`--all` 与 `--only=<候选>` 必须 0 fail（逐节点比较 kind / pos / end / text / name，与 `ast-json-diff` 同口径）；
target 不存在（本分支的 enum/class）时 harness 报 `SKIPPED` 并退出码 0——这是「结构预留」，不是通过。

---

## 6. T5 / T6 落地清单（本分支冻结的工具接口）

### 6.1 enum（T5，最低风险）

1. 改 `enum-declaration-possible-shape.xl.md`：`enum` / `declare enum` / `const enum` 关键字格提前 `Done` + `Accept`；`BuildByIndex` 改成
   `const shell = new EnumDeclarationShape(host.Template); return BodyGuideUtil.MountShell(host, state.Start, tokenIndex, shell, context);`；
2. 改 `enum-declaration-shape.xl.md`：`OnBracketCreatedEvent`（`IsBodyBracket(壳, 括号, [])` → `MountBodyGuide(括号, EnumDeclarationShape.CreateBodyPossibleShapes())` + 壳装 `new CatalogGuide([], new EnumDeclarationEndPossibleShape())`）、
   `static CreateBodyPossibleShapes`（`CreateShapesCache`）、`static BuildFromCode`（`FromUnits` 的 code 版本）、`static CollectBodyMembers(host, bracket, context)`（`return BodyGuideUtil.CollectBodyMembers(host, bracket, context, EnumDeclarationShape.BuildMembers)`）；
3. 增 `enum-declaration-end-possible-shape.xl.md`（照 interface end：`{` 且 `Closed` ⇒ `Accept`；`BuildByIndex` 里 `FinishShell(shell.Parent, shell, built)`）；
4. 增 `typescript/tokens/members/enum-member-possible-shape.xl.md`。

### 6.2 class（T6，主体）

同 §6.1 的结构，区别：8 类成员候选 + `blocked = ["extends", "implements", ","]` + 独立的 `ClassMemberPossibleUtil`（判型 / 边界 / 扫描），
`BuildByIndex` 的 raw 兜底必须保留 `MemberParsedWhole` 式的「整段没读完 ⇒ 不建、不 splice」；`ClassDeclarationShape.BuildMembers` 只把可见性放宽，
解析逻辑不动。`class` 表达式路径（`ClassExpressionPossibleShape`）**不串路**。

### 6.3 共用接线样板

```ts
// 壳的 OnBracketCreatedEvent
this.OnBracketCreatedEvent = (bracket, context) => {
  if (this.BodyBracket !== null) return;
  if (!(bracket instanceof Bracket)) return;
  if (!BodyGuideUtil.IsBodyBracket(this, bracket as Bracket, ["extends", "implements", ","])) return;
  const body = bracket as Bracket;
  this.BodyBracket = body;
  BodyGuideUtil.MountBodyGuide(body, XxxDeclarationShape.CreateBodyPossibleShapes());
  this.CatalogGuide = new CatalogGuide([], new XxxDeclarationEndPossibleShape());
};

// 关键字格 BuildByIndex
const shell = new XxxDeclarationShape(host.Template);
return BodyGuideUtil.MountShell(host, state.Start, tokenIndex, shell, context);

// 终结候选 BuildByIndex
const shell = host as XxxDeclarationShape;
const code:Array<Token> = [];
for (const unit of shell.Data) { if (!unit.IsTriviaToken) code.push(unit); }
const built = XxxDeclarationShape.BuildFromCode(shell, code, shell.Pos, context);
BodyGuideUtil.FinishShell(shell.Parent, shell, built);
return built;

// BuildFromCode 里取成员
const members = BodyGuideUtil.CollectBodyMembers(
  host, bodyUnit as Bracket, context, XxxDeclarationShape.BuildMembers);
```

> 上面的写法是**接线示意**（TS 形态），实际在 `.xl.md` 里按项目规范写 `## method` / `## static method` + ```ts``` 围栏。

---

## 7. 验收（每个 body guide 分支合并前）

7 项门禁全绿：`xl_build` 0 error / `tsc` 0 error / `ast-json` = 6167（+本分支新增用例 N）/ `ast-json-diff` 0-0-0 /
`token-ast` 不差于 1715-1705-0-0-10 / `validate` 1719-0 / `real-dts` 226-226 / `xl_check` 0 error；
外加 `node tests/member-possible/harness.mjs --all` 与 `node tests/body-guide/harness.mjs --all` 全过。

**AST 逐节点一致是唯一硬约束**：壳化只允许改变「什么时候建」，不允许改变「建成什么」——成员仍只由既有建造器
（`TypeBuilder.ParseTypeMember` / `ClassDeclarationShape.BuildMembers` / `EnumDeclarationShape.BuildMember`）产出，
区间 / `Pos` / `End` / 文本口径一律不变。

需要特别盯的既有用例 stem：`declarations.ts`、`members.ts`、`end-declarations.ts`、`dts-types.ts`、`dts-recovery.ts`、
`possible-build.ts`、`possible-compute.ts`、`missing-possible.ts`、`class-expressions.ts`、`export.ts`、`asi-import-boundary.ts`、`end.ts`
（完整表见设计文档 §7.2）。
