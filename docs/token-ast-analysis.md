# token 语料 AST 对拍：191 处失败的 §6 归因、五问答案与修复落地状态

本文件是 token 语料 AST 对拍的**最终汇总**，由四份分目录归因文档合并而成（数据来源见 §0）。
它回答四件事：

1. 原始 **191 处失败**（162 crash + 29 diff）落在 `typescript/IMPORTANCE.md` §6 的哪一类、各多少条；
2. 「何时 build / build 提什么 / 何时 close / close 提什么」在**机制族**层面的答案；
3. 哪些问题**必须由用户裁定**（basic token 场景），现状、证据、要动 `core` 的哪一处；
4. round-1 修复合入后的读数、还剩哪些缺口。

**结论先行**：191 处里 **end 收口族 71 条（end compute 63 + 缺少 end 6 + end build 2）**、
**build 提取族 70 条（possible build）**、**候选族 42 条（possible compute 30 + 缺少 possible 12）**、
**basic token 8 条（归因条数；按受影响文件是 11 份，口径见 §3 脚注与 §5）**。也就是说：
**token 化本身不是主因（8/191），真正的主因是「这条语句/类型在哪一格结束」与
「build 时拿到的是不是完整单元集」**。round-1 修复后读数从 **1501/162/29/10** 降到 **1561/119/12/10**
（ok/crash/diff/ts-invalid），最终合并态（HEAD `8dbb7976`）为 **1636/47/9/10/1**、ast:cases **4763/4763、0/0/0**。

## 0. 数据来源与口径

| 来源 | 范围 | 文档 |
| --- | --- | --- |
| statements | `statements/**` + `ambiguous/**` 的 **57** 份 crash | `cover-token-an-stmt/docs/token-ast-analysis-statements.md` |
| declarations | `declarations/**` 的 **41** 份 crash | `cover-token-an-decl/docs/token-ast-analysis-declarations.md` |
| expressions + types | `expressions/**` 31 + `types/**` 16 = **47** 份 crash | `cover-token-an-type/docs/token-ast-analysis-expressions-types.md` |
| modules + lexical + 全部 diff | modules 8 + lexical 9 = **17** 份 crash，**29** 条 diff（分布全目录） | `cover-token-an-mod-diff/docs/token-ast-analysis-modules-diffs.md` |

- 崩溃口径：`SourceFileRunner.Parse(source, file)`，失败时展开 `InnerException` 取最内层消息；
  「最小复现」= 逐行前缀喂 `Parse`，第一个抛错的前缀最后一行。
- diff 口径：与 `typescript/cases/ast-json.mjs` 同口径（结构差 / 同 kind 位置差 / 字段差）；
  归一表只有一份实现：`typescript/cases/ast-compare.mjs` 的 `TS_KIND_ALIASES`（`ast-json.mjs` /
  `ast-json-diff.mjs` / `token-ast.mjs` 共用，17 条）。
- 四份文档的分组号原样引用：statements 的 `A/B/C/D/E/F/G/H/I/J/K/L/M/N/O`、declarations 的 `G1/G2a/G2b/G2c/G3a/G3b/G4/G5/G6/G7/G8/G9/G10/G11/G12/G13`、
  expressions/types 的 `G1a/G1b/G2/G3/G4/G5/G6/G7/G8/G9/G10/G11`、modules-diffs 的 `C1–C8` 与 `D1–D14`。

## 1. 基线读数

1703 行逐文件基线（Lead 生成；**本仓库不跟踪 `tmp/`，不要依赖本地遗留文件**——基线可在任意 checkout 上
用 `node typescript/cases/token-ast.mjs --json <path> --quiet` 重建）：

| 状态 | ok | crash | diff | ts-invalid | gap-now-passing | 合计 |
| --- | --- | --- | --- | --- | --- | --- |
| 原始基线（commit `dd5a494c`） | 1501 | **162** | **29** | 10 | 1 | 1703 |
| round-1 合并后（commit `2a563080`） | **1561** | **119** | **12** | 10 | 1 | 1703 |
| Plan A（token regex 判据，`cover-token-regexstart`） | **1638** | **45** | **9** | 10 | 1 | 1703 |
| 最终合并态（commit `8dbb7976`） | **1636** | **47** | **9** | 10 | 1 | 1703 |

