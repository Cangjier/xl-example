# 接口体成员增量构建：候选契约与实现手册（wave1 → wave2）

本文是「接口体成员从 `BuildMembers` 一次性解析，改成接口体 `Bracket` 的 `CatalogGuide` 按成员增量构建」这条重构的合同。
wave1 已完成共享管线与一个参考候选（`PropertySignaturePossibleShape`，下称**参考实现**）；wave2 的五条并行分支只需要按本文实现自己那一类候选。

参考实现：`typescript/tokens/types/property-signature-possible-shape.xl.md`（完整可跑，含共享工具）。
管线改动：`typescript/tokens/declarations/interface-declaration-shape.xl.md`（`CreateBodyPossibleShapes` + `CollectBodyMembers`）。

---

## 0. 一句话架构

接口体 `{` 创建时，`InterfaceDeclarationShape.OnBracketCreatedEvent` 给这个 `Bracket` 挂
`CatalogGuide(CreateBodyPossibleShapes())`。此后接口体里**每个 basic token / 括号单元关闭**时只问父单元（= 这个括号），
括号把自己的 `Data` 交给 `CatalogGuide.ComputePossibleShapesByIndex`：

1. 对每个还活着的候选调 `ComputeByIndex(host.Data, tokenIndex, cache)`，返回 `Reject` 的候选从 `Candidates` 里去掉；
2. 只剩一个候选且它的 `IsBuildable(...)` 为 true 时，调它的 `BuildByIndex(host, tokenIndex, catalog, context)`；
3. `BuildByIndex` 建出成员形状后 `host.Data.splice(start, consumed, shape)` 原地顶替，`CatalogGuide.Reset()` 清缓存、复位候选；
4. 接口体 `}` 关闭时括号不查自己（只问父 = 接口声明壳），壳的终结候选 `InterfaceDeclarationEndPossibleShape` 走
   `InterfaceDeclarationShape.BuildFromCode`；`CollectBodyMembers` 把括号 `Data` 里**已建好的成员形状按序收集**，
   仍留 raw basic token 的路径（导出 / 模块体 / 语句位置的一次性构建、以及没来得及增量建出的尾巴）用 `BuildMembers` 兜底。

**唯一硬约束：合并后 AST 与重构前逐节点一致（kind / pos / end / text / name）。** 增量只是把「什么时候建」提前，
成员形状仍然只由 `TypeBuilder.ParseTypeMember()` 建，所以成员边界必须与它同口径。

---

## 1. 候选契约（每个 wave2 候选必须满足）

### 1.1 `ComputeByIndex(units, tokenIndex, cache) => ShapeStates`

- `units` 是**宿主**（接口体 `Bracket`）的 `Data`；`tokenIndex` 是刚关闭的那个单元的下标（可能是 trivia）。
- 只判**当前条目**：条目起点 = `ItemUtil.ItemStart(units)`（最后一个非 basic token 之后），即前面已经建好的成员形状之后。
  不要从 `0` 开始重扫全表，也不要跨条目存状态。
- 返回：
  - `Reject`：当前条目前缀**不可能**再长成我这一类（例如参考实现看到 `(` / `<` / `new (` / `[k: string]` / `get x (`）。
  - `Uncertain`：还可能是我这一类，或信息不足（**空条目 / 纯 trivia / 纯分隔符一律 `Uncertain`**）。
  - `Accept`：当前条目已经是我的一个完整成员，且成员边界已确定（`state.Complete`）。
- **不要在 `ComputeByIndex` 里建形状、也不要跑 `TypeBuilder` 解析**（拿不到 `Template` / `Context`，而且会被调用 7 次）。
  判型只需要词的层面信息；真正的解析留给 `BuildByIndex`。
- 同一次判定里所有候选共享 `cache`；把公共扫描结果写进 `PossibleShapeCache`，键固定用
  `MemberPossibleUtil.CacheKey`（参考实现的 `MemberPossibleUtil.Scan` 已做了这件事），其它候选直接读，不要各写一份。

### 1.2 `IsBuildable(units, tokenIndex, cache, context) => bool`

- 只有「成员边界已确定」的 `Accept` 才返回 true；返回 false 表示「继续等后面的单元」。
- `CatalogGuide` 只在**只剩一个候选**时才问 `IsBuildable`；所以迟一点建是安全的，早一点建会切错边界。

### 1.3 `BuildByIndex(host, tokenIndex, catalog, context) => Token`

