# REPORT-all-possible-A1 — 原子操作数（字面量/标识符/字符串/模板/regex/bigint/this）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | `task-10` — WP-A1：原子操作数（`_coord/PLAN-all-possible.md` §3.1「主表达式」+ §4.1 A1） |
| 分支 | `feat/a1`（只提交本地分支，**未 push origin**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a1-operands`（`node_modules` = canonical 的 junction） |
| base | `base-e0b` = `e0b-initializer/feat/e0b` 的 `f62730b0`（含 E0a + E0b；初始化器目录已接到 `ExpressionShapeCatalog`） |
| 实现 commit | `94eab3d9`（`feat(a1): primary atom candidates ... + migrate 34 cases`）；本报告随后的 docs commit 见 `git log` |
| 构建产物 | `dist/ts/**`、`build/ts/**`（gitignored） |

**任务目标 35 条，达成 34 条并迁 `tts-impl`；1 条（`partial/statements/let-continuation-identifier`）按依赖记录未达成**
（原因见 §6，属 A2 的右操作数目录范围，不在 A1 写域）。

## 1. 交付物（own 文件）

**新增 9 个 `.xl.md`**（`typescript/tokens/expressions/forms/primary/`，一形态一文件 + 一个 A1 内共享判据）：

| 文件 | 候选类 | 覆盖 |
| --- | --- | --- |
| `identifier-primary-possible-shape.xl.md` | `IdentifierPrimaryPossibleShape` | 标识符 / `undefined`（`IdentifierShape`） |
| `string-literal-primary-possible-shape.xl.md` | `StringLiteralPrimaryPossibleShape` | 普通字符串 `"…"` / `'…'` / 转义（`StringLiteralShape`） |
| `template-primary-possible-shape.xl.md` | `TemplatePrimaryPossibleShape` | 无反插 / 有内插 / 嵌套模板（`NoSubstitutionTemplateLiteralShape` / `TemplateExpressionShape` + Head/ Middle/ Tail/ Span） |
| `tagged-template-primary-possible-shape.xl.md` | `TaggedTemplatePrimaryPossibleShape` | `tag\`…\``（`TaggedTemplateExpressionShape`） |
| `regex-literal-primary-possible-shape.xl.md` | `RegexLiteralPrimaryPossibleShape` | 正则（字符类 / 转义斜杠 / flags） |
| `big-int-literal-primary-possible-shape.xl.md` | `BigIntLiteralPrimaryPossibleShape` | `1n` / `10n`（`BigIntLiteralShape`） |
| `keyword-literal-primary-possible-shape.xl.md` | `KeywordLiteralPrimaryPossibleShape` | `true` / `false` / `null`（`*KeywordShape`） |
| `this-primary-possible-shape.xl.md` | `ThisPrimaryPossibleShape` | `this`（`ThisKeywordShape`） |
| `primary-atom-guard.xl.md` | `PrimaryAtomGuard` | A1 内共享判据：两道闸门（见 §3） |

**1 个共享文件（只追加，E0a own）**：`typescript/tokens/expressions/expression-shape-catalog.xl.md`

- `# dependencies` 追加 8 行 import（8 个候选类）；
- `ExpressionShapeCatalog.AppendFragments` 的 `// [E-CAT:FRAGMENTS]` 之后按 WP id 追加 8 行（只追加、未重排/未删任何行）：

```ts
// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序（form WP 只在本行之后追加，不重排）：
  BigIntLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  IdentifierPrimaryPossibleShape.AppendTo(shapes); // [A1]
  KeywordLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  RegexLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  StringLiteralPrimaryPossibleShape.AppendTo(shapes); // [A1]
  TaggedTemplatePrimaryPossibleShape.AppendTo(shapes); // [A1]
  TemplatePrimaryPossibleShape.AppendTo(shapes); // [A1]
  ThisPrimaryPossibleShape.AppendTo(shapes); // [A1]
```

**34 个 case `git mv`**：`typescript/cases/tts/cases/partial/<area>/<name>.ts` →
`typescript/cases/tts-impl/cases/<area>/<name>.ts`（declarations 6、lexical 12、expressions 14、statements 2 = 34）。
**未改**：`VariableDeclarationShape.FinishIncremental`、`ExpressionCatalogFactory`、`RightOperandPossibleShape`、
`tts/run.mjs`、`tts-impl/run.mjs`、两个 `INDEX.md`（B7/A7 收口时重跑生成物）。

## 2. 实现口径（与 legacy EOF 树逐节点一致）

每个候选都是 `PossibleShape` 三入口 + `AppendTo`，`BuildByIndex` 只做「造形状 + 原位 `Replace` + C1 `Pos`」：

- `Pos` = 前一个非 trivia 单元的 `EndIndex`（`IncrementalItemPosition.AfterPreviousCode`，与 C1 同一条）；
- 形状构造复用 legacy 的同一份实现：`IdentifierShape.FromBasicToken`、`StringLiteralShape.FromBasicToken`、
  `RegularExpressionLiteralShape.FromBasicToken`、`BigIntLiteralShape.FromBasicToken`、
  `NoSubstitutionTemplateLiteralShape.FromBasicToken`；关键字字面量 / `this` 手工签入签出（legacy
  `MakeKeywordLeaf` 同口径）；
- **模板**照抄 `ExpressionBuilder.ParseTemplateToken`：整段模板是**一个** `String` basic 单元，`Data` 里
  `ConstString` = 字面段、`InterpolationString` = `${…}`（其 `Data` 是内插表达式 token）；head/middle/tail/span 的
  `Pos` / `src` 逐项照抄（head `src` = `` ` `` 到 `${`+1、tail `Pos` = 表达式 `EndIndex`、span `Pos` = `interp.StartIndex+1`）；
- **带标签模板**在模板关闭时把前一个代码单元（`IdentifierShape` 标签）摘出来，与模板节点一起装
  `TaggedTemplateExpressionShape`，原位替换「标签 + 模板」两格（与二元候选的原位替换同一惯用法）；
- 内插表达式 A1 只支持原子（标识符 / 数字 / bigint / 关键字 / 正则 / 嵌套模板），其余按 C10 显式 throw
  `增量变量形状未支持：expression 插值里的…`（目标 `let-init-template-nested` 由递归模板路径覆盖）。

## 3. 关键设计：`PrimaryAtomGuard` 两道闸门（零漂移的机械保证）

A1 只支持「初始化器 = 单个原子」。若原子关闭时就直接建形状，**以原子开头但带续接语法**的既有 `partial` case
（`let x = y as T` / `let x = typeof y` / `let x = y = 1` / `let x = a/b` / `let x = new C` …）会：
先建出首原子形状 → 后续续接单元没有候选 → EOF 收口时要么「多根」显式 throw、要么只剩半棵树（divergent）。

而流式驱动看不到未来单元，候选无法在原子关闭时判断「后面还有没有」。因此把判定放进 `IsBuildable`
（`CatalogGuide` 在只剩 1 个候选时会先问 `IsBuildable`，返回 false 就继续 `Waiting`）：

1. **`IsInitializerStart`**：本格是初始化器的**第一个代码单元**——`units` 里它之前最后一个非 trivia 单元必须是
   `Symbol("=")`；
2. **`IsTerminalAfter`**：从该单元 `EndIndex` 往后看源码，跳过空白 / 换行，第一个非空白字符是 **EOF 或 `;`**
   （标识符候选额外允许反引号：带标签模板的标签后面必然跟模板，由 tagged 候选消费）。

任一不满足 → 不建，交给 `FinishIncremental` 既有的 `ExpressionBuilder` 降级分支 → 该 case 保持原 `partial`
行为（零漂移）。`FinishIncremental` 的多根拒绝**未放宽**。

**实测（同一份代码，仅加/不加闸门的对照）**：未加闸门时 18 条非目标 `partial` case 被打成 throw/divergent
（`as-*` 9 条、`assignment`、`bin-div`、`bin-in`、`bin-instanceof`、`ref-new-no-parens`、`satisfies-*` 2、
`unary-typeof`、`unary-void`、`let-comparison-init`）；加闸门后**这 18 条全部回到原 `partial`**，
变化集合恰好只有 34 条 A1 目标（见 §4 的 diff-report 读数）。

**闸门的边界（有意保守，写进类注释）**：注释（`/* */`、`//`）不当作 trivia 跳过、`,`/`}`/`)` 等收口符不认——
这些形态本就不在 A1 目标里，保守判「不建」只会保持 `partial`，不会产生错树。
`context.CurrentDocument === null` 时放行（真实驱动链一定设文档；探针没设时最多「多建」，不会判错目标）。