- **191 处失败 = 162 crash + 29 diff**；`ts-invalid` 10 份是 TS 自己 `parseDiagnostics ≠ 0`（尺子不测），不计入 191。
- `gap-now-passing` 1 份 = 语料里 `xl:known-gap` 已转绿的守卫；`known-gap` 共 3 份（2 diff + 1 gap-passing）。
- 主仓同一提交上复核：`node typescript/cases/ast-json.mjs` → **4622/4622**；
  `ast-json-diff.mjs` → 完全一致 4622 / 结构差 0 / 位置差 0 / 字段差 0。
- 本文件写作时在上述克隆（分支 `cover-token-an-mod-diff`，rebase 到 `2a563080`）上实测：
  `token-ast.mjs --quiet` → `ok 1561 / crash 119 / diff 12 / ts-invalid 10 / gap-now-passing 1`，与主仓读数一致。

## 2. 归因方法

1. 每个成员在自己的克隆上 `xl_build(core+typescript)` → `tsc`，逐份复跑自己目录的失败文件（全部复现，
   崩溃消息与基线逐条一致）；
2. 对每条失败做**最小复现**（逐行前缀 / 单行独立解析）与**单变量对照**（加分号、去尾随换行、拆/并换行），
   把「症状」变成可复验的对照组；
3. 根因只落到 `typescript/**/*.xl.md` 的文件:方法:行号；**四份文档都没有改任何代码**；
4. diff 另判「真 shape 缺口 / 尺子归一表 / TS 自恢复」三类（见 §6.4）。

## 3. §6 七类问题表（191 条逐类计数）

| §6 类别 | statements 57 | declarations 41 | expressions+types 47 | modules+lexical+diffs 46 | **合计** |
| --- | --- | --- | --- | --- | --- |
| basic token 存在问题 | 1（M） | 0 | 1（G8） | 6（C5 3、C6 2、C7 1） | **8** |
| 缺少 possible | 4（D） | 4（G10 3、G11 1） | 3（G6 族） | 2（C4 shebang） | **12** |
| 缺少 end | 1（I） | 5（G2b 2、G2c 3） | 0 | 0 | **6** |
| possible compute 不对 | 14（B 8、E 3、J/K/N） | 1（G12） | 2（G7 两支） | 13（C8 1 + D3 4、D4 2、D5 2、D8 1、D10 1、D12 1、D14 1） | **30** |
| possible build 不对 | 3（G 2、H 1） | 21（G1 9、G3a/b、G4 3、G5 2、G6 1、G7 1、G8 1、G9 1、G13 1） | 33（G1a 15、G2、G3 3、G4 3、G5 5、G7 2、G9、G11 2） | 13（D1 3、D2 2、D6 3、D7 4、D13 1） | **70** |
| end compute 不对 | 34（A 23、C 7、F 2、L 1、O 1） | 10（G2a） | 9（G1b 6 + G10 3） | 10（C1 3、C2 3、C3 2、D9 1、D11 1） | **63** |
| end build 不对 | 0 | 0 | 0 | 2（D9 的 throw 零宽节点、type-tail-linecomment） | **2** |
| **合计** | **57** | **41** | **47** | **46** | **191** |

**计数 reconcile 说明**：源文档里标「待确认」的 4 条按**主类**计入——types `G10` 3 条（语句边界错位 / lambda 范围，
暂记 end compute）与 modules-diffs `D14` 1 条（基线结构差、本克隆未复现，暂记 possible compute）。
其余「混合组按主类计，次类在各组正文里注明」（例如 `G2` 主类 possible build 次类 basic token，
`A` 主类 end compute 次类缺少 end，`D9` 在 3 份文件上分属 end compute/end build）。

> **basic token 的 8 与 11**：本表与结论里的「basic token 8」是**归因条数**（items 1–4 的条数）；
> §5 待用户裁定清单按**受影响文件**计数，items 1–4 共 8 份 + item 5 shebang 2 份 + item 6 `>>` 拆分 1 份 = **11 份**。
> 两个数字口径不同（归因条数 vs 受影响文件数），不矛盾；具体文件以 §5 清单实测为准。

### 3.1 每类代表根因与落点

