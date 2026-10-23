# opt/base-v2：O1 + O2 合并基座复核（task-21）

独立合并者复核：**自己跑**全部读数，不照抄 O1 / O2 作者的数字。

| 项 | 值 |
| --- | --- |
| 基座 | `perf/buffer-analysis` @ `1dd7ce7f`（含 `tests/bench/*` perf 探针） |
| 合并 1 | `origin/opt/whole` @ `f712f22a`（O1：`Document.WholeRange` 缓存）→ merge `055d4741` |
| 合并 2 | `origin/opt/char-pass` @ `50cd9fdb`（O2：`BranchTransiter` 第五参 `value` 顺链）→ merge `93d83bad` |
| 产物分支 | `opt/base-v2` |
| 克隆目录 | `xl-example-set/opt-merge-ab`（从主仓本地路径克隆，`origin` 即主仓；`node_modules` 从主仓复制，不入库） |
| 结论 | **V2-MERGE DONE**：两次 `--no-ff` 合并**零冲突**、重建 0 error、等价 0 FAIL / 0 ERROR、六道门禁全绿；A/B 两轮 **+6.14% / +4.90%**（逐文件中位之和）、**+5.87% / +3.28%**（每轮合计中位），8/8 文件在两轮里都是正收益 |

---

## 1. 合并顺序与落点

```
1dd7ce7f  perf/buffer-analysis（基座）
   ├─ 055d4741  merge --no-ff origin/opt/whole        （O1，3 文件 +264/−1）
   └─ 93d83bad  merge --no-ff origin/opt/char-pass    （O2，18 文件 +238/−33）
```

* 两次合并都是 `ort` 策略**自动完成，无冲突、无手工介入**。
* 互补性来自改动面不重叠：O1 只碰 `core/syntax/document.xl.md` + `core/syntax/source-range.xl.md`；
  O2 碰 `branch-transiter` / `token` / `unit-token` / `templates/template` 与 13 个 `basic-tokens/*`。
  两边唯一的公共文件是各自新增的 `docs/opt-*.md`，互不相干。
* **产物落地已核对**（不是"合进源码就算数"）：
  * `build/ts/core/syntax/document.js` 有 `WholeRange = null` 字段槽；
  * `build/ts/core/syntax/unit-token.js` 有 `const value = buffer.At(index);` 与 `item(context, this, buffer, index, value)` 五参调用。
* 顺序沿用任务指定的 O1 → O2。二者语义正交（一个省"分配"，一个省"重复读"），顺序对结果无影响；
  按 O1 在前合并的实际好处是：O2 的 13 个 basic-token 改动落在 O1 之后，diff 干净、review 更容易。

## 2. 重建

| 步骤 | 命令（cwd = `opt-merge-ab`） | 结果 |
| --- | --- | --- |
| 基线构建 | `xl_build paths=core,typescript targets=ts` @ `1dd7ce7f` | 871 written，**0 error**，2440 warning |
| 基线 tsc | `node_modules\.bin\tsc.cmd -p tsconfig.json` | **0 error**，871 个 js |
| 基线快照 | `Copy-Item -Recurse build build-base` | `build-base`（gitignored） |
| 合并后构建 | `xl_build` | 18 written / 853 skipped（增量指纹命中），**0 error** |
| 合并后 tsc | `tsc -p tsconfig.json` | **0 error** |
| 静态检查 | `xl_check paths=core,typescript` | **0 error**，4 warning（E1107 重名类型，见下） |

`xl_check` 的 4 条 E1107（`ImportAttributesPossibleShape`、`GetAccessorPossibleShape`、
`IndexSignaturePossibleShape`、`SetAccessorPossibleShape` 各有一份重名声明）**与本次合并无关**：
它们全在 `typescript/tokens/**` 下，而两次合并对该目录**零改动**，故属基座既有告警。
（`xl_check` 的 2440 条 W3102/W3103 是 `# namespace` / member 无描述的既有噪声，一并以 `ignore` 滤掉，
本页只对 error 下结论。）

## 3. 等价复核

```
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
```

| 通道 | PASS | FAIL | ERROR | 两版抛同一错误 |
| --- | --- | --- | --- | --- |
| XML 序列化 | **4504** | **0** | **0** | 52 |
| digest（token 指纹） | **4504** | **0** | **0** | 52 |

* 语料 **4556** 个文件 / 7,837,812 字符（`typescript/cases/*`、`tests/cases/**`、`node_modules/typescript/lib/*.d.ts` 全量）。
* XML 字节数：基线 **34,109,694** = 实验 **34,109,694**（逐字节相等）；
  digest 总数：基线 **797,790** = 实验 **797,790**。
