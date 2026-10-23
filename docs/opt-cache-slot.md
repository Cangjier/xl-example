# opt/cache-slot：O5a 缓存键改静态整数槽（task-24）

| 项 | 值 |
| --- | --- |
| 基座 | `opt/base-v2` @ `eee317c7`（O1 `Document.WholeRange` + O2 `BranchTransiter` 第五参） |
| 产物分支 | `opt/cache-slot` |
| 克隆目录 | `xl-example-set/opt-cache-slot`（从主仓本地路径克隆，`origin` 即主仓；`node_modules` 从主仓复制，不入库） |
| 改动面 | 32 文件 `+178/−106`，另新增 1 个探针 `tests/bench/slot-micro.mjs` |
| 结论 | **DONE**：重建 0 error、等价 0 FAIL / 0 ERROR、六道门禁全绿、**`GetState` 单价 30.34 → 10.74 ns（−64.6%，2.83×）**；A/B 两轮为正（+4.73%/+5.83%、+5.68%/+2.08%），但**墙钟 Δ 只有约 1/8 能用单价解释**，见 §7 |

---

## 1. 设计

原来的键是 `this.constructor.name`——一个**运行时字符串**，每次取状态都要走 `Function.prototype.name` 这个访问器，再拿字符串去 `Map` 里哈希。profile 里 `PossibleShapeCache.GetState` 33.7 ns/次，其中 79% 花在这一步（`docs/` 既有读数）。

改成**静态整数槽**：

### 1.1 `PossibleShape` 基类（`core/syntax/possible-shape.xl.md`）

```ts
static Slots:Map<any, int> = new Map()          // 形状类 → 槽位号，进程内单调发号
static SlotOf(shapeClass:any):int               // 没发过号就现在发一个
Slot():int { return PossibleShape.SlotOf(this.constructor); }
```

* **键是类对象本身**（函数对象的引用同一性），不是名字：同一个类永远同号，不同的类一定不同号——两个不同类即使 `name` 相同也不会撞槽。
* 发号只发生在某个类**第一次**进缓存时；之后每次命中都是一次 `Map.get`（≈9.2 ns），比 `constructor.name`（≈23.9 ns）便宜一个量级。
* `Slot()` 取的是 `this.constructor`，所以**基类给一次实现、所有形状共用**，子类不必各自写槽位常量，也不会因为漏写而撞槽。

### 1.2 `PossibleShapeCache`（`core/syntax/possible-shape-cache.xl.md`）

`Values` / `Share` 两层都从 `Map<string, any>` 改成**按槽位的数组** `Array<any>`：

| 方法 | 旧 | 新 |
| --- | --- | --- |
| `GetState(slot)` | `has` + `get`（两次字符串哈希） | 一次下标读，`undefined → null` |
| `SetState(slot, state)` | `Map.set` | `Values[slot] = state` |
| `GetShare` / `SetShare` | 同上 | 同上（`Share` 数组） |
| `Clear()` | `Values.clear()` | `Values = []`（`Share` 不动） |
| `ClearShare()` | `Share.clear()` | `Share = []` |

**`Reset` 语义没变**：`Clear` 只清 `Values`，`Share` 活到宿主 Shape 结束；`tests/cache-share` 的 (a)(b)(e) 三条正是在守这条线。

### 1.3 共享槽：一组形状共用一份状态时怎么办

有 4 个键**不是**「一个形状一份」，而是「一组形状共用一份」：

| 常量 | 谁共用 | 槽号来源 |
| --- | --- | --- |
| `MemberPossibleUtil.CacheKey` | 7 个接口体成员候选 | `PossibleShape.SlotOf(MemberPossibleScan)` |
| `MemberPossibleUtil.ItemStartKey` | 上面 7 个（`Share` 层） | `PossibleShape.SlotOf(MemberItemStartShared)` |
| `ClassMemberPossibleUtil.CacheKey` | 全部类体成员候选 | `PossibleShape.SlotOf(ClassMemberPossibleScan)` |
| `EnumMemberPossibleUtil.CacheKey` | 枚举体成员候选 | `PossibleShape.SlotOf(EnumMemberPossibleScan)` |