| 类别 | 代表根因（组号） | 涉及 `.xl.md` | 代表 token 文件 |
| --- | --- | --- | --- |
| **end compute 不对（63）** | 块体/根级 ASI 判据缺失（A 23、G2a 10、G1b 6、C 7）；终结候选在「下一条语句第一个 code 单元」Accept 但普通候选未灭（C1 3、C2 3）；简单语句收口格缺 EOF/换行（B 8 的次类、I）；`;` 归上一条语句（O、L） | `statements/statement-scanner.xl.md`、`statements/expression-statement-possible-shape.xl.md`、`files/source-file-end-possible-shape.xl.md`、`declarations/import-declaration-end-possible-shape.xl.md`、`types/type-builder.xl.md`（类型 ASI） | `stmt-block-statements.ts`、`stmt-while.ts`、`st-switch.ts`、`modules/gap-sweep-linecomment-import-03.ts` |
| **possible build 不对（70）** | build 前/中拿到的单元集被切碎或被不完整文法拒绝：泛型 `,` 顶层切分（G1a 15、G3b）、形参模式/默认值（G1 9）、类型文法缺档（G5：无返回类型调用签名 / mapped 值后成员 / 未具名可选元组 / 箭头返回函数类型；G4 `!` 后缀；G6 `a?`）、继承子句只认名字（G4 decl 3）、`new` 后缀链/模板归属（D6 3、D7 4） | `statements/statement-builder.xl.md`、`declarations/function-declaration-shape.xl.md`、`declarations/class-declaration-shape.xl.md`、`expressions/expression-builder.xl.md`、`types/type-builder.xl.md`、`declarations/heritage-clause-shape.xl.md` | `expressions/expr-arrow-generic.ts`、`decl-func-destructured-params.ts`、`types/gap-r900-call-signature-no-return-type.ts`、`expressions/expr-new-callee-postfix-assert.ts` |
| **possible compute 不对（30）** | 候选在 EOF 哨兵上 Accept/Reject 不决（B 8）；成员起点「修饰词 vs 名字」与换行（D3 4、C8）；顶层 `abstract`/`declare` 跨行（D4 2）；`async` 上下文关键字升级（D5 2）；泛型箭头 vs 尖括号断言（D8）；类型位「词 + `{`」（D10）；mapped 值换行（D12）；`<` 的逗号判据（E 3） | `statements/*-possible-shape.xl.md`（6 个语句候选）、`declarations/class-declaration-shape.xl.md`、`expressions/expression-builder.xl.md`、`types/type-builder.xl.md` | `statements/st-throw.ts`、`declarations/gap-sweep-newline-clsmod-03.ts`、`ambiguous/am-arrow-generic.ts` |
| **缺少 possible（12）** | 整类形态没有候选：泛型箭头 / `async<T>`（D 4）、带装饰器的声明（G10 3）、`using` 声明（G11）、shebang trivia（C4 2）、types 侧候选缺失（G6 族 2） | `expressions/expression-builder.xl.md`、`*-declaration-possible-shape.xl.md`×3、`trivia/shebang-trivia-possible-shape.xl.md`、`types/*-possible-shape.xl.md` | `statements/expr-async-generic-arrow.ts`、`declarations/decl-type-alias-decorator.ts`、`lexical/lex-shebang.ts` |
| **缺少 end（6）** | 块体 / namespace 体没有自己的终结候选：函数体与构造器体（G2b 2）、ModuleBlock 里 `import=`/`export=` 只认 `;`（G2c 3）、`export as namespace` 无分号（I 1） | `files/source-file-end-possible-shape.xl.md`（对照）、`statements/statement-builder.xl.md`、`declarations/module-block-shape.xl.md`、`declarations/import-equals-declaration-shape.xl.md` | `decl-namespace-import-equals-require.ts`、`declarations/decl-namespace-export-equals.ts` |
| **end build 不对（2）** | close 取 End 的单元取错：零宽节点落点与语句 End 撑大（D9 的 throw 无参数 / type-tail 的行注释尾巴） | `statements/expression-statement-shape.xl.md`、`types/type-builder.xl.md` | `statements/stmt-throw-no-argument-then-statement.ts`、`types/type-tail-linecomment.ts` |
| **basic token 存在问题（8）** | 字符→token 归类：控制头后 `/` 非正则（2）、`$` 非标识符字符（3）、`\uXXXX` 转义标识符（2）、U+FEFF 非 trivia（1） | `core/syntax/basic-tokens/**`（用户裁定）、`typescript/run/typescript-template.xl.md:44`、`typescript/run/text-document.xl.md:31-40` | `lexical/lex-ident-dollar-*.ts`、`lexical/lex-bom.ts`、`expressions/expr-r1233-control-head-regex.ts` |

## 4. 用户五问的答案（按机制族）

### 4.1 end 收口族（end compute 63 + 缺少 end 6 + end build 2 = 71）

