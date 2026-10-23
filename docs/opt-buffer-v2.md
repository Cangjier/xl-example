# opt/buffer-v2 — 四项优化的最终合并与验收

STATUS: **DONE** — 四支全部 `--no-ff` 干净合入（零冲突），重建 0 error，八道门禁全绿，
等价 **0 FAIL / 0 ERROR / 同错 52**（v1 与 base-v2 两个基线皆然），
**累计 A/B 相对 v1 两轮 +28.71% / +29.69%（逐文件）、+29.31% / +29.55%（每轮）**，
本层增量相对 base-v2 **+25.00% / +26.19%（逐文件）**，
新 TS 倍数 **ours/ts-np = 6.20× · ours/ts-par = 4.93×**。

- 合并 HEAD：`7e8bf943`（分支 `opt/buffer-v2`）
- 基座：主仓 `opt/base-v2` @ `eee317c7`（含 O1 + O2）
- 工作副本：`C:\Users\Admin\Documents\GitHub\xl-example-set\opt-final`（独立 clone，从零重建）

---

## 1. 合并顺序与回滚点

四条分支均以 `eee317c7` 为祖先（`git merge-base --is-ancestor` 四条全 0），改动面基本不重叠，
`tests/cache-share/check.mjs` 被 O5a 改动属预期。四次合并**全部 `ort` 自动完成，零冲突**。

| # | 优化 | 分支 tip | 合并 commit | 改动面 |
|---|------|----------|-------------|--------|
| 0 | 基座（O1+O2） | `eee317c7` | — | — |
| 1 | **O3** `UnitToken.Process` 每字符帧瘦身 | `eb3d9b8b` | `d58eeac4` | `core/syntax/unit-token.xl.md` |
| 2 | **O4** basic `Transit` 十 → 一（融合分派） | `fe53d69f` | `71b84e5d` | `core/syntax/templates/template.xl.md` + 新增 `basic-dispatch.xl.md` |
| 3 | **O5a** 缓存键改静态整数槽 | `f98e5b64`（代码 `04743495`） | `40c01763` | 30 份 `*-possible-shape.xl.md` + `tests/cache-share/check.mjs` |
| 4 | **O5b** member 边界 O(1) 记忆 | `f88ff0e2` | `7e8bf943` | `member-boundary.xl.md` + `type-builder.xl.md` |

**回滚点**（任一格都可直接 `git reset --hard` 落回，均为可构建、可验收状态）：

| 回滚到 | 含义 |
|--------|------|
| `eee317c7` | base-v2，仅 O1+O2（本次合并前的已知良好点） |
| `d58eeac4` | base-v2 + O3 |
| `71b84e5d` | base-v2 + O3 + O4 |
| `40c01763` | base-v2 + O3 + O4 + O5a |
| `7e8bf943` | 全部四项（本文件描述的终态） |

若要整体回到 v1，则落回 `opt/integration-buffer` 的 tip；`build-v1` 快照即由 `buffer-final-merge` 提供。

---

## 2. 各项贡献（各支自测读数，非本次合并后重测）

> 每一行都是**该支单独相对它自己的基线**测出来的，口径与样本都不同；
> 各支**不可相加**——它们打的是同一条热路径的不同段，收益相互重叠。
> 合并后的真实增量见 §4。

| 优化 | 关键机制 | 自测 A/B（逐文件 / 每轮，两轮） | 直接证据 |
|------|----------|-------------------------------|----------|
| **O3** process-frame | 窗口不变量提到循环外 + 下标循环替代 `for-of` | +0.82%/+0.12%，+7.05%/+7.94% | profile self **19.5%**、约 520 ns/帧 |
| **O4** dispatch | ten-way 分派融成一个 `BasicDispatch`；每字符 `Transit` **3.37 → 1** | +19.91%/+19.11%，+16.88%/+17.63% | 单进程整轮 **6233.6 → 5362.4 ms（−14.0%）** |
| **O5a** cache-slot | 缓存键改静态整数槽，去掉每次取状态的扫描 | +4.73%/+5.83%，+5.68%/+2.08% | `GetState` 单价 **30.34 → 10.74 ns（−64.6%，2.83×）** |
| **O5b** member-memo | 记忆整个成员边界扫描结果 | +3.57%/+2.47%，+2.66%/+0.91% | `HasBetween` **1,157,836 → 150,136（−87.0%）**，扫描 `at` **−97.7%** |

读法：O4 是这一层的主力（自测约 +17~20%），O5a / O5b 各贡献个位数，
O3 的两轮跨度（+0.1% ~ +7.9%）说明单轮数字在噪声量级内，不宜单独引用。
四支合起来的增量（§4）小于四者之和，符合"同一条热路径分段优化、收益重叠"的预期。

---

## 3. 门禁（八道，全部自跑，HEAD `7e8bf943`）

