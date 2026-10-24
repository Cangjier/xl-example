# HANDOFF — perf-opt-root-2（性能优化第二轮 / .ts 密集语料）

STATUS: PARTIAL —— 8 dts 达标（0.977×）；4556 份 `.ts` 语料 **1.478× → 1.362×**，未达 ≤1.05（原因见「剩余热点」）
BRANCH: perf-opt-root-2 @ 本文件同一次 commit
BASE: perf-opt-root-1 @ 23f0880a（其基 refactor-integration @ c348f6af）
CLONE: C:\Users\Admin\Documents\GitHub\xl-example-set\perf-opt-root-2

## 做了什么

### 1. 测量工具（新增，只解析计时）
`tests/bench/parse-corpus.mjs` —— 以 `SourceFileRunner.Parse` 逐文件解析并计时：
`--build` / `--roots`（默认 `typescript/cases,tests/cases,samples`）/ `--repeat`，逐文件 try/catch（基线版在
52 个语料文件上抛错，不 catch 会把整轮测量打断）。语料 **4548 个 `.ts` / 3.78 MB**，与
`buffer-equivalence` 的 4556 份同一批（差 8 份为 `.d.ts` 采样）。
它把 XML 序列化与 digest 排除掉，才能把「解析」这一侧单独量出来；`buffer-equivalence` 的
「解析耗时」仍是与 root-1 对比的官方口径。

### 2. 复现（修前，静默，本机无其它 agent）
- 8 dts：new 511.9 / base 535.2 = **0.956×**（复现 root-1 的 0.970×）。
- `.ts` 语料（`buffer-equivalence --mode both --base ..\baseline-build\build --new build --dts 4 --quiet`）：
  基线 3618.4 / 实验 5347.6 = **1.478×**（root-1 记的 1.56× 同量级）。

### 3. 归因（本轮关键：两侧**分开进程** profile，不再混样）
修前 new 侧（只用 `parse-corpus.mjs`，无 XML/digest 噪声）positionTicks top：

| 行 | 函数 | 占比 |
|---|---|---|
| class-declaration-shape.js:169 | `BuildFromCode` | 6.75% |
| root-item-rule.js:75 | `Analyze` | 6.18% |
| source-file-tail-builder.js:330 | `BuildTrailingDeclaration` | 5.39% |
| class-declaration-shape.js:112 | `FromUnits` | 4.20% |
| root-item-rule.js:744 | `BuildByKind` | 3.34% |
| class-declaration-shape.js:150 | `BuildFromUnits` | 2.98% |
| root-item-rule.js:623 | `HasTailNew` | 1.30% |

**类族合计 14.0%**，而同一份 profile 里 `type-alias` / `enum` / `function` 都在 1% 以下。
⇒ `.ts` 上确实还有与 kind 4 同源的「试探异常风暴」，但主角是 **kind 3（class）**，不是 enum/function：
`BuildFromCode` 的采样落在**函数入口行**（V8 对未优化/异常返回的帧按首行记 tick），配合同族的
`FromUnits`/`BuildFromUnits` 每次调用都做一次 `[start..tokenIndex]` 的 O(n) 复制
（`BuildByKind` 在 `Analyze` 里按**每个候选格**试探调用）→ 每个中间格一次 O(n) 复制 + 一次 `throw`。

### 4. 守卫（等价变换：只把「抛 → catch → null」提前成「return null」）
`typescript/tokens/items/root-item-rule.xl.md` 新增两个私有助手，按 build 产物同在 `RootItemRule` 类内：

- `QuickRejectBraceBody(host, start, end, minHead)`：`[start,end]` 末个非 trivia 单元必须是 `{` 括号，
  且区间内至少 `minHead` 个非 trivia 单元。
- `QuickRejectFewerThan(host, start, end, minCount)`：区间内非 trivia 单元数 ≥ `minCount`（数到 `minCount` 即停）。

接到三个 kind 分支（判据逐条对齐对应 `BuildFromCode` 的 throw 分支）：

