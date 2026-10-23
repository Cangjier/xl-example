# Share 缓存与 body guide 推广（SHAPE-CACHE 轮经验总结）

> 本文件是本轮（SHAPE-CACHE）的**经验总结 / 推广手册**：把「`PossibleShapeCache.Share` 数据槽」
> 「interface 成员扫描二次 → 线性」「body guide 范式推广到 enum / class」三件事的**做法、证据、边界**
> 写下来，供下一批 shape（type literal / function / module / object literal …）直接照抄或明确放弃。
>
> **代码面**：`integration-7` @ `893e567c`（2026-10-23）。
> **环境**：Windows，Intel Xeon Platinum 8378C @ 2.80GHz，Node **v24.21.0**，TypeScript **6.0.3**。
> **数字口径**：基线读数见 `BASELINE.md`（`repeat=3 / warmup=1`）；本轮复测统一用
> `--repeat 5 --warmup 2` 取**中位**，同一会话内串行跑，机器与基线同一台。两套口径不可逐位比较，
> 只看量级与曲线形状（§3.4 专门讲噪声）。任务书里出现的「~18–22 ms / 90–110×」来自 T4 会话的读数，
> 本轮 docs 会话独立复测得 22.489 ms（§3.3），落在同一区间。

---

## 1. 一句话结论

本轮把三件事做完并**全程不破门禁**：

1. **`PossibleShapeCache.Share`**：在逐条目状态（`Values`，随 `Reset` 清）之外，加了一层
   **Shape 生命周期内长期复用、不受 `Reset`** 的数据槽（`Share`），配 `GetShare` / `SetShare` / `ClearShare`，
   并把「每条数据自带新鲜度判据」写成纪律；
2. **interface 成员扫描从二次降到线性**：单成员 `interface I { a: A | A | … }` 在 N=4000 时
   **2012.093 ms → 22.489 ms（约 89.5×，T4 会话读数约 90–110×）**，曲线由「N 翻倍 ≈ ×4」变成
   「N 翻倍 ≈ ×2」（每 token ≈ 5.6–6.0 µs 恒定）；真实 `.d.ts` 8 份合计 2031.8 ms → 1990.2 ms（**−2.0%**）；
3. **body guide 范式推广**：enum（枚举声明壳化 + 枚举体成员增量）与 class（类声明壳化 + 类体 8 类成员增量
   + 装饰器感知 + `ClassMemberCatchAllPossibleShape` 兜底）落地，`BodyGuideUtil` 成为各族共用管线。

**7 项门禁全程逐项不变**（每个 merge 与最终 `integration-7` 都是这组读数）：

| # | 门禁 | 读数 |
|---|---|---|
| 1 | `ast-json.mjs` | **6167** case / 47 stem（cj-ok 6167，cj-fail 0） |
| 2 | `ast-json-diff.mjs` | **0 / 0 / 0**（结构差 / 位置差 / 字段差） |
| 3 | `token-ast.mjs --quiet` | **1715 / 1705 / 0 / 0 / 10**（ts-invalid=10，gap-now-passing=0） |
| 4 | `validate.mjs` | **1719 条 / 0 不合格** |
| 5 | `real-dts-ast.mjs` | **226 / 226** |
| 6 | `tsc -p tsconfig.json` | **exit 0** |
| 7 | `xl_check(core, typescript → ts)` | **0 error**（warning 是噪音） |

> 这三件事的**共同前提**是同一句：所有共享/增量都只允许影响「**什么时候建**」，不允许影响「**建成什么**」。
> 任何缓存命中与否都必须产出逐节点一致的 AST —— 门禁 1/2/5 就是这句话的机器判据。

---

## 2. `PossibleShapeCache.Share` 设计

### 2.1 API

缓存分两层，键都按**形状名**分槽（形状在自己名下读写，不拼键名、不互相撞）：

| 成员 | 作用 | 谁清 |
|---|---|---|
| `Values: Map<string, any>` + `GetState<Item>` / `SetState<Item>` | **逐条目**判定状态（当前这一条成员/语句的扫描中间量） | `Clear()`（= 普通 `Reset` 路径） |
| `Share: Map<string, any>` + `GetShare<Item>` / `SetShare<Item>` | **Shape 生命周期内可长期复用**的数据（跨条目共享的锚点、索引、目录） | 只有 `ClearShare()` |

- `GetShare` / `GetState` 未写过返回 `null`，类型由调用方点明（`cache.GetShare<MemberItemStartShared>(key)`）；
- `SetShare` / `SetState` **只在第一次建对象时调**：对象建出来之后由形状就地改，缓存里握着的是同一个引用；
- `Clear()` **只清 `Values`**，`Share` 不动（这是本轮的关键语义，也是 §2.3 全部纪律的来源）；
- `ClearShare()` 清空 `Share`，由宿主 Shape 生命周期收尾时显式调用。