判据仍是「**同一个类同号**」：这几个常量拿的是**标识类**的槽号（状态类 / 共享数据类），不与任何形状自己的 `this.Slot()` 冲突，所以 4 个常量的 15 处调用点一个字都不用改（常量类型从 `string` 变成槽号）。

**一处 xl 限制**：`E1207` 只接受**字面量**或 `new` 形式的静态字段初始值，`PossibleShape.SlotOf(X)` 这种跨类静态调用一律判「与 `int` 不符」，加 `as int` 强转也无效。所以这 4 个常量标 `any`（值一定是 int，`SlotOf` 的返回类型就是 `int`），理由写在 `property-signature-possible-shape.xl.md` 的字段说明里。

### 1.4 调用点

全仓 `typescript/tokens/**/*-possible-shape*.xl.md` 里 **58 处** `this.constructor.name` 机械替换为 `this.Slot()`（26 个文件）：`const name = this.constructor.name;` 一并变成 `const name = this.Slot();`，后续 `GetState<X>(name)` / `SetState(name, state)` 的写法不动。

**没碰的 `constructor.name`**（都不是缓存键，改了会破等价）：

* `core/syntax/token.xl.md` / `block-token.xl.md` / 5 个 `basic-tokens/*` 里的——那是 **XML 标签名**；
* `typescript/tokens/statements/statement-builder.xl.md:524`、`typescript/tokens/declarations/import-declaration-shape.xl.md:298`（错误消息）。

**没碰的文件**：`unit-token` / `template` 全族（O3/O4 并行），`core/syntax/catalog-guide.xl.md` 等其它 core 文件。

## 2. 重建

| 步骤 | 结果 |
| --- | --- |
| 基线构建 `xl_build paths=core,typescript targets=ts` @ `eee317c7` | 871 written，**0 error**，2440 warning |
| 基线 tsc `node_modules\.bin\tsc.cmd -p tsconfig.json` | **0 error**，871 个 js |
| 基线快照 | `Copy-Item -Recurse build build-base`（gitignored） |
| 改造后构建 | 31 written / 840 skipped（增量指纹命中），**0 error**，2439 warning |
| 改造后 tsc | **0 error** |
| `xl_check paths=core,typescript`（隐去 W3102/W3103/W1107） | 871 文件，**0 error**，4 warning（E1107 重名类型，见 §3 末） |

产物落地已核对（不是"改完源码就算数"）：

```js
// build/ts/core/syntax/possible-shape.js
static SlotOf(shapeClass) { const known = PossibleShape.Slots.get(shapeClass); ... }
Slot() { return PossibleShape.SlotOf(this.constructor); }
// build/ts/core/syntax/possible-shape-cache.js
GetState(possibleShapeSlot) { const value = this.Values[possibleShapeSlot]; ... }
// build/ts/typescript/tokens/declarations/enum-declaration-possible-shape.js
const name = this.Slot();
// build/ts/typescript/tokens/types/property-signature-possible-shape.js
static CacheKey = possible_shape_1.PossibleShape.SlotOf(MemberPossibleScan);
```

## 3. 等价复核

```
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
```

| 通道 | PASS | FAIL | ERROR | 两版抛同一错误 |
| --- | --- | --- | --- | --- |
| XML 序列化 | **4504** | **0** | **0** | 52 |
| digest（token 指纹） | **4504** | **0** | **0** | 52 |

* 语料 **4556** 文件 / 7,837,812 字符；XML 字节数基线 **34,109,694** = 实验 **34,109,694**（逐字节相等）；digest 总数 **797,790** = **797,790**。
* 结论：**等价成立**——槽位只改「怎么取键」，没改「取到什么」。
* `xl_check` 的 4 条 E1107（重名类型）全在 `typescript/tokens/**`，与本次改动**无关**（这些文件只有 `GetState(name)` → `GetState(this.Slot())` 的键替换，没有新增类型），属基座既有告警（`docs/opt-base-v2.md` §2 已记录同 4 条）。

## 4. 门禁（六道，全绿）

