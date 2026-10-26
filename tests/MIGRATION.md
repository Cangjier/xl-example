# `tests/` 迁移说明：`feature/quick-parse` ← `feature/print-direct-ast`

这一份是本分支独有的文件（源分支没有），记的是**搬了什么、搬过来之后哪几道门真的跑得动**。

## 来源与形状

| 项 | 值 |
| --- | --- |
| 来源分支 | `feature/print-direct-ast` |
| 来源提交 | `ebdc86d842317205112c9b86419ab33cff1a34bd` |
| 搬运方式 | `git checkout feature/print-direct-ast -- tests` |
| 规模 | 4587 个文件 / 103974 行 |

**除本文件外，`tests/` 与源分支逐字节一致**，可用这一条复核（**只应看到本文件是新增的**）：

```bash
git diff feature/print-direct-ast -- tests     # 唯一一处新增就是本文件
```

搬过来的树：

| 目录 | 内容 |
| --- | --- |
| `tests/cases/` | 五类语料 4487 份（`token` 1707 / `stdlib` 966 / `exec` 793 / `runtime` 776 / `e2e` 245）+ `case-file.mjs`（文件头指令解析）+ `corpus.mjs`（语料发现层）+ `README.md` |
| `tests/parse/` | 五把尺子（`validate.mjs` / `ts-ast.mjs` / `direct-ast.mjs` / `direct-lint.mjs` / `wide-ast.mjs`）+ `ts-shape.mjs`（转发层）+ `typescript-parsing-gaps.md`（缺口台账） |
| `tests/runtime/` | 执行引擎的判据（`check.mjs` 9000+ 行、`run-cli.mjs`）与 81 份运行时用例 |
| `tests/coverage/` | 覆盖度尺子（`run.mjs` / `sweep.mjs` / `matrix.mjs` / `judge-batch.mjs` / `report.json` / `README.md`） |
| `tests/gates/` | 门禁总入口（`run.mjs`，一次并行跑 11 道门：4 道适用 + 7 道 N/A） |
| `tests/cpp/` | C++ 产物自检（`check.mjs`） |

## 为什么需要这一页：两个分支差了约 1250 轮

`feature/quick-parse` 停在 `b78fa3a8`，而 `tests/` 是 `b78fa3a8` **之后**才长出来的（`87770670` 是第一个带 `tests/` 的提交），此后又跟着约 1250 轮一起演化。也就是说：**这套尺子测的东西，大部分在这个分支上还不存在**，所以「搬过来了」与「跑得动」是两件事。

## 各道门在本分支的实测

实测环境：Windows / node v24.21.0，工作区干净（`git status` 无未跟踪改动）。

| 门 | 命令 | 退出码 | 它读什么 | 结论 |
| --- | --- | --- | --- | --- |
| `cases:check` | `npm run cases:check` | **0** | 只读 `tests/cases/**` + `node_modules/typescript` | ✅ **真的量了本分支**：1707 条 token 用例，0 条不合格 |
| `cases:tsast` | `npm run cases:tsast` | 0 | `build/ts/typescript/**` | ⚠️ **假绿**，见下一节 |
| `cases:direct` | `npm run cases:direct` | 0 | `build/ts/typescript/**` | ⚠️ **假绿**，见下一节 |
| `direct:lint` | `npm run direct:lint` | 1 | `typescript/**/*.xl.md` 规范页 | ❌ 本分支没有 `typescript/`：**31 页规范、0 段 `PrintAst`**，按它自己的规矩「抽到 0 个就是红」判红 |
| `runtime:check` | `npm run runtime:check` | 1 | `runtime/` `typescript-exec/` + `build/ts/runtime/**` | ❌ 先印一屏 `ok`（那批 `ok` 量的是旧产物），随后 `ENOENT: scandir '.../typescript-exec/builtins'` |
| `runtime:cli` | `npm run runtime:cli` | 1 | 同上 + `build/ts/tsrun.js` | ❌ 同上 |
| `coverage` | `npm run coverage` | 1 | 同上 | ❌ 同上 |
| `cpp:check` | `npm run cpp:check` | 1 | `dist/cpp/` | ❌「找不到 `dist/cpp` —— 先跑 `xl_emit` 生成 C++ 产物」（这一道**不在** `gates` 名单里） |
| `samples` | `npm run samples` | 1 | `samples/check.mjs` + `build/ts/cjcli.js` | ❌ 逐字节对不上（`expected` 是本分支那份夹具，`actual` 来自下面那批旧产物） |

`npm run gates` 把其中 8 道一次跑完（= 上表去掉 `cpp:check`），实测 **3 通过 / 5 失败，墙钟 9.1s**：
通过的 3 道是 `cases:check`（真）、`cases:tsast` 与 `cases:direct`（都是假绿）。所以**当前状态下 `gates` 必然红**。

> ↑ 这一段是 `feature/quick-parse` 时期的历史读数（当时的 `build/` 是另一个分支的产物）。
> `feature/all-possible` @ `e41fb978` 的**两态实测**（基线 `8456ec3c` / 当前态）在
> `_coord/REPORT-r7-gates.md`：两态都是 1 绿（`cases:check`）/ 7 红，其中 6 红的失败原因
> **与 R1–R7 无关**——它们要读的源 / 产物在本仓库根本不存在。本节把这件事显式化，
> 让「全量门」的读数分得清「真红」与「结构上不可能跑」。