| # | 门 | 命令 | 读数 | 判定 |
|---|----|------|------|------|
| 1 | 构建 | `xl_build`（core + typescript，ts） | **872 written / 0 error**，2439 warning（全为 `W3102/W3103` 文档描述缺失） | PASS |
| 2 | 编译 | `node_modules\.bin\tsc.cmd -p tsconfig.json` | 退出 0，**872 个 .js** | PASS |
| 3 | 静态检查 | `xl_check`（core + typescript） | **872 文件 / 0 error / 4 warning** | PASS |
| 4 | body-guide | `node tests/body-guide/harness.mjs --all` | **109 / 109**（35+25+23+16+10，fail 0） | PASS |
| 5 | AST 快照 | `node typescript/cases/ast-json.mjs` + `ast-json-diff.mjs` | **6167 / 6167**；结构差 **0**、位置差 **0**、字段差 **0** | PASS |
| 6 | 真实 .d.ts | `node typescript/cases/real-dts-ast.mjs` | 文件 **226**、解析成功 **226**、崩溃 **0**、AST 完全一致 **226**、有差异 **0** | PASS |
| 7 | token AST | `node typescript/cases/token-ast.mjs` | total **1715**、ok **1705**、crash **0**、diff **0**、ts-invalid **10**、known-gap **0** | PASS |
| 8a | 用例 | `node tests/parse/validate.mjs` | **1719 条 / 0 条不合格** | PASS |
| 8b | cache-share | `node tests/cache-share/check.mjs` | **7 / 7 PASS，0 FAIL** | PASS |

**两处需要交代的读数**

1. **构建/检查是 872 而不是 871**：O4 新增了 `core/syntax/templates/basic-dispatch.xl.md`，
   源文件数从 871 变 872，因此 872/0 就是 871/0 门禁在合并树的等价读数（base-v2 上仍是 871/0）。
2. **`node tests/gates/run.mjs`（8 道并行门）在合并树上失败，且基座同样失败**，与本次合并无关：
   `runtime:cli` / `cases:tsast` / `coverage` / `samples` 依赖 `tsrun.xl.md`、`print-ast-common.xl.md`
   这两份**本仓库根本不存在**的源（`git ls-files` 查无此文件，主仓同样没有），
   `direct:lint` 报的 4 处 `any` 也是既有文本。该现象在 `docs/opt-process-frame.md` 已有记录（"基线即红"）。
   上表第 4~8 项是逐条独立跑的真实门禁，均通过。

---

## 4. 等价

`node tests/bench/buffer-equivalence.mjs --mode both`，语料 4556 个文件、7,837,812 字符：

| 基线 | xml 通道 | digest 通道 | 字节 | 结论 |
|------|----------|-------------|------|------|
| `build-v1` | PASS 4504 / **FAIL 0 / ERROR 0** / 同错 52 | 同上 | 34,109,694 = 34,109,694 | **等价** |
| `build-base` | PASS 4504 / **FAIL 0 / ERROR 0** / 同错 52 | 同上 | 34,109,694 = 34,109,694 | **等价** |

"同错 52"是两侧同时报错的既有用例，不是本次引入的差异；两通道的字节数与 token 数
（797,790）在基线与实验两侧完全相等，即**输出逐字节相同**。

---

## 5. 增量 A/B（base-v2 → v2，合并层自身收益）

`node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7`，两轮：

| 轮次 | TOTAL（逐文件中位之和） | Δms | 提升 | TOTAL（每轮合计中位） | 提升 |
|------|--------------------------|-----|------|------------------------|------|
| 第一轮 | 1328.987 → 996.773 ms | −332.214 | **+25.00%** | 1330.971 → 991.580 | **+25.50%** |
| 第二轮 | 1371.151 → 1012.092 ms | −359.059 | **+26.19%** | 1369.179 → 1015.001 | **+25.87%** |

两轮口径一致（25.0~26.2%），稳定性检查：逐文件之和与每轮合计中位相差基线 2 ms / 实验 5.2 ms（第一轮）、2 ms / 2.9 ms（第二轮），无口径漂移。

---

## 6. 累计 A/B（v1 → v2，含 O1~O5b 全部优化）

`node tests/bench/buffer-ab.mjs --base build-v1 --new build --repeat 7`，两轮：

| 轮次 | TOTAL（逐文件中位之和） | Δms | 提升 | TOTAL（每轮合计中位） | 提升 |
|------|--------------------------|-----|------|------------------------|------|
| 第一轮 | 1429.957 → 1019.464 ms | −410.493 | **+28.71%** | 1449.778 → 1024.913 | **+29.31%** |
| 第二轮 | 1412.606 → 993.242 ms | −419.364 | **+29.69%** | 1410.369 → 993.535 | **+29.55%** |

**累计 ≈ +29.2%（逐文件，两轮均值）／+29.4%（每轮合计）**，且两轮同向、量级稳定。
分文件（第二轮，逐文件中位）：