## 4. 验收读数（全部可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **0 error**；3 warning（既有 `E1107` 三条重名，与基线逐条相同）；578 up-to-date（含 9 新增） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | `node typescript/cases/tts/run.mjs --quiet --json tmp/verify-tts.json` | **exit 0**：346 条，FAIL 0；`throw 125 / atomic 202 / partial 19 / incremental 0`（迁移后剩余账本） |
| 4 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 79 / FAIL 0 / 79**（原 45 + 新迁 34） |
| 5 | `node typescript/cases/tts/tools/diff-report.mjs tmp/base.json tmp/verify-tts.json --allow <34 个已迁 id>` | **PASS**：其余 346 条逐条相同；34 条以「删除」形式被 allow（= 迁移走），**没有非目标漂移** |
| 6 | `node tmp/legacy-check.mjs`（tmp，gitignored；15 个代表形态，`expr-probe --both`） | **shape 行 15/15 一致**；原文树差异只在 `src`（既有缺陷 4 `rangeOnlyDifference`，计划 §2.3 容忍） |
| 7 | `node typescript/cases/tts/run.mjs --show <目标>`（抽样） | 全部 `expected=partial actual=incremental`，`earlier` 显示该原子形状（如 `StringLiteralShape@pos=7`、`TaggedTemplateExpressionShape@pos=7`） |
| 8 | `node typescript/cases/tts-impl/run.mjs --show lexical/let-init-template-nested` | `incremental`（嵌套模板路径）；`let-continuation-identifier` 在 tts 仍 `partial`（§6） |

