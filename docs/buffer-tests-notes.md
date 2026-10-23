# T9 测试/基准/门禁脚本适配记录（feat/buffer-tests）

分支：`feat/buffer-tests`（base = `feat/buffer-core` @ `0f76e6b5`）
工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\buffer-tests`
权威口径：`C:\Users\Admin\Documents\GitHub\xl-example-set\BUFFER-CONTRACT.md`（§0、§4）与
`buffer-core/docs/buffer-core-api.md`。

结论先说：**脚本侧要改的只有 4 个文件 + 1 处诊断打印**。`core/` / `typescript/` 业务源码一行未动；
当前分支解析器尚未适配（T3–T8 未合并），所以除 `tests/cache-share/check.mjs`、`dts-cost-probe --micro`
之外的**解析类门禁全部不可跑**——它们都在新驱动的 index 0 抛 `no progress`，这是预期，不是脚本坏了。

---

## 1. grep：脚本里对内建 API 的全部命中（改前）

范围：`typescript/cases/*.mjs`、`tests/**/*.mjs`、`samples/*.mjs`（T9 拥有文件）。
关键字：`Source`、`process-source`、`ProcessSource`、`ProcessSingle`/`ProcessAt`、`SourceQueue`、
`LastSource`、`End.Index`、`EndIndex`、digest 的 `[Start,End]`。

排除噪声后（`SourceFileRunner` / `ts.createSourceFile` / `RunSources` / `source` 局部变量都不算），
真实耦合只有 3 个文件 6 处：

| 文件 | 行 | 改前 | 性质 |
| --- | --- | --- | --- |
| `typescript/cases/ast-compare.mjs` | 108–109 | `range.Start == null ? 0 : range.Start.Index`、`range.End == null ? 0 : range.End.Index + 1` | Source 对象 + 闭区间 +1 |
| `typescript/cases/real-dts-ast.mjs` | 99–100 | 同上（该文件的私有副本） | 同上 |
| `tests/bench/dts-ab.mjs` | 23 | digest 印 `${Start ? Start.Index : -1},${End ? End.Index : -1}`（闭区间） | Source 对象 + 闭区间 |
| `tests/bench/dts-cost-probe.mjs` | 34 | WATCH 名单里的 `ProcessSingle`、`DrainQueue`（已不存在） | 陈旧方法名 |
| `tests/bench/dts-cost-probe.mjs` | 136–170 | `require("core/syntax/source.js")`、`require("core/syntax/process-source.js")`、`new Source(...)`、`doc.At(...)`、`s.Value`、`new ProcessSource(...)` | 已删除的类/文件 |
| `tests/bench/dts-cost-probe.mjs` | 44 | 注释「静态转调函数（例如 Source.EOF）」 | 陈旧说明 |

确认**没有**耦合的（grep 逐文件看过，不需要改）：

- `typescript/cases/ast-json.mjs`、`ast-json-diff.mjs`、`token-ast.mjs`：只经 `ast-compare.mjs` 的
  `createAstCore` / `cjAst` 取 pos/end，自身不碰 `Source`。
- `tests/parse/ts-ast.mjs`、`ts-shape.mjs`、`validate.mjs`、`direct-lint.mjs`：只消费 `cjcli --ts-ast`
  的产物 / `ts.createSourceFile`，不直接读 `SourceRange`。
- `tests/parse/direct-ast.mjs`：**只查存在、不查值**（`!("pos" in node)` / `!("end" in node)`，
  第 163–164 行；第 166/181 行明确跳过 `kind/pos/end` 三键）。因此开闭区间切换**不需要它改**，
  它也不会因为 end 从闭变半开而变红——这已按任务要求逐行确认。
- `tests/body-guide/harness.mjs`、`tests/member-possible/harness.mjs`、`tests/cover9/probe.mjs`、
  `tests/coverage/run.mjs`、`tests/cpp/check.mjs`、`samples/check.mjs`、`tests/bench/parse-perf.mjs`、
  `dts-profile.mjs`、`prof-summary.mjs`：只走 `SourceFileRunner.Parse` / `fs` / 进程调用，无内建 API 耦合。

---

## 2. 改动清单（逐文件）

### 2.1 `typescript/cases/ast-compare.mjs` — `cjAst` 改半开
```js
// 改前
pos: shape.Pos >= 0 ? shape.Pos : (range.Start == null ? 0 : range.Start.Index),
end: range.End == null ? 0 : range.End.Index + 1,
// 改后（半开：Start/End 是 int，-1 = 未设置；End 已是「最后字符 + 1」，与 TS node.end 同口径）
const startIndex = typeof range.StartIndex === "number" ? range.StartIndex : -1;
const endIndex   = typeof range.EndIndex   === "number" ? range.EndIndex   : -1;
pos: shape.Pos >= 0 ? shape.Pos : startIndex >= 0 ? startIndex : 0,
end: endIndex >= 0 ? endIndex : 0,
```
`typeof === "number"` 不是防御性冗余：`const range = shape.SourceRange || {}` 里的 `{}` 分支
（形状还没签入时）没有 getter，直接读 `range.StartIndex` 会得到 `undefined`，`undefined >= 0` 为 false，
但写成 `?? -1` 更明确。语义等价于契约 §1.6：`AstNode.Pos = shape.Pos`、`AstNode.End = shape.SourceRange.EndIndex`，
**禁止再 +1/-1**。

### 2.2 `typescript/cases/real-dts-ast.mjs` — 同一处改法
该文件是 `ast-compare` 口径的私有副本（226 份真实 `.d.ts` 的尺子），改动同上。

### 2.3 `tests/bench/dts-ab.mjs` — digest 改半开 + 前置缺失时给出可读出口
- `rangeTag(node)` 现在印 `[StartIndex,EndIndex)`（旧版闭区间 `[Start,End]`）。digest 只用于
  base/exp 两侧互比（`sameDigest` / `digestLen`），两端同口径，记号变化不影响结论。
- 新增前置检查：`build/ts` 与 `build/ts-exp` 任一缺失 → 打印哪一棵缺失、怎么生成，
  **退出码 2**（「前置未满足」，不是脚本异常）。原来缺 `build/ts-exp` 时是 `MODULE_NOT_FOUND` 抛栈。

### 2.4 `tests/bench/dts-cost-probe.mjs` — 计数名单更新 + micro 档换新 API
- `WATCH`：删 `ProcessSingle`、`DrainQueue`（已不存在），加 `ProcessRange`、`TrySignOut`、
  `SignOutToken`、`Has`（新驱动/新签出的真实热路径名）。`DrainMessages`、`At`、`IsInRange` 保留。
- `--micro` 的 `Source` / `ProcessSource` / `doc.At` / `s.Value` 四条改成新对应物：

  | 旧项 | 新项 | 说明 |
  | --- | --- | --- |
  | `new Source(doc,i)` | `new SourceRange(doc,i,i+1)` | 分配成本对照 |
  | `doc.At(i)  [= new Source + call]` | `range.At(i)`（`range = SourceRange.Whole(doc)`） | 新实现**不分配**，这正是优化的目标 |
  | `s.Value  [getter + GetValue]` | `range.At(5)` | 取固定字符 |
  | `queue push+splice(0,1)`（`new ProcessSource`） | **标记 `unavailable: true`** | `SourceQueue` / `ProcessSource` 已按契约 §1.4 删除，驱动改为 `SyntaxContext.ProcessRange`，**无对应物**；同时新增 `ReloadMessage push+splice(0,1)` 作为「数组队列成本」的参照行 |

  不可用项仍然出现在输出里（带 `note`），不会静默消失；`--count` 档（真正的每字符调用计数）口径不变。

### 2.5 `tests/bench/parse-perf.mjs` — 只改「失败怎么打印」（诊断，不动测量）
改前 `catch (error) { console.error(\`bench 失败: ${error && error.message ? error.message : error}\`) }`。
解析失败抛的是 `SyntaxException`（**不是 JS Error**，文本在 `Message` 字段），于是门禁上只能看到
`bench 失败: [object Object]`。现在同时打印 `Message` 与 `InnerException`，测量逻辑、退出码（1）全不变。
这一处不是 API 耦合，是「解析器未就绪时门禁读数必须可读」的最小修复；如果 Lead 要求严格只改 API 耦合，
可以单独回滚这一处（其余改动不依赖它）。

---

## 3. 自检：脚本自身能不能加载/正确

### 3.1 语法：全部通过
```
node --check typescript/cases/ast-compare.mjs      # OK
node --check typescript/cases/real-dts-ast.mjs     # OK
node --check tests/bench/dts-ab.mjs                # OK
node --check tests/bench/dts-cost-probe.mjs        # OK
node --check tests/bench/parse-perf.mjs            # OK
```

### 3.2 `cjAst` 语义单测（半开映射是否正确）
用假形状对象直接调 `cjAst`（不需要解析器）：
```
{SourceRange:{Start:5,End:9,StartIndex:5,EndIndex:9},Pos:5}  → {"kind":"Identifier","pos":5,"end":9,"text":"abcd"}
{SourceRange:{},Pos:-1}                                       → {"kind":"Identifier","pos":0,"end":0}
父节点 [0,10) + 子节点 [5,9)                                   → SourceFile pos 0 end 10, child pos 5 end 9
```
即：`[5,9)` → TS 的 `pos=5,end=9`，**不再有 +1**；未签入范围落回 `0/0`。

### 3.3 真机验证（在一棵临时构建树上跑脚本本身）
当前分支没有 `build/`，且全仓 `xl_build` 要等 T3 落地；为了把「脚本坏了」和「解析器没适配」分开，
在仓库外建了一棵**临时验证树**（不进本分支、不提交）：
`C:\Users\Admin\AppData\Local\Temp\t9-verify` = `feat/buffer-bootstrap`（T0b：只删 `Source` import 行的基座）
+ 本分支这 5 个脚本。读数：

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 生成 | `xl_build`（cwd=验证树, paths `core,typescript`） | **871 written, 0 error**（2446 warning 全是 W3102/W3103 文档警告，与基线同性质） |
| 编译 | `node node_modules/typescript/bin/tsc -p tsconfig.json` | exit 2、**430 error**，全部落在未适配的 basic-tokens / typescript 文件；`tsc` 无 `noEmitOnError`，仍产出了 `build/ts`（`source-file-runner.js`、`source-range.js` 在；`source.js` 已不存在，符合预期） |
| 缓存自测 | `node tests/cache-share/check.mjs` | **5/5 PASS**（该脚本不经过解析器，唯一能全绿的门禁） |
| micro 探针 | `node tests/bench/dts-cost-probe.mjs --micro` | **跑通**，输出见 §4 |
| 解析门禁 | `node tests/bench/parse-perf.mjs --dts 8 --repeat 1` | exit 1，`bench 失败: throw by line 0, SyntaxContext.Process: no progress at index 0, the owner blocked without consuming any character ---> at file: lib.dom.d.ts:0` |
| 合成长度档 | `node tests/bench/parse-perf.mjs --single 200 --repeat 1` | 同上，`at file: synthetic-single-200.ts:0` |
| A/B 脚本 | `node tests/bench/dts-ab.mjs` | exit 2：`build/ts : ok / build/ts-exp : 缺失`（该实验树历史上就没进仓） |

`no progress at index 0` 是**新驱动层的无进展保护**在 index 0 触发：`SourceFileShape.Process` 还是旧签名
（`(context, source)`），被新驱动以 `(context, buffer, index)` 调用后不消费字符、也不推进 `context.Index`。
这正是 T4（`source-file-shape.xl.md`）+ T3/T5–T8 的移植面；**不是脚本问题，也不该由脚本绕过**。

---

## 4. 早期性能信号（micro，明确不是门禁读数）

同一台机器、同一次会话，两个构建树各自跑 3 次取中位（每项 200 万次迭代，`time()` 先热身 20 万次）：

| 项 | 旧（`buffer-baseline` build，`feature/quick-parse`） | 新（验证树 `feat/buffer-core` 驱动） |
| --- | --- | --- |
| 单字符分配 | `new Source(doc,i)` **6.31 ns** | `new SourceRange(doc,i,i+1)` **6.43 ns** |
| 单字符读取 | `doc.At(i)` **11.36 ns** | `range.At(i)` **9.39 ns**（−17%） |
| 底座 | `doc.GetValue(i)` 7.79 ns | `doc.GetValue(i)` 8.73 ns |

- 结论：`At` 不分配确实换来约 **17%** 的单字符读取收益（`SourceRange.At` = `Has()` + `GetValue()`，
  生成码见 `build/ts/core/syntax/source-range.js:23-30`）；分配成本持平。
  这只是「读一个字符」的微基准，真正的 ≥20% 要看 `parse-perf --dts 8 --repeat 3`（含驱动层去队列）。
- ⚠️ `dts-cost-probe --micro` 里的 `range.At` 读数是 **32.03 ns**，明显高于上表 9.39 ns：`--micro` 是
  「先给所有模块原型挂计数包装、再量」的模式，而 `At` 在 `WATCH` 名单里 → 被包装（`bump()` 计入）。
  旧 `doc.At` 那一行同样被包装，所以 probe 内部的横向对比仍成立；**绝对值请引用上表**。
- 其它 probe 行（同样受包装影响，仅供对照）：`new SourceRange` 7.82 ns、`ReloadMessage push+splice(0,1)`
  74.48 ns（已删除的 `SourceQueue` 项标 `unavailable`）、`cache.GetState(ctor.name)` 42.32 ns。

---

## 5. 门禁可跑性矩阵（当前分支 vs 集成后）

当前分支（`feat/buffer-tests`，无 `build/`）：**所有解析类门禁不可跑**。实测
`node tests/bench/parse-perf.mjs --dts 8 --repeat 1` 的直接报错：
```
Error: Cannot find module '...\buffer-tests\build\ts\typescript\run\source-file-runner.js'
Require stack: - ...\buffer-tests\tests\bench\parse-perf.mjs
```
原因只是「还没构建」，不是脚本引用错文件——同一个脚本在 §3.3 的验证树上能加载并跑到新驱动的
`no progress at index 0`。这是 T3–T8 合并前必然的中间态。

| 门禁 | 命令 | 现在 | 集成后（`xl_build` + `tsc` 全绿 + T3–T8 合并） |
| --- | --- | --- | --- |
| 用例校验 | `node tests/parse/validate.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| AST 快照 | `node typescript/cases/ast-json.mjs` | ✗ 无构建 | 可跑；**必须重生成** `typescript/cases/*.cj-ast.json`（pos/end 半开化会让旧快照全红）。该脚本无 `--write` 开关，直接跑即写盘（`ast-json.mjs:164-165`） |
| 快照对拍 | `node typescript/cases/ast-json-diff.mjs` | ✗ 无构建 | 可跑（依赖上一行重生成的快照；脚本未改） |
| token 尺子 | `node typescript/cases/token-ast.mjs --quiet` | ✗ 无构建 | 可跑（经 `ast-compare.cjAst`，已适配） |
| 真实 d.ts | `node typescript/cases/real-dts-ast.mjs` | ✗ 无构建 | 可跑（已适配 pos/end） |
| TS AST 尺子 | `node tests/parse/ts-ast.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| direct-ast | `node tests/parse/direct-ast.mjs` | ✗ 无构建 | 可跑（只查 pos/end 存在性，脚本未改） |
| body-guide | `node tests/body-guide/harness.mjs --all` | ✗ 无构建 | 可跑（脚本未改） |
| member-possible | `node tests/member-possible/harness.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| cover9 | `node tests/cover9/probe.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| coverage | `node tests/coverage/run.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| cache-share | `node tests/cache-share/check.mjs` | 需 `build/ts`（本分支无构建→MODULE_NOT_FOUND）；**在验证树上 5/5 PASS** | 可跑（不经过解析器，脚本未改） |
| 样本 | `node samples/check.mjs` | ✗ 无构建 | **要 root 入口的构建**：需要 `build/ts/cjcli.js`，它来自仓库根的 `cjcli.xl.md`，`xl_build paths=[core,typescript]` 不产出它。集成后要么补 `xl_build` 覆盖根文件，要么先确认基线本就有这件事（T2 的基线构建同样没有 `cjcli.js`） |
| 性能 | `node tests/bench/parse-perf.mjs --dts 8 --repeat 3` | ✗ 无构建 | 可跑（已修诊断打印；测量逻辑未变） |
| 性能 A/B | `node tests/bench/dts-ab.mjs` | ✗ 缺 `build/ts-exp` | 只在有历史实验树时可跑；否则 exit 2 并说明 |
| 每字符计数 | `node tests/bench/dts-cost-probe.mjs --count --files 3` | ✗ 无构建（`--micro` 同样需要 `build/ts`，但验证树上已跑通） | 可跑（名单已更新） |
| profile | `node tests/bench/dts-profile.mjs` | ✗ 无构建 | 可跑（脚本未改） |
| cpp 清单 | `node tests/cpp/check.mjs` | ✗ exit 1：`找不到 dist/cpp —— 先跑 xl_emit 生成 C++ 产物`（与 buffer 无关，本 clone 没有 C++ 产物） | 与 buffer 改动无关；脚本未改 |

集成后的最短复跑顺序（建议 Lead/verifier 照抄）：
```powershell
cd <buffer-tests>
xl_build        # paths [core,typescript]（+ 根 cjcli 若要 samples 门禁）
node node_modules\typescript\bin\tsc -p tsconfig.json    # 期望 0 error
node typescript\cases\ast-json.mjs                        # 重生成 *.cj-ast.json（半开快照）
node tests\parse\validate.mjs
node typescript\cases\ast-json-diff.mjs
node typescript\cases\token-ast.mjs --quiet
node typescript\cases\real-dts-ast.mjs
node tests\parse\ts-ast.mjs
node tests\parse\direct-ast.mjs
node tests\body-guide\harness.mjs --all
node tests\cache-share\check.mjs
node samples\check.mjs
node tests\bench\parse-perf.mjs --dts 8 --repeat 3
node tests\bench\dts-cost-probe.mjs --count --files 3
```

---

## 6. 未决 / 需要别人处理的事（不在 T9 拥有文件内）

1. `docs/*.md` 里仍有旧 API 叙述（**不是脚本，T9 不改**）：
   `docs/Final.md:140`（`End = SourceRange.End.Index+1` 的旧口径）、`docs/body-guide-contract.md:124`
   （`bracket.SourceRange.Start.Index + 1`）、`docs/dts-optimization-ideas.md` 与 `docs/dts-optimization.md`
   全篇的 `ProcessSource` / `SourceQueue` / `LastSource` 分析。这些是历史取证文档，建议保留原文
   并在文档头部加「已被 buffer 契约取代」的注记，而不是重写。
2. `typescript/cases/*.cj-ast.json` 快照必须在集成后重生成（见 §5）。本分支**没有**动这些 JSON：
   现在重生成只会把半开格式烧进快照，而解析器还没适配，会得到错误的值。
3. `dts-cost-probe` 的 `--micro` 里 `At` 被计数包装放大（§4 末）；如果以后要拿它的绝对值作结论，
   需要把 `At` 从 `WATCH` 移出或加 `--raw` 档——本次不做，只在文档里标注。
4. `samples/check.mjs` 依赖 `build/ts/cjcli.js`；本工作流（`paths=[core,typescript]`）不产出根入口，
   这是既有事实（T2 基线构建也没有该文件），需要 Lead 决定集成时是否补构建根目录。
5. 本分支没跑 `tests/parse/direct-lint.mjs` / `tests/coverage/run.mjs` / `tests/cpp/check.mjs` 的完整读数：
   前者依赖解析器（会跟 parse-perf 一样在 index 0 失败），后者与 buffer 无关、留给 verifier 在集成树跑。
