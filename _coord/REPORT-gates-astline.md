# REPORT gates-astline — ToAstLine 重构后统一 gates 全量复验

- 日期: 2026-10-26
- 角色: 验收成员（只报告，不修代码）
- 被验收分支: `refactor/astline` @ `4969338f7b7dec4354587122b2e179a1e836d0ba`
  （ToAstLine 重构 + 语料基线重算；含 `465529d1` W1 渲染器、`8c6e82ec`/`84b2cf15` ToAstLine 取代 ToXmlString、
  `325dbaa0`/`7a48baa4` AstOperator 兜底、`28c72439`/`1d1fdc3a` 语料基线重算、`5fcf0398` 合并）
- 工作分支: `gates-astline`（从 `refactor/astline` 建，本报告是它唯一的新增提交）
- 验收克隆: `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-astline`
- 基线克隆: `C:\Users\Admin\Documents\GitHub\xl-example-set\gates-astline-base` @ `633d22ed`（仅用于 A/B 对比）
- canonical: `C:\Users\Admin\Documents\GitHub\xl-example`（只作为克隆源；全程未 checkout、未改动、未在其中构建）
- 结论一句话: **11 道门 4 通过 / 0 失败 / 7 不适用，exit 0，与上一轮 `b9b47f21` 的读数完全一致；无 FAIL，因此无回归信号。但 `direct:lint` 这一道门的 PASS 不含证据（它扫到 0 段方法体，且这一点在 base 上完全相同）——见 §6。**

---

## 1. 环境

| 项 | 值 |
| --- | --- |
| OS | Windows（pwsh 执行；gates 由 `npm run gates` 起 `node` 子进程） |
| node / npm | v24.21.0 / 11.19.0 |
| typescript | 6.0.3（来自 canonical 的 `node_modules`，`Copy-Item` 复制，25.8 MB） |
| CPU | 16 逻辑核（gates 自报「11 路，16 核」） |
| 克隆方式 | `git clone <canonical> gates-astline` → `git fetch <canonical> refactor/astline` → `git checkout -b gates-astline FETCH_HEAD` |
| 说明 | canonical 里 `refactor/astline` 只是本地 `refs/heads/` 引用，无 `origin/` 跟踪引用，所以必须用 `git fetch <路径> <分支>` 取 `FETCH_HEAD` 再建分支 |

```
$ git rev-parse HEAD
4969338f7b7dec4354587122b2e179a1e836d0ba
$ git rev-parse --abbrev-ref HEAD
gates-astline
$ git status --porcelain        # 构建前 / 构建+全部测试后 / 写报告前 各查一次
（空）
```

> `dist/` 与 `build/` 都在 `.gitignore` 里（`.gitignore:2 dist`、`build`），产物不入库，所以「工作区干净」与「产物已生成」不矛盾。

## 2. 构建

### 2.1 xl_build（DSH 工具）