底层只能写 `any`：xl 的类型标注不接受 `{[key:string]:any}`（`E1204`），`Map<string, any>` 是这套规范里
唯一能写的字符串键映射，明确性由取值侧的泛型补回来（与 `SyntaxContext.GetDefault` 同款）。

### 2.2 生命周期

**`Share` 的寿命 = 持有这份 cache 的 `CatalogGuide`（宿主 Shape）的寿命**，不是「一条成员」的寿命：

- 一个 interface / enum / class 的 body 括号上挂一个 `CatalogGuide`，它自带一个 `PossibleShapeCache`；
  **body 括号收口（或整段被丢弃）就是 `ClearShare()` 的时机**；
- 因此 `Share` 里的东西必须能跨**很多条成员**复用，价值才成立：条目起点、已建成员数、成员目录这类
  「单调推进 / 只建一份」的事实；
- 反过来，任何「只对当前这条成员成立」的结论都必须放 `Values`，否则会被下一条目读到（见 §2.3）。

### 2.3 「不受 `Reset`」的代价与纪律

`Values` 由 `CatalogGuide` 在每条目结束时清；`Share` **不清**。这带来一个必须正面处理的后果：

> 换到下一条目之后，`Share` 里的旧数据**仍然指着上一条目的结论**。使用前必须自证还新鲜，否则就是拿
> 上一条目的结论判下一条目 —— 这类 bug 不会让门禁红，只会让 AST 在长语料上偶发偏移，极难定位。

纪律（四条，写在 `docs/body-guide-contract.md` §4，本轮全部被实现验证）：

1. **每条 `Share` 数据自带新鲜度判据**，且判据必须是 **O(1)** 能查的（引用同一性 / 界内 / 前一位的类别 /
   版本号），不能「用一次全扫来校验」—— 那就把省下的时间又花回去了（`MemberItemStartShared` 的做法见 §2.4）；
2. **只在 Build 阶段按需写回**：`Compute` / `ComputeByIndex` **不假定** `Share` 里已经有东西；
   `BuildByIndex` / `BuildFromCode` 里读、缺了就地建、建完写回；
3. **形状收尾时 `ClearShare()`**：body 括号收口 / 被丢弃即清，内存与语义一起归还；
4. **键仍按形状名分槽**：一个形状一份，不给多类候选共用同一个键。

> 违反第 1 条不会「算错一次」，而是「一直算错到下一次重建」；违反第 2 条会在 `Compute` 阶段读到
> 上一条目的残值；违反第 3 条只是漏内存。所以顺序是：先保证 1/2，再谈省了多少。

### 2.4 `MemberItemStartShared` 的真实代码要点

`Share` 里第一个、也是本轮收益最大的一份数据：**条目起点**（`ItemUtil.ItemStart`）的长期缓存。
七类 interface 成员候选（属性 / 方法 / 索引 / 调用 / 构造 / get / set）共用同一份。

**为什么需要**：`Scan` 在每个 basic token 关闭时被七类候选**各调一次**，而 `ItemUtil.ItemStart` 要从
`Data` 尾部**倒扫 O(k)**；七个候选各扫一遍就是 7×O(k)，长成员上直接退化成二次。

**O(1) 新鲜度校验**（`ItemStartValid`）—— 只看 `Start` 前后各一格，不从头扫：

```ts
if (!shared.Valid) return false;
if (shared.Host !== units) return false;                  // 同一宿主 Data（引用同一性）
if (shared.Start < 0 || shared.Start > units.length) return false;
if (shared.Start > 0 && units[shared.Start - 1].IsBasicToken) return false;   // 前一位只能是已建形状
if (shared.Start < units.length) {                        // Start 上不该坐着已建形状
  const atStart = units[shared.Start];
  if (!atStart.IsTriviaToken) return atStart.IsBasicToken;
}
return true;
```

四条判据各挡一种失配：跨宿主（换了 `Data` 数组）、越界、**前一位是 basic token**（说明上一条还没建完，
起点不该在这里）、**`Start` 上坐着已建形状**（说明上一条刚被 `splice` 顶替而 `Share` 还没更新）。

**写回点**：`splice` 之后统一调一份，而不是七个候选各写一遍 —— 七者共用同一份事实源，写回口径必须逐字一致：

```ts
// MemberPossibleUtil.UpdateItemStartAfterBuild(cache, host, start)
const shared = cache.GetShare<MemberItemStartShared>(MemberPossibleUtil.ItemStartKey);
if (shared !== null) {          // 还没有读者问过就不新建：ItemStartOf 的倒扫会写下第一份
  shared.Host = host.Data;
  shared.Start = start + 1;     // 被建的形状正好坐在 start 上，起点前进一格
  shared.Valid = true;
}
```

**不调它的后果是正确但慢**：`splice` 之后 `units[start]` 变成已建形状，上面「`Start` 上坐着已建形状」
那条判据立刻失配，下一次 `Scan` 退回 `ItemUtil.ItemStart` 的 O(成员长) 倒扫 —— 正好是本次要消掉的那次重扫。
这就是为什么「写回」必须和「校验」成对出现：**校验保证了正确性，写回保证了收益**。