## 本仓库不适用的门（not-applicable，不构成失败）

**口径**：`not-applicable` 只表示「这道门要读的**源 / 产物**在本仓库根本不存在」，
不是「跑不过」，更不是「放宽判据」。证据见 `_coord/REPORT-r7-gates.md` §5（`git ls-files`
可证缺的源；已知良好的对照克隆 `chore-all-possible-setup` 同样没有这些产物）。

| 门 | 命令 | 为什么在本仓库不可用（缺的源 / 产物） | 证据 |
| --- | --- | --- | --- |
| `runtime:check` | `npm run runtime:check` | 读 `build/ts/runtime/**`；源目录 `runtime/` 不在本仓库，无 `runtime/**/*.xl.md` | 诊断 §5；`runtime/` 不存在 |
| `runtime:cli` | `npm run runtime:cli` | 读 `build/ts/tsrun.js`；入口 `tsrun.xl.md` 不在本仓库 | 诊断 §5；`tsrun.xl.md` 不存在 |
| `cases:tsast` | `npm run cases:tsast` | 读 `build/ts/typescript/print-ast-common.js`；源页 `typescript/print-ast-common.xl.md` 不在本仓库 | 诊断 §5；全仓无 `*print-ast-common*.xl.md` |
| `cases:direct` | `npm run cases:direct` | 同上（同一个 TS 形状投影） | 诊断 §5 |
| `coverage` | `npm run coverage` | 同上 | 诊断 §5 |
| `samples` | `npm run samples` | 读 `build/ts/cjcli.js`；`cjcli.xl.md` 依赖 `./dawn/text/*.xl.md`，而本仓库没有 `dawn/` | 诊断 §1.4 / §5；全仓 `xl build` 报 2 个 `E1006` |
| `cpp:check` | `npm run cpp:check` | `dist/cpp` 不存在；`xl.json` 的 `build.target` 只有 `["ts"]`，C++ 产物要 `xl_emit` 才有 | 诊断 §2.1 / §5 |

**`tests/gates/run.mjs` 的行为**（第 R7 收口改）：

- 对上面这些门**不运行**，打印 `N/A   <门名>   <原因>`；它们计入**跳过**，不计失败。
- 判定只看 `gate.notApplicable` 里列的路径**是否存在**。**只要源出现**（例如 `runtime/` 落地、
  `tsrun.xl.md` 落地、`dist/cpp` 由 `xl_emit` 生成），这一门就照常运行、照常可能红——
  真实失败（脚本抛错、断言不过）不会被吞。
- 汇总结论行分开印「通过 / 失败 / 不适用」三个数；**适用门全绿时 exit 0**。
  `--verbose` 仍然保留每一门的输出尾巴。
- 当前读数：**11 道门 = 4 通过 + 7 不适用，exit 0**。4 道通过的是 `cases:check`（1720/0）、
  `direct:lint`（0 处违反）、`wide-ast`（2494/2494，差异 0）与 `real-dts-ast`（226/226）。

**按 R7 收口口径，不为这些门补源文件**：`dawn/`、`runtime/`、`tsrun.xl.md`、
`print-ast-common.xl.md` 都属另一条产物线，搬进来远超本次验收范围。
门本身与 `package.json` 脚本都保留着，等那条产物线落地即可用。

## 适用的 AST 门：`wide-ast` 与 `real-dts-ast`（本轮收编）

这两道门**不**在 not-applicable 清单里：它们读的是本仓库自己的构建产物，缺产物就是真实失败。

| 门 | 命令 | 语料 / 判据 | 依赖 |
| --- | --- | --- | --- |
| `wide-ast` | `npm run ast:wide`（`node tests/parse/wide-ast.mjs`） | 2505 件：node_modules `.d.ts` 226 + `dist/ts/**` 560 + `samples/**` 3 + `tests/cases/token/**` 1716；跳过 TS 自己非法的 11 件；四方向（结构 / 位置 / 字段）+ 地基（缺 range / 越界 / 未映射）全 0 | `build/ts/typescript/run/source-file-runner.js`（`npm run build`） |
| `real-dts-ast` | `npm run ast:dts`（同一支 `ast:dts`；门名 `real-dts-ast`） | node_modules 226 件真实 `.d.ts`；结构 / 位置 / 字段三栏 | 同上 |

**为什么现在才进池子**：`wide-ast` 是宽尺子（`_coord/diag-wide-ast.mjs` 的正式收编），
它不依赖那条在本仓库不存在的 `print-ast-common`，所以能在这里跑；`real-dts-ast` 一直可用，
只是没被 `GATES` 收进去。两道门共用**唯一一套投影**：`typescript/cases/ast-compare.mjs` 的
`tsAst` / `cjAst`；`real-dts-ast.mjs` 本地那份重复 `cjAst` 已删除（它以前少了字符串导出名的
`Text` 那一格，是第二份真相）。

