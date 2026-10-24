# HANDOFF — Stage 2 余项（perf）：ItemStart 按条目记忆

分支 `feature/possible-statement-s2b`，基线 `feature/possible-statement` @ 6719ed24。
只改 `core/syntax/possible-shape-cache.xl.md`、`typescript/tokens/item-util.xl.md` 与 35 个候选的 `ComputeByIndex` 调用点；
未改 `core/` 的判定逻辑，未改 `StatementBoundaryUtil.IsAsiBoundary`，默认路径不变。

## 1. 改动

**做法**：把 `ItemStart` 的记忆**绑在 `PossibleShapeCache.Clear()` 上**，而不是绑数组引用/长度。

- `PossibleShapeCache` 新增 `ItemStartValue:int = -1`、`ItemStartLength:int = -1` 两个字段与
  `GetItemStart(unitsLength)` / `SetItemStart(value, unitsLength)`；`Clear()` 里一并复位成 `-1`
  （`Clear` 原体只有 `this.Values = []`，现在多两行）。
- `ItemUtil.ItemStartCached(units, cache)`：命中就返回，未命中才调**原封不动**的 `ItemUtil.ItemStart(units)`
  再写回。`ItemStart` 本身一行没改，仍是唯一的判据来源（不存在两份规则）。
- 35 个 `ComputeByIndex` 里的 `ItemUtil.ItemStart(units)` → `ItemUtil.ItemStartCached(units, cache)`。

**为什么这个作用域是"条目"而不是"碰巧"**：`CatalogGuide.Reset()` 是唯一调用 `Clear()` 的地方
（`catalog-guide.xl.md:134`），而 `Reset()` 的两个调用点（`:99`、`:119`）都紧跟在 `BuildByIndex`
之后——`host.Data` 只可能在 `BuildByIndex` 里被 splice。于是**两次 `Clear()` 之间 `host.Data` 内容不变**，
`ItemStart` 在该区间内是常量，返回记忆值与原值逐位相同。这正是 HANDOFF-s2 §3/§5 要求的
「绑 `Reset` 的条目生命周期」，也解释了上一任「用 `units` 数组引用当键」为什么会坏：那个引用跨条目复用。

**换了什么、没换什么**：23 个 `ItemStart` 调用点**故意没换**——它们都在 `BuildByIndex` 的
`state === null ? ItemUtil.ItemStart(host.Data) : state.Start` 兜底分支里，`cache` 不在作用域内，
且是冷路径。保持原样既是零风险，也保住了「记忆只在 Compute 热路径生效」的边界。
清单见 §4。

## 2. 行为等价证据（全部本机实跑）

| 关卡 | 结果 |
| --- | --- |
| `xl_build` targets=ts | 0 error（2505 warning 全为既有 W3102/W3103 文档警告） |
| `tsc -p tsconfig.json` | 0 error |
| 四步 ast-json：重生成 → `git status --short typescript/cases` | **statuslines = 0**（逐字节重生成一致） |
| `ast-json-diff` | **完全一致 6167 / 6167**；结构差 0、位置差 0、字段差 0 |
| `ast-json.mjs` 汇总 | cases=6167 **cj-ok=6167 cj-fail=0** |
| `token-ast.mjs` | total=1716 ok=1706 **crash=0 diff=0** ts-invalid=10（既有） |
| `real-dts-ast.mjs` | EXIT=0（无 CRASH） |
| `harness --all` / `--double-accept` / `--lint` | 全 EXIT=0 |
| dev 组 / op 组 | EXIT=0，file-fallback legal 值不变 |
| `op-ast-proof` | 25/25 pass（形状树接管 25、TS 逐节点 25、数字叶子 8） |
| `parse/validate` | EXIT=0 |
| `feas-operator` harness + insert-between | 6/6、9/9 pass |

**过程事故（已修，留档）**：脚本批量替换时，`ItemStartCached` 自己方法体里的
`const value = ItemUtil.ItemStart(units);` 也被正则改成了 `ItemStartCached`，造成无限递归
（首轮 dev/op/ast-json 全部 `Maximum call stack size exceeded`）。修法是把那一行还原成
`ItemUtil.ItemStart(units)`，重编后全表恢复绿。这是替换脚本的锅，不是缓存作用域的设计问题；
§2 的所有读数都是修复**之后**重跑的。

