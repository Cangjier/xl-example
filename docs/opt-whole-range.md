# O1：`SourceRange.Whole` 按 Document 缓存复用

分支 `opt/whole`（基于 `perf/buffer-analysis` tip `1dd7ce7f`）。只改 `core/syntax` 两个 `.xl.md`，不碰 `typescript/`、`tests/` 业务源码，不碰 `bin/`。

## 结论（TL;DR）

| 项 | 结果 |
| --- | --- |
| 补丁 | `Document.WholeRange` 缓存槽 + `SourceRange.Whole` 首次构造、之后复用同一实例（2 文件） |
| 分配（lib.dom） | **1,805,739 → 407,866**（**−77.4%**） |
| 分配（8 份 d.ts） | **4,147,084 → 777,205**（**−81.3%**） |
| 等价 | `buffer-equivalence --mode both`：4556 文件，xml/digest **FAIL 0 / ERROR 0**，逐字节一致 |
| 门禁 | validate / ast-json / ast-json-diff / real-dts / token-ast / body-guide **全绿** |
| 性能 | 同进程交替 A/B 墙钟在噪声内（−1.4% ~ +0.6%）；GC 暂停 **164.3 → 127.2 ms（−22.6%）** |
| 判定 | **保留**：零语义风险、分配与 GC 压力显著下降；**不宣称**墙钟提升（见 §7.4 噪声） |

一句话：这次改动兑现了「分配大头」这一个目标（Whole 分配从每份 140 万降到 1），但没有把它转化成稳定的墙钟收益——时间瓶颈不在这些小对象的分配上。

## 1. 背景

`docs/perf-profile-buffer.md` 的归因：`lib.dom` 每份 1.81M 个 `SourceRange` 里 **1.40M 是 `Whole`（77.4%）**，其中 80.4% 来自 member-boundary → line-terminator 热循环——`HasBetween` 每被调一次就 `new SourceRange(document, 0, GetCount())` 一次。而这个范围覆盖的区间在文档生命周期内是常量：`[0, GetCount())`。

同一 `Document` 的全文范围没有任何理由重复构造。

## 2. 补丁

### 2.1 `core/syntax/document.xl.md`

在 `Parent` 之后新增缓存槽（并写明「只读共享视图」的约定）：

```xl
## field WholeRange:SourceRange | null = null

**整文档只读视图的缓存槽**：`SourceRange.Whole(document)` 第一次调用时把 `[0, GetCount())` 建在这里，之后同一个文档的每次调用都返回这同一个实例。

文档长度在构造后不变（`TextDocument.Content` 是只读的，`GetCount` 是它的闭包），所以这份缓存不需要失效。但它是**共享的只读视图**：调用方只能读（`At` / `Has` / `GetRaw` 等），**不得改写返回范围的 `Start` / `End`**，否则会污染所有持有该视图的代码。
```

### 2.2 `core/syntax/source-range.xl.md`

```xl
## static method Whole:(document:Document)=>SourceRange

整个文档：`[0, document.GetCount())`。

**按文档缓存**：第一次调用时建好并放进 `document.WholeRange`，之后同一文档的每次调用都返回同一个实例。

缓存实例是**共享的只读视图**：调用方只能读，不得改写它的 `Start` / `End`。

```ts
if (document.WholeRange === null) {
  document.WholeRange = new SourceRange(document, 0, document.GetCount());
}
return document.WholeRange;
```
```

### 2.3 生成物

`dist/ts/core/syntax/document.ts` 多一个字段初始化 `WholeRange = null`；`dist/ts/core/syntax/source-range.ts` 的 `Whole` 就是上面那四行。`xl_build`（targets ts）与 `tsc -p tsconfig.json` 均 **0 error**，`xl_check` **0 error**（warning 数与基线相同：2440）。

## 3. 为什么这是零风险