### 2.5 适用 / 不适用

**适用**（判据：跨条目复用 + 单调推进 + O(1) 可校验）：

- 扫描锚点：条目起点、已建成员数、边界位置（本轮全部用了）；
- 「只建一份」的目录 / 表：成员候选目录（`CreateBodyPossibleShapesCache`）、形状名 → 索引的静态表；
- 宿主级索引：`Host` 引用 + 位置的二元组，且位置只会前进。

**不适用**：

- 任何「当前成员/当前语句」的判定中间量 —— 那是 `Values` 的职责，放 `Share` 一定会读到上一条目的残值；
- 需要 O(k) 才能证明新鲜的结论（等于没省）；
- 「建成什么」的结论（AST 内容、成员范围、`Pos`）—— 共享只允许影响「什么时候建」；
- 跨 `CatalogGuide` 共享的可变状态：`Share` 属于**一个** `CatalogGuide` 的 cache，不同 body 括号各一份。

---

## 3. interface declare shape 性能

### 3.1 根因表

单成员长类型（`interface I { a: A | A | … }`）的二次曲线来自**四处「每个 token 都重算一遍」**，
且第一处还被**七类候选各调一次**：

| # | 位置 | 原来的代价 | 为什么是二次 |
|---|---|---|---|
| 1 | `ItemUtil.ItemStart` | 每个 basic token 从 `Data` 尾部倒扫 O(k)，**七类候选各调一次** | 7×O(k) × N 次 = O(N²) |
| 2 | `MemberPossibleScan.Scan` | 每个 token **重建** `Code` / `CodeAt` 数组（复制前缀） | 复制长度随 N 增长 → O(N²) |
| 3 | `MemberBoundary.FindTypeMemberBoundary` | 每个 token 从 0 全前缀扫 O(k) | O(N²) |
| 4 | `MemberPossibleUtil.AngleDepth` | 每个 token 从头数一遍 `<` 深度 | O(N²) |

### 3.2 修复

| # | 修复 | 落点 |
|---|---|---|
| 1 | **`Share` 缓存条目起点**：`MemberItemStartShared` + O(1) 校验，`splice` 后 `start + 1` | `property-signature-possible-shape.xl.md` §`MemberItemStartShared` / `ItemStartValid` / `UpdateItemStartAfterBuild` |
| 2 | **`Code` / `CodeAt` 只追加**：`Extend` 从 `state.Checked` 起 `push`，不重建 | 同文件 §`Extend` |
| 3 | **角括号深度增量**：每追加一个代码单元折一次 `AngleJudge.ScanDepth` | 同文件 §`Extend`（`state.Angle`） |
| 4 | **成员边界增量**：`MemberBoundaryScan` + `ScanTypeMemberBoundary`，只判新位置 | `member-boundary.xl.md` §`MemberBoundaryScan` / `ScanTypeMemberBoundary` |

**增量边界的一个细节（容易写错）**：`FindTypeMemberBoundary` 带**一格 lookahead**（`[...]` 既可能是类型的
索引访问后缀、也可能是下一个成员的计算名，两条判据都要看 `at + 1`）。所以末位那一次**永远不会被提前锁定**，
一次扫到底必须把游标**回退到末位**，下一次连末位一起复查：

```ts
// MemberBoundary.ScanTypeMemberBoundary 的收尾
scan.Checked = code.length > 1 ? code.length - 1 : 1;   // 回退一格：末位判据缺 at+1，不能锁定
```

按「逐 token 全量重算」的等价性实现即可：`Boundary` 一旦找到就锁定（更长的前缀不会改变「第一个命中」），
没找到就把 `Checked` 回退到末位。均摊 O(1)，且与全量版**逐 token 等价**。

### 3.3 前后数字

**合成单成员**（`interface I { a: A | A | … }`，一个成员）：

| N（token） | 基线 ms | 本轮 ms | 倍数 | 基线 µs/token | 本轮 µs/token |
|---|---|---|---|---|---|
| 500 | 33.217 | **2.992** | 11.1× | 66.4 | 5.98 |
| 1000 | 133.268 | **5.716** | 23.3× | 133.3 | 5.72 |
| 2000 | 502.891 | **11.406** | 44.1× | 251.4 | 5.70 |
| 4000 | 2012.093 | **22.489** | **89.5×** | 503.0 | 5.62 |

**曲线形状**：基线 N 翻倍 ≈ ×3.8–×4.3（二次），本轮 **×1.91 / ×2.00 / ×1.97**（线性），
µs/token 从 66→503 递增变成 5.6–6.0 恒定 —— 这才是「把二次项消掉」的证据，绝对值的倍数只是附带。

**真实语料 `.d.ts`**（8 份，合计 4 056 233 B）：