- **正确的应该什么时候 build**：语句/类型的最后一格只有四种——`;`、闭合的 `}`/`)`/`]`/`>`、**换行 ASI 边界**、**EOF 哨兵**。
  本族 71 条缺的主要是后两种；块体内部与根层必须**同一时机**（不能根层走 `SourceFileEndPossibleShape`、块体走裸扫描器）。
  受限产生式（`return`/`throw`/`break`/`continue`）的换行在**关键字之后**就结束，这档已有，新判据不能覆盖它。
- **build 时应该提取哪些信息**：`SignIn(首单元)` / `SignOut(最后一个非 trivia 代码单元的 End)` / `Pos = Positions[first]`；
  字段从子形状取（语句体/表达式/类型/标签名/绑定/catch 类型/类型实参表）；**trivia 只进 `Pos`，永不进 `End`**。
- **什么时候 close**：`;`（已有）、换行 ASI（缺：A/C/F/L/O/G2a/G1b）、EOF 哨兵（缺：B/I）、括号闭合（已有）；
  块体/namespace 体要有自己的「换行处结束」通道（G2b/G2c）。
- **close 时应该提取哪些信息**：最后一个**非 trivia** 单元的 `End`；字段全部在 build 时提完，close 只做白名单校验与
  basic token 丢弃（IMPORTANCE §3.5）；类型注解要跳过尾随注释；零宽节点（`throw` 的恢复 Identifier、`OmittedExpression`）
  的 pos=end=落点那一格，由 build 定死，close 不再改。
- **典型机制**：`statement-scanner.ScanExpressionBody` 的停止集只有 `;`/EOF/`}`，没有「换行 + 表达式可结束」；
  `ImportDeclarationEndPossibleShape` 的 ASI `Accept` 与普通候选同格；`;` 应归上一句而不是新起空语句。

### 4.2 build 提取族（possible build 70）

- **什么时候 build**：构造**到齐**的那一格（括号闭合、`;`/ASI、EOF）；**build 之前不得按裸 `,` 切声明**——
  顶层 `,` 只是在 `<>` 深度为 0 时才是声明分隔符。
- **build 时提取哪些信息**：① 这条声明/语句覆盖到哪个**顶层单元**（`<>`/`()`/`[]`/`{}` 的深度是这一层必需信息）；
  ② 文法缺省档要补齐：无返回类型调用签名、mapped 值后的 `parseTypeMembers()`、具名可选元组的 `OptionalType`、
  `JSDocNonNullableType`（`!` 后缀）、`a?` 无类型成员；③ 字段从子形状提取，basic token 必须在 build 时全部提完。
- **什么时候 close**：与 4.1 相同（`;`/ASI/EOF/闭合括号）；本族不新增 close 时机，只改「交给 build 的单元集」与文法。
- **close 时应该提取哪些信息**：区间到最后一个非 trivia 代码单元；`Pos` 含前导 trivia；分隔符（成员后的 `;`/`,`）按 TS 口径进区间。
- **典型机制**：`BuildVariableDeclarationList` 角度深度、`BuildParameters` 把模式/默认值路由到 `ParseParameter`、
  `type-builder` 的五个文法档、`ParseNew`/标签模板的类型实参归属。

### 4.3 候选族（possible compute 30 + 缺少 possible 12 = 42）

- **什么时候 build**：仍由候选在「到齐」那一格 build；本族的问题是**候选该不该还活着**。
- **build 时提取哪些信息**：本族不改字段，只改「谁 Accept / 谁 Reject / 有没有候选」。
- **什么时候 close**：`Accept` 必须发生在「候选已全灭」那一格（IMPORTANCE §3.3：终结候选 Accept 时候选数必须为 0）；
  EOF 哨兵上普通候选要明确 Accept/Reject，不能留 `Uncertain`（B 8）。整类形态缺候选时（泛型箭头、装饰器声明、`using`、
  shebang）要新增 candidates，而不是在 build 层兜底。
- **close 时应该提取哪些信息**：同 4.1；候选层只回答边界，不取字段。
- **典型机制**：6 个语句候选的 EOF 分支、`LabeledStatement` 与声明候选共存、上下文关键字（`async`/`abstract`/`declare`/`readonly`）
  的「升级 or 名字」判据、`<` 的多实参判据。

### 4.4 basic token 族（8 + 口径 1）

- **什么时候 build / close / 提取什么**：本族不适用——字符还没被归成正确的 token，shape 层无从谈起；
  详见 §5 逐条。