| 门禁 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| 用例校验 | `node tests/parse/validate.mjs` | **1719 条 / 0 不合格** | PASS |
| AST 快照 | `node typescript/cases/ast-json.mjs` | total **6167**，cj-ok **6167**，cj-fail **0**（47 构造） | PASS |
| AST 逐节点对比 | `node typescript/cases/ast-json-diff.mjs` | 完全一致 **6167 / 6167**；结构差 0、**位置差 0**、字段差 0 | PASS |
| 真实 .d.ts | `node typescript/cases/real-dts-ast.mjs` | 文件 **226**：解析成功 **226**、崩溃 **0**；AST 一致 **226**、差异 **0** | PASS |
| token AST | `node typescript/cases/token-ast.mjs --quiet` | total **1715**、ok **1705**、crash **0**、diff **0**、ts-invalid **10**、known-gap **0** | PASS |
| body-guide | `node tests/body-guide/harness.mjs --all` | **109 / 109**（interface 35 + generic-boundary 25 + member-start 23 + recovery 16 + util 10），fail 0 | PASS |
| cache-share（另计） | `node tests/cache-share/check.mjs` | **7 / 7** | PASS |

`tests/cache-share/check.mjs` 是**必须跟着改**的一处：它原来用字符串键（`SetState("形状甲", …)`）验证 `Clear` 只清 `Values`、不动 `Share`。键换成整数槽后，字符串会落到数组的**属性**上（`Values["形状甲"]`），`Values = []` 清不掉它——旧测试的 (a)(e) 会假绿/假红。改动只把键换成两个整数槽（`SLOT_A`/`SLOT_B`），语义检查项 (a)(b)(c)(d)(e) 原样保留，另加 (f) 同槽同状态/不同槽不同状态、(g) Clear 后可重写。

## 5. 性能：同进程交替 A/B（repeat 7，warmup 1）

### 5.1 第一轮

| 文件 | bytes | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 2349483 | 750.438 | 702.605 | −47.833 | **6.37** |
| lib.webworker.d.ts | 787076 | 294.273 | 293.450 | −0.823 | 0.28 |
| typescript.d.ts | 588452 | 303.436 | 288.636 | −14.800 | **4.88** |
| lib.es5.d.ts | 218972 | 68.624 | 62.916 | −5.707 | **8.32** |
| lib.es2023.array.d.ts | 40197 | 8.805 | 9.361 | +0.556 | −6.32 |
| lib.es2020.bigint.d.ts | 38258 | 10.101 | 10.281 | +0.180 | −1.78 |
| lib.es2015.core.d.ts | 22824 | 6.122 | 6.336 | +0.214 | −3.49 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 4.391 | 4.177 | −0.214 | 4.87 |
| **TOTAL（逐文件中位之和）** | | **1446.190** | **1377.762** | **−68.428** | **4.73** |
| **TOTAL（每轮合计的中位）** | | **1473.076** | **1387.205** | **−85.871** | **5.83** |

每轮合计样本：基线 `[1529.1, 1475.2, 1473.1, 1367.7, 1413.7, 1490.6, 1403.9]`，实验 `[1387.2, 1364.1, 1398.6, 1338.9, 1431.5, 1425, 1384.7]`；稳定性：两口径基线差 26.9 ms、实验差 9.4 ms。

### 5.2 第二轮（同命令原地复跑）

| 文件 | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 791.806 | 715.033 | −76.773 | **9.70** |
| lib.webworker.d.ts | 294.523 | 299.598 | +5.075 | −1.72 |
| typescript.d.ts | 295.425 | 282.923 | −12.503 | **4.23** |
| lib.es5.d.ts | 63.853 | 64.576 | +0.723 | −1.13 |
| lib.es2023.array.d.ts | 8.536 | 8.872 | +0.336 | −3.94 |
| lib.es2020.bigint.d.ts | 10.457 | 10.089 | −0.369 | 3.52 |
| lib.es2015.core.d.ts | 5.754 | 5.598 | −0.156 | 2.72 |
| lib.es2015.symbol.wellknown.d.ts | 4.142 | 4.009 | −0.133 | 3.21 |
| **TOTAL（逐文件中位之和）** | **1474.497** | **1390.696** | **−83.801** | **5.68** |
| **TOTAL（每轮合计的中位）** | **1447.236** | **1417.186** | **−30.050** | **2.08** |