| 文件 | bytes | 基线 ms | 本轮 ms | Δ |
|---|---|---|---|---|
| lib.dom.d.ts | 2 349 483 | 1128.083 | **1070.732** | −5.1% |
| lib.webworker.d.ts | 787 076 | 404.561 | **393.225** | −2.8% |
| typescript.d.ts | 588 452 | 382.424 | **390.997** | +2.2% |
| lib.es5.d.ts | 218 972 | 91.369 | **90.034** | −1.5% |
| lib.es2023.array.d.ts | 40 197 | 15.295 | 14.886 | −2.7% |
| lib.es2020.bigint.d.ts | 38 258 | 15.841 | 16.035 | +1.2% |
| lib.es2015.core.d.ts | 22 824 | 8.911 | 8.899 | −0.1% |
| lib.es2015.symbol.wellknown.d.ts | 10 971 | 5.549 | 5.428 | −2.2% |
| **合计（8 份）** | | **2031.832** | **1990.236** | **−2.0%** |

**合成多成员**（n 个 `a{i}: number;`）：

| n | 基线 ms | 本轮 ms | Δ | 基线 µs/member | 本轮 µs/member |
|---|---|---|---|---|---|
| 200 | 3.600 | 3.397 | −5.6% | 18.0 | 17.0 |
| 500 | 8.654 | 8.686 | +0.4% | 17.3 | 17.4 |
| 1000 | 16.899 | 16.346 | −3.3% | 16.9 | 16.3 |

多成员本来就是线性（µs/member 稳定 16–18），本轮**不退化**（±5% 内）即可，这也是「增量没有引入额外二次项」的旁证。

### 3.4 怎么读这些数字（口径与噪声）

- **两套口径不可混比**：基线 `repeat=3 / warmup=1`，本轮 `repeat=5 / warmup=2`；
- **小档噪声大**：500/1000 档单次波动 ±3–20%（基线 1000 档跑到过 163.6 ms），所以小档的「倍数」
  只当趋势看；**4000 档与 dts 合计**才是可比的量级证据；
- **dts 合计的 run-to-run 波动 ±2.4%**（基线三次合计 2013.8 / 2031.8 / 2112.7），本轮 −2.0% 落在波动内 →
  真实语料这一档的准确说法是「**没有变慢，且有 1–3% 的小幅下降**」，不是「显著加速」（原因见 §6）；
- **取中位、同会话、串行**：不要跨会话拼数字；`--json` 的 `samplesMs` 保留全部样本，复核时先看样本范围。

---

## 4. body guide 推广范式

### 4.1 两条机制事实（决定范式能不能成立）

1. **`Bracket.Transit` 只回调「直接父单元」**。body 的 `{` 创建时，`OnBracketCreatedEvent` 只会送到
   **它的直接父单元**。所以「壳」必须是这个 `{` 的父单元 —— 也就是说**壳必须在 `{` 出现之前就已经挂到宿主
   `Data` 上**。做不到这一点，事件根本没有接收者，body guide 无从挂起。
   → 这就是「**声明关键字格提前 Accept**」这一步不可省的原因：壳要在关键字阶段就建出来、顶替进宿主
   `Data`、并让宿主把后续字符交给它（`MountedUnit`），`{` 才会以壳为父。
2. **收口必须 `splice` 顶替，不能 `Token.Replace`**。`Replace` 不经过宿主 `Data`，`MountedUnit` 会继续指向
   已被顶替的旧壳，后续字符被送进死对象。`FinishShell` 因此手写 `splice` + 清 `MountedUnit`。

### 4.2 七件套（每个 body shape 都是这七件）

1. **关键字格提前 Accept**：声明的关键字（`interface` / `enum` / `class`）所在格把壳建出来；
2. **壳的 `OnBracketCreatedEvent`**：`BodyGuideUtil.IsBodyBracket(壳, 新括号, blocked)` 为真才算 body
   （`{` / 角括号深度 0 / 前一位不在 `blocked` 表里）；
3. **挂成员目录**：`MountBodyGuide(bodyBracket, CreateBodyPossibleShapes())`；
4. **壳自己装终结候选**：`new CatalogGuide([], new XxxEndPossibleShape())`（注意：**终结候选挂壳上，不挂 body 括号**）；
5. **`MountShell`**：把 `host.Data[start..tokenIndex]` 搬进壳、定 `Pos`、`splice` 顶替、`host.MountedUnit = shell`；
6. **收口取成员**：`XxxShape.BuildFromCode` 里 `CollectBodyMembers(host, bodyBracket, context, XxxShape.BuildMembers)`；
7. **`FinishShell`**：用完整形状顶替壳（`splice` + 清 `MountedUnit` + 认父）。

### 4.3 `BodyGuideUtil` 的七个方法

本文件**不 import 任何具体声明形状**（壳、成员候选、raw 兜底都由调用方以参数传入），否则
interface / enum / class 各自 import 它会形成 require 环。七个方法：