## 5. basic token 待用户决定清单（按 IMPORTANCE §3.1，只能由用户发起）

> **更新（Plan A 已落地）**：场景 1（控制头 `)` 之后 / 语句起点的 `/`）已实施——`RegexTemplate.CanStartAt(units,index)` + `RegexToken.Transit` 改调用 + `TypeScriptRegexTemplate.CanStartAt` 覆写。`expr-r1233-control-head-regex.ts`、`stmt-if-body-regex-not-comment.ts` 转 PASS；最新读数 **1638/45/9**（剩余 54 = 45+9），basic-token 类红 10→8。场景 1 不再「待裁定」；`RegexStartAfter` 保留（语法层否决/放行通道，当前无写入点），其余场景不变。

本清单按**受影响文件**计数：items 1–4 共 **8 份** + item 5 shebang **2 份** + item 6 `>>` 拆分 **1 份** = **11 份**。
§3 表与结论里的「basic token 8」是**归因条数**（items 1–4），口径不同、不矛盾。

| # | 场景 | 影响文件（原始 191 内） | 现状 | 要动 `core` 的哪一处 | 为什么必须用户裁定 |
| --- | --- | --- | --- | --- | --- |
| 1 | 控制头 `)` 之后 / 语句起点以 `/` 开头 | 2（`expr-r1233-control-head-regex.ts`、statements M 组 1 份） | `/` 被判成 `Symbol("/")`（除号），`ParsePrimary` 抛「不支持的表达式起点」；`if (/x/…)` 这种 `(` 之后的 `/` 已能判对 | `core/syntax/basic-tokens/` 的 `RegexToken` vs `Symbol` **位置判据**（`typescript/run/typescript-template.xl.md:44` 记录同症状；也可在 parser 侧做 re-scan） | `/` 的归类是字符→token 判定，属 basic token；两种口径（token 层判 vs parser 重扫）影响所有 `/` 场景 |
| 2 | `$` 作标识符字符（`$x`、`a$b`、`$$`、`I$X`） | 3（`lex-ident-dollar-*.ts`） | `$` 在符号表里（同时是 `$"…"` 内插前缀），`$x` 被拆成 `Symbol($)+Common(x)`；下游 `statement-builder:512/520`、`expression-builder:2037`、`type-builder:1687` 抛错 | `core/syntax/basic-tokens/symbol.xl.md` 与标识符扫描（`common.xl.md`）；改后要保留 `$"` 内插的 lookahead 回退 | `$` 既可能是标识符字符又可能是内插前缀，属 basic token 的字符类，且与字符串内插互相牵制 |
| 3 | `\uXXXX` 转义标识符（`const \u0061bc = 1`） | 2（`lex-unicode-escape-identifier.ts`、`lx-unicode-ident.ts`） | `\` 是 Symbol、`u0061bc` 是 Common，拼不成一个标识符；TS 的 Identifier 文本是解码后的 `abc` | `core/syntax/basic-tokens/` 的 Common/标识符扫描（新增「`\u` 起转义、转义后整体算标识符字符」） | 转义序列的解码与字符归类在 token 层，shape 层拿不到完整 token |
| 4 | U+FEFF（BOM） | 1（`lex-bom.ts`，BOM 在第 4 行行首） | `Common` 把 `\uFEFFconst` 吞成一个词，`const` 不再是关键字 | ① `core/syntax/basic-tokens/` 的空白/trivia 字符类（TS scanner 把 BOM 当 whitespace）；② 可选：`typescript/run/text-document.xl.md:31-40` 对**第 0 格**剥 BOM | U+FEFF 是否算 trivia 是 basic token 的字符判定；运行层只能处理第 0 格，中间行仍需 token 层 |
| 5 | shebang `#!` 作为首行 trivia | 2（`lex-shebang.ts`、`lx-shebang.ts`） | `#` 一律按 PrivateIdentifier 前缀扫（`punctuation/hash-token-shape.xl.md:12`），`!` 另起单元；`ShebangTriviaShape` 已存在，但 `trivia/shebang-trivia-possible-shape.xl.md:13-25` 的 compute/build 是「未实现」桩 | 若要 token 层成 trivia：`core/syntax/basic-tokens/` 的 `#`/`!` 判据；若只补 typescript 层：补 `ShebangTriviaPossibleShape` 的 compute/build 并在 SourceFile 候选表接线（**不需要 core**） | `#!` 是否作为一类 token 层 trivia 属 basic token；两种落点（token 层 vs typescript 层）由用户选 |
| 6 | `>>` / `>>>` 是否在 token 层拆成单个 `>` | 1（types G2，`expr-nested-generics` 类；当前 typescript 层已绕过） | token 层不拆；types 侧 `type-builder.xl.md:1717 IsSplitClose` 已在类型位绕过，expression 侧 `MatchAngleClose`（`expression-builder.xl.md:1759-1761`）明确写着「拆 `>>` 需要 basic token 决策」 | 若在 token 层拆：`core/syntax/basic-tokens/` 的 `>>`/`>>>` 复合符号表 | 拆不拆影响所有泛型收尾与右移运算符；目前 typescript 层绕过已够用，是否改 token 层属口径决定 |