- 从共享缓存里取 `MemberPossibleScan`：`state.Start`（宿主 `Data` 下标）、`state.CodeAt[state.End]`（最后一个代码单元的宿主下标）。
- 消费范围 = `host.Data.slice(state.Start, state.CodeAt[state.End] + 1)`：
  - **包含**成员自己的 `;` / `,`（与 `TypeBuilder.SpanTypeMember` 同口径：TS 的成员区间含分隔符）；
  - **不包含**成员之后的 trivia（`splice` 只到最后一个代码单元，trivia 留给下一条目当先行 trivia）。
- `basePos = MemberPossibleUtil.BasePos(host, state.Start)`：条目起点前最近一个非 trivia 单元的 `End.Index + 1`；
  前面没有单元时用宿主 `SourceRange.Start.Index + 1`。这是 `Pos` 的口径，必须与整段 `BuildMembers` 一致。
- 用 `new TypeBuilder(host.Template, context)` + `builder.Load(consumed, basePos)`，然后**只调一次** `builder.ParseTypeMember()`：
  - 断言 `builder.At === builder.Units.length`（成员读完了，没有 leftover）；
  - 断言 `builder.OriginalConsumed() === consumed.length`（消费范围与判定一致）；
  - 断言产出的形状类就是自己这一类（见 §3 的「必产出」列）；
  - 任何断言失败直接 `throw`（宁可红，不可静默切错）。
- `host.Data.splice(state.Start, consumed.length, built)`，再 `built.Parent = host`，返回 `built`。

### 1.4 边界、ASI、分隔符、trivia

- **成员边界**（与 `TypeBuilder.ParseTypeBounded` 同口径）三条证据，`MemberPossibleUtil.Analyze` 已实现：
  1. `MemberBoundary.FindMemberBoundary(code, 0) < code.length`：找到了下一个成员的起点 ⇒ 当前成员到该位置前一个代码单元为止；
  2. 最后一个代码单元是 `;` / `,`：显式分隔符，等它自己被 token 化后**吃进成员区间**再建
     （所以 `ComputeByIndex` 在「最后一个代码单元之后的下一个字符是 `;` / `,`」时**不要**提前 `Accept`，`IsCompletionBoundary` 故意不含它们）；
  3. 最后一个代码单元之后的下一个字符是容器收口字符 `}` / `]` / `)` / `>` / EOF：本层不会再有代码单元，立即收口。
     这是「最后一条成员没有分隔符」的建出时机——接口体的 `}` 不会再触发本目录的判定。
- **ASI 三种合法写法行为一致**（AST 都有相同的成员形状与区间）：
  - `interface I { a: A; b: B }`：`;` 到达时建第一条（含 `;`）；
  - `interface I { a: A, b: B }`：`,` 同上；
  - `interface I { a: A \n b: B }`：`b` 关闭时 `FindMemberBoundary` 指到 `b`，建第一条（区间到 `A`），`b` 留在 `Data` 里成为下一条目起点。
- **不能提前收口**的反例：`a: A` 换行 `[B]` 仍是一个类型 `A[B]`（TS 的索引访问后缀不看换行）；
  `a: A` 换行 `[B]: C` 才是两个成员（`[` 后跟 `:` 才像成员起点）。这类判定交给 `MemberBoundary`，不要自己写换行规则。
- **trivia**：`ComputeByIndex` 判型时跳过 `IsTriviaToken`；`BuildByIndex` 的区间只切到最后一个代码单元，
  成员前后的注释 / 换行由 `splice` 天然留在原处，下一条目的 `Pos` 由 `BasePos` 重新算。
- **空条目 / 纯 trivia / 纯分隔符**：`Kinds = AllKinds`、`Complete = false` ⇒ 所有候选 `Uncertain`，等容器收口时
  `CollectBodyMembers` 兜底（`interface I { /* c */ }`、`interface I { ; a: A }` 这类不会让目录抛「没有候选形状」）。

### 1.5 共享扫描状态 `MemberPossibleScan`（参考实现已给）

| 字段 | 含义 |
| --- | --- |
| `Start` | 当前条目起点（`ItemUtil.ItemStart(units)`） |
| `Checked` | 已扫到的 `tokenIndex + 1`；比它小的 `tokenIndex` 直接复用结论 |
| `Kinds` | 还可能的成员种类（`MemberPossibleUtil.*Kind`，空数组 = 已不可能） |
| `Complete` / `End` | 当前成员是否收住 / 收在哪个**代码单元下标** |
| `CodeAt` | 代码单元下标 → 宿主 `Data` 下标 |

`MemberPossibleUtil.Scan(units, tokenIndex, cache)`：
- 条目起点变了、或缓存越界（目录复位残留）就重建状态；
- 每次只从 `Start` 扫到 `tokenIndex`（增量：只处理新单元）；
- 调 `Analyze` 更新 `Kinds` / `Complete` / `End`。