| 文件 | bytes | v1 ms | v2 ms | 提升% |
|------|-------|-------|-------|-------|
| `lib.dom.d.ts` | 2,349,483 | 726.917 | 526.521 | 27.57 |
| `lib.webworker.d.ts` | 787,076 | 291.557 | 200.657 | 31.18 |
| `typescript.d.ts` | 588,452 | 298.974 | 196.425 | 34.30 |
| `lib.es5.d.ts` | 218,972 | 65.583 | 47.368 | 27.77 |
| `lib.es2023.array.d.ts` | 40,197 | 9.064 | 6.617 | 26.99 |
| `lib.es2020.bigint.d.ts` | 38,258 | 10.278 | 7.716 | 24.93 |
| `lib.es2015.core.d.ts` | 22,824 | 5.835 | 4.675 | 19.87 |
| `lib.es2015.symbol.wellknown.d.ts` | 10,971 | 4.398 | 3.262 | 25.82 |

**绝对毫秒（便于直接引用）**

| 量 | v1 | v2 | 说明 |
|----|----|----|------|
| 8 份 .d.ts 逐文件中位之和 | 1412.6 ~ 1430.0 ms | **993.2 ~ 1019.5 ms** | A/B 两轮 |
| `lib.dom.d.ts`（2.35 MB，最大件） | 726.9 ~ 748.5 ms | **526.5 ~ 530.3 ms** | 单文件中位 |
| `parse-perf --dts 8 --repeat 3` | — | **TOTAL median 1073.391 ms** | 语料 4,056,233 B，墙钟 4528.069 ms |

---

## 7. 新 TS 倍数（相对 TypeScript 官方解析器）

`node tests/bench/perf-vs-ts.mjs --top 8 --repeat 5`（TS 6.0.3，同进程逐轮交替，warmup 1 + repeat 5）：
语料 top8 = 8 份 / 4629 KB / 4.74 M 字符。

| 口径 | ours | 对照 | 倍数 |
|------|------|------|------|
| `ours / ts-np`（`setParentNodes: false`） | **1123.99 ms** | 181.14 ms | **6.20×** |
| `ours / ts-par`（`setParentNodes: true`） | **1123.99 ms** | 227.77 ms | **4.93×** |
| 每字符（ours / ts-np / ts-par） | 237.15 ns | 38.22 ns / 48.06 ns | — |

分文件倍数（`x np` / `x par`）：`lib.dom` 6.30× / 5.05×、`lib.webworker` 6.85× / 5.59×、
`typescript.d.ts` 6.73× / 5.36×、`lib.es5` 4.39× / 3.48×。

**参数口径更正**：本分支的 `perf-vs-ts.mjs` **没有 `--dts` 这个参数**（`parseArgs` 的 `default` 会直接
`未知参数` 退出），文件头写明的是 `--top N`（默认 8，即最大的 8 份 .d.ts）与 `--corpus`（全部 226 份）。
上面这组用 `--top 8 --repeat 5` 跑，与任务要求的"8 份"语料一致。
另注意 §6 的 `parse-perf --dts 8` 语料是 8 份 `typescript/lib` 的 .d.ts（4,056,233 B），
本节 `--top 8` 因 `@types/node` 的 `inspector.generated.d.ts` / `crypto.d.ts` / `fs.d.ts` / `http2.d.ts`
更大而换成另一组 8 份（4629 KB），**两者 TOTAL 不可直接相减**。

口径提醒：`ours` 是 shape 树（不含 AST 投影），`ts-np/ts-par` 是 TS AST，产物不同，
倍数只作量级参照，不是等价实现的比值——这句话写在脚本头里，本文件沿用。

---

## 8. 复现命令

```powershell
git clone "C:\Users\Admin\Documents\GitHub\xl-example" "C:\Users\Admin\Documents\GitHub\xl-example-set\opt-final"
cd opt-final
git checkout opt/buffer-v2
Copy-Item -Recurse "C:\Users\Admin\Documents\GitHub\xl-example\node_modules" .

# 重建（xl_build / xl_check 为插件工具，cwd=本 clone，paths=["core","typescript"]，targets=["ts"]）
#   1) xl_build   2) node_modules\.bin\tsc.cmd -p tsconfig.json   3) xl_check
# 基线快照：v1 用 buffer-final-merge/build；base-v2 在 eee317c7 上重建后复制为 build-base

node tests/body-guide/harness.mjs --all
node typescript/cases/ast-json.mjs; node typescript/cases/ast-json-diff.mjs
node typescript/cases/real-dts-ast.mjs
node typescript/cases/token-ast.mjs
node tests/parse/validate.mjs
node tests/cache-share/check.mjs

node tests/bench/buffer-equivalence.mjs --mode both --base build-v1   --new build
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 7   # 增量
node tests/bench/buffer-ab.mjs --base build-v1   --new build --repeat 7   # 累计
node tests/bench/parse-perf.mjs   --dts 8 --repeat 3
node tests/bench/perf-vs-ts.mjs   --top 8 --repeat 5
```
