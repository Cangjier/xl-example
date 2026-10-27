# T4 基线：双触发源 possible（Close / BracketCreate）目标用例矩阵

- 分支：`feature/all-possible-1027-cases`（基于 `feature/all-possible-1027` @ `70c3d632`）
- 工作副本：`C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-cases`
- 构建：`xl_build(paths=["core","typescript"], targets=["ts"])` → `dist/ts`（636 文件，3 warning）→ `node node_modules/typescript/bin/tsc -p .` → `build/ts`（失败 0）
- 立场：**未重构的基线**。本报告只记录「今天是什么样」，供重构后逐条对比；不跑 gates、不改源码。
- 变量命名现状：`PossibleSource` / `BracketCreate` 在 `70c3d632` 全仓 **0 命中**（`core` / `typescript` / `tests` / `docs` / `_reports` / `_coord`），
  所以「possible 只由 Close 触发」是当前实现的默认事实，本基线就是它的读法。

## 一条命令

```powershell
node tmp/target-cases.mjs            # 表格 + 汇总（report-only，退出码 0）
node tmp/target-cases.mjs --strict   # 有 error / diff 即退出码 1（重构后当门用）
node tmp/target-cases.mjs --only=if,switch   # 按文件名/源码过滤
node tmp/target-cases.mjs --json     # 机器可读（含 source / firstHop / deterministic）
```

前置：`build/ts` 必须存在（先 `xl_build` 再 `tsc -p .`）。探针加载
`build/ts/typescript/run/source-file-runner.js` 与 `build/ts/typescript/tokens/statements/statement-route-util.js`，
对拍口径复用 `typescript/cases/ast-compare.mjs` 的 `flatten` / `kindOf` / `cjAst` / `tsAst`
（与 `tests/statement-possible/harness.mjs` 同一套）。

## 用例

`tests/cases/all-possible-1027/` 共 **30 条**，每文件头部带 `// xl:note`（这一条在测什么）与
`// xl:expect`（**实测基线** status，不是任务假设）。正文口径与 `tests/cases/case-file.mjs` 的
`caseBody()` 一致：所有 `// xl:` 开头整行在解析前剥掉，所以注释不参与逐字对拍。

| # | 文件 | 覆盖点 |
| --- | --- | --- |
| 001 | `if-empty-block` | `if (a) {}` 块体 if |
| 002 | `if-bare-statement` | `if (a) b;` 无块体 |
| 003 | `if-else-empty-blocks` | `if (a) {} else {}` |
| 004 | `if-nested-empty-block` | `if (a) { if (b) {} }` |
| 005 | `if-else-if-chain` | `if (a) {} else if (b) {} else {}` |
| 006 | `while-empty-block` | `while (a) {}` |
| 007 | `do-while-empty-block` | `do {} while (a)` |
| 008 | `for-empty` | `for (;;) {}` |
| 009 | `for-of-empty-block` | `for (const x of y) {}` |
| 010 | `for-in-empty-block` | `for (const x in y) {}` |
| 011 | `switch-case-empty-block` | `switch (a) { case 1: {} }` |
| 012 | `switch-case-bare` | `switch (a) { case 1: b; }`（011 的对照组） |
| 013 | `try-catch-empty` | `try {} catch {}` |
| 014 | `try-finally-empty` | `try { } finally { }` |
| 015 | `try-catch-finally` | `try {} catch (e) {} finally {}` |
| 016 | `function-empty-body` | `function f() {}` |
| 017 | `class-method-empty-body` | `class C { m() {} }` |
| 018 | `arrow-empty-body` | `const f = () => {}` |
| 019 | `class-constructor-empty` | `class C { constructor() {} }` |
| 020 | `object-literal-empty` | `const o = {}`（无分号，兼测 EOF/ASI） |
| 021 | `call-empty-object-arg` | `f({})` |
| 022 | `ternary-empty-objects` | `const a = b ? {} : {}` |
| 023 | `paren-empty-object` | `({})` |
| 024 | `array-literal-empty` | `const a = []` |
| 025 | `call-empty-args` | `f()` |
| 026 | `if-regex-test` | `if (/x/.test(s)) {}` — **唯一实测回退** |
| 027 | `if-block-comment-only` | `if (a) { /*c*/ }` |
| 028 | `if-empty-statement` | `if (a) ;` |
| 029 | `if-nested-block-comment` | `if (a) { if (b) { /*x*/ } }` |
| 030 | `if-line-comment-body` | `if (a) {` + 行注释 + `}` |

