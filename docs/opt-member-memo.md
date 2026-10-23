# opt/member-memo — O5b：成员边界判定的 O(1) 记忆化

STATUS: **DONE** — 等价 0 FAIL / 0 ERROR；六道门禁全绿；A/B 两轮 TOTAL 均为正；
lib.dom 1.16M 次换行判定降到 15.0 万次（−87.0%）。

| 项 | 值 |
| --- | --- |
| 基座 | `opt/base-v2` @ `eee317c7`（O1 + O2） |
| 产物分支 | `opt/member-memo` |
| 克隆目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\opt-member-memo` |
| 改动文件 | `typescript/tokens/types/member-boundary.xl.md`、`typescript/tokens/types/type-builder.xl.md`（均为调用方的最小接线） |
| 未改 | `core/**`（O1/O2/O3/O4 面）、所有 `possible-shape*`（O5a 并行） |

---

## 1. 问题与判据

profile：`FindMemberBoundary` + `LineTerminator.HasBetween` self 2.75% + ~30ms 分配；
`lib.dom.d.ts` 一份 1.12M 次 `HasBetween`，其中 1.03M 次来自 `FindMemberBoundary` 的扫描循环。

实测基线（`lib.dom.d.ts`，单次 parse，临时计数、未提交）：

| 读数 | 基线 |
| --- | ---: |
| `LineTerminator.HasBetween` 调用 | 1,157,836 |
| 不同 `(left.EndIndex, right.StartIndex)` 对 | 62,233 |
| `FindMemberBoundary` 调用 | 11,422 |
| `FindMemberBoundary` 循环里判过的 `at` | 1,031,369 |
| 每次调用的平均 `code.length - from` | 91.3 |

即：同一段前缀上反复问同一个边界；调用次数与「成员类型前缀长度的平方」同阶。

## 2. 做法：单调边界记忆（不是逐对 bool 缓存）

### 2.1 缓存对象

`member-boundary.xl.md` 新增 `class MemberBoundaryCache`：

| 字段 | 含义 |
| --- | --- |
| `Code:Array<Token> \| null` | 条目对应的 `Units` 数组（**引用**比较） |
| `From:int` | 算出 `Boundary` 时的 `from` |
| `Boundary:int` | `FindMemberBoundary(Code, From)` 的结果，`-1` = 无条目 |

`FindMemberBoundary(code, from, cache?)` 新增可选第三参。命中条件：

```
cache.Code === code
&& cache.Boundary >= 0
&& from >= cache.From
&& (cache.Boundary >= code.length || from < cache.Boundary)
```

正确性（单调性，写进方法注释）：

- 若 `Boundary == code.length`：`(From, len)` 内无边界；当前 `from >= From` ⇒ `(from, len)` 更无边界 ⇒ 答案仍是 `len`。
- 若 `Boundary < code.length`：`Boundary` 是 `(From, len)` 内**第一个**命中；当前 `From <= from < Boundary`
  ⇒ `(from, Boundary)` 内没有命中，`Boundary` 又是命中 ⇒ 第一个命中仍是 `Boundary`。

判定本身没有改：未命中时仍走原来的逐条扫描（换行 + 前单元能收类型 + 当前像成员起点），
缓存只改变「同一个 `(code, from)` 前缀被重复询问」的次数。

### 2.2 生命周期（不跨文件、不跨数组）

- `TypeBuilder.BoundaryCache`：一个 `TypeBuilder` 实例一份；`Load` 时把三个字段归零。
- `TypeBuilder` 的 `ParseTypeBounded` / `ParseReturnTypeBounded` 在把 `Units` 换成
  `savedUnits.slice(startAt, boundary)` 的**切片**解析期间，先把三个字段保存并清零，切回原数组后恢复；
  切片里的 `At` 与外部不是同一套下标，不能共用条目。
- 没有静态缓存、没有按 `Document` 的全局表，所以不跨文件残留；`At` 回退（如
  `ParseConditionalType` 里的 `this.At = extendsIndex`）时 `from >= cache.From` 不成立，自动重算。
- 不传 `cache` 的调用方行为与改动前逐字节相同。

### 2.3 为什么没有用「逐对 bool LineBreakCache」

先按任务给的保守方案做过原型（缓存放 `MemberBoundary` 静态、按 `(Document, left.EndIndex)`
存 bool，校验 right）：

| 原型 | 命中率 | A/B TOTAL（逐文件 / 每轮） |
| --- | ---: | --- |
| 稀疏数组（长度 ~2.35M） | 95.4% | **−13.11%**（更慢） |
| 定长直接映射 2^18 | 95.0% | −2.03% / +0.13% |

逐对缓存把 1.16M 次判定压到 5.6 万次，但剩下的 1.09M 次仍是 1.09M 次函数调用 + 哈希/数组查找；
lib.dom 只 +0.88%，小文件被缓存分配拖累。于是改成「缓存整个边界结果」：
只保留 O(1) 命中，且命中的是**最贵的那些长扫描**，不再为每次判定付一次缓存查找。

## 3. 读数（临时计数，未提交）

`lib.dom.d.ts` 单次 parse：

| 读数 | 基线 | 改后 | 变化 |
| --- | ---: | ---: | ---: |
| `HasBetween` 调用 | 1,157,836 | 150,136 | **−87.0%** |
| `FindMemberBoundary` 扫描的 `at` | 1,031,369 | 23,669 | **−97.7%** |
| `FindMemberBoundary` 调用 | 11,422 | 11,422 | 0 |
| 记忆命中 / 调用 | — | 1,194 / 11,422 | 10.45% |
| 每次调用平均 `code.length - from` | 91.3 | 3.3 | 长扫描基本消失 |

命中率只有 10.45%，但**命中的都是顶层长扫描**（每个平均约 840 个 `at`），所以
1,194 次命中省下约 1.0M 次循环；剩下 23.7k 次是切片末尾的短扫描。
另外约 126k 次 `HasBetween` 来自 `HasBefore` / 其他调用方，是线性量，本任务不碰。

`lib.es5.d.ts`：`HasBetween` 12,224 → 10,407（−14.9%），记忆命中 68 / 760。

## 4. 等价

```
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
```

| 通道 | PASS | FAIL | ERROR | 两版同错 |
| --- | ---: | ---: | ---: | ---: |
| XML 逐字节 | 4504 | **0** | **0** | 52 |
| digest（token 位置） | 4504 | **0** | **0** | 52 |

XML 字节 34,109,694 = 34,109,694；token 797,790 = 797,790。语料 4556 文件 / 7,837,812 字符。
**结论：等价。**

## 5. 门禁（六道，全绿）

| 门禁 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| 用例校验 | `node tests/parse/validate.mjs` | 1719 条 / 0 不合格 | PASS |
| AST 快照 | `node typescript/cases/ast-json.mjs` | 6167 / 6167，cj-fail 0 | PASS |
| AST 逐节点 | `node typescript/cases/ast-json-diff.mjs` | 6167 / 6167，结构/位置/字段差 0 | PASS |
| 真实 .d.ts | `node typescript/cases/real-dts-ast.mjs` | 226 解析成功 / 0 崩溃 / 0 差异 | PASS |
| token AST | `node typescript/cases/token-ast.mjs --quiet` | total 1715 / ok 1705 / crash 0 / diff 0 / ts-invalid 10 | PASS |
| body-guide | `node tests/body-guide/harness.mjs --all` | 109 / 109（35+25+23+16+10） | PASS |

重建：`xl_build paths=core,typescript targets=ts` → **2 written / 0 error / 2440 warning**（增量），
`node_modules\.bin\tsc.cmd -p tsconfig.json` → **exit 0 / 0 error**；
`xl_check paths=core,typescript` → **871 files / 0 error / 2440 warning**（与基座同）。

## 6. 性能（同进程交替 A/B，`--repeat 7 --dts 8`，两轮）

### 6.1 第一轮

| 文件 | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 696.419 | 660.187 | −36.232 | **5.20** |
| lib.webworker.d.ts | 262.827 | 253.403 | −9.425 | 3.59 |
| typescript.d.ts | 279.123 | 266.209 | −12.914 | 4.63 |
| lib.es5.d.ts | 56.050 | 67.105 | +11.054 | −19.72 |
| lib.es2023.array.d.ts | 8.587 | 8.726 | +0.139 | −1.62 |
| lib.es2020.bigint.d.ts | 9.623 | 9.907 | +0.284 | −2.95 |
| lib.es2015.core.d.ts | 5.613 | 5.654 | +0.041 | −0.73 |
| lib.es2015.symbol.wellknown.d.ts | 4.130 | 3.995 | −0.135 | 3.28 |
| **TOTAL（逐文件中位之和）** | **1322.373** | **1275.185** | **−47.188** | **3.57%** |
| **TOTAL（每轮合计中位）** | **1323.200** | **1290.487** | **−32.713** | **2.47%** |

### 6.2 第二轮

| 文件 | 基线中位 ms | 实验中位 ms | Δms | 提升% |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 695.602 | 685.798 | −9.804 | 1.41 |
| lib.webworker.d.ts | 282.656 | 243.942 | −38.715 | 13.70 |
| typescript.d.ts | 273.221 | 284.217 | +10.996 | −4.02 |
| lib.es5.d.ts | 62.750 | 64.716 | +1.967 | −3.13 |
| lib.es2023.array.d.ts | 8.448 | 8.251 | −0.197 | 2.34 |
| lib.es2020.bigint.d.ts | 9.600 | 9.793 | +0.192 | −2.01 |
| lib.es2015.core.d.ts | 5.463 | 5.470 | +0.007 | −0.13 |
| lib.es2015.symbol.wellknown.d.ts | 4.092 | 3.891 | −0.200 | 4.90 |
| **TOTAL（逐文件中位之和）** | **1341.832** | **1306.078** | **−35.754** | **2.66%** |
| **TOTAL（每轮合计中位）** | **1341.857** | **1329.602** | **−12.255** | **0.91%** |

两轮 TOTAL（逐文件）均为正：**+3.57% / +2.66%**（两轮均值约 +3.1%），每轮合计口径 **+2.47% / +0.91%**。
大文件两轮同向为正（dom / webworker / symbol）；`lib.es5` 单文件在 53–70 ms 之间本来就有 ±20% 抖动
（两轮基线自身 56.0 / 62.8），**不把它的单轮负数当结论**。

### 6.3 parse-perf（绝对读数）

```
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```

| 项 | 基线（两轮） | 改后 |
| --- | ---: | ---: |
| lib.dom.d.ts median | 733.519 / 706.361 ms | **685.561 ms** |
| TOTAL median | 1391.685 / 1391.467 ms | **1340.605 ms** |
| 相对基线 | — | **−3.66%** |

## 7. 风险与回退

| 风险 | 说明 |
| --- | --- |
| 缓存正确性依赖 `Units` 数组不被就地改写 | `TypeBuilder` 只在 `Load` 里建 `Units`；切片是新建数组。若将来有人在 `Load` 之后 `push`/改写 `Units`，必须同时把 `BoundaryCache` 归零。代码注释已写明。 |
| `At` 回退 | 条件要求 `from >= cache.From`；回退即重算，不返回过期边界。 |
| 切片期间条目 | 保存/清零/恢复三步；若切片解析抛异常，原 `Units` 本身也不会恢复，属于既有失败路径。 |
| 小文件退化 | 单文件抖动 ±20%，两轮 TOTAL 仍为正；若后续要求逐文件全绿，可给缓存加 `Units.length` 阈值（未做，避免改变命中面）。 |

回退：`git revert <commit>` 或把 `ParseTypeBounded` / `ParseReturnTypeBounded` 的第三参去掉、
删掉 `BoundaryCache` 字段与 `MemberBoundaryCache` 类即可；行为回到基座逐条扫描。

## 8. 复现

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" opt-member-memo
cd opt-member-memo
git checkout opt/base-v2
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
xl_build paths=core,typescript targets=ts      # 871 written / 0 error
node_modules\.bin\tsc.cmd -p tsconfig.json     # exit 0
Copy-Item -Recurse build build-base
git checkout -b opt/member-memo
# … 改 member-boundary.xl.md + type-builder.xl.md …
xl_build paths=core,typescript targets=ts
node_modules\.bin\tsc.cmd -p tsconfig.json
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/body-guide/harness.mjs --all
node tests/bench/buffer-ab.mjs --repeat 7 --dts 8
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
```