* 结论：**等价成立**。O1 与 O2 都只改"怎么取"，没改"取到什么"。
* 手法说明：等价脚本是同进程**顺序**跑两版（基线 5663 ms / 实验 6019.3 ms），
  这一条读数**不作为性能证据**——顺序单发在进程间本来就有 ±5% 级漂移（见 O1 文档 §7.4），
  性能只认下面同进程交替的 `buffer-ab`。

## 4. 门禁（六道，全绿）

| 门禁 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| 用例校验 | `node tests/parse/validate.mjs` | **1719 条 / 0 不合格** | PASS |
| AST 快照 | `node typescript/cases/ast-json.mjs` | total **6167**，cj-ok **6167**，cj-fail **0**（47 构造） | PASS |
| AST 逐节点对比 | `node typescript/cases/ast-json-diff.mjs` | 完全一致 **6167 / 6167**；结构差 0、**位置差 0**、字段差 0 | PASS |
| 真实 .d.ts | `node typescript/cases/real-dts-ast.mjs` | 文件 **226**（跳过 TS 非法 0）；解析成功 **226**、崩溃 **0**；AST 一致 **226**、有差异 **0** | PASS |
| token AST | `node typescript/cases/token-ast.mjs` | total **1715**、ok **1705**、crash **0**、diff **0**、ts-invalid **10**、known-gap **0** | PASS |
| body-guide | `node tests/body-guide/harness.mjs --all` | **109 / 109**（interface 35 + generic-boundary 25 + member-start 23 + recovery 16 + util 10），fail 0 | PASS |

与两位作者各自的读数逐项一致——这些门禁本来就是确定性的，一致只是必要条件，
真正的复核价值在"我在合并后的树上重跑过"。

## 5. 性能：同进程交替 A/B（repeat 7，warmup 1）

```
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7
```

### 5.1 第一轮

| 文件 | bytes | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 2349483 | 710.959 | 673.690 | −37.269 | **5.24** |
| lib.webworker.d.ts | 787076 | 299.654 | 268.651 | −31.004 | **10.35** |
| typescript.d.ts | 588452 | 297.493 | 287.617 | −9.876 | **3.32** |
| lib.es5.d.ts | 218972 | 62.327 | 56.671 | −5.656 | **9.08** |
| lib.es2023.array.d.ts | 40197 | 9.311 | 8.443 | −0.868 | **9.32** |
| lib.es2020.bigint.d.ts | 38258 | 10.071 | 9.358 | −0.713 | **7.08** |
| lib.es2015.core.d.ts | 22824 | 6.118 | 5.571 | −0.548 | **8.95** |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 4.117 | 4.027 | −0.090 | **2.18** |
| **TOTAL（逐文件中位之和）** | | **1400.051** | **1314.027** | **−86.024** | **6.14%** |
| **TOTAL（每轮合计的中位）** | | **1404.483** | **1322.015** | **−82.467** | **5.87%** |

每轮合计样本：基线 `[1440.3, 1404.5, 1427, 1374.1, 1386.8, 1346.4, 1467]`，
实验 `[1381.5, 1314.8, 1321.8, 1332.9, 1322, 1288.3, 1384.4]`；稳定性：两口径基线差 4.4 ms、实验差 8 ms。

### 5.2 第二轮（同命令原地复跑，检验可重复性）

| 文件 | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 731.933 | 704.606 | −27.327 | **3.73** |
| lib.webworker.d.ts | 284.484 | 268.052 | −16.432 | **5.78** |
| typescript.d.ts | 299.985 | 284.290 | −15.695 | **5.23** |
| lib.es5.d.ts | 62.362 | 53.872 | −8.490 | **13.61** |
| lib.es2023.array.d.ts | 8.561 | 8.323 | −0.238 | **2.78** |
| lib.es2020.bigint.d.ts | 9.704 | 9.192 | −0.512 | **5.28** |
| lib.es2015.core.d.ts | 5.631 | 5.585 | −0.046 | **0.82** |
| lib.es2015.symbol.wellknown.d.ts | 4.246 | 3.986 | −0.260 | **6.12** |
| **TOTAL（逐文件中位之和）** | **1406.907** | **1337.906** | **−69.000** | **4.90%** |
| **TOTAL（每轮合计的中位）** | **1391.026** | **1345.341** | **−45.686** | **3.28%** |

每轮合计样本：基线 `[1453.4, 1419.8, 1419.9, 1391, 1364.8, 1388.3, 1348.3]`，
实验 `[1482.6, 1389.3, 1345.3, 1354.1, 1341.9, 1287.7, 1283.4]`；稳定性：基线差 15.9 ms、实验差 7.4 ms。

### 5.3 单跑基线读数（供对照）

```
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```

