# REPORT-all-possible-A1b — `PrimaryAtomGuard` 续接白名单 + `let-continuation-identifier` 收尾

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-20` — WP-A1b（A1 补丁/收尾） |
| 分支 | `feat/a1b`（本地，**未 push**）；从 `feat/a1` @ `4a3405fa` 起 |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a1-operands`（`node_modules` = canonical junction） |
| base | `git merge base-int`（`_integration/integration/all-possible`）→ **merge commit `aafb6188`** |
| 实现 commit | `3e72b1b9`（白名单 + A2 合并动作 + 2 case 迁移）；报告随后的 docs commit 见 `git log` |
| 合并情况 | **无冲突**（A1 注册区行与 A2/A4 行自然共存：`[A1]` 8 行、`[A2]` 1 行、`[A4]` 1 行）；`xl_build` 重生成 23 个被合并文件 |

## 1. 交付物（本轮实际改动）

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `expressions/forms/primary/primary-atom-guard.xl.md`（A1 own） | 白名单字段 + `IsDivisionAfter` + `IsTerminalAfter` 扩展 | `ContinuationChars = "+-*%<>&|^"`、`ContinuationWords = ["in","instanceof"]`；`/` **故意不在**字符白名单 |
| `expressions/forms/primary/identifier-primary-possible-shape.xl.md`（A1 own） | 排除 `in` / `instanceof` | 否则它们那一格 A1 与 A2 两个 `Accept` 并列 ⇒ 永远 `Waiting` |
| `expressions/forms/operator/binary-operator-possible-shape.xl.md`（**A2 own，本次代执行其合并动作**） | 标识符格 `Uncertain → Reject`（A2 报告 §6 指定的集成动作）+ 除号例外 | 见 §2.2、§5 的越权说明 |
| `typescript/cases/tts/cases/partial/...` → `tts-impl/cases/...` | `git mv` 2 条 | `partial/statements/let-continuation-identifier`、`partial/expressions/bin-in` |
| `_coord/REPORT-all-possible-A1b.md` | 本报告 | — |

## 2. 实现

### 2.1 `PrimaryAtomGuard`：从「只认收口」到「收口 或 已被消费面接管的续接」

A1 的第二道闸门原来只认 EOF / `;`（标识符额外反引号）。A1b 扩成三档（`IsTerminalAfter`）：

1. 收口：EOF / `;`；
2. 带标签模板：标识符后反引号（`allowTemplate`）；
3. **续接白名单**（字符级 `ContinuationChars` + 词级 `ContinuationWords`）：这些续接已经有候选能**消费已建原子**。

启用的字符/词与理由（逐条实测）：

| 白名单 | 消费面 | 结果 |
| --- | --- | --- |
| `+` `*` | 既有 `BinaryExpressionPossibleShape`（A2 让路后它只管这两个） | `a + b`、`a * b` 的左侧原子提前物化后被消费 |
| `-` `%` `<` `>` `&` `\|` `^` | A2 `BinaryOperatorPossibleShape` + A2 扩过的右操作数目录（标识符分支） | `a < b`、`a >= b`、`a & b` 等同型 |
| `in` / `instanceof`（词级） | A2 `BinaryOperatorPossibleShape.TextOf` 把它们当运算符文本 | `'a' in b`、`a instanceof B` |
| `/` | **不启用**：A1 一旦提前把标识符换成形状，`RegexToken` 的起点判据把「非 basic 的最后一个代码单元」当成语句边界（`RegexTemplate.CanStart`：`!lastCode.IsBasicToken ⇒ true`），`a/b` 会被重新切成正则 ⇒ `bin-div` 实测 **divergent**（incremental EOF 树只剩 `IdentifierShape a`） | 保留 A2 的「在 `/` 那一格就地物化左操作数」兜底（见 2.2） |
| `=` `!` `?` `:` `.` `(` `[` | 赋值 / 前缀 / 条件 / 成员 / 调用 / 下标**当前没有能消费的候选**（A2b/A2c/A3 未合并） | 不启用；提前建原子会让 EOF 收口退化成 throw/divergent |

### 2.2 A2 文件的「合并动作」与除号例外（越权范围说明）