| kind | 形状 | 守卫 | 同源 throw |
|---|---|---|---|
| 3 | class | `QuickRejectBraceBody(…, 3)` | `类声明的类体不是花括号`（L302）、`类声明不完整`（L229/L253）、`class declaration requires a name`（L249） |
| 5 | enum | `QuickRejectBraceBody(…, 3)` | `枚举声明的枚举体不是花括号`（L163）、`枚举声明不完整`/`缺少名字`/`缺少枚举体`（L142/L150/L158） |
| 8 | type-alias | `QuickRejectFewerThan(…, 4)` | `类型别名声明不完整`（L110 `code.length < 4` / L174） |

**为什么等价**：三条判据在对应 `BuildFromCode` 里违反时**必然 throw**，而 `BuildByKind` 外层就是
`try { … } catch { return null; }`，所以「提前 return null」与原来的「抛→catch→null」结果逐位相同；
没有被守卫拦掉的调用一律原样进 `FromUnits`。全量 AST（6167）与 226 份 real-dts 逐节点一致可佐证。

**未做**：kind 6（function）/ kind 7（module）的同类守卫。两者的收口允许 ambient 形态（无函数体、
无分号、以返回类型收口），「末单元必须是 `{` 或 `;`」对 ambient 不成立；要做必须逐分支复刻
ambient 口径（`function-declaration-shape.js` L175–L212 / `module-declaration-shape.js` L118–L139），
本轮为控风险不做。

## 性能读数（静默；每项多轮取中位）

### 8 dts — `node .\tests\bench\parse-perf.mjs --dts 8 --repeat 5`
| 侧 | 轮次 | 中位 |
|---|---|---|
| new | 530.942 / 552.152 / 538.937 | **538.937 ms** |
| base（在 `..\baseline-build` 内跑同脚本） | 551.578 | **551.578 ms** |

**new/base = 0.977×**（目标 ≤1.0 达标）。root-1 同口径 511.0/527.0 = 0.970×，两侧都在 ±5% 波动带内。

### 4556 份 `.ts` 语料 — 官方口径 `buffer-equivalence --mode both --base ..\baseline-build\build --new build --dts 4 --quiet`
| | 基线 | 实验 | 比值 |
|---|---|---|---|
| 本轮**修前**（同会话） | 3618.4 ms | 5347.6 ms | **1.478×** |
| 本轮**修后** | 3605.8 ms | 4909.1 ms | **1.362×** |

实验侧 −8.2%；对比 root-1 的 1.56× 已明显收敛，但**未到 1.05**。

### `parse-corpus.mjs`（只解析，4548 文件，3 轮）
| | new 中位 | base 中位 | 比值 |
|---|---|---|---|
| 修前 | 3893.8（单轮） | 1815.0 | 2.145× |
| 修后 | **3222.7**（3173.6 / 3222.7 / 3317.6） | **2088.5**（2088.5 / 1833.1 / 2114.6） | **1.543×** |

new 自身 **−17.2%**。注意基线在这批语料上 **52 个文件解析抛错**（提前中断，计时偏低），
所以这一列比值系统性偏大；与 root-1 对比请用上面的 buffer-equivalence 口径。

### profile 前后（new 侧，只解析）
| 项 | 修前 | 修后 |
|---|---|---|
| 类族合计 | 14.0% | **4.3%** |
| `BuildFromCode` | 6.75% | 1.62% |
| `FromUnits`(class) | 4.20% | 1.57% |
| `BuildFromUnits`(class) | 2.98% | 1.12% |

修后 new 侧 top：`Analyze` 6.17%、`BuildTrailingDeclaration` 5.84%、`Transit`(basic-dispatch) 5.16%、
`ParsePrimary` 5.03%、`BuildByKind` 3.61%、`HasTailNew` 1.51%。

