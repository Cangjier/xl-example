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
| `tests/parse/` | 四把尺子（`validate.mjs` / `ts-ast.mjs` / `direct-ast.mjs` / `direct-lint.mjs`）+ `ts-shape.mjs`（转发层）+ `typescript-parsing-gaps.md`（缺口台账） |
| `tests/runtime/` | 执行引擎的判据（`check.mjs` 9000+ 行、`run-cli.mjs`）与 81 份运行时用例 |
| `tests/coverage/` | 覆盖度尺子（`run.mjs` / `sweep.mjs` / `matrix.mjs` / `judge-batch.mjs` / `report.json` / `README.md`） |
| `tests/gates/` | 门禁总入口（`run.mjs`，一次并行跑 8 道门） |
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

## ⚠️ 假绿：`build/` 与 `dist/` 现在是**另一个分支**的产物

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
npm run cases:check      # 唯一一道现在就绿、且真的量了本分支的门
```

等上面「缺什么」那几样落地、并且产物按本分支重建之后：

```bash
npm run gates            # 8 道门一次跑完
```