| 方法 | 职责 |
|---|---|
| `BasePos(host, start)` | 壳 / 条目的 `Pos` 口径：`start` 前最近一个非 trivia 单元的 `End.Index + 1`，前面没有则 `0` |
| `IsBodyBracket(shell, bracket, blocked)` | 判「这个新 `{` 肯定是我的 body」：非 `{` 否；角括号深度 ≠ 0 否；前一位文本 ∈ `blocked` 否 |
| `MountBodyGuide(bracket, shapes)` | 给 body 括号挂成员候选目录（`bracket.CatalogGuide = new CatalogGuide(shapes)`） |
| `MountShell(host, start, tokenIndex, shell, context)` | 搬单元 → 定 `Pos` → `splice` 顶替 → `MountedUnit = shell`（顺序逐字固定：先 `Add` 全部并 `SignIn` 首单元，再算 `Pos`，最后 splice / 认父 / 挂载） |
| `CollectBodyMembers(host, bracket, context, rawFallback)` | 收口取成员：已增量建出的按序取；**没有已建成员**→整段交 `rawFallback`；**有已建成员但尾巴还是 raw** → 把尾巴包成临时括号视图交 `rawFallback`，拼在后面 |
| `FinishShell(host, shell, built)` | `host.Data` 里 `splice` 顶替壳、`built.Parent = host`、`MountedUnit === shell` 时清空 |
| `CreateShapesCache(cacheRef, factory)` | 成员目录「只建一份」的静态缓存（`cacheRef` 空才调 `factory()`） |

`blocked` 表按族给：interface / class 是 `["extends", "implements", ","]`（`{` 处在「后面还能接类型」的位置
就是 heritage 里的类型字面量），enum / module 可以为空 —— 但**判据不能省**，只给空表。

### 4.4 enum 落地（第一个「其它 body shape」，最小完整样本）

- **改 2**：`enum-declaration-possible-shape.xl.md`（关键字格提前 Accept + 壳 + `OnBracketCreatedEvent`）、
  `enum-declaration-shape.xl.md`（`BuildFromCode` / `CollectBodyMembers` / 成员建造器接线）；
- **增 2**：`enum-declaration-end-possible-shape.xl.md`（壳的终结候选，收口）、
  `members/enum-member-possible-shape.xl.md`（枚举体成员候选，枚举体只有这一类成员）；
- **1 候选**：`EnumMemberPossibleShape` —— 枚举体成员形态单一（`A` / `A = 1` / `A = "x"`），一个候选就够，
  不需要 CatchAll；
- **harness 分组**（`node tests/body-guide/harness.mjs --target=enum`）：cases **46**、generic-boundary **19**、
  member-start **10**、recovery **5**。

enum 的价值是**样本最小**：七件套一步不少，但没有多候选协调、没有 CatchAll、没有装饰器。新族先照 enum 抄一遍。

### 4.5 class 落地（最大的一块：壳化 + 8 类成员 + 装饰器 + 兜底）

分两步交付，每步独立过门禁：

- **T6a 壳化（成员仍原子）**：`class-declaration-possible-shape`（关键字格提前 Accept）、
  `class-declaration-shape`（`BuildFromCode` / `BuildMembers`）、`class-declaration-end-possible-shape`（收口）。
  这一步的验收标准是「AST 完全不变、dts 不变、7 门禁不变」—— 壳化本身**不产生**任何增量收益，只是把
  body 括号变成可挂目录的位置；
- **T6b P0/P1：类体 8 类成员 + CatchAll + 装饰器**：
  - 8 类候选：属性（`PropertyDeclarationPossibleShape`）、方法（`MethodDeclarationPossibleShape`）、
    构造（`ConstructorPossibleShape`）、`get` / `set` 访问器（`class-*-accessor-possible-shape`）、
    索引签名（`class-index-signature-possible-shape`）、`static {}`（`ClassStaticBlockDeclarationPossibleShape`）、
    孤立 `;`（`SemicolonClassElementPossibleShape`）；
  - 共享判型：`class-member-possible-util.xl.md`（702 行的公共判据：修饰符、装饰器、成员头判型、`ImplementedKinds()`）；
  - **装饰器感知**：`DecoratorHeadAt` —— 成员前的 `@dec` / `@a.b.c` 属于**下一个**成员的头，不是前一个的尾巴；
  - **兜底**：`ClassMemberCatchAllPossibleShape`（见 §7.2）；
  - **harness 分组**（`--target=class`，**T6b 会话读数，docs 会话未复现**，见 §7.6）：cases **54**、
    generic-boundary **6**、member-start **21**。

**为什么 class 必须有 CatchAll 而 enum 不需要**：`CatalogGuide` 在「候选 0 个且没有终结候选」时**直接抛错**，
而**类体括号上没有终结候选**（终结候选在壳上）。类体成员形态远超 8 类（`abstract`、`declare`、
参数属性、`accessor` 关键字、装饰器 tagged template …），只要还有一类没做，就必须有一个**永不退出**的
候选占位，否则「没认出的成员」会让目录直接抛错而不是安静地留在 raw 里。