**所有候选都用同一个 `Scan` 结论**：`ComputeByIndex` 里只需要
`HasKind(state.Kinds, 我的 Kind) ? (state.Complete ? Accept : Uncertain) : Reject`。

---

## 2. 七类判型表

`MemberPossibleUtil.ClassifyHead` 按「已攒下的代码单元前缀」给出**还可能的种类**（多值时继续等；定死时给单个；不可能给空）。
`MemberPossibleUtil.Kind` 常量：`PropertyKind=1`、`MethodKind=2`、`IndexKind=3`、`CallKind=4`、`ConstructKind=5`、`GetKind=6`、`SetKind=7`。

先剥前缀修饰词（与 `TypeBuilder.ParseTypeMember` 同口径）：

- `readonly`：**同一行**且后面跟名字 / 字符串名 / 计算名 `[...]` 才是修饰词；换行时 TS 按 ASI 把 `readonly` 收成**成员名**
  （`readonly` ⏎ `readonly: number` = 两个属性成员）。`readonly [k: string]: A` 剥完修饰词是索引签名；`readonly [expr]: A` 是计算名属性。
- `abstract`：只有后面紧跟 `new` 时才算构造签名的修饰词（`abstract new (...): T`）。
- `get` / `set` 不是普通修饰词，见下表的访问器分支。

| 首 token（剥完修饰词） | 判定 | Reject 何时发生 | Accept/Build 何时发生 |
| --- | --- | --- | --- |
| `(` 括号 | `CallKind` 定死（调用签名） | 其它 6 类立刻 Reject | `)` 关闭后，看参数表后面还有没有 `:` 返回类型；完整成员到边界后 Call 候选建 |
| `<` 符号 | `CallKind` 定死（泛型调用签名 `<T>(...): T`） | 其它 6 类 Reject | 类型参数表 + 参数表 + 可选返回类型都到齐、边界确定 |
| `new` + 下一代码单元是 `(` 括号或 `<` | `ConstructKind` 定死（构造签名；**判据不看换行**：`new` ⏎ `(` 仍是构造签名） | 其它 6 类 Reject | 参数表（+泛型）+ `:` 返回类型到齐、边界确定 |
| `new` + 下一单元是**另一个**单元（如 `new` ⏎ `new(): void`） | `PropertyKind`（`new` 是属性名） | 非属性类 Reject | 与属性签名同上；`new` ⏎ `new(...)` 是两个成员，靠 `FindMemberBoundary` 切开 |
| `[` 括号，内部第二个代码单元是 `:`，或空括号 | `IndexKind` 定死（索引签名 `[k: string]: A`、`[k: symbol]: A`） | 其它 6 类 Reject；**计算属性名属性签名也必须 Reject**（内层不是 `k :` 形态） | 参数 + `:` + 类型到齐、边界确定 |
| `[` 括号，内层不是索引形态 | 计算属性名：后面是 `:` / `?` / `?:` / `;` / `,` → `PropertyKind`；后面是 `(` 括号或 `<` → `MethodKind`；信息不足 → `[Property, Method]` | 按上面定死后的种类让其它候选 Reject | 名字 + 可选 `?` + 类型（属性）/ 参数表（方法）到齐、边界确定 |
| 名字（标识符 / 字符串字面量 / 数字字面量） | 名字族，**先 `[Property, Method]` 两可**，随后的单元收敛 | 看到 `(` 括号或 `<` ⇒ `MethodKind` 定死，属性候选 Reject；看到 `:` ⇒ `PropertyKind` 定死，方法候选 Reject | 属性：可选 `?` + `:` + 类型（无类型也合法：`interface I { a }`）；方法：`(`/`<` + 参数表 + 可选 `:` 返回类型 |
| 名字后跟 `?` / `?:` | 若 `?` 后面是 `(` 括号：**看参数表 `)` 之后的下一字符**——是 `:` ⇒ `MethodKind`（可选方法 `m?(): T`），否则 `PropertyKind`（可选属性 + 括号类型 `a?: (A) => B` / `a?: () => void`）。若 `?` 后面是 `<` ⇒ `MethodKind`；其它 ⇒ `PropertyKind` | 定死后其它候选 Reject | 同上 |
| `get` / `set` + 名字（标识符或以 `[` 开头的计算名）+ `(` 括号 | `GetKind` / `SetKind` 定死（访问器） | 其它 6 类 Reject | `(` 参数表 + 可选 `:` 返回类型、边界确定 |
| `get` / `set` 后面不是「名字 + `(`」 | 退化为名字族：`get` / `set` 本身是成员名（`get: A` 是属性、`get(): void` 是方法、`get` 独占是属性） | 按名字族定死 | 按名字族定死 |
| `{` 括号 / 其它符号 / 其它单元 | 空种类（不可能构成任何对象类型成员）— 但只在真的是坏前缀时才发生 | 全部候选 Reject | — |