A2 报告 §5.1/§6 写明：**A1 合并后**要把 `BinaryOperatorPossibleShape.ComputeByIndex` 里
「标识符 `Common` ⇒ `Uncertain`」改成 `Reject`（由 A1 建标识符、A2 只做运算符）。这个集成动作在本分支执行，
否则合并后 A1 的 15 条 tts-impl case 会退化：标识符格上 A1 与 A2 两个候选都活着 ⇒ 永远 `Waiting`。
（实测：只 merge 不改这一行 → `tts-impl` 15 FAIL，全是 `lit-bigint / lit-false / lit-null / lit-true /
lit-undefined / lit-this / let-init-identifier …` 这类 Common 原子。）

但这会顺带废掉 A2 的「在运算符格就地物化左操作数」兜底对**除号**的覆盖：A2 候选在标识符格就被拒掉，
`a/b` 的 `/` 格没有候选。因此加一个**仅除号**的例外：标识符后紧跟**除号**时 A2 仍返回 `Uncertain`
（活到 `/` 格干它原来的活）。注意不能用「下一个字符是 `/`」——`//` / `/*` 是注释 trivia，会把数字/标识符格的
两个候选并活着（`lexical/comment-block-after-init`、`comment-block-around-operator` 实测退化成 partial）；
所以用 `PrimaryAtomGuard.IsDivisionAfter`：下一个非空白字符是 `/` **且紧挨着的下一个字符不是 `/`、`*`**。

**越权声明**：`forms/operator/binary-operator-possible-shape.xl.md` 不在 task-20 声明的写域（写域只有
`forms/primary` / cases / 报告）。本次改它是 A2 报告自己指定的合并动作 + 保住 A2 已迁 case（`bin-div`/
`bin-instanceof`）的必要条件；改动都是「A2 报告 §6 的 1 行合并动作 + 1 个除号例外」，没有改 A2 的其它语义，
未动 `ShapeOperatorStack` / 右操作数目录 / 注册区。合并 sheriff 若要求，可把这一小段拆给 A2 属主确认。

## 3. 迁移的 case（2 条）

| case | 原分类 | 现分类 | 依据 |
| --- | --- | --- | --- |
| `partial/statements/let-continuation-identifier`（`let x = a\n+ b`） | partial | **incremental** | `--show`：`earlier: IdentifierShape@pos=7, BinaryExpressionShape@pos=7, PlusTokenShape@pos=9, IdentifierShape@pos=11` |
| `partial/expressions/bin-in`（`'a' in b`） | partial | **incremental** | A1 的 `StringLiteralShape` 在 `'a'` 处提前物化，A2 的 `InKeywordShape` 在 `in` 格消费；`--show` = incremental |

迁移后 `tts` 剩 195 条、`tts-impl` 230 条（228 + 2）。

## 4. 验收读数（全部实跑）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**；3 warning（既有 `E1107` 三条重名，与基线相同）；585 up-to-date |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs --quiet --json tmp/a1b-final.json` | **exit 0**：195 条 FAIL 0；`throw 96 / atomic 85 / partial 14 / incremental 0` |
| 4 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 230 / FAIL 0 / 230** |
| 5 | `node typescript/cases/tts/tools/diff-report.mjs tmp/a1b-base.json tmp/a1b-final.json --allow <2 个已迁 id>` | **PASS**：197 个 id 中 195 条逐条相同、2 条为已迁（删除）、**不允许变化 0** |
| 6 | `node tmp/legacy-check.mjs`（15 个代表形态，`expr-probe --both`） | shape 行 **15/15 一致**；原文树差异只在既有缺陷 4 的 `src` |
| 7 | 18 条防回归红线逐条 `--show` | 见 §4.1 |

`tmp/a1b-base.json` = **merge 完成、A1b 改动之前**的 tts 账本（197 条）；`diff-report` 用它做「只允许 2 条迁移」的机械证明。
`build/ts`、`dist/ts`、`tmp/**` 均 gitignored。

### 4.1 防回归红线（A1 报告列的 18 条）逐条复查