### 4.6 每步验收（照这个顺序，别跳）

| 步 | 验收 |
|---|---|
| 1 关键字格提前 Accept | AST 不变（`ast-json` 6167 / diff 0-0-0 / dts 226） |
| 2 `OnBracketCreatedEvent` + `IsBodyBracket` | 上面 + 该族 harness 的 `generic-boundary` 组全过（类型实参里的 `{}` 不被当 body） |
| 3 `MountBodyGuide` | 上面 + 「目录挂上了但一个成员都建不出」＝AST 仍一致（此时还是纯 raw） |
| 4 终结候选 + `MountShell` / `FinishShell` | 上面 + 未闭合体在 EOF 的恢复形（§7.1） |
| 5 成员候选逐类加 | 每加一类跑一次 harness 对应组 + 7 门禁 |
| 6 CatchAll | 目录不再抛 `CatalogGuide: 没有候选形状可以构成` |
| 7 装饰器 / 边界细节 | `member-start` 组 + 长语料 dts |

---

## 5. 推广到其它 shape 的清单

### 5.1 可直接复制的条件（三条都满足才动手）

1. **mounted shell**：这个 shape 有一个「壳」能**在 body 括号出现之前**挂到宿主 `Data` 上
   （关键字格提前 Accept + `MountedUnit` 接管后续字符）；
2. **body bracket**：body 是一个 `Bracket`，且 `Bracket.Transit` 会把它的创建事件送到壳（壳是直接父单元）；
3. **成员建造器已有**：该族已经有「一次性构建」的 `BuildMembers(host, bracket, context)`，可以原样当
   `rawFallback` —— 这是增量路径与 raw 路径产出同一棵 AST 的**唯一**保证（不要为增量另写一个建造器）。

### 5.2 明确不做的（附理由，下一批不要重复论证）

| shape | 结论 | 理由 |
|---|---|---|
| **type literal**（`{ a: A }`） | ❌ 不做 | `TypeBuilder.ParseTypeLiteral` 是在**已经闭合的括号**上直接建成员，没有「壳先挂上、`{` 才创建」的时机；`{` 的父单元是类型起始处的某个 token，不是壳。要做只能让 `TypeBuilder` **在解析类型之前预扫**字面量体（另开课题，见 §6 的教训：先证明收益 ≥10%） |
| function（`function f() {}`） | ❌ 不做 | body 是**语句块**，成员是 statement，不是「成员」；已有语句级 possible shape 覆盖，再挂一层目录是重复机制 |
| module / namespace（`namespace N {}`） | ❌ 不做 | body 是语句体，候选集 = statement 全集（数量大、判型成本高），收益/风险比不划算；且没有「成员」语义上的收口需求 |
| object literal（`{ a: 1 }`） | ❌ 不做 | 表达式体，元素是 `PropertyAssignment` / `SpreadAssignment`，不是声明成员；且同样有「已闭合括号上直建」的问题 |
| static block（`static {}`） | ❌ 不做 | 它本身已经是 class 体的**一个成员**（`ClassStaticBlockDeclarationPossibleShape` 已覆盖），不需要独立 body guide；内部是 statement 序列 |
| switch / try | ❌ 不做 | 语句块，成员是 `case` / `clause`，不是声明成员；不在本轮范式的作用域内 |

### 5.3 新增一个 body shape 的 checklist（8 步）

1. **提前 Accept**：声明关键字格建壳并 `MountShell`（此时还没有 body，`BodyBracket = null`）；
2. **壳的 `OnBracketCreatedEvent`**：`BodyGuideUtil.IsBodyBracket(shell, bracket, blocked)`，为真则记 `BodyBracket`；
3. **`MountBodyGuide`**：给 body 括号挂本族成员候选目录（`CreateBodyPossibleShapes()`，`CreateShapesCache` 缓存一份）；
4. **壳装终结候选**：`new CatalogGuide([], new XxxEndPossibleShape())`；终结候选里 `EndPossible` + `FinishShell`；
5. **`BuildFromCode` / `CollectBodyMembers`**：收口取已建成员 + raw 尾巴（`rawFallback = XxxShape.BuildMembers`）；
6. **成员候选全集或 CatchAll**：把该族成员形态**全部**列出；列不全就必须有 CatchAll（`IsBuildable` 恒 `false`，
   只在「收住且 `Kinds ⊆ ImplementedKinds`」时 `Reject` 让位）；
7. **harness 分组**：`tests/body-guide/harness.mjs` 的 `BODY_TARGETS` 加一项（`shapeName` / `modulePath` /
   候选模块表 / `cases` / `genericBoundary` / `memberStart` / `recovery`），**只改这张表 + 补用例，不改 harness 逻辑**；
8. **7 门禁**：每加一类候选复跑一次（ast-json 6167 / diff 0-0-0 / token-ast 1715-1705-0-0-10 / validate 1719-0 /
   dts 226-226 / tsc 0 / xl_check 0 error），跑完 `git checkout -- typescript/cases` 还原快照。