## 3. perf 前后（同机、同 `perf.mjs`，各 2 轮，中位数）

| 指标 | 改前 | 改后 |
| --- | --- | --- |
| long n=300 | 15.56 / 11.71 ms | 12.91 / 11.08 ms |
| many 2000 | 32.56 / 31.81 ms | 32.62 / 28.90 ms |
| scale n=100 | 1.33 / 1.36 ms | 1.61 / 1.35 ms |
| scale n=200 | 4.33 / 4.05 ms | 3.99 / 4.02 ms |
| scale n=400 | 14.96 / 14.95 ms | 13.95 / 13.80 ms |
| **ratio(200/100)** | **3.25 / 2.98** | **2.47 / 2.98** |
| **ratio(400/200)** | **3.45 / 3.69** | **3.50 / 3.44** |
| callsPerToken (many) | 15.01 | 15.01（不变，符合预期） |

`candidateCalls` 一律不变（many=30015、scale=30），说明改动只减少每次调用的**内部**代价，
没有改变任何判定路径——与"逐位等价"一致。

**结论：目标 ≤2.5 未达成。** 只拿到小幅改善（many 好的一轮 −9%，long −5%~−17%，其余在噪声内），
`ratio(400/200)≈3.45–3.50` 仍是 WARN。按纪律**不硬凑**，如实记录。

## 4. 剩余热点与归因（不粉饰）

**原假设被证伪：剩余二次项不在 `ItemStart`。**

证据是规模档的候选调用计数：scale n=100→400 时 `candidateCalls` **恒为 30**，而耗时涨到 ~3.5×。
`ItemStart` 在 optimize 前也只可能被调用 ≤30 次（每候选每格一次），**不可能**解释 100→400 的增长。
也就是说这条曲线本来就不是 `ItemStart` 造成的，给它加记忆自然改不动它。

结合计数，下一个热点的高置信嫌疑是**每条语句的建树路径**（按语句数线性增长 → 总代价 O(n²)）：

1. `typescript/tokens/files/source-file-end-possible-shape.xl.md` 的 4 处 `ItemUtil.ItemStart(host.Data)`。
   其中至少一处（`const start = ItemUtil.ItemStart(host.Data);`，在 `BuildByIndex` 里）**每条语句都执行一次**，
   且扫的是当时整个 `Data` 尾巴 → 单条 O(k)、合计 O(n²)。它是 23 个未换点里唯一在**建树热路径**上的。
2. 若干 `ComputeByIndex` 之外的判定辅助（`statement-route-util.Decide` 内的 `ItemUtil.ItemStart(units)`）
   签名里没有 `cache`，本次未动；若要继续，需要给 `Decide` 加缓存参数并改其全部调用点——属于跨文件签名改动，
   风险高于本次改动，建议单独一轮做。

**下一步建议（按性价比）**：先给 `BuildByIndex` 传 `catalog.PossibleShapesComputeCache`、把第 1 条那处接上记忆
（注意：`BuildByIndex` 运行时 `Clear()` 还没发生，记忆仍然有效，语义与 `ComputeByIndex` 一致），
再复测 scale ratio；若仍 >2.5，再用 `node --cpu-prof` 对 scale n=400 采样，按栈归因而不是按猜测。

## 5. 风险

- **作用域依赖 `Clear()` 的调用时机**。当前 `Reset()` 只在建树后调用，论证成立；若将来有人在
  "改了 `host.Data` 但不 `Reset`"的路径上继续 Compute，记忆会给出旧值。已加 `ItemStartLength`
  长度校验兜住"长度变了"这一种（splice 只会变短），但**长度不变的内容重填**兜不住——这类改动必须同时调 `Clear()`。
  已在两个字段的文档注释里写明这条约束。
- `-1` 是"未算"哨兵，而 `ItemStart` 合法值域是 `0..units.length`，不会撞。
- 未改 `core/` 判定逻辑与 `IsAsiBoundary`，回归面被等价证据覆盖到 6167 条 AST。

## 6. 回滚

    git checkout feature/possible-statement-s2b
    git reset --hard 6719ed24

或只回退改动：`git revert` 本分支 2 个 commit。改动面 = 2 个定义文件 + 35 个候选的一行调用点。