探针口径（列含义）：

- `status`：`ok` / `moved` / `diff` / `error` / `fallback`
  - `diff`：kind 序列、节点数、或 `text`/`name`/`isTypeOnly` 不同（`detail` 给首个分歧点 `#i`）
  - `moved`：kind 序列相同但 `pos`/`end` 不同
  - `error`：`Parse` 抛异常（`detail` 给异常首行）
  - `fallback`：`Parse` 之后 `StatementRouteUtil.LastFileFallback === true`
- `match`：`fallback` 情形下回退**之后**的 AST 对拍结果
- `fb`：本 case 是否触发 `LastFileFallback`
- `pin`：实际 status 是否等于文件头 `xl:expect`（`hit` / `MISS`）
- `detail`：逐字一致 / 首个分歧点 / 首跳原因

`LastFileFallback` 的语义（`build/ts/typescript/run/source-file-runner.js:18-27`）：
shell 路径 `ParseCore(..., true)` **抛异常** → `FileFallbackCount + 1` → 改用 `ParseCore(..., false)`（legacy）重来 → 置真。
异常被 `catch` 吞掉，所以探针另调一次 `SourceFileRunner.ParseCore(source, "case.ts", true)` 把**首跳**复现出来。

## 基线结果（30/30）

运行期开关：`EnableShellExpressions=true`、`EnableBracketRoleCatalog=true`、`EnableFileFallback=true`、`EnableControlFlowShell=true`。

| 文件 | status | match | fb | pin | detail |
| --- | --- | --- | --- | --- | --- |
| 001-if-empty-block | ok | ok | - | hit | 逐字一致 |
| 002-if-bare-statement | ok | ok | - | hit | 逐字一致 |
| 003-if-else-empty-blocks | ok | ok | - | hit | 逐字一致 |
| 004-if-nested-empty-block | ok | ok | - | hit | 逐字一致 |
| 005-if-else-if-chain | ok | ok | - | hit | 逐字一致 |
| 006-while-empty-block | ok | ok | - | hit | 逐字一致 |
| 007-do-while-empty-block | ok | ok | - | hit | 逐字一致 |
| 008-for-empty | ok | ok | - | hit | 逐字一致 |
| 009-for-of-empty-block | ok | ok | - | hit | 逐字一致 |
| 010-for-in-empty-block | ok | ok | - | hit | 逐字一致 |
| 011-switch-case-empty-block | ok | ok | - | hit | 逐字一致 |
| 012-switch-case-bare | ok | ok | - | hit | 逐字一致 |
| 013-try-catch-empty | ok | ok | - | hit | 逐字一致 |
| 014-try-finally-empty | ok | ok | - | hit | 逐字一致 |
| 015-try-catch-finally | ok | ok | - | hit | 逐字一致 |
| 016-function-empty-body | ok | ok | - | hit | 逐字一致 |
| 017-class-method-empty-body | ok | ok | - | hit | 逐字一致 |
| 018-arrow-empty-body | ok | ok | - | hit | 逐字一致 |
| 019-class-constructor-empty | ok | ok | - | hit | 逐字一致 |
| 020-object-literal-empty | ok | ok | - | hit | 逐字一致 |
| 021-call-empty-object-arg | ok | ok | - | hit | 逐字一致 |
| 022-ternary-empty-objects | ok | ok | - | hit | 逐字一致 |
| 023-paren-empty-object | ok | ok | - | hit | 逐字一致 |
| 024-array-literal-empty | ok | ok | - | hit | 逐字一致 |
| 025-call-empty-args | ok | ok | - | hit | 逐字一致 |
| **026-if-regex-test** | **fallback** | ok | YES | hit | 整条文件回退 legacy，AST 仍逐字一致；**首跳：`缺少标识符`** |
| 027-if-block-comment-only | ok | ok | - | hit | 逐字一致 |
| 028-if-empty-statement | ok | ok | - | hit | 逐字一致 |
| 029-if-nested-block-comment | ok | ok | - | hit | 逐字一致 |
| 030-if-line-comment-body | ok | ok | - | hit | 逐字一致 |

```
SUMMARY: cases=30 ok=29 moved=0 diff=0 error=0 fallback=1 | LastFileFallback=1（其中回退后 AST 仍 ok=1） | pin-miss=0
```