1. **区间常量**：`Document` 抽象只有 `GetValue` / `GetCount` 两个委托。全仓唯一实现是 `TextDocument`，`Content` 在构造后不再变，`GetCount` 是 `() => content.length`；`Document` 基类也没有任何写 `GetCount` 的路径。因此 `[0, GetCount())` 在文档生命周期内不变，缓存无需失效。
2. **只读**：grep 了全仓 `SourceRange.Whole(` 的 49 个调用点（`core/` 23 处、`typescript/` 26 处，含 `MemberParsedWhole` 这类同名前缀，实际 Whole 调用约 30 处），全部是 `const whole = SourceRange.Whole(...)` 后只调 `whole.At(...)`，或内联 `SourceRange.Whole(doc).At(...)`；**没有一处**把返回值写进 `Token.SourceRange` 之类的字段，也没有一处改写 `whole.Start` / `whole.End`。
   全仓 `.Start =` / `.End =` 的 72 处写入目标全是 `token.SourceRange`（token 自己的窗口范围）、`state` 对象或 `source-range` 自己的构造函数，没有一处落在 Whole 的返回值上。
3. **相等语义不变**：`Equals` 比的是 `Document` 引用 + `Start` + `End`，不是对象身份；两个文档拿到的缓存实例互不相同，`Same` / `Different` 的判定与改动前一致。
4. **失败模式收敛**：即使将来有人违反「只读」约定去改写缓存实例，症状是所有引用该文档全文视图的位置一起错位——这类错误会在等价性门禁（xml/digest 逐字节、全语料）里立刻暴露，不需要等到线上。

## 4. 分配前后

### 4.1 现有探针：只数调用，不数分配

`node tests/bench/dts-alloc-probe.mjs --files 1` 在改动前后打印的数字**一模一样**：

```
SourceRange.Whole() 1397874  0.595/char  19.04/窗口
全部 SourceRange 分配 ≈ 1,805,739 个 = 0.769/char
```

这是探针的设计使然，不是没生效：它把模块导出 `SourceRange` 换成一个计数子类，并单独包了一层 `Whole` 来数**调用次数**；`Whole` 内部的 `new SourceRange(...)` 用的是模块内局部绑定，子类看不到，所以它用「调用次数」估算 Whole 的分配量。**补丁之后 `Whole` 仍有 1,397,874 次调用，但只在首次调用时分配 1 个对象**，于是探针最后那行“全部 SourceRange 分配 ≈ 1,805,739”会高估约 140 万。读这个探针的数字时请注意这一点。

### 4.2 真实构造计数（本补丁的分配证据）

为了拿到真正的 `new SourceRange(...)` 次数，用一个**不入库**的临时脚本把 `build/ts/core/syntax/source-range.js` 的构造函数包一层计数器再加载（方法见附录 A）。同一台机器、同一语料，只换 build 目录：

| 文件 | 基线分配 | 补丁后分配 | 变化 |
| --- | ---: | ---: | ---: |
| lib.dom.d.ts（2,349,323 字符） | 1,805,739 | 407,866 | **−77.41%** |
| lib.webworker.d.ts | 1,306,641 | 157,113 | −87.98% |
| typescript.d.ts | 928,247 | 153,700 | −83.44% |
| lib.es5.d.ts | 71,095 | 38,707 | −45.56% |
| lib.es2023.array.d.ts | 10,361 | 6,052 | −41.59% |
| lib.es2020.bigint.d.ts | 12,257 | 6,548 | −46.58% |
| lib.es2015.core.d.ts | 6,942 | 3,899 | −43.83% |
| lib.es2020.intl.d.ts | 5,802 | 3,320 | −42.78% |
| **8 份合计** | **4,147,084** | **777,205** | **−81.26%** |

lib.dom 的构成也自洽：补丁后 407,866 = 316,050（Token 字段的空构造）+ 91,814（buffer 窗口）+ 1（空区间）+ **1（整份文档只构造一次 Whole）**；每字符从 0.769 降到 0.174，每窗口从 ~24.6 降到 5.56。基线里 Whole 的 1,397,874 次调用（0.595/char、19.04/窗口）整条消失。

### 4.3 身份验证

```
new build:  SourceRange.Whole(d) === SourceRange.Whole(d)  → true，范围 [0, 7)
new build:  不同 TextDocument → 不同实例                      → true
base build: SourceRange.Whole(d) === SourceRange.Whole(d)  → false
```

## 5. 等价性

```
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
```

