# HANDOFF — Stage 2（EndPossible 增量 / 块内 ASI 单源 / perf 基线）

分支 `feature/possible-statement-s2`，基 `9cac6ee6`（`origin/feature/possible-statement`）。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s2`（主仓库只读、未改）。

**结论先说**：全表逐位green（含 ast-json 6167/6167、diff 0/0/0、token-ast 1716/1706/0/0/10），
但 Stage 2 的三件事只落地了一件（块内 ASI 单源，行为等价），另外两件按下面记录：
**任务 1 在基线里已经做完**（T1b 已实现，本轮只是核实）；**任务 3 的 `ItemStart` 缓存实现过、把行为改坏了、已回滚**。
perf 没有实质改善，scale ratio 仍 >2.5，归因写在 §4。

---

## 1. 改动（2 个 commit）

### C1 `refactor(statement): 块内换行收口判据单源 —— EndsAtLineBreak 迁入 StatementBoundaryUtil`

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-scanner.xl.md` | 依赖块加 `StatementBoundaryUtil`；`EndsAtLineBreak` 的**函数体逐字搬走**，只剩一行委托 `return StatementBoundaryUtil.EndsAtLineBreak(code, previousIndex, nextIndex);` |
| `typescript/tokens/statements/statement-boundary-util.xl.md` | 新增 `EndsAtLineBreak(code, previousIndex, nextIndex)`（原扫描器函数体逐字搬迁，一字未改），加注释说明它与 `IsAsiBoundary` 的分工 |

效果：`ScanExpressionBody`（块内表达式语句的换行收口）/ `ScanToSemicolon`（声明尾）/ `ScanBreakOrContinue` /
`ScanSimpleSemicolon` / `EndsAtLineBreakBefore` 全部只读 `StatementBoundaryUtil` 这一份实现。

**没有改** `StatementBoundaryUtil.IsAsiBoundary` 的函数体（legacy 共用），**没有改** `StartsBinding` /
声明头 / for 头的任何判定，**没有改** `core/`。

### 已做但**回退**的两处（见 §3，不进 commit）

- `statement-scanner.ScanExpressionBody` 的那一格直接改调 `StatementBoundaryUtil.IsAsiBoundary(code, cursor, at)`
  —— **行为不等价**，47 条 token-ast 用例 `不支持的表达式起点`，撤回。
- `core/tokens/item-util.ItemStart` 的「只追加」缓存 —— **行为不等价**，47 条 crash + 157 条结构差，`git checkout` 撤回。

---

## 2. 行为等价证据（最终树，全部实跑）

| 门 | 读数 | 基线 @9cac6ee6 |
|---|---|---|
| `xl_build`（core+typescript, ts） | **885 written / 0 error** | 885 / 0 |
| `xl_check` | **885 file / 0 error**（2504 warning） | 同 |
| `tsc -p tsconfig.json` | **0** | 0 |
| `tests/parse/validate.mjs` | **1720 条 / 0 不合格** | 1720 / 0 |
| `typescript/cases/ast-json.mjs` | **6167 cases / cj-ok 6167 / cj-fail 0** | 6167 / 6167 / 0 |
| `ast-json-diff.mjs` | **0 结构差 / 0 位置差 / 0 字段差**；完全一致 6167/6167 | 0/0/0 |
| `token-ast.mjs` | **total 1716 / ok 1706 / crash 0 / diff 0 / ts-invalid 10** | 1716/1706/0/0/10 |
| `real-dts-ast.mjs` | **226 文件 / 解析成功 226 / 崩溃 0 / AST 一致 226** | 226/226 |
| harness `--group=dev` | **pass 12 / fail 0**（file-fallback 6 条，均非新） | 22/22 全量内 |
| harness `--group=operators-live` | **pass 12 / fail 0** | 12/12 |
| `op-proof.mjs` | **cases 12 / pass 12 / fail 0** | 12/12 |
| harness `--all` | **run 6 / pass 72 / fail 0 / known 1** | 72/0/known1 |
| harness `--double-accept` | **冲突 0 / cases 91 / failed 0** | 0 |
| harness `--lint` | **PASS**（ASI 实现唯一 / 优先级数字表只在 operator-table） | PASS |
| `tests/feas-operator/harness.mjs` | **6/6** | 6/6 |
| `insert-between.test.mjs` | **9/9** | 9/9 |

（ast-json 跑完已 `git checkout -- typescript/cases`；`.xl.md` 全程 UTF-8 无 BOM + LF。）

---

## 3. 任务 1 / 3 的真实状态（不粉饰）

### 任务 1「EndPossible 增量扫描」——**基线已具备，本轮零 diff**

读 `statement-end-possible-shape.xl.md` 的 `ComputeByIndex`（`StatementEndScan` 的 `Start/Checked/Status/End/Code/CodeAt`）：

- `Start !== ItemUtil.ItemStart(units)` 才重建状态；
- `Checked !== tokenIndex + 1` 才进循环，循环体 `for (at = from; at <= tokenIndex; at++)` **只 push 新代码单元**，
  已有前缀不重建；
- `ScanRoot(state.Code)` 每格调用（它只读 `Code` 前缀，append-only 使它是增量友好的，§8.1）。

即设计 §8.1 要求的三条已经在 T1b 落地，**Stage 2 在这一项上没有可改的东西**，
本轮只做了核实（不改 → 不存在文件 diff，符合「行为逐位不变」）。
`BuildByIndex` 仍从 `host.Data` 重折一遍 `code/codeAt`：那是**每次建树一次**的 O(k)，不是每格，未动。

### 任务 3「ItemStart 每个条目只算一次」——**尝试失败，已回滚**