**两条最容易写错的分界**（参考实现已覆盖，wave2 用共享工具即自动正确）：

1. **索引签名 vs 计算属性名**：只看 `[...]` 内部**第二个代码单元是不是 `:`**（空括号按索引签名的 recovery）。
   `[k: string]: A` 是 `IndexSignature`；`[Symbol.iterator]: A`、`["a"]: A`、`[0]: A`、`[sym]?: A` 都是 `ComputedPropertyName` 的属性签名。
2. **调用签名 vs 构造签名**：`(` / `<` 开头是调用签名；`new` 后跟 `(` 或 `<` 是构造签名（换行不影响）；
   `new` 后面是别的单元时 `new` 只是成员名（属性签名）。`abstract new (...)`: TS recovery 成名字为 `new` 的
   `MethodSignature`（带 `AbstractKeyword`），`TypeBuilder` 已按 TS 处理，候选按「构造签名分支」让路即可。

---

## 3. 每类应复用的 TypeBuilder / Shape 与断言

所有候选的 `BuildByIndex` 都是同一段模板，只改三个常量：

| 候选 | 共享工具 Kind | `BuildByIndex` 必产出（`instanceof` 断言） |
| --- | --- | --- |
| `PropertySignaturePossibleShape`（参考实现） | `PropertyKind` | `PropertySignatureShape` |
| `MethodSignaturePossibleShape` | `MethodKind` | `MethodSignatureShape`（含 `abstract new (...)` 的 recovery 分支） |
| `IndexSignaturePossibleShape` | `IndexKind` | `IndexSignatureShape` |
| `CallSignaturePossibleShape` | `CallKind` | `CallSignatureShape` |
| `ConstructSignaturePossibleShape` | `ConstructKind` | `ConstructSignatureShape` |
| `GetAccessorPossibleShape` | `GetKind` | `GetAccessorShape` |
| `SetAccessorPossibleShape` | `SetKind` | `SetAccessorShape` |

共用的工具与方法全部来自 `property-signature-possible-shape.xl.md`（wave2 在自己的 `.xl.md` 里 import 即可）：

```xl
import { MemberPossibleScan } from "./property-signature-possible-shape.xl.md"
import { MemberPossibleUtil } from "./property-signature-possible-shape.xl.md"
```

wave2 候选的**完整实现**就是这个形状（把 `PropertyKind` / `PropertySignatureShape` 换成自己的）：

```ts
// ComputeByIndex
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const state = MemberPossibleUtil.Scan(units, tokenIndex, cache);
if (!MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.MethodKind)) {
  return ShapeStates.Reject;
}
if (state.Complete) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;

// IsBuildable
const state = cache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
return state !== null && state.Complete && state.End >= 0
  && MemberPossibleUtil.HasKind(state.Kinds, MemberPossibleUtil.MethodKind);

// BuildByIndex
const state = catalog.PossibleShapesComputeCache.GetState<MemberPossibleScan>(MemberPossibleUtil.CacheKey);
if (state === null || state.End < 0 || state.End >= state.CodeAt.length) {
  throw new Error("MethodSignaturePossibleShape.BuildByIndex: 判定状态缺失");
}
const start = state.Start;
const end = state.CodeAt[state.End];
const basePos = MemberPossibleUtil.BasePos(host, start);
const consumed:Array<Token> = host.Data.slice(start, end + 1);
const builder = new TypeBuilder(host.Template, context);
builder.Load(consumed, basePos);
const built = builder.ParseTypeMember();
if (!(built instanceof MethodSignatureShape)) {
  throw new Error("MethodSignaturePossibleShape.BuildByIndex: 产出不是 MethodSignatureShape");
}
if (builder.At !== builder.Units.length || builder.OriginalConsumed() !== consumed.length) {
  throw new Error("MethodSignaturePossibleShape.BuildByIndex: 成员没有读完");
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
return built;
```

依赖（每个 wave2 文件的 `# dependencies` 需要的）：`SyntaxContext`、`CatalogGuide`、`PossibleShape`、`PossibleShapeCache`、
`ShapeStates`、`Token`、`ItemUtil`、`TypeBuilder`、自己的 `...Shape`、以及 `MemberPossibleScan` / `MemberPossibleUtil`。