| 计数 | 值 |
| --- | --- |
| cases | 30 |
| **ok** | **29** |
| **fallback** | **1**（026-if-regex-test，首跳 `缺少标识符`） |
| **diff** | **0** |
| **error** | **0** |
| moved | 0 |
| 确定性（两次 Parse 的 `ToAstLine(0)` 逐字节相同） | 29/29 有 XML 的 case 全真；无一条非确定 |
| pin-miss | 0 |

## 结论与对重构的含义

1. **基线是干净的**：30 条里 29 条逐字对拍通过，0 diff / 0 error。这说明「括号创建时触发 possible」这件事
   今天**没有**在树形状上留下任何可见债务——所以重构后**任何** `diff` / `error` / 新增 `fallback`
   都直接算回归，不需要再区分「本来就坏」。
2. **已知 fallback 只有 1 条，不是 4 条**。任务给的假设是
   `if (/x/.test(s)) {}`、`if (a) { /*c*/ }`、空体 / 嵌套 / 注释变体都属于已知 fallback；
   实测只有 `026-if-regex-test` 真回退（`LastFileFallback=YES`，首跳 `缺少标识符`），
   而 `027`（块注释）、`028`（空语句 `;`）、`029`（两层嵌套 + 注释）、`030`（行注释）**全部 ok 且不回退**。
   → 重构时不要把「注释 / 空体」当既有缺口放过：它们今天是硬通过，退化成 fallback 就是回归。
3. **唯一要盯的既有缺口是 `026`**：正则字面量做条件时 shell 路径抛 `缺少标识符`，靠 `ParseFileFallback`
   整条回退 legacy 才拿到正确 AST。这条的 `xl:expect` 写的是 `fallback`——
   重构后若它变成 `ok`，pin 会 MISS，那是**改进**（可以收紧成 `ok`）；若它变成 `error`/`diff`，那是坏消息。
4. **块体（`if(){}` 这类最要紧的形态）今天全绿**：001/003/004/005/011/013/014/015/016/017/018/019/029 覆盖了
   `if` / `switch-case` / `try` / 函数体 / 方法体 / 构造器体 / 箭头体的**空块体**，
   逐字对拍全部一致、且都不回退。新增的 `BracketCreate` 触发最容易重复 build 或丢 `Block` 层，
   这 13 条是直接探针。
5. **括号即表达式的对照组也在**：020–025（`{}` / `f({})` / 三元两支 / `({})` / `[]` / `f()`）
   把「括号创建」的另一种角色（A4 对象、P1 调用、P4 分组、数组）摆在同一条轴上。
   若 `BracketCreate` 触发 possible 抢在建树之前，最先塌的就是这 6 条。

## 重构后怎么用

```powershell
Set-Location C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-cases
xl_build { cwd: ".", paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .
node tmp/target-cases.mjs            # 与上面的基线表逐行对比
node tmp/target-cases.mjs --strict   # 当门用：任何 error/diff 退出码 1
```

判据（按严重度）：

| 变化 | 判定 |
| --- | --- |
| 任一 `ok` → `diff` / `error` | **回归**，直接拦 |
| 任一 `ok` → `fallback` | **回归**（整条文件退到 legacy，形状对但增量路径已死） |
| `026` `fallback` → `ok` | **改进**，把该文件 `xl:expect` 改成 `ok` 收账 |
| `pin-miss` 出现但 status 是 `ok`/`fallback` 互转 | 只有 `026` 这一条允许，其余按上两行判 |
| `moved` 出现 | 结构同、位置挪，通常是新触发多走了一次空格/收口，需人看 `detail` 的 `#i` |

## 边界

- 未跑 gates（`tests/gates` 等）—— 按任务约定，本轮只跑这 30 条目标 case。
- 未改任何源码：本分支只新增 `tests/cases/all-possible-1027/`（30 个 `.ts`）、`tmp/target-cases.mjs`、本报告。
  用例目录不在 `tsconfig.json` 的 `include`（只有 `dist/**/*.ts`）内，也不属于 `tests/cases` 既有的
  `e2e`/`exec`/`runtime`/`stdlib`/`token` 五个分类，所以不会被既有语料跑法捡走。
- `tmp/gen-cases.mjs` 是生成本批用例的一次性脚本，按任务约定**不入库**；
  用例文件本身是最终产物，改单条直接改 `.ts` 即可。
- `tmp/` 被 `.gitignore:11` 忽略，而探针按任务约定就落在 `tmp/target-cases.mjs`，
  所以它是 `git add -f` 强制入库的（唯一一条强制项）。