**34 条迁移清单**：declarations 6（`const-string-init`、`let-identifier-init`、`let-regex-init`、`let-string-init`、
`let-template-init`、`let-template-substitution-init`）；lexical 12（`let-init-bigint|identifier|regex-class|
regex-escaped-slash|regex-flags|string-double|string-escape|string-single|template-nested|template-plain|template-subst|
template-tagged`）；expressions 14（`lit-bigint|false|null|regex|string-double|string-escape|string-single|tagged|
template-sub|template|true|undefined`、`ref-ident`、`ref-this`）；statements 2（`const-identifier-init`、
`let-identifier-init`）。

## 5. 约束遵守（E0b 留下的 5 条）

1. **`=`/trivia 回 `Uncertain`**：8 个候选的 `ComputeByIndex` 对 `Symbol("=")` 与 trivia 都是 `Uncertain`，其余
   非本形态符号/单元才 `Reject`；
2. **目录始终 ≥2 个活候选**：E-base 的 `NumericLiteralPossibleShape` / `BinaryExpressionPossibleShape` 未动，
   A1 只**追加** 8 个候选（`=` 处它们全部 `Uncertain` + 原有两个也活着）；
3. **同一候选类不注册两次**：注册区 8 行互不同类；未替换/未复制任何既有候选；
4. **右操作数目录只有 `RightOperandPossibleShape.Catalog()` 一份**：本 WP 一行未改（这也是 §6 的依赖原因）；
5. **一次 build 后父层只剩 1 个非 basic 表达式根**：A1 形态本身是单根；非 A1 形态被 §3 闸门挡在「不建」，
   `FinishIncremental` 的「多根 ⇒ throw」原样保留。