> 另：contextual keyword 的「孤立时不升级」口径（declarations `G12`：`declare;` / `abstract;`）
> 也可放 typescript 层兜底（表达式语句候选按 Identifier 收），但用例注释要求「token 层不升级」——
> 这一条同样**交用户决定**（是否动 basic token 的 Keyword 升级表）。

## 6. 修复落地状态

### 6.1 已合入主仓的修复（round-1 ~ round-5，最终合并 HEAD `8dbb7976`）

四个分支合入：`cover-token-fix-build`、`cover-token-fix-class`、`cover-token-an-mod-diff`（+ 文档）、`cover-token-an-decl`（仅文档）。
各提交自带**各自基线（1501/162/29）上的读数**——彼此有重叠组，**不可相加**，只能看最后合并态：

| 分支 | 提交 | 覆盖组 | 该提交所在分支的读数（ok / crash / diff） |
| --- | --- | --- | --- |
| cover-token-fix-build | `57f5a486` | A 块体/根级 ASI、catch 绑定类型、泛型逗号深度、type-alias 无分号收口 | 1501→**1528** / 162→**135** / 29→29 |
| cover-token-fix-build | `c1ff6481` | statements E（初始化器 `<>` 深度，`am-call-type-args` 等 3 份转 ok） | 1528→**1530** / 135→**129** / 29→**31**（临时 diff 增量后续由其它组收掉） |
| cover-token-fix-class | `bf31249b` | 类体索引签名（K/G5/G6）、`readonly` 作名（C8）、类成员修饰词与名字分派（D3 类侧） | 1501→**1510** / 162→**156** / 29→**26**，0 回归；ast:cases 4622/4622 |
| cover-token-an-mod-diff | `a784d4c1` | D1 数组空槽、D2 解构计算键（2 份的 1 份）、D6 `new` 后缀链、D7 类型实参+模板、D13 具名导入字符串名 | 1501→**1514** / 162→**161** / 29→**17**，0 回归 |
| cover-token-an-mod-diff | `9260d2bb` + `a1526d34` | type-builder：`JSDocNonNullableType`（G4 3 份）、无返回类型调用签名、mapped 值后成员、元组具名可选、`a?` 无类型成员、mapped 空方括号 IndexSignature（G5/G6/D12） | 1501→**1508→1509** / 162→**157** / 29→**26**，0 回归 |
| round-2（class 第二轮） | `bf31249b` / `cfea36ae` | D4 顶层 `abstract`/`declare` 换行、D5 `async` 首语句 pos、类成员 pending-head | 1523→**1527** / 155 / 14→**10**，0 回归 |
| round-3/4（中间多分支合并） | `cover-token-fix-end`、`cover-token-an-stmt`、`cover-token-an-mod-diff` 等 | A/B 块体 ASI、EOF 裸块、ASI 成员名、条件类型/infer、footer 收口 | 逐轮收敛到最终合并态 |
| round-5（coverage 文档收尾） | `cover-token-coverage` | 7 类常驻构造 141 条并入 `typescript/cases/*.ts`、移除 `token-repros/`、文档读数更新 | 读数不变：**1636 / 47 / 9** |
| **最终合并态** | **`8dbb7976`** | 全部合入 | **1636 ok / 47 crash / 9 diff / 10 ts-invalid / 1 gap-now-passing**；ast:cases **4763/4763、0/0/0** |

- 每个修复提交都带逐条验证过的**最小用例**；这些用例本轮已折成 §6 七类的常驻构造（见 §6.5），
  `typescript/cases/token-repros/` 已删除。
- 验证方式统一为：目标文件 `token-ast.mjs <file>` exit 0 + 全量 `token-ast.mjs --quiet`（ok 只升、crash/diff 只降）
  + `npm run ast:cases`（identical == total，结构/位置/字段差全 0）+ `xl_build` 0 error + `tsc` 0。