| case | A1b 前 | A1b 后（`--show`） | 结论 |
| --- | --- | --- | --- |
| `partial/expressions/as-expr` | partial | **partial** | 未漂移 |
| `partial/types/as-chain-type` | partial | **partial** | 同上 |
| `partial/types/as-const-assertion` | partial | **partial** | 同上 |
| `partial/types/as-keyof-typeof` | partial | **partial** | 同上 |
| `partial/types/as-literal-string-type` | partial | **partial** | 同上 |
| `partial/types/as-primitive-type` | partial | **partial** | 同上 |
| `partial/types/as-template-literal-type` | partial | **partial** | 同上 |
| `partial/types/satisfies-then-as` | partial | **partial** | 同上 |
| `partial/types/satisfies-type` | partial | **partial** | 同上 |
| `partial/expressions/satisfies-expr` | partial | **partial** | 同上 |
| `partial/expressions/assignment`（`y = 1`） | partial | **partial** | 同上（`=` 不在白名单） |
| `partial/expressions/ref-new-no-parens` | partial | **partial** | 同上（`new` 后是字母，词级白名单只认 `in`/`instanceof`） |
| `partial/expressions/unary-typeof` | partial | **partial** | 同上 |
| `partial/expressions/unary-void` | partial | **partial** | 同上 |
| `expressions/bin-div`（tts-impl） | incremental | **incremental** | 未漂移（A2 除号例外兜底） |
| `expressions/bin-instanceof`（tts-impl） | incremental | **incremental** | 未漂移（`instanceof` 词级白名单 + A2） |
| `declarations/let-comparison-init`（tts-impl） | incremental | **incremental** | 未漂移 |
| `throw/types/as-array-type`、`throw/types/as-intersection-type` | throw | **throw** | 抽样复核（`expected=throw actual=throw`） |

**关键实测（白名单取舍的证据）**：
- 加 `/` 到字符白名单 ⇒ `expressions/bin-div` 变 **divergent**（`RegexToken` 误切，见 §2.1）⇒ **排除 `/`**；
- 只按「下一字符 `/`」给 A2 例外 ⇒ `lexical/comment-block-after-init`、`comment-block-around-operator` 从
  incremental 退化成 **partial**（注释开头把两候选并活）⇒ 改成 `IsDivisionAfter`；
- 不给 A2 做合并动作 ⇒ `tts-impl` **15 FAIL**（A1 的 Common 原子全部退化 partial）。

## 5. 给后续 WP 的交接

1. **白名单是唯一扩口**：A2b/A2c/A3/A5 的候选一旦能消费某类续接，就往
   `PrimaryAtomGuard.ContinuationChars` / `ContinuationWords` 加对应首字符/关键字（并在这里补一行「消费面」注释）；
   `as` / `satisfies` 要等它们的候选（A5/A2b）落地后再加词。
2. **`/` 的特殊性是既有 tokenizer 缺陷**：`RegexTemplate.CanStart` 的 `!lastCode.IsBasicToken ⇒ 起正则`
   假设「非 basic = 语句边界」，与「初始化器里已物化的表达式形状」冲突（A1 报告的缺陷 2 同族）。
   要真正把 `/` 加进白名单，得先改 `TypeScriptRegexTemplate.CanStartAt`（让表达式形状被认作操作数结尾）——
   不在本 WP 写域，建议单列缺陷收尾 WP。届时删掉 A2 的 `IsDivisionAfter` 例外，把 `/` 加进白名单。
3. **A2 文件的合并动作已代执行**：如果 A2 属主在别的分支也写了同样的 1 行改动，合并时按「标识符 ⇒ Reject +
   除号例外」这一份为准（不要回退成 `Uncertain`，否则 A1 的 15 条 tts-impl case 立刻退化）。
4. **注释 trivia**：白名单判据仍不把 `/* */` / `//` 当 trivia 跳过（遇到即判「不建」，保持 partial）——这要求
   「原子 + 注释 + 续接」的形态留给后续 WP；`comment-block-*` 两条 tts-impl case 是靠「数字 + 除号例外」
   维持 incremental 的（已实测）。
5. `PrimaryAtomGuard` 仍是 A1 自有目录下的共享判据；若 A3/A2b 要跨目录复用，按 §5.2 迁 `forms/shared/`（E0a own）。

## 6. 风险

1. **越权改动 A2 文件**（§2.2）：改动最小且是 A2 报告指定动作，但严格说不在 task-20 写域；合并 sheriff 需知悉。
   若要求回退，则 A1b 的 15 条 tts-impl 会退化，必须在同一 PR 内由 A2 属主补上。
2. **`/` 缺口**：`a/b`、`a / b` 这类以标识符开头的除法仍靠 A2 的「`/` 格就地物化」路径（不是 A1 原子提前物化），
   与 A1 原子路径的时序不同；修 tokenizer 后可统一，建议单列缺陷 WP。
3. **白名单的边界**：只加实测安全项；`?` / `=` 等一旦有候选，需要同步验证 `a ? b : c`、`y = 1` 不因「两候选并活 /
   半棵树」漂移，再扩。
4. **未跑既有 gates**（按纪律）；未 `--write-index`（INDEX 由 B7/A7 收口重生成）；未 push。