调用：`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、**不传 out**（走仓库 `xl.json` 的 `build.out = "dist"`）。

```
xl build — 566 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)
```

**与预期一致：566 written / 0 error / 3 warning。** 3 条 warning 全部是既有 E1107（同名类型在多页声明）：

```
typescript/tokens/types/class-get-accessor-possible-shape.xl.md:16: warning[E1107]: type "GetAccessorPossibleShape" is also declared in typescript/tokens/types/get-accessor-possible-shape.xl.md
typescript/tokens/types/class-index-signature-possible-shape.xl.md:16: warning[E1107]: type "IndexSignaturePossibleShape" is also declared in typescript/tokens/types/index-signature-possible-shape.xl.md
typescript/tokens/types/class-set-accessor-possible-shape.xl.md:16: warning[E1107]: type "SetAccessorPossibleShape" is also declared in typescript/tokens/types/set-accessor-possible-shape.xl.md
```

### 2.2 tsc

```
$ node node_modules/typescript/bin/tsc -p .
TSC_EXIT=0
```

### 2.3 基线克隆（同配方，用于 §5 的 A/B）

`gates-astline-base` = `git clone <canonical>` + `git checkout feature/all-possible` → HEAD `633d22edbe8acb06d18b7c7ad108b36ac7cb27ff`，`git status --porcelain` 空。
构建读数与分支**逐项相同**：`566 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)`、`tsc` exit 0、3 条 E1107 同一批。

## 3. 三条目标用例基线

被验收分支上的实测（工作目录 = 克隆根）：

| 用例 | 期望基线 | 实测 | exit | 墙钟 |
| --- | --- | --- | --- | --- |
| `npm run tts` | PASS 6 / FAIL 8 / 14，exit 1 | **PASS 6 / FAIL 8 / 14** | **1** | ~0.9s |
| `npm run tts:incremental` | PASS 14 / FAIL 0 / 14，exit 0 | **PASS 14 / FAIL 0 / 14**（其中 1 步仅差文档内嵌注释，计 PASS） | **0** | ~1.0s |
| `npm run tts:corpus` | 1723 / 差异 0 | **文件数 当前 1723 / 基线 1723（解析异常 7）；一致 1723；差异 0（变化 0 / 缺失 0 / 新增 0）** | **0** | ~2.3s |

三条**逐项复现**，重构产物本身没有坏：legacy 路径仍然是那 6 通过 / 8 失败（第 8 步起是 legacy 模式已知的差异，不是本轮引入），增量路径 14/14 全绿，语料 1723 件零差异。

## 4. 统一 gates（`npm run gates -- --jobs 11`）

**没有遇到 `EPERM`/spawn/pipe 问题，`npm run gates` 直接跑通，因此未降级为逐道门串行执行。**

第一次运行：`EXIT=0`，墙钟 **8.5s**（门内自报 8.5s）。第二次复跑：`EXIT=0`，墙钟 8.1s，**逐门判定与计时完全相同**（判定稳定、无抖动）。

```
11 道门并行跑（11 路，16 核）：runtime:check · runtime:cli · cases:tsast · cases:direct · direct:lint · samples · cases:check · wide-ast · real-dts-ast · coverage · cpp:check

