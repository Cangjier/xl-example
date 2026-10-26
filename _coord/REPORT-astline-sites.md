# REPORT · astline-sites（W2：调用点与目标工具切到 `ToAstLine`）

- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\astline-sites`，分支 **`astline-sites`**
- 基线：canonical `xl-example` feature/all-possible @ **`633d22ed`**（主仓库只读，未改动）
- 提交：
  - **`15e3f1ec`** `refactor(astline): 调用点与目标工具切到 ToAstLine`（41 文件，+286 / −358）
  - **`8c6e82ec`** W1 `refactor(astline): Token.ToAstLine(indent) 取代 ToXmlString`
  - **`465529d1`** `chore(astline): 引入 W1 渲染器`（`git merge --no-ff`，**无冲突**）
- 未 push；**未跑任何既有 gate**（`npm run gates` 全程未执行）；未新增 npm 脚本。

---

## 1. 调用点清单（canonical `633d22ed` 实测：113 处命中）

`rg` 在本机不可用，改用 ripgrep 等价检索（DSH `grep` 工具）得到 113 处。

### 1.1 `.mjs`：33 个文件

| 分类 | 文件 | 改法 |
| --- | --- | --- |
| 目标用例工具 | `tests/parse/token-time-shapes.mjs` | 删除自绘树，树改为 `root.ToAstLine(0)`（见 §2） |
| 语句接管 / 对拍 | `tests/statement-possible/*.mjs` 共 **28** 个：`block-body-takeover`、`comma-import-fallback`、`control-flow-body-takeover`、`control-flow-boundary`、`control-flow-takeover`、`declaration-shell-boundary`、`declaration-shell-call-position`、`declaration-statement-takeover`、`decorated-declaration-takeover`、`eof-last-token-close`、`export-bare-variable-default-async`、`export-no-semicolon-eof`、`final-matrix`、`harness`、`import-expression-cases`、`op-ast-proof`、`op-proof`、`perf`、`r1-repro`、`s4ag-sw-takeover`、`s4j-function-body`、`s4l-await-body`、`s4y-case-clause-takeover`、`shape-ast-coverage`、`short-family-boundary`、`tail-residual-cases`、`throw-shape-alive`、`yield-boundary` | `.ToXmlString()` → `.ToAstLine(0)`；比较语义不变（两侧都换成同一渲染器，逐字节比较仍然有效） |
| §1 miss 漏检 | `tests/direct-build/target-cases.mjs` | 同上；`typeof root.ToXmlString === "function"` → `typeof root.ToAstLine === "function"`，错误文案同步 |
| 运算符可行性 | `tests/feas-operator/harness.mjs` | 同上；`baselineXml`/`prototypeXml` → `baselineAstLine`/`prototypeAstLine` |
| buffer 基准 | `tests/bench/buffer-equivalence.mjs` | 调用点是 `ToString()`（W1 已由 `ToAstLine(0)` 实现），只同步注释里的方法名 |
| gate 源 | `tests/parse/validate.mjs` | 仅注释提到方法名，改口径为 `ToAstLine`（运行逻辑不依赖该字符串） |

### 1.2 文档（当前口径，已同步）

`README.md`、`docs/Final.md`、`docs/statement-ast-pipeline.md`、`docs/direct-candidate-pipeline.md`、`docs/typescript-parsing-gaps.md`（在 `tests/parse/`）、`tests/parse/token-time-shapes/README.md`、`docs/cpp-design-notes.md`、`docs/xl-to-cpp.md`。

> C++ 端口两篇（`docs/xl-to-cpp.md`、`docs/cpp-design-notes.md`）只做了**方法名文本同步**（`std::string ToAstLine(int indent) override` 等）。C++ 端口的样本/期望（`samples/*.expected.xml`）重生成不在本任务范围（`cpp:check` 是 gate，按约定不跑）。

### 1.3 未改（有意保留）

- `core/**/*.xl.md`：W1 的所有权（合并后只剩 1 处历史引用，见 §5）。
- `_coord/*`：历史报告/契约（`CONTRACT-tts-incremental.md`、`REPORT-tts-final.md`、`REPORT-tts-wp-a.md`、W1 的 `CONTRACT-astline.md` / `REPORT-astline-core.md`）——历史快照，保留。
- `tests/parse/token-time-shapes/let-x.expected.txt`：**一字未动**（`git status` 可证）。
- `docs/expected-token-time-shapes.md`：**一字未动**。
- `typescript/IMPORTANCE.md`、`core/**`、`typescript/tokens/**`：硬约束，未改。

---

## 2. 目标用例工具 `tests/parse/token-time-shapes.mjs`

- **删除自绘树**：整个 `// shape 树 dump` 段（`TOKEN_SHAPE_SUFFIX`、`readText`、`readRaw`、`dumpNode`、`formatNodeFields`、`appendChildren`、`treeLines`）全部移除，替换为 20 行的 `renderTree(shape)`：直接 `shape.ToAstLine(0)`，末尾换行容错（`endsWith("\n")` 时裁掉），并保留「没有 `ToAstLine` 就 fail」的清晰报错。
- 每一步 `step.tree = renderTree(shape)`（**字符串**，`--json` 里 `tree` 仍是字符串）、`step.lines = step.tree.split("\n")`。
- **保留**：逐字符 `context.ProcessRange(context.Root, new SourceRange(document, i, i+1), i)` 驱动、EOF 收尾（`Index=count` → `Root.SignOut` → `Root.Process(空窗口)` → `DrainMessages`）、`--diff/--from-doc/--expected/--sync-expected/--incremental/--mode/--quiet/--legacy-corpus/--write-baseline`、`annotation-only` 容错（期望行去 `/\s+←.*$/` 后与实际相等即 PASS）、退出码 0/1/2。
- 语料模式指纹：`shape.ToXmlString()` → `shape.ToAstLine(0)`，基线 `note` 同步改写。
- `tests/parse/token-time-shapes/README.md`：新增「树由 `Token.ToAstLine(0)` 产出、`dumpNode`/`treeLines` 已删除」「语料基线随渲染器重算」两段，并在读数表补注。

### 其它 `.mjs` 的顺带口径修正（保持原判据强度）

纯字符串替换会让基于 XML 标签的检查变成**空转**，所以这些一并改成 AST 行口径：

- `xml.includes(`<${tag}>`)` → `astLine.includes(`${tag}  `)`（节点行 = 类名 + 两个空格；16 个文件）。
- `s4j` / `s4l`：`/<StatementShape[ >]/.test(...)` → `/StatementShape  /.test(...)`。
- `tail-residual-cases.mjs`：`count(xml, tag)` 的 needle `<Tag>` → `Tag  `。
- `r1-repro.mjs`：`topKinds` 的行内标签正则 → 行首类名正则（`/^([A-Za-z0-9_.]*Statement[A-Za-z0-9_.]*)(?=  )/gm`）。
- `perf.mjs`：叶子数（原 `<X></X>` 正则）→ 「下一行不再缩进」的行计数。
- 复合标识符 `xmlOf`/`legacyXml`/`shapeXml`/`offXml`/`xmlDifference`/`firstXmlDifference`/`baselineXmlOf`/`parseXml`/`xmlEqLegacy` 等统一改成 `*AstLine*`。
- **保留**：`statement-possible/`、`direct-build/`、`bench/` 里裸 `xml` 局部变量与对象键（`shell.xml`、`readings.xml`、`--mode xml`），以及大量消息文本里的「XML」字样——它们是**数据键/输出契约/历史文案**，改名会牵动外部消费方；只保证渲染调用与判据口径正确。后续如要统一措辞，单独一轮做。

---

## 3. 语料基线重算（必须说明）

`tests/parse/token-time-shapes/legacy-corpus-baseline.json` 是 `Root.ToXmlString()` 时代的 sha256，渲染器换成 `ToAstLine(0)` 后**全部哈希必然失效**。因此按约定用同一条命令重算并提交：

```
node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline
```

- 结果：**1723 文件**、解析异常 **7**、耗时 ~1.4s，`fileCount=1723`、`errorCount=7`、`note` 已改为 `Root.ToAstLine(0)`。
- 基线只保证「**同一渲染器下**解析行为逐字节不变」；解析行为的回归由最终 gates 把关（重构期按约定不跑 gates）。
- 复核：`npm run tts:corpus` → **1723 一致 / 差异 0**（变化 0 / 缺失 0 / 新增 0），exit 0。
- ⚠️ 若 W1 按 §4 修 `op`，**指纹会变**：修完必须再跑一次 `--write-baseline` 并再次提交（顺序：修 core → 重建 → `tts` 转 6/8/14 → 重算基线 → `tts:corpus` 归零）。

---

## 4. 验收读数

| 项 | 命令 | 读数 | exit |
| --- | --- | --- | --- |
| 构建 | `xl_build`（cwd=克隆，`paths=["core","typescript"]`，`targets=["ts"]`） | **566 written / 0 error / 3 warning**（E1107 三处为既有）；合并 W1 后增量 **13 written / 553 skipped / 0 error** | 0 |
| 编译 | `node node_modules/typescript/bin/tsc -p .` | 0 error，`build/ts` 566 个 js；`build/ts/core/syntax/token.js` 含 `ToAstLine`（3 处） | 0 |
| legacy | `npm run tts` | **PASS 5 / FAIL 9 / 14 步**（预期 6/8/14，**差 1 步：EOF**，见 §5.1） | 1 |
| incremental | `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14 步**，char 11 `[annotation-only]` | **0** |
| corpus | `--write-baseline` → `npm run tts:corpus` | **1723 一致 / 差异 0**（变化 0 / 缺失 0 / 新增 0） | 0 |
| validate | `node tests/parse/validate.mjs` | **1720 条用例，0 条不合格** | 0 |
| 抽跑 | `node tests/feas-operator/harness.mjs` | `cases=6 pass=4 fail=2`（`a+b*c`、`a+b*c-d/e`） | 1 |

> **incremental 14/14 是本任务的核心证据**：目标工具不再是「自绘格式恰好和文档一样」，而是 `Token.ToAstLine(0)` 的输出与 `docs/expected-token-time-shapes.md` **逐字节一致**（含 char 11 的行尾注解容错）。
>
> `feas-operator` 的 2 个 FAIL 是两侧**真实树不同**（运算符优先级形态），与渲染器无关：改造前后比较的两侧都换成了同一个渲染器，等式判定不变。这两个 FAIL 不是本任务引入，也不在四组验收读数里。

---

## 5. 与 W1 输出的差异（阻塞上报）

### 5.1 legacy EOF 少 `op`（唯一阻塞项）

`legacy` 读数从 6/8/14 变成 **5/9/14**，差的正是 EOF 一步。差异原文（期望 vs 实际，只列不同行）：

```text
E|             │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
A|             │  ├─ AsteriskTokenShape  pos=9  src=[9,10)
E|             ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
A|             ├─ PlusTokenShape  pos=11  src=[11,12)
```

根因（已定位，在 W1 的 `core/**`，W2 按硬约束不得改）：

- `Token.AstLabel()` 的 `op` 只取 `AstOperator()`，而 `AstOperator()` 是**字段探测**：`const op = (this as any).Op; return typeof op === "string" ? op : "";`（`core/syntax/shape-token.xl.md` §`AstOperator`）。
- `AsteriskTokenShape` / `PlusTokenShape` 的 `Op` **只在工厂里赋值**（`build/ts/typescript/tokens/punctuation/asterisk-token-shape.js:24`：`shape.Op = "*"`）。
- legacy（`EnableIncrementalVariableShapes=false`）EOF 树里的这两个节点是**另一条创建路径**产出的，`Op` 为空串 → 渲染器不印 `op`；incremental 路径设了 `Op`，所以 14/14 全过。
- 改造前该步能 PASS，是因为**旧工具自己**在 `text === null && /TokenShape$/` 时从 `src` 区间切原文补 `op`（原 `readRaw`）——那是工具级兜底，不是 `Op` 字段。现在渲染器只有一处实现，这个兜底必须由 core 提供。

建议修法（二选一，均属 W1）：

1. `AstOperator()` 增加兜底：`Op` 为空且类名匹配 `/TokenShape$/` 时，用 `SourceRange` 的 `Document.GetRaw(Start, End)` 切片（等价旧 `readRaw`）；
2. 或让 legacy 创建路径也给运算符形状写 `Op`（元数据，不改树形）。

**未改期望文件**：`let-x.expected.txt` 与 `docs/expected-token-time-shapes.md` 均一字未动（差异只写在报告里）。

### 5.2 残留 `.xl.md` 命中 1 处

```text
core/common-util.xl.md:5: ... 过去 `BlockToken.ToXmlString` 与各 token 的 XML 输出都要用 `XmlDecode` ...
```

这是 W1 合并进来的文件（`core/**`，W2 不得改）。它只是历史叙述，但会让「`.xl.md` 0 命中」这条验收挂 1。建议 W1 改写成「过去 `BlockToken` 的 XML 渲染…」之类的措辞。

---

## 6. 剩余 `ToXmlString` 命中（合并后实测）

| 范围 | 命中 |
| --- | --- |
| `*.mjs` | **0** |
| `*.xl.md` | **1**（`core/common-util.xl.md:5`，见 §5.2，W1 所有权） |
| 当前 `.md`（`README.md` / `docs/**` / `tests/**`，不含 `_coord`） | **0** |
| `_coord/**` | 若干：`CONTRACT-astline.md`、`REPORT-astline-core.md`（W1 的契约/报告）、`CONTRACT-tts-incremental.md`、`REPORT-tts-final.md`、`REPORT-tts-wp-a.md`——**历史文档，按约定保留** |
| `tests/parse/token-time-shapes/legacy-corpus-baseline.json` | 0（已重算，`note` 改为 `Root.ToAstLine(0)`） |

---

## 7. 交接（给合并 / 验收成员）

1. **先修 §5.1（W1）**，否则 `npm run tts` 停在 5/9/14；修完重建（`xl_build` 增量 + `tsc -p .`）→ `npm run tts` 应为 **6/8/14、exit 1**。
2. **修完必须重算语料基线**（`op` 进指纹）：`node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline` → `npm run tts:corpus` 应回到 1723/0。
3. 顺手清 §5.2 的 `core/common-util.xl.md:5` 历史引用，让 `.xl.md` 归零。
4. 合并顺序：本分支已含 W1 的 `8c6e82ec`（merge `465529d1`），直接 `git merge --no-ff astline-sites` 即可，不要再单独合 W1（否则重复合并）。
5. 本分支**未 push**、**未跑 gates**；gates 全量复验留给最终验收人（重构期禁用既有 gate 的约定仍然有效）。
6. 本报告与基线重算在**独立提交**里（`chore(astline): 按 ToAstLine 重算语料基线`），与 `15e3f1ec` 的代码改动分开，便于回退。