---

## 6. 性能调查结论（perf-sweep P1）

T4 之后另开了一轮「还有没有得赚」的调查（分支 `perf-sweep`），结论是**没有**：

- **dts 的真实热点在 core 的逐 token 流水线**（不是 diff 的 scope）：`UnitToken.Process` **16.6%**、
  `SyntaxContext` **10.8%**、`Bracket.Transit` ≈ **7.4%**；
- **scope 内唯一候选** `MemberBoundary.FindMemberBoundary` 只占 **2.6%** —— 即使改成 0 也只值 2.6%，
  **不值得改**；
- 因此 dts 端到端的合理预期就是 **−1~3%**（与 §3.3 实测 **−2.0%** 吻合），`lib.dom` 那 −5.1% 里有相当一部分
  是 run-to-run 波动；
- **要做 core 性能必须另开分支**，并且先设门槛：**端到端 ≥10%** 才动 core 的逐 token 流水线
  （那是所有 shape 的共同底盘，改动面与回归面都远大于单个 possible shape）。

> 这条结论的价值在于**把「还能再快一点」变成可拒绝的提议**：一个 2.6% 的候选不值得一轮全量回归。

---

## 7. 风险与遗留（如实）

### 7.1 壳化后「未闭合体在 EOF」的恢复形与基线不同

壳化改变了「`{` 的父单元」，因此**未闭合体在 EOF** 的恢复形（AST 与诊断）与基线不再逐节点相同：
enum 与 class 各出现 **2–3 条未跟踪形**的差异。影响面：

- **不影响 7 门禁**：构造语料（6167）与真实 `.d.ts`（226）都不含这些形，所以门禁读数逐项不变；
- 这些形**未被跟踪**（不在 `typescript/cases/*.ts` 里），因此也不会被 `ast-json-diff` 捕捉；
- 下一批若要收敛：先裁定「未闭合体的恢复形以哪个为准」，再补用例（补了就变成**被跟踪**的形，门禁会盯住）。

### 7.2 class CatchAll 的语义取舍

`ClassMemberCatchAllPossibleShape` 的取舍是**只在最窄的条件下让位**：

- `IsBuildable` **恒 `false`**（永不建形状，只占位）；
- `ComputeByIndex`：共享扫描**收住**（`Complete`）且 `Kinds` **全部落在** `ImplementedKinds()`
  （当前：属性 / 方法 / 孤立 `;`）→ `Reject`（让给具体候选，`CatalogGuide` 才可能收敛到「唯一候选」而建出成员）；
  **其余一律 `Uncertain`**（构造 / 访问器 / static 块 / 索引签名 / 未知形态 / 未收住的条目都由它占位、raw 兜底）。

代价：`ImplementedKinds()` 是**手写**的「本阶段实现了哪些类」清单，每加一类候选必须同步加进去 ——
漏加的症状是「该类成员永远建不出来（被 CatchAll 占着）、但 AST 仍然正确」，属于**正确但慢**的退化，
不会被门禁发现。**加候选的 checklist 里必须包含「更新 `ImplementedKinds()`」**。

### 7.3 3 条新增 E1107（同名类型 warning）

class 的三个候选与 interface 侧同名：

- `class-get-accessor-possible-shape` 里的 `GetAccessorPossibleShape` vs `get-accessor-possible-shape`；
- `class-set-accessor-possible-shape` 里的 `SetAccessorPossibleShape` vs `set-accessor-possible-shape`；
- `class-index-signature-possible-shape` 里的 `IndexSignaturePossibleShape` vs `index-signature-possible-shape`。

`xl_check` 因此从 2447 warning 涨到 **2450 warning，0 error**（另 1 条 E1107 是本轮之前就有的
`ImportAttributesPossibleShape`）。**不影响构建与门禁**（ts 目标下产物落在不同文件），但建议下一批改名为
`ClassGetAccessorPossibleShape` / `ClassSetAccessorPossibleShape` / `ClassIndexSignaturePossibleShape`
（改 `.xl.md` 的类名 + 文件名，属纯改名，门禁可验证）。

### 7.4 bench 小档噪声口径

- `--warmup 2 --repeat 5` 取**中位**；小档（500/1000、multi 200/500）单次波动 ±3–20%，**不要**用单次样本下结论；
- dts 合计 run-to-run ±2.4%（基线三次 2013.8 / 2031.8 / 2112.7），**−2% 级差异落在波动内**；
- 同机、同会话、串行；跨会话拼数字会把噪声当收益。

### 7.5 装饰器等极端形保守 raw 兜底

- 装饰器：`@dec` / `@a.b.c` / 装饰器后换行 / 成员之间夹装饰器，靠 `DecoratorHeadAt` 归到**下一个**成员的头；
- **极端形**（装饰器参数里的 tagged template、装饰器链上含 `@dec<T>()` 之类）走**保守 raw 兜底** ——
  不增量、交 `CollectBodyMembers` 的 raw 尾巴，AST 与基线一致，只是没提速。这是有意的取舍：
  宁可慢，不可错。

