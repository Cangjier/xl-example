# HANDOFF — perf-opt-root-1（性能优化 / root 接线回归）

STATUS: COMPLETE（主验收达成；宽语料时序残留见「剩余热点」）
BRANCH: perf-opt-root-1 @ 8d98c451
BASE: refactor-integration @ c348f6af
CLONE: C:\Users\Admin\Documents\GitHub\xl-example-set\perf-opt-root-1

## 做了什么

### 1. 函数级归因（`--cpu-prof` + `tests/bench/prof-summary.mjs` + 自写 positionTicks 汇总）
`BuildFromCode@declarations/interface-declaration-shape.js:129` 占 **27.40% self（1249/4817 tick）**，
但它内部并无重活。按 `positionTicks` 逐行摊开，**95% 的采样落在三行 `throw` 上**：

| JS 行 | 语句 | tick |
|---|---|---|
| L181 | `throw new Error("接口声明缺少名字")` | 431 |
| L189 | `throw new Error("接口声明缺少接口体")` | 348 |
| L237 | `throw new Error("接口声明的接口体不是花括号")` | 414 |

调用链 `RootItemRule.Analyze` → `BuildByKind(:744)` → `FromUnits(:110)` → `BuildFromCode`：
`Analyze` 对**每个候选格**都试探建一次（`if (this.Alive.size === 1) { BuildByKind(...) }` 在 while 循环里），
绝大多数试探必然失败，于是每次 parse 在这里抛出**上万次**异常；`BuildByKind` 外层是
`try { … } catch { return null; }`，所以每次抛都白付一次 Error 构造 + 抓栈 + GC。
→ 结论与 perf-audit-root 的 H1 一致（形状被按 code 重建），但**真实成本在异常控制流，不在重建本身**：
interface/class/enum 的成员形状由括号 item 表增量建好，`CollectBodyMembers` 只是收集（仅 10 tick）。

### 2. 优化：`typescript/tokens/items/root-item-rule.xl.md` — `BuildByKind` 的 kind===4 分支加「形状快速否定」
判据与 `InterfaceDeclarationShape.BuildFromCode` 逐条同源，**语义不变**（原来的 `throw → catch → null`
改成 `提前 return null`，可证等价）：
1. `[start, end)` 内最后一个非 trivia 单元必须是 `StartBracketChar === "{"` 的 `Bracket`；
2. 「interface / 名字 / 体」三格必须都在（前 3 个非 trivia 计数，最多扫 3 格，O(1)）。
两条不成立就 `return null`，不再进 `FromUnits`。

未做：class/enum 同类守卫（`.d.ts` 语料上 class 仅 1 tick）、`HasTailNew` 反向扫描表（见下）。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | PASS |
| AST 全量 | `node .\typescript\cases\ast-json.mjs` | 6167/6167 cj-ok | PASS |
| AST diff 全量 | `node .\typescript\cases\ast-json-diff.mjs` | 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts | `node .\typescript\cases\real-dts-ast.mjs` | 226 解析成功 / 崩溃 0 / AST 一致 226 | PASS |
| quick | `..\tools\gates.ps1 -Tier quick` | PASS（5.7 s） | PASS |
| standard | `..\tools\gates.ps1 -Tier standard` | PASS（10.6 s，仅 gates/run.mjs 基线已知红 1/8） | PASS |
| batch-split | `node .\tests\body-drive\batch-split.mjs` | PASS 70 段 / 837 断言 / 0 失败 | 不回归 |
| item-oracle | `node .\tests\body-drive\item-oracle.mjs` | PASS（92 段 / 454 前缀，逐前缀一致） | 不回归 |
| stream-proof | `node .\tests\body-drive\stream-proof.mjs` | PASS 146 / FAIL 0 | 不回归 |
| buffer（waived） | `buffer-equivalence --mode both --base ..\baseline-build\build --new build --dts 4 --quiet` | xml PASS 4484 / FAIL 16 / ERROR 52；digest PASS 4380 / FAIL 120 / ERROR 52 | 与 perf-audit-root 读数逐位相同（WP-3 既有差异，非本轮引入），按用户指示只记录 |

## 性能

`node .\tests\bench\parse-perf.mjs --dts 8 --repeat 5`，静默（`Get-Process node` = 0），每侧 3 轮取中位：

| 轮 | 改前 new(ms) | 改后 new(ms) | base(ms) |
|---|---|---|---|
| r1 | 814.256 | 552.090 | 542.080 |
| r2 | 791.990 | 511.040 | 499.930 |
| r3 | 839.293 | 508.134 | 526.982 |
| 中位 | **814.256** | **511.040** | **526.982** |

- 改前 **new/base = 1.545×**（复现 perf-audit-root 的 1.53×）
- 改后 **new/base = 0.970×**（−37.2% vs 改前；比基线还快 3%）
- 额外两轮改后读数：532.581 / 517.774 ms（与中位同量级，无回弹）

## 剩余热点（未做，下一轮建议）

1. **宽语料时序残留**：`buffer-equivalence` 的「解析耗时」在 4556 份 `.ts` 语料上仍是
   **优化侧 5266.8 / 5493.7 ms vs 基线 3435.3 / 3376.6 ms ≈ 1.56×**（改前同口径 5502.4 / 3504.5，
   即本轮对该语料 **0 改善**）。已用「位置互换」实验排除 harness 顺序偏差：
   把 `--base build --new ..\baseline-build\build` 反着跑，慢的仍然是优化侧（5493.7 vs 3376.6）。
   → `.d.ts` 的异常风暴已消除，`.ts` 语料上还有**另一处同量级回归**，与接口无关。
   下一步：对 `.ts` 密集语料做 `--cpu-prof`（用 `buffer-equivalence` 自己的文件表或
   `parse-perf --single/--multi` 合成档），怀疑点依次是 `ClassDeclarationShape.BuildFromCode` /
   `FunctionDeclarationShape.FromUnits` 的同类试探异常、以及 `Analyze` 里 kind≠4 的
   `BuildByKind` 试探（`L316/L338/L390/L436` 每格一次）。
2. **`HasTailNew` 自递归**：改后 profile 仍 2.20%（105 tick），按审计建议改文件级反向扫描表可再省 2–4 pp。
3. 形状/Token 复用压 GC（改前 GC 5.3%）。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name perf-opt-root-2 -From perf-opt-root-1 -Base perf-opt-root-1
cd perf-opt-root-2
# 1) 先量化 .ts 语料残留：对其做 cpu-prof，按 positionTicks 找第二个 throw 热点
# 2) 同样用「快速否定」把 kind 3/5/6 的试探路径提前 return null（判据必须与各自 BuildFromCode 的 throw 逐条对齐）
# 3) HasTailNew -> 文件级反向扫描表
# 每步：xl_build -> tsc -> ast-json + diff -> real-dts 226 -> parse-perf 3 轮 + buffer 时序
```

## 阻塞点
无。

## 踩过的坑
- `prof-summary.mjs` 只给到函数级；**必须再读 cpuprofile 的 `positionTicks`** 才能看到 27% 全落在三行 `throw` 上。
  自写汇总时注意：`.mjs` 是 ESM，`require` 不可用，脚本要存成 `.cjs`。
- `BuildFromCode` 的 self time 不是「重建成员」：成员由接口体 item 表增量建好，`CollectBodyMembers` 只收集。
- `buffer-equivalence` 的「解析耗时」与 `parse-perf` 会给出**相反**的结论（前者 1.56×、后者 0.97×）；
  用位置互换实验才能判掉 harness 偏差，别只看单一差值。