8 份 d.ts 合计 4,056,233 B，墙钟 5776.228 ms，**TOTAL median 1394.471 ms**
（dom 729.513 / webworker 282.521 / typescript.d.ts 298.572 / es5 56.131 /
es2023.array 8.015 / es2020.bigint 9.717 / es2015.core 5.459 / es2015.symbol 4.543）。
这是合并后树的**绝对读数**，不与 `build-base` 比较（`parse-perf` 没有 A/B 口径）。

## 6. 与 O2 作者读数的对照

| 口径 | O2 作者（`opt/char-pass` 单独） | 本页（O1+O2 合并）第一轮 | 本页第二轮 | 两轮均值 |
| --- | ---: | ---: | ---: | ---: |
| TOTAL（逐文件中位之和） | 1502.341 → 1445.976，**+3.75%** | **+6.14%** | **+4.90%** | **+5.52%** |
| TOTAL（每轮合计的中位） | 1515.203 → 1454.353，**+4.02%** | **+5.87%** | **+3.28%** | **+4.58%** |
| 逐文件正收益数 | 7/8（`lib.es5` −4.5%） | **8/8** | **8/8** | **16/16** |

**怎么读这三个表：**

1. **方向与量级一致，不是新结论**：合并后的提升落在 O2 作者给的 +3.75~4.02% 之上 1~2 个百分点，
   两轮均值 +5.52% / +4.58%。**这 1~2pp 不能当成"O1 又赚了 2%"**——O1 作者自己测的同进程 A/B
   是 −1.4%~+0.6%（纯噪声量级，并明确"不宣称墙钟提升"），而 1~2pp 恰好也落在文档里写明的
   ±2% 噪声带内。可辩护的说法只有："合并后没有回退，且不劣于 O2 单独"。
2. **真正稳的信号是逐文件方向**：两轮共 16 个文件级读数**全部为正**（最小 +0.82%，最大 +13.61%），
   而 O2 单独时 `lib.es5` 是 −4.5%、O1 单独时 `lib.es5` 是 +12.1%（同属抖动）。方向一致性比单个 TOTAL 百分比更可信。
3. **基座绝对值的机器差异**：O2 作者的基线 TOTAL 是 1502.341 ms，本页基线是 1400.051 / 1406.907 ms
   （同一台机器、不同会话，热状态不同）。所以**只能比 Δ%，不能比绝对毫秒**。
4. **两个汇总口径会分开**：第一轮 6.14% vs 5.87%（差 0.27pp），第二轮 4.90% vs 3.28%（差 1.62pp）。
   第二轮两口径分歧更大，说明该轮基线样本本身在漂移（基线样本从 1453.4 一路降到 1348.3）——
   这正是 `buffer-ab` 头部写的"两个口径都要看、取同向保守值"的原因。**保守结论：合并基座相对基座
   ≈ **+3.3% ~ +6.1%**，中位 ≈ +4.9%（逐文件口径）/ +4.6%（每轮口径）。**

## 7. 保留下来的已知风险（合并带来的，不是回退）

| 风险 | 说明 | 现状 |
| --- | --- | --- |
| 共享只读视图 | O1 让 `SourceRange.Whole(doc)` 返回**同一实例**；任何调用方若改写它的 `Start`/`End` 会污染全进程 | 现行代码无写入者；`document.xl.md` 与 `source-range.xl.md` 都已写明"共享只读视图，不得改写"。属**契约型约束，靠 review 守** |
| `value` 第五参的一致性 | O2 把"当前字符"从每个 Transit 各自 `buffer.At(index)` 改为调度层读一次顺链传下；任何**新写的** `BranchTransiter` 若仍去 `buffer.At(index)` 只会退化性能，不会错 | 13 个 basic-token 实现点已全部改到位；`branch-transiter.xl.md` 已把"不要为当前字符再读一遍"写成条款 |
| 两处"前探/回看"仍用 `buffer.At` | O2 只消掉"当前字符"的重复读，`index ± k` 仍要读 buffer | 设计边界，非缺陷；后续若还要压热路径，这是下一处 |

## 8. 复现清单

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" opt-merge-ab
cd opt-merge-ab
git checkout perf/buffer-analysis; git checkout -b opt/base-v2
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
# 基线
xl_build paths=core,typescript targets=ts
node_modules\.bin\tsc.cmd -p tsconfig.json
Copy-Item -Recurse build build-base
# 合并（零冲突）
git fetch origin
git merge --no-ff origin/opt/whole
git merge --no-ff origin/opt/char-pass
# 重建
xl_build paths=core,typescript targets=ts
node_modules\.bin\tsc.cmd -p tsconfig.json
xl_check paths=core,typescript
# 复核
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs
node tests/body-guide/harness.mjs --all
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```

`build/`、`build-base/`、`dist/`、`.xl/`、`node_modules/`、`tmp/` 均在 `.gitignore` 内，不入库。