## 门禁读数（本分支实测）
| 项 | 结果 | 判定 |
|---|---|---|
| xl_build | 870 文件，本轮 1 written / 869 skipped，0 error / 2400 warning | PASS |
| xl_check | 870 文件，**0 error** / 2400 warning（基线同） | PASS |
| tsc | exit 0 | PASS |
| AST 全量 | 6167/6167 cj-ok | PASS |
| AST diff 全量 | 6167/6167；结构 0 / 位置 0 / 字段 0 | PASS |
| real-dts | 226 解析成功 / 崩溃 0 / AST 一致 226 | PASS |
| quick | PASS 5.6 s | PASS |
| standard | PASS 10.7 s（`tests/gates/run.mjs` 基线已知红 1/8） | PASS |
| batch-split | PASS 70 段 / 837 断言 / 0 失败 | 不回归 |
| item-oracle | PASS（454 前缀逐前缀一致） | 不回归 |
| stream-proof | PASS 146 / FAIL 0 | 不回归 |
| buffer（waived） | xml PASS 4484 / FAIL 16 / ERROR 52；digest PASS 4380 / FAIL 120 / ERROR 52 | 与 root-1 逐位相同（WP-3 既有差异，按指示只记录） |

## 剩余热点与「为什么 1.05 没到」
1. **不是异常风暴了**：修后与 root 接线相关的可攻点合计约 17%（`Analyze` 6.2 + 尾构建 5.8 +
   `BuildByKind` 3.6 + `HasTailNew` 1.5）。**即使全部消掉**，按当前分摊也只能到约 1.13×，
   所以 ≤1.05 必须做**结构性改动**，不是再加守卫能到的。
2. `Analyze`（root-item-rule.js:75）6.2%：while 每格更新候选集并试探建一次。彻底解法是把
   「每格一次 `BuildByKind`」换成「先算形态右界、再只建一次」——会动收口顺序，风险高，需独立一轮。
3. `BuildTrailingDeclaration`（source-file-tail-builder.js:330）5.84% vs 基线同函数 1.33%：
   尾巴逐段重建，是 `.ts`（大量短语句）小文件固定成本的主项。
4. `ParsePrimary` / `BuildExpressionRange` 高于基线（5.03% vs 1.33% / 2.90%）：kind 9 的
   `BuildStatement` 兜底在每格重解表达式（`BuildStatement` 自身 1.80%）。
5. `HasTailNew`（:623）1.51%：仍建议改文件级反向扫描表（本轮未做，机械改动、收益 ~1 pp）。

## 下一步的精确命令
```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name perf-opt-root-3 -From perf-opt-root-2 -Base perf-opt-root-2
cd perf-opt-root-3
# 1) kind 6/7 守卫：先读 function-declaration-shape 的 ambient 分支（L160-L215）与
#    module-declaration-shape 的 L110-L145，把「末单元」判据按 ambient 口径补全
# 2) HasTailNew -> 文件级反向扫描表（只读 SourceRange，O(1)/次）
# 3) 大头在 Analyze（6.2%）与尾构建（5.8%）：先做「每格一次 BuildByKind -> 形态右界预判」的试验分支
node .\tests\bench\parse-corpus.mjs --build build --repeat 3
node .\tests\bench\parse-corpus.mjs --build ..\baseline-build\build --repeat 3
node .\tests\bench\buffer-equivalence.mjs --mode both --base ..\baseline-build\build --new build --dts 4 --quiet
node .\tests\bench\parse-perf.mjs --dts 8 --repeat 5
```

## 踩过的坑（本轮新增）
- **必须两侧分开进程 profile**：同一进程同时跑 base 与 new（如 `buffer-equivalence --mode both`
  加 `--cpu-prof`）时，两侧文件名都含 `build/ts/`，按路径归一后**无法区分**，会把基线的采样算到
  优化侧头上（本轮第一版汇总因此给出错误的 14% 归因）。用 `parse-corpus.mjs --build <侧>` 各跑一次。
- `.NET` 的 `[IO.File]::ReadAllText` 用**进程启动目录**而不是 PowerShell 的 `cd`；改 `.xl.md` 的脚本
  必须传绝对路径，否则会去读源仓库同名路径并静默失败（`$t` 变成 `$null`，后续 replace 全空转）。
- `positionTicks` 对「抛异常返回」的函数把采样记在**函数首行**，不要以为首行有重活；
  要看同一函数在 base 侧的占比做对照，才知道是异常路径还是算法问题。
- `parse-perf.mjs` 没有 `--build` 参数；跑 base 要在 `..\baseline-build` 目录里跑它自己的脚本（哈希一致）。

## 阻塞点
无。未 merge、未 push。