```
语料 4556 个文件，7837812 字符
xml:    PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（字节 基线 34109694 / 实验 34109694）
digest: PASS 4504 / FAIL 0 / ERROR 0 / 同错 52（token 基线 797790 / 实验 797790）
结论: 等价（xml+digest 通道全部 PASS）
```

「同错 52」是两版对同一输入抛同一个异常（含错误文本与 `^` 位置），属于等价；xml 每份产物字节数两版完全相同。

## 6. 门禁

| 门 | 命令 | 结果 |
| --- | --- | --- |
| validate | `node tests/parse/validate.mjs` | 1719 条用例，**0 不合格** |
| ast-json | `node typescript/cases/ast-json.mjs` | 6167/6167，cj-fail **0** |
| ast-json-diff | `node typescript/cases/ast-json-diff.mjs` | 6167 条**完全一致 6167**；结构差/位置差/字段差均 0 |
| real-dts | `node typescript/cases/real-dts-ast.mjs` | 226 份真实 `.d.ts` 解析成功 226、崩溃 0、AST 完全一致 226、差异 0 |
| token-ast | `node typescript/cases/token-ast.mjs` | total=1715、ok=1705、crash 0、diff 0、ts-invalid 10、known-gap 0 |
| body-guide | `node tests/body-guide/harness.mjs` | 35/35、10/10、5/5、8/8、util 10/10，**fail 0** |

## 7. 性能

### 7.1 `buffer-ab`：同进程交替 A/B（主证据）

`node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 5`

| 口径 | 基线 | 实验 | Δ |
| --- | ---: | ---: | ---: |
| TOTAL（逐文件中位之和） | 1431.645 ms | 1423.673 ms | **−7.97 ms（+0.56%）** |
| TOTAL（每轮合计的中位） | 1450.509 ms | 1394.892 ms | **−55.62 ms（+3.83%）** |

逐文件：dom −0.59%、webworker −1.48%、typescript.d.ts −1.79%、es2023.array +5.78%、es2020.bigint +6.16%、es2015.core −3.08%、es2015.symbol −0.19%；`lib.es5.d.ts` 单份 +12.1%（59.5 → 66.7 ms）——60 ms 量级的文件单份就能抖出这个幅度（它的样本区间见 `--json` 输出），不构成回退证据。

同样的命令 `--repeat 15`：

| 口径 | 基线 | 实验 | Δ |
| --- | ---: | ---: | ---: |
| TOTAL（逐文件中位之和） | 1469.248 ms | 1463.307 ms | **−5.94 ms（+0.40%）** |
| TOTAL（每轮合计的中位） | 1463.226 ms | 1484.067 ms | **+20.84 ms（−1.42%）** |

两个口径**符号相反、量级都在 ±1.5% 以内**：这就是噪声本身的大小。

### 7.2 `parse-perf --dts 8 --repeat 3`

`build/ts` 是硬编码路径，基线读数用「临时把 `build` 换成 `build-base` 的副本、跑完换回」得到（跑完已还原）：

| 读数 | TOTAL 中位 |
| --- | ---: |
| 基线（build = build-base） | 1431.695 ms |
| 实验（build） | 1509.450 ms |

单看这两个数像是慢了 5.4%，但同一份 lib.dom 的样本区间在两次读数里分别是 `[811.1, 730.9, 746.8]` 与 `[859.0, 771.1, 736.3]`——进程间单次读数本来就有 5% 级漂移。**结论以 §7.1 的同进程交替 A/B 为准**（那也是 `buffer-ab` 自己写在文件头里的验收口径）。

### 7.3 GC 暂停（分配下降去了哪里）

`node --trace-gc tests/bench/parse-perf.mjs --dts 8 --repeat 1 --warmup 1`，各跑一次：

| | Scavenge | Mark-Compact | 合计暂停 |
| --- | ---: | ---: | ---: |
| 基线 | 35 次 / 154.5 ms | 3 次 / 9.8 ms | **164.3 ms**（38 次） |
| 补丁后 | 34 次 / 119.4 ms | 3 次 / 7.8 ms | **127.2 ms**（37 次） |

GC 暂停少 **37.1 ms（−22.6%）**，方向与「少分配 77% 小对象」一致；这次单跑的总时长也顺带从 1608.8 ms 降到 1525.8 ms。GC 计数本身也有进程间抖动，但暂停时长与分配量的方向是稳定的。