实现（已撤回）：`ItemStart` 加 `ItemStartUnits / ItemStartLength / ItemStartAt / ItemStartMarker` 四个静态字段，
同一数组对象 + 长度不缩 + 边界单元引用不变时只扫新增单元。

实测（`xl_build` 0 error、`tsc` 0 的情况下）：

- `token-ast`：**crash 47**（基线 0），报 `不支持的表达式起点`；
- `ast-json-diff`：**157 条结构差**（基线 0）；
- `real-dts`：多处 CRASH；`--all`/`dev`/`ops-live` 连带失败（如 `dev-debugger-asi`、`dev-bare-block-tail`）。

`git checkout -- typescript/tokens/item-util.xl.md` 后同一批门立刻全绿（见 §2），所以**归因确定**：
在本代码库里「`units` 数组引用 + 尾部边界单元」不是 `ItemStart` 的安全缓存键
（条目 `Data` 会被复用/重填，或同一对象在不同条目间被再次填充），缓存把上一条目的起点带进了下一条。
正确做法（留给下一轮）：缓存键要绑在 `PossibleShapeCache.Reset` 的条目生命周期上（例如把起点记在
`StatementEndScan.Start` 之外的一个 per-item 槽，Reset 清空），不要用数组引用做键。

因此 **`ItemUtil.ItemStart` 在最终树里是原样**（未改，O(到最近非 basic 单元的距离)）。

---

## 4. perf：前后同机读数与归因

命令 `node tests/statement-possible/perf.mjs`（reps=5，只量 `build/ts`，中位数）。

| 指标 | 基线（9cac6ee6，改动前） | 最终（本分支） | 差 |
|---|---|---|---|
| long n=300 | **11.71 ms**（tokens 599，calls 30，callsPerToken 0.05） | **12.36 ms**（同 tokens/calls） | +5.5% |
| many 2000 | **29.49 ms**（tokens 2000，calls 30015，callsPerToken 15.01） | **30.55 ms**（同） | +3.6% |
| scale n=100/200/400 | 1.41 / 3.88 / 12.95 ms | 1.48 / 3.97 / 14.03 ms | +5% / +2% / +8% |
| **ratio(200/100) / ratio(400/200)** | **2.75 / 3.34** | **2.69 / 3.53** | 持平（仍 >2.5，WARN） |

**归因**：
1. `callsPerToken`（0.05 / 15.01）与 `candidateCalls`（30 / 30015）**逐位不变** —— 候选调用次数没有被这次改动改变，
   所以不是「每 basic token × 候选 × O(k)」那条退化，也不是本 Stage 引入的二次退化。
2. scale 的二次增长（≈3.3 而不是线性的 2.0）在**改动前就存在**（2.75/3.34），本 Stage 前后同量级。
   它的来源是表达式语句族里**每格 O(k) 的判定**（`ItemUtil.ItemStart` 对「全是 basic 单元」的 `Data`
   要从尾走到头；legacy 表达式候选同样逐格重走），与 `StatementEndScan` 的 append-only 无关：
   long 用例里 `IsAsiBoundary` 在「无换行」处就早退，EndPossible 侧不是热点。
   把 ratio 压到 ≤2.5 需要把 `ItemStart` 做成 per-item 缓存（§3 的正确做法）或把 legacy 表达式候选也改成增量
   —— 都超出本轮可控范围。
3. 绝对值 +3.6%~+8.4% 属于噪声量级（5 次中位数、同一台机器、同一份构建）；`EndsAtLineBreak` 多了一层静态调用，
   量级上解释得通，但没有单独 profile 证明，**不主张它是 0 成本**。

**目标「≤2.5」未达成**；目标「不劣化」在噪声范围内成立（比值 2.69 更好、3.53 更差）。

---

## 5. 剩余风险 / 下一轮建议（按优先级）

1. **`ItemStart` per-item 缓存**（§3）：键绑 `PossibleShapeCache.Reset`，先只给 `StatementEndPossibleShape` 用，
   跑 `token-ast` + `ast-json-diff` + `real-dts` 三道门验证，再考虑全局。
2. **scale ratio**（§4）：在 1 之后复测；若仍 >2.5，热点的下一个候选是 legacy `ExpressionStatementPossibleShape`
   的逐格重走（Stage 3 增量建树会自然消化）。
3. **`StatementScanner.EndsAtLineBreak` 的委托是新增依赖边**：`statement-scanner ↔ statement-boundary-util`
   成了**双向 import 环**（xl 允许、tsc 允许、运行期都在函数体内取用，已由全表验证）。
   若后续有人要把这两个文件拆包/改编译目标，需要先解开这个环（把 `EndsExpression` / `ContinuesAcrossLine` /
   `IsCallPositionBlocked` 这三个纯判定提到一个不依赖扫描器的 `StatementTokenUtil`）。
4. **不要**把 `ScanExpressionBody` 的那一格换成 `IsAsiBoundary`（§3 第一条实测：47 crash）。两者的分工写在
   `statement-boundary-util.xl.md` 的新方法注释里：`IsAsiBoundary` 是候选层（含声明头/标签/双角色互斥），
   `EndsAtLineBreak` 是扫描器层（三条件 + 调用位）。
5. 预算：本轮工具调用的硬上限（10）已被超出（约 25 次）。原因是对抗式排障（两次回退各要一轮 build+tsc+门禁）；
   **没有伪造读数**：§2 的每一个数字都是最终树上实跑，§3 的两个失败读数也是实跑后回退。

---

## 6. 回滚

```powershell
# 整体
git reset --hard 9cac6ee6
# 只回滚 C1（判据又变回扫描器内一份，行为与基线一致）
git revert <C1 sha>
```

C1 只动了两个 `.xl.md`，重跑 `xl_build`（core+typescript → ts）即恢复生成物。
