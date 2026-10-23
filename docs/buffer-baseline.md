# buffer-baseline — buffer 改造验收基线（读数 / 等价工具 / 性能基准）

本文件是 BUFFER-CORE CONTRACT §0 的**对照基准**：后续 buffer 改造分支（半开
`SourceRange`、`Source` 删除、buffer 窗口驱动）验收时，7 项门禁读数不得低于本文件，
XML 产出必须与本分支逐字节一致，`parse-perf` / `buffer-ab` 的 TOTAL 必须比本文件至少快 20%。

> 本分支 `verify/buffer-baseline` 从主仓 `feature/quick-parse @ fcbf2e23` 派生，
> **只新增 docs/ 与 tests/bench/ 下的文件，未改动 core/**、typescript/** 业务源码，未修任何既有门禁脚本。**

---

## 0. 环境（读数只在这个环境下成立）

| 项 | 值 |
| --- | --- |
| 操作系统 | Microsoft Windows 10 企业版 LTSC |
| CPU | Intel(R) Xeon(R) Platinum 8378C CPU @ 2.80GHz |
| Node | v24.21.0 |
| TypeScript / tsc | 6.0.3（devDependency `typescript@^6.0.0`） |
| 基线 commit | `fcbf2e235300466a13481a38286587d200db5161`（merge: DTS-PERF 报告补充独立复验读数与 `/*/` 边界例外） |
| 基线分支 | `feature/quick-parse`（= 本分支 `verify/buffer-baseline` 的起点） |
| 工作目录 | `C:\Users\Admin\Documents\GitHub\xl-example-set\buffer-baseline`（独立 clone） |
| 实测时间窗 | 2026-10-23 13:10–13:17（Asia/Shanghai, +08:00） |
| 构建产物 | `dist/`（xl 产物）+ `build/`（tsc 产物）；`build-base/` 是 `build/` 的副本，保留给 A/B |

复现构建（本仓约定，见 BUFFER-CONTRACT §4）：

1. `xl_build`（会话工具，cwd=本 clone，`paths=["core","typescript"]`，`targets=["ts"]`）
2. `node_modules\.bin\tsc.cmd -p tsconfig.json`
3. `Copy-Item -Recurse build build-base`（`build/` 与 `build-base/` 都已被 .gitignore 忽略，不入库）

---

## 1. 构建与 xl check（门禁 1、2）

| 项 | 命令 | 读数 | 耗时 | 判定 |
| --- | --- | --- | --- | --- |
| xl_build | xl_build paths=core,typescript target=ts | **873 written / 0 error / 2447 warning**（0 skipped、0 planned） | 会话工具未提供耗时 | PASS |
| tsc | `node_modules\.bin\tsc.cmd -p tsconfig.json` | **exit 0，0 error**（无输出） | 4.3 s | PASS |
| xl check | xl_check paths=core,typescript target=ts | **873 file(s) / 0 error(s) / 2447 warning(s)** | 会话工具未提供耗时 | PASS |

- 构建产物共 873 个 `.ts`（`dist/ts/**`）→ 873 个 `.js`（`build/ts/**`）。
- warning 全部是 W3102/W3103（成员/namespace 缺描述），与代码正确性无关；验收口径是「0 error，warning 不增加」。
- 注意：`HANDOFF.md` 里 7 门禁表是 `integration/member-possible @ 33cfb647` 的读数（865 files / 2444 warning），
  与本基线（873 files / 2447 warning）不是同一棵树；**以本文件为对照基准**。

## 2. 7 项门禁实测（HANDOFF 口径）

全部命令在本 clone 根目录执行，`build/` 已按 §1 构建。

| # | 门禁 | 命令 | 可跑 | 读数 | 耗时 | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | xl check | xl_check（见 §1） | ✅ | 873 files / **0 error** / 2447 warning | — | PASS |
| 2 | xl_build + tsc | 见 §1 | ✅ | 873 written / **0 error**；tsc **exit 0** | tsc 4.3 s | PASS |
| 3 | body-guide | `node tests/body-guide/harness.mjs --all` | ✅ | **109/109 pass，0 fail，0 skipped**：cases 35/35、generic-boundary 25/25、member-start 23/23、recovery 16/16、util 10/10 | 0.6 s | PASS |
| 4 | AST 快照 + 差异 | `node typescript/cases/ast-json.mjs && node typescript/cases/ast-json-diff.mjs` | ✅ | ast-json：**6167/6167**（47 个构造，cj-ok=6167 cj-fail=0）；diff：**完全一致 6167/6167，结构差 0、位置差 0、字段差 0** | 1.9 s + 0.3 s | PASS |
| 5 | real-dts AST | `node typescript/cases/real-dts-ast.mjs` | ✅ | **226 份（跳过 TS 非法 0）：解析成功 226、崩溃 0、AST 差异 0** | 5.9 s | PASS |
| 6 | token AST | `node typescript/cases/token-ast.mjs --quiet` | ✅ | **total=1715 / ok=1705 / crash=0 / diff=0 / ts-invalid=10**；known-gap 0 | 2.0 s | PASS |
| 7 | parse validate | `node tests/parse/validate.mjs` | ✅ | **1719 条用例 / 0 条不合格** | 0.6 s | PASS |

### 2.1 另外 3 个入口（task 里「若可用」的部分）：本分支不可跑及原因

| 入口 | 命令 | 可跑 | 原因 |
| --- | --- | --- | --- |
| runtime:check | `node tests/runtime/check.mjs` | ❌ exit 1 | 依赖 `build/ts/runtime/{value,heap,gc,ir,vm,...}.js`，本分支没有 `runtime/` 源目录（`git ls-files runtime/` 为空），按契约构建 core+typescript 产不出这些产物 |
| runtime:cli | `node tests/runtime/run-cli.mjs` | ❌ exit 1 | 自检报「产物不是最新的，先跑 xl_build --force：tsrun.xl.md → 还没有产物」；本分支无 `tsrun.xl.md` |
| samples:check | `node samples/check.mjs` | ❌ exit 1 | 依赖 `build/ts/cjcli.js`，而根入口 `cjcli.xl.md` 不在 `xl_build(paths=core,typescript)` 范围内；其 import 的 `./dawn/text/*` 在本分支也不存在，根入口在当前树上不可构建 |

以上均**未修门禁本身**，只记录不可跑的原因；它们也不在 HANDOFF 的 7 门禁表内。

---

## 3. 性能基线（`parse-perf --dts 8 --repeat 3`，跑 2 遍）

命令：`node tests/bench/parse-perf.mjs --dts 8 --repeat 3`（warmup=1；每文件 4 次 parse，取后 3 次中位）。

### Run 1（2026-10-23 13:12:03–13:12:12，墙钟 8.36 s）

| 文件 | bytes | stmts | median (ms) | samples (ms) |
| --- | ---: | ---: | ---: | --- |
| lib.dom.d.ts | 2349483 | 2805 | 1084.488 | 1114.094, 1084.488, 1064.027 |
| lib.webworker.d.ts | 787076 | 1149 | 408.823 | 408.823, 402.603, 422.607 |
| typescript.d.ts | 588452 | 2 | 377.817 | 406.197, 375.122, 377.817 |
| lib.es5.d.ts | 218972 | 147 | 91.014 | 94.059, 88.089, 91.014 |
| lib.es2023.array.d.ts | 40197 | 13 | 15.396 | 15.396, 17.664, 13.501 |
| lib.es2020.bigint.d.ts | 38258 | 12 | 15.123 | 16.506, 15.02, 15.123 |
| lib.es2015.core.d.ts | 22824 | 21 | 11.366 | 8.844, 11.366, 12.796 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 33 | 7.014 | 9.227, 7.014, 5.499 |
| **TOTAL median** | 4056233 | | **2011.041** | |

### Run 2（2026-10-23 13:12:16–13:12:25，墙钟 8.34 s）

| 文件 | bytes | stmts | median (ms) | samples (ms) |
| --- | ---: | ---: | ---: | --- |
| lib.dom.d.ts | 2349483 | 2805 | 1082.450 | 1119.623, 1082.450, 1075.941 |
| lib.webworker.d.ts | 787076 | 1149 | 413.430 | 413.430, 425.000, 413.247 |
| typescript.d.ts | 588452 | 2 | 381.730 | 423.482, 381.730, 366.799 |
| lib.es5.d.ts | 218972 | 147 | 85.995 | 90.868, 83.446, 85.995 |
| lib.es2023.array.d.ts | 40197 | 13 | 13.066 | 12.870, 14.650, 13.066 |
| lib.es2020.bigint.d.ts | 38258 | 12 | 14.755 | 17.860, 14.713, 14.755 |
| lib.es2015.core.d.ts | 22824 | 21 | 8.693 | 8.693, 10.346, 8.497 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 33 | 5.563 | 5.354, 5.860, 5.563 |
| **TOTAL median** | 4056233 | | **2005.682** | |

### 两遍稳定性

- **TOTAL：2011.041 → 2005.682 ms，差 5.36 ms（0.27%）**；dom 1084.5/1082.5（差 0.19%），webworker +1.13%，typescript.d.ts +1.04%，es5 −5.5%，小文件 ±2–3 ms。
- 结论：`TOTAL median ≈ 2005–2011 ms` 作为基线；单文件重跑抖动通常在 ±5% 内（小文件绝对抖动 ±2 ms）。
- 交叉印证：§5 的 A/B 工具在同样 8 份文件、5 轮下给出的基线 TOTAL 为 **1997.476 ms**（逐文件中位之和），与 parse-perf 的 2005–2011 ms 一致。

---

## 4. 等价工具 `tests/bench/buffer-equivalence.mjs`

XML 逐字节 + **半开位置 digest** 的双通道等价验收。同进程分别加载基线 build 与实验 build，
两棵模块树互不共享状态。

### 语料（固定、顺序确定）

- `typescript/cases/**/*.ts`（50 份）
- `tests/cases/**/*.ts`（4495 份）
- `samples/*.ts`（3 份）
- `node_modules/typescript/lib` 下最大 8 份 `*.d.ts`（必需 4 份固定入选，其余按体积补足；
  与 `parse-perf --dts 8` 选的是同一批 8 份：lib.dom / lib.webworker / typescript.d.ts / lib.es5 /
  lib.es2023.array / lib.es2020.bigint / lib.es2015.core / lib.es2015.symbol.wellknown）
- 合计 **4556 份，7,837,812 字符**

### 两个通道

1. **xml（验收口径）**：每份语料用两版 `SourceFileRunner.Parse` 解析，取 `Root.ToString()`
   （= `ToXmlString`，与 cjcli 写出的 XML 同源；cjcli 的 `-o` 只额外把 `><` 拆成换行），
   转 UTF-8 字节后 `Buffer` 逐字节比较；不一致时报首个不同字节偏移与两侧上下文。
2. **digest（位置通道）**：先序遍历 token 树，每 token 一行
   `构造器名[Start,End)  Temp文本`。旧版（基线）`SourceRange.Start/End` 是 `Source`（闭区间，
   `End.Index` = 最后字符），归一为半开：`end = End.Index + 1`；新版（半开 int）原样。
   也就是「新版 End 减 1 归一后与旧版逐条相同」；XML 不含位置，位置变化只能靠这一通道看出来。
   脚本还做根范围自检：归一后根必须是 `[0, 字符数)`，否则给警告（防止归一写反）。

### 自检（baseline vs 同一份基线内容的 `build`，预期全 PASS）

命令：`node tests/bench/buffer-equivalence.mjs --mode both --quiet --json`

| 通道 | 结果 | 备注 |
| --- | --- | --- |
| xml | PASS 4504 / FAIL 0 / ERROR 0 / **同错 52** | 两侧 XML 字节各 34,109,694 B，完全相等 |
| digest | PASS 4504 / FAIL 0 / ERROR 0 / **同错 52** | 两侧 token 各 797,790 条 |
| 根范围自检 | 0 个文件不满足 `[0, 字符数)` | 归一（End+1）方向正确 |
| 耗时 | 18.2 s（解析 7678/7381 ms、XML 757 ms、digest 1077 ms） | |

「同错 52」= 两版在**整文件**解析时抛出同一异常、按同错计（XML 无从比较，单独计数）：
- 43 份在 `typescript/cases/` 下（41 份 `typescript/cases/*.ts` + 2 份 `typescript/cases/token-repros/*.ts`）：
  它们是「一行一个用例」的夹具（`ast-json.mjs` 逐行解析），整文件本身不是可解析的 TS（含故意残缺的
  恢复用例），所以整文件解析必然抛错；这 43 份的内容正确性由门禁 4（6167 条逐行 AST 对比）覆盖，
  不走 XML 通道（50 份 `typescript/cases/**/*.ts` 中另有 6 份整文件可解析，已计入 PASS）。
- 其余 9 份：`tests/cases/e2e/*`（4）、`tests/cases/runtime/*`（2）、`tests/cases/token/*`（2）、
  `samples/generic.ts`（1）。test-case / token-repros 类为刻意的非法/恢复输入；
  `samples/generic.ts` 是 cjcli（dawn 模板）的样本，`SourceFileRunner`（typescript 模板）不接受其泛型语法。

### 检测能力自检（负向用例，证明不是「空跑全 PASS」）

在 `%TEMP%` 复制一份 build 并做最小改动（不改仓库内任何文件），用 `--base build-base --new <fake>` 跑：

| 改动 | 期望 | 实测 |
| --- | --- | --- |
| 只改 `Token.ToXmlString` 输出（加一个字符） | xml FAIL、digest PASS | xml FAIL（首个不同字节 @17，1638 B vs 1676 B），digest PASS，exit 1 |
| 只改 `SyntaxContext` 根 `SignOut` 的终点（范围 −1） | digest FAIL、xml PASS | xml PASS，digest FAIL（`SourceFileShape[0,131)` vs `[0,130)`），exit 1 |

### 用法

```powershell
# 验收：两通道都跑（推荐）
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build

# 只看 XML 逐字节（验收口径本身）
node tests/bench/buffer-equivalence.mjs --base build-base --new build

# 只跑位置 digest；只跑某些文件（调试）
node tests/bench/buffer-equivalence.mjs --mode digest --base build-base --new build
node tests/bench/buffer-equivalence.mjs --only lib.es5.d.ts --base build-base --new build

# 大语料只印失败行 + 机器可读汇总
node tests/bench/buffer-equivalence.mjs --mode both --quiet --json
```

退出码：`0` = 选中通道全部等价；`1` = 有 FAIL/ERROR；`2` = 用法错误或 build 目录不存在。
`--dts N` 调 lib 大文件数量（0 = 不跑 d.ts 档）。

---

## 5. A/B 性能工具 `tests/bench/buffer-ab.mjs`

同一进程分别 require 基线 build（`build-base`）与实验 build（`build`）的
`ts/source-file-runner.js`，对同一批 8 份大 `*.d.ts` 交替 parse，5 轮逐文件取中位。

- 语料与 `parse-perf --dts 8` 完全相同（同一批文件、同一顺序）。
- 每轮内 A、B 各 parse 一次并计时；**相邻轮交换先后顺序**（奇偶轮 A→B / B→A），抵消顺序偏置。
- 先跑 warmup 轮（默认 1，不计数）；`--repeat` 默认 5。
- TOTAL（验收用）= 逐文件中位之和；另报「每轮合计的中位」看稳定性。
- 提升 % = `(基线中位 − 实验中位) / 基线中位 × 100`，正数 = 实验版更快。

### 自检（`build-base` vs `build`，两者内容相同，预期 ≈0%）

命令：`node tests/bench/buffer-ab.mjs --json`（2026-10-23，25.3 s）

| 文件 | bytes | 基线中位 (ms) | 实验中位 (ms) | 提升% |
| --- | ---: | ---: | ---: | ---: |
| lib.dom.d.ts | 2349483 | 1072.547 | 1085.467 | −1.20 |
| lib.webworker.d.ts | 787076 | 401.678 | 418.620 | −4.22 |
| typescript.d.ts | 588452 | 382.479 | 382.753 | −0.07 |
| lib.es5.d.ts | 218972 | 95.693 | 96.940 | −1.30 |
| lib.es2023.array.d.ts | 40197 | 14.379 | 14.585 | −1.44 |
| lib.es2020.bigint.d.ts | 38258 | 16.494 | 16.026 | +2.83 |
| lib.es2015.core.d.ts | 22824 | 8.704 | 8.926 | −2.54 |
| lib.es2015.symbol.wellknown.d.ts | 10971 | 5.503 | 5.652 | −2.70 |
| **TOTAL（逐文件中位之和）** | 4056233 | **1997.476** | **2028.969** | **−1.58** |
| TOTAL（每轮合计的中位） | | 1998.746 | 2041.061 | −2.12 |

**噪声带结论**：同样内容的两份 build 也会量到约 **−1.6% ~ −2.1%**（单文件最差 −4.2%），
这是本机这个工具/这批语料的噪声底。验收要求 ≥20%，远高于噪声，判定安全；
但**不要拿单文件百分比下结论**，以 TOTAL 为准，且实验前后尽量在同一会话、同一批 8 文件上跑。

### 用法

```powershell
# 验收：基线 build-base vs 实验 build，5 轮，不达 20% 直接非 0 退出
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 5 --min-improve 20

# 实验 build 在别处（例如实验分支的 clone）
node tests/bench/buffer-ab.mjs --base <基线clone>\build-base --new <实验clone>\build

# 机器可读 + 多轮
node tests/bench/buffer-ab.mjs --json --repeat 7
```

退出码：`0` = 正常（或达到 `--min-improve`）；`1` = 运行失败/未达门槛；`2` = 用法错误、
目录不存在、或 `--base`/`--new` 指到同一目录。

---

## 6. `build-base` 的保留与重建

- 本 clone 已有 `build-base/`（= 基线 `build/` 的完整副本，873 个 `.js`），`build/` 与
  `build-base/` 均在 `.gitignore` 内，**不会也不应该提交**。
- 换机器/换 clone 时重建基线产物的办法（任选其一）：
  1. 在基线 commit 上构建一次：
     ```powershell
     git clone "C:\Users\Admin\Documents\GitHub\xl-example" <dir>
     cd <dir>; git checkout feature/quick-parse; git checkout -b verify/buffer-baseline
     Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .
     # xl_build（cwd=<dir>, paths=["core","typescript"], targets=["ts"]）
     node_modules\.bin\tsc.cmd -p tsconfig.json
     Copy-Item -Recurse build build-base
     ```
  2. 从本分支（`verify/buffer-baseline`）构建后复制成 `build-base`；实验分支的 `build` 另建。
- 两个脚本都接受绝对/相对 build 目录，不要求叫 `build-base`/`build`。

---

## 7. 验收复跑清单（交给 verifier / fixer）

```powershell
# 0) 环境：node v24.21.0 / tsc 6.0.3；先完成 §1 的 xl_build + tsc
# 1) 7 项门禁（§2 表内命令）
node tests/body-guide/harness.mjs --all
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs --quiet
node tests/parse/validate.mjs

# 2) 等价（基线 vs 实验，xml 为验收口径，digest 看位置）
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build

# 3) 性能（同会话，TOTAL ≥20% 提升）
node tests/bench/parse-perf.mjs --dts 8 --repeat 3
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 5 --min-improve 20
```

判定口径（与 BUFFER-CONTRACT §0 对齐）：

1. xl_build 后 tsc 0 error；xl check 0 error（warning 不高于 2447）。
2. 7 项门禁读数**不低于**本文件 §2（baseline 全绿，即不允许出现任何 regression）。
3. `buffer-equivalence --mode xml` 全部 PASS（同错按等价计），0 FAIL/ERROR；digest 亦应为 0 FAIL。
4. 位置口径由 digest 通道覆盖（XML 不含 pos/end）。
5. `buffer-ab` 的 TOTAL 提升 ≥20%（本机噪声底约 ±2%）。