### 7.4 噪声说明（读这些数字前请先看）

- 同进程 A/B 的 `buffer-ab` 是唯一把「两版交替、同进程、同 JIT 热身」做全的口径；它的两个汇总口径在 repeat 5 / 15 下都能差出 ±1.5%~±4%，**±2% 以内的差异不能当成收益或回退**。
- `parse-perf` 是单 build、跨进程读数，lib.dom 单份的样本极差就有 ~120 ms；不要用两次 `parse-perf` 的总中位做因果判断。
- 本补丁的确定收益是**分配量与 GC 暂停**（§4.2、§7.3），墙钟收益在噪声内，**不宣称**。

## 8. 风险与回滚

- 风险点只有一个：有人把 `Whole` 的返回值当可变范围去改 `Start` / `End`（当前全仓没有）。缓存注释与文档都写明了「只读共享视图」。
- 若将来出现需要可变全文范围的调用点，正确做法是 `SourceRange.Whole(doc).Clone()`，而不是把缓存改回去。
- 回滚：`git revert <commit>`（只涉及两个 `.xl.md` 与重新生成的 `dist`）；或 `git checkout perf/buffer-analysis -- core/syntax/document.xl.md core/syntax/source-range.xl.md` 后重建。

## 9. 复现

```bash
# 1) 基线
xl build            # paths: core, typescript; targets: ts  → 0 error
node_modules/.bin/tsc -p tsconfig.json                      # 0 error
cp -r build build-base

# 2) 补丁后
xl build && node_modules/.bin/tsc -p tsconfig.json           # 0 error
node tests/bench/buffer-equivalence.mjs --mode both --base build-base --new build
node tests/bench/buffer-ab.mjs --base build-base --new build --repeat 15
node --trace-gc tests/bench/parse-perf.mjs --dts 8 --repeat 1 --warmup 1
```

## 附录 A：真实分配计数的临时脚本（不入库）

`build/ts/core/syntax/source-range.js` 里 `Whole` 的 `new SourceRange(...)` 用的是模块内局部绑定，替换导出或包原型都数不到；唯一可靠的办法是**在加载前改写这个编译产物的构造函数**，再把改好的模块塞回 `Module._cache`：

```js
// 用法: node whole-alloc-count.mjs build/ts 8   （build/ts 或 build-base/ts）
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const [buildArg, filesArg] = process.argv.slice(2);
const buildTs = path.resolve(buildArg);
const srFile = path.join(buildTs, "core", "syntax", "source-range.js");
const marker = "constructor(document, start, end) {";
const src = fs.readFileSync(srFile, "utf8").replace(
  marker,
  marker + "\n        globalThis.__SR_ALLOC__ = (globalThis.__SR_ALLOC__ || 0) + 1;",
);
const m = new Module(srFile, null);
m.filename = srFile;
m.paths = Module._nodeModulePaths(path.dirname(srFile));
m._compile(src, srFile);
Module._cache[srFile] = m; // 后续 require('./source-range.js') 拿到计过数的版本

const { SourceFileRunner } = require(path.join(buildTs, "typescript", "run", "source-file-runner.js"));
const libDir = path.join(process.cwd(), "node_modules", "typescript", "lib");
const files = fs.readdirSync(libDir).filter((n) => n.endsWith(".d.ts"))
  .map((n) => ({ name: n, full: path.join(libDir, n), size: fs.statSync(path.join(libDir, n)).size }))
  .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name))
  .slice(0, Number(filesArg ?? 1));

let total = 0;
for (const f of files) {
  const text = fs.readFileSync(f.full, "utf8");
  SourceFileRunner.Parse(text, f.name);            // warmup
  globalThis.__SR_ALLOC__ = 0;
  SourceFileRunner.Parse(text, f.name);
  console.log(f.name, globalThis.__SR_ALLOC__);
  total += globalThis.__SR_ALLOC__;
}
console.log("total", total);
```

该脚本只在测量时使用，**没有提交**；仓库里的 `tests/bench/dts-alloc-probe.mjs` 保持原样（它数的是 `Whole` 调用次数，见 §4.1）。