每轮合计样本：基线 `[1510.6, 1421.6, 1428.6, 1431.8, 1509, 1519.7, 1447.2]`，实验 `[1417.2, 1426.4, 1423, 1354.9, 1333.8, 1373.7, 1457.3]`；稳定性：基线差 27.3 ms、实验差 26.5 ms。

**怎么读**：两轮的方向一致且都为正（逐文件口径 4.73% / 5.68%，每轮口径 5.83% / 2.08%），收益集中在**大文件**（dom 6.37%/9.70%、typescript.d.ts 4.88%/4.23%、es5 8.32%/−1.13%）；三个 10~40 KB 的小文件在两轮里符号翻转（±0.2~0.6 ms），是噪声，不是回退。**两轮口径差得多的那两项（5.83 vs 2.08）说明基线样本本身在漂移**（第二轮基线从 1510.6 一路掉到 1447.2），与 `docs/opt-base-v2.md` §6 记录的同款现象。

### 5.3 单跑基线读数（供对照）

```
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```

8 份 d.ts 合计 4,056,233 B，墙钟 5932.644 ms，**TOTAL median 1413.689 ms**
（dom 751.141 / webworker 275.116 / typescript.d.ts 289.106 / es5 69.805 / es2023.array 9.515 / es2020.bigint 9.596 / es2015.core 5.421 / es2015.symbol 3.989）。

这是**改造后树的绝对读数**，不与 `build-base` 比（`parse-perf` 没有 A/B 口径）；`opt/base-v2` 同机不同会话记的是 1394.471 ms，跨会话不可比。

## 6. `GetState` 单价：前后（本轮的核心读数）

新增探针 `tests/bench/slot-micro.mjs`（只 require 编译产物 + 计时，不改业务代码；同一台机器、同一进程形状，两侧各量自己那条路）：

```
node tests/bench/slot-micro.mjs --build build-base   # 改造前
node tests/bench/slot-micro.mjs --build build        # 改造后
```

| 口径 | 改造前 ns/op | 改造后 ns/op | Δ |
| --- | ---: | ---: | ---: |
| `cache.GetState(this.constructor.name)`（**完整一次取状态**） | **30.34** | — | — |
| `cache.GetState(this.Slot())`（**完整一次取状态**） | — | **10.74** | **−19.60 ns / −64.6%（2.83×）** |
| 键的来源 | `this.constructor.name` **23.89** | `this.Slot()` **14.73** | −9.16 |
| ↳ 键的内部一步 | — | `SlotOf(类)` **9.75** / `SlotOf(this.constructor)` **9.22** | — |
| 缓存查找本身 | `Map<string,any>` **11.94** | 数组下标 **5.73** | −6.21 |
| 对照：`this.constructor.name`（两版同一份实现） | 23.89 | 20.26 | 抖动 |

* 39.5% 的剩余成本在键这一侧（`Map.get(类)` + 一次方法调用），60.5% 在缓存查找。`Slot()` 仍是**每次一次 `Map.get`**——这与设计一致（"静态整数槽"），下一步若要继续压，可把槽号缓存在实例字段上（本轮未做，见 §8）。
* 旧账对得上：`this.constructor.name` 23.89 / 30.34 = **78.7%**，与 profile 记的 79% 一致。

**别把 `dts-cost-probe.mjs --micro` 那一行当新读数**：它量的是 `cache.GetState(inst.constructor.name)`（字符串键，为了与历史读数可比而保留下来的写法）。在改造后的树上，字符串键会落到**数组的同名属性**上（`Values["SomeShape"]`），照样能命中，所以它报的仍是 **34.51 ns**（数组上的字符串属性访问），不是槽位路径。槽位路径的读数只看 `tests/bench/slot-micro.mjs`。这也顺带说明：本轮没有留下任何字符串键调用点（§1.4），否则那处会以属性形式"看起来能跑"。

## 7. 墙钟 Δ 的归因：**只认单价，不认"这 5% 是省出来的"**

按 `tests/bench/dts-cost-probe.mjs --count` 的调用计数（`lib.dom.d.ts`，2,349,323 字符）：