**不要**在 wave2 里改 `MemberPossibleUtil.ClassifyHead` / `Analyze` / `Scan` / `MemberPossibleScan`（共享契约）。
如果发现判型表有缺（新用例 red），在 wave2 分支里把缺的 token 形态补进 `ClassifyHead` **必须回报 Lead**，
因为这会影响所有分支；合并顺序上以 wave1 的参考实现为准。

---

## 4. 隔离测试法（每个 wave2 分支都要做）

工具：`tests/member-possible/harness.mjs`（wave1 已提交）。它用运行时 monkeypatch
`InterfaceDeclarationShape.CreateBodyPossibleShapesCache = [你的候选实例]` 来**裁剪候选目录**，不改源码、不改提交。

```bash
# 只留你的候选，跑默认属性/成员用例
node tests/member-possible/harness.mjs --only=MethodSignaturePossibleShape

# 多种候选一起（合并前自测）
node tests/member-possible/harness.mjs --only=PropertySignaturePossibleShape,MethodSignaturePossibleShape

# 从 typescript/cases/*.ts 自动挑「只含你这类成员」的接口用例
#   （默认实现按 PropertySignature 过滤；wave2 可改 isPropertyOnlyInterfaceCase 的谓词，别提交改动）
node tests/member-possible/harness.mjs --from-cases

# 不裁剪（全量链路；自己之外的候选还是桩时会崩，属预期）
node tests/member-possible/harness.mjs --all

# 自定义源码列表（JSON 数组）
node tests/member-possible/harness.mjs --file=my-cases.json
```

方法：

1. 先 `xl_build(cwd=<你的克隆>, paths=["core","typescript"], targets=["ts"])`，再 `node node_modules/typescript/bin/tsc -p tsconfig.json`；
2. 用 `--only=<你的候选>` 跑到 **0 fail**（harness 与 `ts.createSourceFile` 逐节点比 kind/pos/end/text/name）；
3. 再用 `--only=PropertySignaturePossibleShape,<你的候选>` 确认两类能共存（判型互斥、边界不抢）；
4. 最后跑全量门禁（见 §5），`git checkout -- typescript/cases` 还原快照后再提交；
5. **不要**把「临时裁剪 `CreateBodyPossibleShapes` 名单」的改动留在提交里——裁剪只在 harness 的 monkeypatch 里发生。

参考读数（wave1 分支，2026-10-22）：

- `xl check`：0 error；`tsc -p tsconfig.json`：0 error；
- harness 默认 35 例：35/35；`--from-cases` 自动挑出 206 个「只含属性签名成员」的接口用例：206/206；
- `ast:cases`：6167 条中 red ≤ 96，**非接口相关 red = 0**（其余 6 类是桩，接口体仍会在第一个没实现的候选处崩，属预期）；
- `ast:dts` / `token-ast`：不差于基线（dts 148/226、token-ast 1602 ok / 103 crash）。

---

## 5. 验收（全部 wave 合并后由 Lead 统一跑）

```
xl check                      # 0 error
xl build                      # 注意永远传 paths；直接 xl build 根目录有 cjcli 依赖 dawn/** 的既有 2 error
node node_modules/typescript/bin/tsc -p tsconfig.json   # 0 error
node typescript/cases/ast-json.mjs && node typescript/cases/ast-json-diff.mjs   # 6167/6167
node typescript/cases/real-dts-ast.mjs                  # 226/226
node typescript/cases/token-ast.mjs --quiet             # 1705 ok / 0 crash
node tests/parse/validate.mjs                           # 0 不合格
git checkout -- typescript/cases                        # 快照还原，别提交
```

跑完 `ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`，那是已跟踪快照，提交前一定还原。

---

## 6. 交接状态与下一步

- wave1 已完成：接口体 `CatalogGuide` 管线（上一 commit）+ `CollectBodyMembers` 收口 + 7 类候选名单 + `PropertySignaturePossibleShape` 参考实现 + 共享判型工具 + harness + 本文。
- wave2 待做（并行、互不重叠写文件）：`method-signature`、`index-signature`、`call-signature`、`construct-signature`、`get-accessor`+`set-accessor` 五条分支，各自只改自己的 `*-possible-shape.xl.md`。
- 每分支的完成判据：`--only=<自己>` harness 0 fail；`--only=PropertySignaturePossibleShape,<自己>` 0 fail；本分支 `ast:cases` 非接口 red = 0 且 red 数 ≤ 96；`tsc` 0 error；不动 `typescript/cases` 快照。
- 合并时若有 `ClassifyHead` 争用，按「先参考实现、后增量补充」处理并回报 Lead；`CollectBodyMembers` 只属于 wave1，wave2 不要改。