### 6.2 仍剩的缺口（最终合并态 `8dbb7976`：56 = 47 crash + 9 diff）

剩余 **56 处 = 47 crash + 9 diff**（另有 10 ts-invalid 不计、1 gap-now-passing 作回归守卫），按目录：

| 目录 | 条数 | 说明 |
| --- | --- | --- |
| declarations | 18 | G1 形参模式/默认值（8 条「函数参数不是标识符」仍占大头）、G2c ModuleBlock、G10 装饰器声明、孤立 `declare`/`abstract` 等 |
| statements | 7 | 块体 ASI 剩余档、`do-while` 体收口、EOF 共存 |
| expressions | 5 | 泛型箭头 / `new` 实参后缀 / `yield` 语境 |
| types | 6 | 类型位「词 + `{`」、index-signature 换行、条件类型收尾 |
| lexical | 8 | `$` 3 + `\uXXXX` 2 + BOM 1 + shebang 2（全部 §5 待用户决定） |
| modules | 2 | import/export ASI 残留 |
| ambiguous | 1 | 泛型箭头 |

剩余 crash 的**主要消息分布**（top）：

| 消息 | 条数 | 主要族 |
| --- | --- | --- |
| 函数参数不是标识符 | 8 | G1 形参模式 / 默认值 |
| 表达式没有读完 | 6 | 块体 ASI / 表达式边界 |
| 不支持的表达式起点 | 5 | 表达式文法缺档 |
| 缺少标识符 | 4 | `$` / unicode / shebang 连带 |
| 变量声明缺少标识符 | 3 | `$` / 绑定模式 |
| 类型注解没有读完 | 3 | 类型 ASI / 类型文法 |
| 变量声明里有无法识别的单元 | 3 | `!` 断言 / 类型实参切分残留 |
| 类型别名声明的类型没有读完 | 3 | 类型 ASI / `>>` |
| 表达式语句没有读完 | 2 | 根级 ASI / 表达式语句收口 |
| 私有标识符缺少名字 | 2 | shebang `#!` |
| 类型别名声明不完整 | 2 | 类型别名收口 |
| 其余各 1 | 6 | 类成员参数、`泛型实参缺少 >`、import equals 点号、函数返回类型、2 条 CatalogGuide 共存 |

### 6.3 仍剩的 9 条 diff（逐条）