N/A   runtime:check           runtime 不存在（执行引擎的源目录 runtime/ 不在本仓库（诊断 §5））
N/A   runtime:cli             tsrun.xl.md 不存在（运行时入口 tsrun.xl.md 不在本仓库（诊断 §5））
N/A   cases:tsast             typescript/print-ast-common.xl.md 不存在（TS 形状投影的源页不在本仓库（全仓无 *print-ast-common*.xl.md））
N/A   cases:direct            typescript/print-ast-common.xl.md 不存在（TS 形状投影的源页不在本仓库（全仓无 *print-ast-common*.xl.md））
ok    direct:lint       0.4s  第三出口的约定 0 条违反（… 25 条约定名 …）
N/A   samples                 dawn 不存在（cjcli.xl.md 依赖 ./dawn/text/*.xl.md，本仓库没有 dawn/（全仓 xl build 报 E1006））
ok    cases:check       0.7s  1720 条用例，0 条不合格
ok    wide-ast          8.3s  PASS 宽尺子：全部解析成功、崩溃 0、AST 逐节点一致、地基 0 处
ok    real-dts-ast      3.5s  真实 .d.ts 全量解析成功且 AST 逐节点一致
N/A   coverage                typescript/print-ast-common.xl.md 不存在（TS 形状投影的源页不在本仓库（全仓无 *print-ast-common*.xl.md））
N/A   cpp:check               dist/cpp 不存在（要 xl_emit 生成 C++ 产物（xl.json 的 build.target 只有 ts））

11 道门：4 道通过、0 道失败、7 道不适用（NOT-APPLICABLE，按跳过计）；墙钟 8.5s
```

### 门表（name / 判定 / 摘要 / 耗时）

| # | 门 | 判定 | 摘要 | 耗时 |
| --- | --- | --- | --- | --- |
| 1 | `runtime:check` | **N/A** | `runtime/` 源目录不在本仓库 | 不运行 |
| 2 | `runtime:cli` | **N/A** | `tsrun.xl.md` 不在本仓库 | 不运行 |
| 3 | `cases:tsast` | **N/A** | `typescript/print-ast-common.xl.md` 不在本仓库 | 不运行 |
| 4 | `cases:direct` | **N/A** | 同 #3（同一份源页缺失） | 不运行 |
| 5 | `direct:lint` | **ok** | 「第三出口的约定 0 条违反」（25 条约定名）；**但扫描段数 = 0，见 §6** | 0.4s |
| 6 | `samples` | **N/A** | `dawn/` 不在本仓库 | 不运行 |
| 7 | `cases:check` | **ok** | 1720 条用例，0 条不合格 | 0.7s |
| 8 | `wide-ast` | **ok** | 全部解析成功、崩溃 0、AST 逐节点一致、地基 0 处 | 8.3s |
| 9 | `real-dts-ast` | **ok** | 真实 `.d.ts` 全量解析成功且 AST 逐节点一致 | 3.5s |
| 10 | `coverage` | **N/A** | `print-ast-common.xl.md` 不在本仓库 | 不运行 |
| 11 | `cpp:check` | **N/A** | `dist/cpp` 不存在（要 `xl_emit` 生成 C++ 产物） | 不运行 |

**合计：11 = 4 PASS / 0 FAIL / 7 N/A，exit 0。**

## 5. 基线 A/B（`633d22ed` vs `4969338f`）

因为没有 FAIL，按派工口径「只对失败门做基线对比」本来不必建基线克隆。但 §6 发现 `direct:lint` 的判定可能是空的，
为了把「既有 vs 回归」判死，仍按同配方建了 `gates-astline-base`（`633d22ed`）并跑同一道 gates：

| | base `633d22ed` | branch `4969338f` | 是否变化 |
| --- | --- | --- | --- |
| xl_build | 566 / 0 err / 3 warn | 566 / 0 err / 3 warn | 否 |
| tsc | exit 0 | exit 0 | 否 |
| gates 合计 | 4 PASS / 0 FAIL / 7 N/A，exit 0，墙钟 7.9s | 4 PASS / 0 FAIL / 7 N/A，exit 0，墙钟 8.5s | **否** |
| PASS 集合 | `direct:lint`、`cases:check`、`wide-ast`、`real-dts-ast` | 同左 | **否** |
| N/A 集合 | `runtime:check`、`runtime:cli`、`cases:tsast`、`cases:direct`、`samples`、`coverage`、`cpp:check` | 同左（7 条理由逐字相同） | **否** |
| `cases:check` 用例数 | 1720，0 不合格 | 1720，0 不合格 | 否 |
| `direct:lint` 原始输出 | 「566 页规范，第三出口（PrintAst）**0 段**」 | 「566 页规范，第三出口（PrintAst）**0 段**」 | 否（两端 27 行输出**逐字节相同**） |

结论：**基线与分支的 gates 读数逐门完全一致，ToAstLine 重构没有改变任何一道门的判定。**

## 6. FAIL 归因

**本轮没有任何 FAIL，因此没有「失败门」需要归因，也没有回归。**

但必须把 `direct:lint` 的 PASS 说清楚，它是本轮唯一一个「看起来绿、实际不含证据」的判定：

1. 它扫的是 `## method PrintAst:(ctx:PrintAstCtx, v:any)=>AstNode | undefined` 这一行
   （`tests/parse/direct-lint.mjs:105` 的 `HEAD_DIRECT_RE`，逐行整行匹配）。
2. 全仓 `*.xl.md` 里这个标题**一处也没有**：分支 `4969338f`、canonical `633d22ed`、上一轮 `b9b47f21` 三个提交上实测都是 **0 处**
   （`git grep '^## method PrintAst' <rev> -- '*.xl.md'` → 0 个文件；`PrintAst` 在 `*.xl.md` 里出现次数同样为 0）。
   于是 `directSections = 0`，所有逐页判据的计数恒为 0，该门打印「0 段」并以 exit 0 结束。
3. 它**没有**「扫到 0 段就红」的守卫：`direct-lint.mjs:1875` 只在 `violations.length > 0` 时 exit 1，
   `direct:lint.mjs:103` 那句注释「`directSections` 掉到 0 ⇒ 这一门当场红」与代码现状不符（是句陈注释）。
4. 这一步在 base 上**完全相同**（base 的输出与分支 27 行逐字节相同，也报「0 段」）。
   原因是 base 上的第三出口渲染器叫 `ToXmlString`，而这一门从更早的轮次起就只认 `PrintAst` 这个名字。

**归因：`direct:lint` 的空扫是既有状态（既有，不是本轮回归）。** 本轮没有让它变好，也没有让它变坏。

## 7. ToAstLine 相关风险点

### 7.1 新增/重写的 ToAstLine 方法体，没有任何静态门看着

本轮把 13 页 `*.xl.md` 的渲染器换掉（`ToXmlString` → `ToAstLine(indent)`），
新增的方法体是 `core/syntax/token.xl.md:353` 的 `## method ToAstLine:(indent:int)=>string`，
另有 `const-string.xl.md`、`string.xl.md`、`bracket.xl.md`、`shape-token.xl.md` 等页的方法体被重写。

- `direct:lint` 的 `HEAD_DIRECT_RE` 只认 `PrintAst`（见 §6）⇒ **这批新方法体不在它的判据里**。
- `wide-ast` / `real-dts-ast` 比的是**AST 节点**（`source-file-runner` 建树后逐节点比对），
  这两个脚本里 `ToAstLine` 出现次数为 **0**，即它们不校验渲染出来的文本。
- gates 里唯一提到 `ToAstLine` 的是 `cases:check`（`tests/parse/validate.mjs` 2 处），
  但那两处只是把 `ToAstLine` 当**产物标签名的来源**写进注释/标签表，并不比对渲染结果。

**⇒ 在 gates 这一层，渲染出来的文本没有任何一道门比对。** ToAstLine 的正文只由目标用例覆盖：`tts` 14/14 与 `tts:corpus` 1723/0（本轮都跑了且都绿）。

### 7.2 语料基线是本分支重算的，所以「差异 0」不等于「与重构前输出一致」

`tests/parse/token-time-shapes/legacy-corpus-baseline.json` 在本分支被重算：
与 `633d22ed` 相比 **1717 行插入 / 1717 行删除**，1723 条指纹里 **1716 条变了**（7 条未变，全是解析异常文件）。

这**不是**语义回归信号，而是本重构的设计后果——渲染格式确实换了：

| | base `633d22ed` | branch `4969338f` |
| --- | --- | --- |
| 方法 | `ToXmlString(0)` | `ToAstLine(0)` |
| 形态 | 单行 XML，无位置信息 | 缩进树，每节点带 `pos=` / `src=[a,b)` |
| `samples/declarations.ts` | 11 587 字符 / 1 行 | 17 870 字符 / 287 行 |

为了把「格式变了但树没变」这件事测出来，本轮额外做了一次**跨版本结构比对**（临时脚本在仓库外，未改任何源码/期望文件）：
用两个克隆各自构建产物渲染全部 1723 件语料，从 base 的 XML 与 branch 的缩进树里各抽出**节点标签序列**，逐件比对：

```
（先把两个克隆各自的绝对根路径归一化成 <ROOT>，否则异常文案里内嵌的路径会造出假差异）
identical tag sequences : 1716
identical error text    : 7
REAL diffs              : 0
files                   : 1723     （1716 渲染成功 + 7 解析异常，与 tts:corpus 自报「解析异常 7」一致）
```

**1716 件语料在重构前后的节点标签序列逐一相同 ⇒ 树结构没变，变的是渲染格式。**

### 7.3 其余观察

- `cases:check` 1720 条、0 不合格，与 base 的 1720 完全一致，用例面没有被本轮改动。
- 3 条 E1107 warning 是本轮之前就有的，未增加。
- 本轮的 `package.json` 与 `tests/parse/token-time-shapes.mjs` 有改动（`tts:incremental` 等脚本/工具侧），
  三条目标用例已按权威基线逐项复现，说明工具侧改动没有改变这三条读数。

## 8. 结论

1. **构建**：566 written / 0 error / 3 既有 E1107 warning；`tsc` exit 0 —— 与预期一致。
2. **三条目标用例**：legacy 6/8/14（exit 1）、incremental 14/0/14（exit 0）、corpus 1723/差异 0（exit 0）—— **全部复现**。
3. **统一 gates**：11 道门 = **4 PASS / 0 FAIL / 7 N/A**，**exit 0**；复跑一次判定与计时完全相同。
4. **与上一轮（`b9b47f21`：4 PASS / 0 FAIL / 7 N/A，exit 0）一致**；并且与 base `633d22ed` 的 A/B 也逐门一致
   ⇒ **ToAstLine 重构没有改变 gates 结论。**
5. **FAIL 归因**：无 FAIL ⇒ 无回归。`direct:lint` 的空扫是**既有**状态（base 上逐字节相同），本轮未引入也未消除。
6. **是否需要派修复成员**：**本轮验收不需要**（无回归、无红门）。
   若要提升证据质量，可另开一项**非本轮范围**的工作：让 `direct:lint` 的标题正则指向现状方法名（`ToAstLine`），
   或补一条「扫到 0 段即红」的守卫——那属于改 gates，本轮硬约束不允许。

## 9. 复现命令

```powershell
# 0) 克隆与分支
$set = "C:\Users\Admin\Documents\GitHub\xl-example-set"
git clone C:\Users\Admin\Documents\GitHub\xl-example "$set\gates-astline"
git -C "$set\gates-astline" fetch C:\Users\Admin\Documents\GitHub\xl-example refactor/astline
git -C "$set\gates-astline" checkout -b gates-astline FETCH_HEAD
git -C "$set\gates-astline" rev-parse HEAD          # 期望 4969338f7b7dec4354587122b2e179a1e836d0ba
Copy-Item C:\Users\Admin\Documents\GitHub\xl-example\node_modules "$set\gates-astline\node_modules" -Recurse -Force

# 1) 构建（DSH 工具）：xl_build { cwd: $set\gates-astline, paths: ["core","typescript"], targets: ["ts"] }
#    期望 566 written / 0 error / 3 warning
cd "$set\gates-astline"; node node_modules/typescript/bin/tsc -p .   # 期望 exit 0

# 2) 三条目标用例
npm run tts             # 期望 PASS 6 / FAIL 8 / 14，exit 1
npm run tts:incremental # 期望 PASS 14 / FAIL 0 / 14，exit 0
npm run tts:corpus      # 期望 1723 / 差异 0，exit 0

# 3) 统一 gates
npm run gates -- --jobs 11   # 期望 4 通过 / 0 失败 / 7 不适用，exit 0

# 4) 基线 A/B（可选，只用于归因）
git clone C:\Users\Admin\Documents\GitHub\xl-example "$set\gates-astline-base"
git -C "$set\gates-astline-base" checkout feature/all-possible   # 期望 633d22ed
Copy-Item C:\Users\Admin\Documents\GitHub\xl-example\node_modules "$set\gates-astline-base\node_modules" -Recurse -Force
# 之后在 base 里重复步骤 1) 与 3)
```

## 10. 边界

- **未改动任何源码 / gates / 期望文件 / `IMPORTANCE.md` / `basic-tokens`**；本提交只新增本报告一个文件。
- 未 push、未碰 canonical（canonical 全程只读：仅 `git rev-parse` / `git grep` / `git diff` / `git clone` 源）。
- 跨版本结构比对用的临时脚本写在 `%TEMP%\gates-astline-diff\`（仓库之外），不属于交付物。
- `_coord` 在本仓库是**被跟踪**目录（17 个文件），且 `git check-ignore` 判定本报告不被忽略，因此按普通 `git add` 提交，未用 `-f`。