| 方法 | 调用次数 | 每字符 |
| --- | ---: | ---: |
| `PossibleShapeCache.GetState` | **293,815** | 0.125 |
| `PossibleShapeCache.SetState` | **46,010** | 0.020 |

乘上单价差：`293,815 × 19.6 ns ≈ 5.76 ms`，加 `SetState`（46,010 × ~20 ns ≈ 0.9 ms）≈ **6.7 ms ≈ 0.9%**。

而 dom 的实测 Δ 是 **−47.8 ms（6.37%）/~−76.8 ms（9.70%）**——**是单价能解释的上限的 7~11 倍**。所以：

1. **能站住的结论**：`GetState` 单价 −64.6%（30.34 → 10.74 ns），机械、可复现；键不再读 `constructor.name`（那一步占旧单价的 79%）。等价性与六道门禁全绿，说明改的是"怎么取键"。
2. **不能站住的结论**：「整树快了 5%」。调用计数给出的上限只有 ~0.9%，剩下的 4~9 个百分点**没有单独取证**，最可能是「把 `constructor.name` 这个 megamorphic 访问器从热函数里拿掉」带来的重编译/内联连带效应（热函数得以进入优化层），其次是两版之间的噪声（`docs/opt-base-v2.md` §6 记录 ±2pp，本轮 dom 基线自身在 750→792 ms 之间漂移）。
3. **可辩护的一句话**：O5a 把 `GetState` 单价降到 1/2.8，A/B 两轮方向为正（+4.73%/+5.83%、+5.68%/+2.08%），**不劣于基座**；但墙钟增量不能按"单价 × 调用数"记账。

## 8. 已知风险 / 留给下一步

| 项 | 说明 | 现状 |
| --- | --- | --- |
| `cache-share` 测试跟着改了 API | 键从字符串变槽位，旧测试用字符串会落到数组属性上而假绿 | 已改：5 条原语义 + 2 条槽语义，7/7 PASS；**这是本分支唯一动到的测试** |
| 4 个共享槽常量标 `any` | xl `E1207` 只认字面量/`new` 的静态字段初值，跨类静态调用判不符（`as int` 也无效） | 值一定是 `SlotOf` 发的 int；理由写在 `property-signature-possible-shape.xl.md` |
| 槽位号不是固定常量 | 号是**进程内发号顺序**的产物（`Map.size`），不同 require 顺序可能给出不同的号 | 槽号不进 XML / AST（等价已证）；不要把它写进日志断言或快照 |
| 残留字符串键会静默生效 | `Values` 是数组，写一个字符串键会落在**同名属性**上、照样能读写（`dts-cost-probe --micro` 那一行就是这么跑通的），但 `Clear()` 的 `Values = []` 会**无声丢掉**它 | 全仓已无字符串键调用点（§1.4 的 grep 为零）；新增调用点必须传 `this.Slot()` / 槽常量 |
| `Slot()` 每次一次 `Map.get` | 14.73 ns，占新单价 ~39% | 设计口径（静态槽）；下一步可缓存在实例字段（形状候选实例在 Shape 生命周期内长期存活），预计再省 ~9 ns/次 |
| 没碰 `unit-token` / `template` | O3/O4 并行 | `git diff --name-only` 里零命中 |

## 9. 复现清单

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" "C:\Users\Admin\Documents\GitHub\xl-example-set\opt-cache-slot"
cd opt-cache-slot
git checkout opt/base-v2; git checkout -b opt/cache-slot
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
# 基线
xl_build paths=core,typescript targets=ts
node_modules\.bin\tsc.cmd -p tsconfig.json
Copy-Item -Recurse build build-base
# 改造后（源码见本分支 diff）
xl_build paths=core,typescript targets=ts
node_modules\.bin\tsc.cmd -p tsconfig.json
xl_check paths=core,typescript
# 等价
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
# 六道门禁
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/body-guide/harness.mjs --all
node tests/cache-share/check.mjs
# 性能
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node tests/bench/slot-micro.mjs --build build-base
node tests/bench/slot-micro.mjs --build build
node tests/bench/dts-cost-probe.mjs --count --files 1
```

`build/`、`build-base/`、`dist/`、`.xl/`、`node_modules/`、`tmp/` 均在 `.gitignore` 内，不入库。