## 6. 未竟项（1 条）与后续接口

**`partial/statements/let-continuation-identifier`（`let x = a\n+ b`）未迁移，仍为 `partial`。**
原因：A1 的标识符候选在 `a` 处被 §3 闸门判定「后面还有 `+`」而不建；`+` 由既有
`BinaryExpressionPossibleShape` 处理（它会建 `BinaryExpressionShape` 并挂
`RightOperandPossibleShape.Catalog()`），而右操作数目录**只有数字**候选，`b` 处会
`CatalogGuide: 没有候选形状可以构成`。补法在 E0b §4.5 指定的唯一扩展点：
`RightOperandPossibleShape.Catalog()` 增加「标识符右操作数」候选（建形状后 `SealRightOperand` + `Quit`，C3），
或 A2 把右操作数目录迁到 E-base 归约栈。两者都不在 A1 写域，A1 未越权（否则会与 A2 抢同一文件）。

**给 A2/A3 的接口建议（闸门怎么松）**：

1. A2/A3 加运算符 / 成员 / 调用候选后，「原子 + 续接」的形态应当由新候选**消费**已建原子，而不是让原子退让。
   届时的改动点是 `PrimaryAtomGuard.IsTerminalAfter`：把它从「只认 EOF/`;`」扩成「认 EOF/`;` **或**
   本分支确有候选消费的续接首字符」（`+ - * / % < > = ! & | ^ ? . ( [ \`` 等白名单），白名单归 A2/A3 维护；
2. 模板内插的 `BuildAtom` 目前只认原子；A2 之后内插表达式应改走新目录（`ExpressionBuilder` 降级或
   E-base 归约栈），届时删掉 `TemplatePrimaryPossibleShape.BuildAtom` 的 throw 分支；
3. `PrimaryAtomGuard` 现在放在 `forms/primary/`（A1 自己的目录）。若 A2/A3 也要复用，按 §5.2 应迁到
   `expressions/forms/shared/`（E0a own），届时由 Lead 决定归属；
4. `context.CurrentDocument.GetRaw` 是**类型化 Document API**（不是 C5 禁的 `ctx.Text`/`ctx.source`），
   但它是本 WP 的「保守判据」，不是形状结构口径；A2 起若能让续接候选消费原子，应优先去掉这个 lookahead。

## 7. 风险

1. **lookahead 的边界**：注释不在跳过之列、`,`/`}` 不认收口、`context.CurrentDocument` 为空时放行——三处都
   按「宁可不建（保持 partial）也不建错树」取向；都有单测外的实测对照（§3 的 18 条回退为 partial）。
2. **模板内插只支持原子**：非原子内插显式 throw（C10），不是静默错树；A2 之后由内插目录接管。
3. **`src` 差异**：增量树的 `src` 端点仍带既有缺陷 4（`rangeOnlyDifference`），本 WP 未修（修它属于缺陷收尾 WP）；
   账本比较剥 `src`，`shape` 行 15/15 一致。
4. **生成物未重跑**：`typescript/cases/tts/INDEX.md`、`tts-impl/INDEX.md` 未手改（B7 收尾时用
   `--write-index` 重生成）；`tts/README.md` / `tts-impl/README.md` 未改。
5. **注册区与 import 的合并冲突**：多个 form WP 会同时改 `expression-shape-catalog.xl.md` 的 import 区与注册区；
   本 WP 只追加在 `[E-CAT:FRAGMENTS]` 之后（按 id 排序），合并时保留双方、按 id 排。
6. **未跑既有 gates**（按纪律：不跑 `gates`/`samples`/`coverage`/`ast:*`）；允许的
   `tests/parse/token-time-shapes.mjs` 未跑（本 WP 的等价证据用 `expr-probe --both` + 账本代替）。