### 7.6 docs 会话的复验差异（需验证成员复核）

本轮 docs 克隆（代码面 `893e567c`，`dist`/`build` 从 `integration-7` 复制后 `tsc` 复跑 exit 0）独立复跑
`tests/body-guide/harness.mjs`，**逐组结果**：

| 组 | 报告读数 | docs 会话复跑 | 结论 |
|---|---|---|---|
| enum `cases` / `generic-boundary` / `member-start` / `recovery` | 46 / 19 / 10 / 5 | **46 / 19 / 10 / 5（全过）** | ✅ 一致 |
| interface `cases` / `generic-boundary` / `member-start` / `recovery` | — | 35 / 10 / 5 / 8（全过） | ✅ |
| `util` | — | 10 / 10 | ✅ |
| `tests/cache-share/check.mjs` | — | **5/5 PASS** | ✅ |
| class `cases` | 54（全过） | **54 中 pass 26 / fail 28** | ❌ **未复现** |
| class `generic-boundary` / `member-start` | 6 / 21 | 4 / 4；4 / 6 | ❌ 部分 |

class 的失败全是 CJ 侧抛 `CatalogGuide: 没有候选形状可以构成（宿主 Bracket，下标 n）`，典型用例
`class C { @a @b.c m() {} }`、`class C { constructor() {} }`、`class C { public static readonly a = 1; … }`。
**7 项门禁不受影响**（harness 不在门禁内，AST 与 dts 全绿），但这说明 class 组要么依赖某个未提交的本地状态、
要么报告读数与当前代码面不符。**结论**：class 的 harness 读数在采纳前必须由 `verify-*` 成员在新克隆里
独立复跑一次；在复现之前，§4.5 的 class harness 数字标注为「T6b 会话读数，docs 会话未复现」。

---

## 8. 复跑命令与验收口径

全部命令在克隆根执行（`<d>` = 克隆路径；`xl` 不在 PATH，构建/检查用会话工具）。

```powershell
# 0) 构建（改过 .xl.md 之后；增量，不确定时 force=true）
#   xl_build(cwd="<d>", paths=["core","typescript"], targets=["ts"], out="dist")
#   xl_check(cwd="<d>", paths=["core","typescript"], targets=["ts"])   # 只认 0 error

# 1) 编译（不可省：用例读 build/，只跑 xl_build 会继续用旧 JS）
cd <d>; .\node_modules\.bin\tsc.cmd -p tsconfig.json      # exit 0

# 2) 7 项门禁（同克隆内串行；不要并行跑 ast-json）
node typescript/cases/ast-json.mjs               # 6167
node typescript/cases/ast-json-diff.mjs          # 0 结构差 / 0 位置差 / 0 字段差
node typescript/cases/token-ast.mjs --quiet      # 1715 / 1705 / 0 / 0 / 10
node tests/parse/validate.mjs                    # 1719 条 / 0 不合格
node typescript/cases/real-dts-ast.mjs           # 226 / 226
git checkout -- typescript/cases                 # 还原被 ast-json 重写的快照

# 3) 两个 harness（不在 7 门禁内，但改了 body shape 必跑）
node tests/body-guide/harness.mjs --target=interface
node tests/body-guide/harness.mjs --target=enum
node tests/body-guide/harness.mjs --target=class
node tests/body-guide/harness.mjs --target=all
node tests/member-possible/harness.mjs

# 4) Share 数据槽自测
node tests/cache-share/check.mjs

# 5) 基准（三档；口径固定 warmup 2 / repeat 5，取中位）
node tests/bench/parse-perf.mjs --dts --repeat 5 --warmup 2
node tests/bench/parse-perf.mjs --single 500,1000,2000,4000 --repeat 5 --warmup 2
node tests/bench/parse-perf.mjs --multi 200,500,1000 --repeat 5 --warmup 2
node tests/bench/parse-perf.mjs --json            # 保留全部样本
```

**验收口径（本轮用过的）**：

1. **门禁 7 项逐项不变**，读数必须与 `BASELINE.md` §2 逐位一致（新增用例的分支只允许 `6167 + N`）；
2. **AST 逐节点一致**是硬约束：任何 `Share` / 增量命中与否，`ast-json-diff` 必须 0-0-0、dts 必须 226-226；
3. **性能**：single 曲线「N 翻倍 ≈ ×2 以内」且 4000 档绝对值显著低于 2012 ms；dts 合计中位**不退化**
   （±5% 内视为无变化，−1~3% 属预期）；multi ±10% 内；
4. **harness**：本族分组全绿；新增一族只在 `BODY_TARGETS` 加表项 + 补用例；
5. `git status --short` 只含本次要提交的文件（`dist/`、`build/`、`node_modules/`、`tmp/` 不进仓库）。