```text
declarations/decl-class-computed-member.ts               D2  类成员计算名（成员名分派，possible build）
expressions/gap-r1231-decl-newline-operator.ts           D9  无分号声明收口（下一条 `/re/g` 被续进声明，end compute）
expressions/gap-r955-yield-await-outside-context.ts      语境型 `yield`（YieldExpression 数量差，possible build/compute）
expressions/gap-r979-new-inst-tagged.ts                  D7  类型实参 + 标签模板（NewExpression End 少一格，possible build）
modules/gap-r869-exp-named-newline-then-from-like.ts     D14 ExportDeclaration 少 ParenthesizedExpression/StringLiteral（待复核）
statements/stmt-do-while-body-terminated.ts              `do-while` 体收口（end compute）
statements/stmt-throw-no-argument-then-statement.ts      D9  throw 零宽节点落点（ThrowStatement End，end build）
types/gap-r1237-type-position-brace.ts                   D10 类型位「词 + {」（possible compute）
types/gap-r907-index-signature-newline-after-readonly.ts D3  readonly 与 `[` 换行（possible compute）
```

按类别：possible build 3、possible compute 3、end compute 2、end build 1。**这 9 条都不属于 basic token**，也不需要改尺子。

### 6.4 「非 shape / 尺子 / TS 恢复」判定（29 条 diff 的结论）

- **28 条是真 shape 缺口**：结构差/位置差都是节点集合或区间真的不同，**没有一条能靠改尺子归一表消掉**；
- **1 条待复核**（`gap-r869-exp-named-newline-then-from-like.ts`：基线结构差 2 个节点，原分析克隆未复现）；
- **10 条 ts-invalid**（TS 自己 `parseDiagnostics ≠ 0`，或 TS 静默恢复成零宽 Identifier / 无名声明）不计入 191，
  属「TS 恢复」类，不应为了对齐它们改 shape；
- **尺子归一表已统一**：`ast-json.mjs` / `ast-json-diff.mjs` / `token-ast.mjs` 共用
  `typescript/cases/ast-compare.mjs` 的 `TS_KIND_ALIASES`（17 条，含 `FirstLiteralToken`、`LastStatement`、
  `LastAssignment` 族、`FirstPunctuation`、`FirstAssignment`、`AssertClause`/`AssertEntry`），
  不再有「窄表把别名印成假结构差」的问题。

### 6.5 §6 七类的常驻用例构造（`typescript/cases/*.ts`）

`typescript/cases/token-repros/` 已并入下列 7 个构造（一行一用例，多行形用行内 `\n`，全部 `ast:cases` 全绿）：

| 构造 | §6 类别 | 条数 | 主要覆盖 |
| --- | --- | --- | --- |
| `basic-token.ts` | basic token 存在问题 | 3（仅边界对照）+ 7 项待裁定注释 | 待用户裁定的 7 个场景只写注释；活跃行钉 `/` 的可判位置 |
| `missing-possible.ts` | 缺少 possible | 9 | D 泛型箭头/`async<T>`、G10 装饰器声明、G11 `using`、G5/G6 类型侧候选 |
| `missing-end.ts` | 缺少 end | 11 | G2b 函数体/构造器体、G2c ModuleBlock 的 `import=`/`export=`、I `export as namespace` |
| `possible-compute.ts` | possible compute 不对 | 25 | K/G5/G6 类体索引签名与成员名、C8、D3、D4、D12、G4/G6/G5 类型成员、conditional-infer |
| `possible-build.ts` | possible build 不对 | 47 | D1/D2/D6/D7/D9/D13、G2 `>>`、G3 async、G7 无体成员/裸 await、G11 function* |
| `end-compute.ts` | end compute 不对 | 43 | A 块体/根级 ASI、B EOF 收口、C1–C3 import/export ASI、L、O、async 前缀歧义 |
| `end-build.ts` | end build 不对 | 3 | D9 `throw`/type-tail 的 End 边界（未修形态只写注释） |
| **合计** | | **141** | `ast:cases` 由 4622 → **4763**（identical 4763/4763、结构/位置/字段差 0） |

> `basic-token.ts` 的 7 个待裁定场景（控制头 `)` 后 `/`、`$`、`\uXXXX`、BOM、shebang、`>>` 拆分、
> Keyword 升级表）全文见该文件头注释与 §5；在用户裁定前不改 `core/**`。

## 7. 复现命令

```bash
# 全量 token 语料（逐文件输出 + 汇总；失败 exit 1）
node typescript/cases/token-ast.mjs

# 只汇总 / 只列失败 / 写逐文件 JSON（schema 与基线报告一致；基线可用 --json 在任意 checkout 重建）
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/token-ast.mjs --fail-only
node typescript/cases/token-ast.mjs --json <path> --quiet

# 过滤：仓库相对路径子串、目录前缀、或 glob
node typescript/cases/token-ast.mjs types/
node typescript/cases/token-ast.mjs "stmt-while"
node typescript/cases/token-ast.mjs "tests/cases/token/**/stmt-while.ts"

# 类型主干 AST 对拍（当前 4763 条；必须 identical == total 且结构差/位置差/字段差全 0）
npm run ast:cases

# token 语料（等价于第一条）
npm run ast:token

# 构建：xl build（core+typescript）→ tsc
npm run build
# 或分步：
#   xl_build(cwd=<仓库>, paths=["core","typescript"], orphans:false)   → 859 written / 0 error
node node_modules/typescript/bin/tsc

# 基线与探针（本仓库不跟踪 tmp/，不要依赖本地遗留文件）
node typescript/cases/token-ast.mjs --json <path> --quiet   # 1703 行逐文件基线，可在任意 checkout 重建
# 四份归因文档的探针是各分析克隆里的临时脚本，未随仓库提交
```

## 8. 附：四份分文档与本文的对应

| 本文节 | 分文档 |
| --- | --- |
| §3 表 | statements §2/§3、declarations §3、expressions+types §2/§5、modules-diffs §3 |
| §4 五问 | statements §4、declarations 各组「五问」、expressions+types 各组「五问」、modules-diffs §4/§5 |
| §5 basic token | statements M、declarations G12、expressions+types §4、modules-diffs §7 |
| §6.4 diff 判定 | modules-diffs §6/§8 |
| §6.2/6.3 剩余缺口 | 主仓 `8dbb7976` 上 `token-ast.mjs --json` 实测（56 = 47 crash + 9 diff）；7 类常驻构造见 §6.5 |