**各自职责（别把绿点读串）**：

- `ast:cases` + `ast-json-diff`（6171 条快照）：**构造覆盖**，快、每类节点都有代表；它证明「这些构造对」。
- `real-dts-ast`（226 件真实 `.d.ts`）：**真实声明形态**，补手写语料没有的 ambient / 全局增强 / 计算名。
- `wide-ast`（2505 件）：**全量与回归**，含 `dist/ts/**` 自己的产物源码与 `tests/cases/token/**` 全部语料，
  以及 node_modules 里全部 `.d.ts`；它证明「换一份没整理过的输入也一致」。
  三把尺子都绿才算「AST 与 TS 一致」这三层都守住。

跑法（缺产物先 `npm run build`）：

```bash
node tests/parse/wide-ast.mjs                 # 门禁，exit 0/1
node tests/parse/wide-ast.mjs --verbose       # 逐文件差异明细
node tests/parse/wide-ast.mjs --per-file      # 每个文件一行状态（排障）
node tests/parse/wide-ast.mjs --top 20        # 失败清单 / 目录族只印前 20 条
node tests/parse/wide-ast.mjs --only <子串>   # 只跑路径匹配的文件（定位）
```

`wide-ast` 的 `BUILD-MISSING`：缺 `build/ts/typescript/run/source-file-runner.js` 时它直接报
`BUILD-MISSING` 并 exit 1（不是抛 `MODULE_NOT_FOUND`），门里看到的就是这一条。

## ⚠️ 历史读数：`build/` 与 `dist/` 曾经是**另一个分支**的产物

`build/` 与 `dist/` 都在 `.gitignore` 里，所以 `git status` 干净并不代表它们是这个分支的。盘上这一批是上一次 checkout 留下的 **print-direct-ast 产物**：`dist/ts/` 下面是 `typescript/` `runtime/` `typescript-exec/` `token_next/`，**没有 `dawn/`**（本分支的语言层在 `dawn/text/`）。

后果是实测出来的：**凡是读 `build/` 的门，量的都是那个分支的代码，而不是本分支的。** 比如

- `npm run cases:tsast` 退出码 0 —— 它连的是 `build/ts/typescript/print-ast-common.js`；
- `npm run cases:direct` 退出码 0 —— 同理；
- `npm run runtime:check` 前半段印一屏 `ok` —— 同理。

⇒ **本分支上唯一一个「真的量了本分支」的门是 `cases:check`。** 其余门的绿点在没有重建产物之前都不算数。

要让它们有意义，先按本分支重建，并且**先清掉 `dist/` 与 `build/`**（`xl build` 只写不删，混着放会得到半新半旧的产物树）：

```bash
rm -rf dist build
xl build            # 规范 → dist/ts/**/*.ts
npm run compile     # dist/ts → build/ts
```

## 缺什么：按门列的清单

| 缺的东西 | 本分支的现状 | 卡住哪几道门 |
| --- | --- | --- |
| TS 形状投影 `projectRoot`（`typescript/print-ast-common.xl.md` → `dist/ts/typescript/print-ast-common.ts` → `build/ts/typescript/print-ast-common.js`） | 没有这个规范页，也没有模块 | `cases:tsast`、`cases:direct`、`coverage` |
| 第三出口 `Token.PrintAst`（`core/syntax/token.xl.md`） | `git grep PrintAst HEAD` 命中 **0** 处 | `cases:direct`、`direct:lint` |
| 执行引擎（`tsrun.xl.md` + `runtime/` + `typescript-exec/` → `build/ts/tsrun.js`） | 三样都没有 | `runtime:check`、`runtime:cli`、`coverage` |
| C++ 产物（`dist/cpp/`） | 没有 | `cpp:check` |

`tests/parse/ts-shape.mjs` 本身只有 31 行，是一层转发 —— 它要的实现在上面第一行。

## 与 `package.json` 的关系

- 新增 14 条脚本，**名字与命令与 `feature/print-direct-ast` 逐条相同**：`gates`、`gates:verbose`、`tsrun`、`cases:check`、`cases:tsast`、`cases:tsast:cases`、`cases:tsast:cli`、`cases:direct`、`direct:lint`、`runtime:check`、`runtime:cli`、`coverage`、`coverage:sweep`、`cpp:check`。
- **唯一没跟过来的是 `bin.tsrun`**：`bin/tsrun.js` 是运行时入口（不属于 `tests/`），而且它 `require` 的 `build/ts/tsrun.js` 在本分支不存在 —— 挂一条指向不存在文件的 `bin` 是 npm 层面的真坏，不是「等实现落地就能用」。`npm run tsrun` 保留着，等 `tsrun.xl.md` 落地即可用。

## 现在该怎么用

```bash
npm run cases:check      # 语料体检：1720 条用例 0 条不合格（不依赖构建）
npm run ast:wide         # 宽尺子：2505 件语料，解析成功 2494、差异 0（需要先 npm run build）
```

等上面「缺什么」那几样落地、并且产物按本分支重建之后：

```bash
npm run gates            # 11 道门一次跑完：4 通过 + 7 不适用，exit 0
```
