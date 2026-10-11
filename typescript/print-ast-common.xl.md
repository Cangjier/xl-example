# dependencies
```ts
// @ts-nocheck
```
```xl
import { Token } from "../core/syntax/token.xl.md"
import { Translate } from "./tokens/string/translate.xl.md"
import { SymbolToken } from "./tokens/symbol-token.xl.md"
```

# namespace cangjie

**TS 形状投影的共享核心**（本文件原名叫 `ts-ast.xl.md`，第 198 轮改名——见下）。

它把产物树（token 树）投成 `ts.createSourceFile` 的形状——**kind 用名字**、
每个节点带 `pos` / `end` 与 TS 那边的字段名，给 `cases:tsast` 那种逐节点对拍与人工 diff 用。

出口的分工（第 181~198 轮搬迁的结论）：

投影的**逐标签逻辑已经全部落在各 token 的 `PrintAst` 上**（49 块，一处一块搬完）。
`projectNode` 现在是两步：

1. **节点就是 token 自己**（第 1018 轮起 `view` 那一层删掉了）：`projectNode(node)` 收的
   就是那一格 token，`v = node`，**没有任何中间形态**；
2. **问这个节点自己**：`node.PrintAst(ctx, node)`——覆写了就由它出这一格
   （`ctx.Nothing` 表示「这一格故意不出节点」）；没覆写（或返回 `undefined`）才落到
   本文件的**通用支**：换名表 + 提层 + 字段名。

**中央那张按 `v.type` 分派的 `switch` 已经整段删除**：它原来有 60 个 `case`，
搬到最后一个（`Statement`）时就没有分支了。所以本文件现在的角色是：

- **通用支**（`structuralProps` 兜底；「包装提层」「段名」
  「体字段」与「节点名」那四格第 988~991 / 1025 轮已经搬上各 token，见 `Token.WrapperField` /
  `Token.SegmentNames` / `Token.BodyField` / `Token.AstKind`——**凡是某一页自己知道的事实，
  一律由那一页答，本文件不替它记第二遍**）；
- **`ctx`**——递给 `PrintAst` 的那一组出口（`Kids` / `Expression` / `TypeExpression` /
  `Node` / `StartOf` / `EndOf` / `Project` / `Structural` / `Declaration` / …）：
  搬迁层不许 import 本文件（token → 本文件 → token 会成环），横切工具只能经它过去。
  **这一组出口只减不增，而且每删一个就补进 `direct:lint` 的 `CTX_BANNED`**
  （第 1015 / 1026 / 1030 / 1037 / 1044 / 1060 / 1062 / 1063 / 1067 / 1069 / 1070 / 1071 / 1073 轮）
  ——名字写回来那一门当场红，所以「投影层不该有的能力」是**结构上拿不到**，不是靠自觉；
  `Text` / `TextOf` / `StringText` / `ValueOf` / `OperatorRank` / `AllKids` / `Template` …
  这一串今天都不在表里；
- **共享实现**：那些**被共享层自己调用、且调用方拿不到「单元」这个入口**的函数
  （表达式重写器 `projectExpression` / `projectTypeExpression`、声明列表 `projectLetFrom`、
  成员名判据 `memberNameOf`、修饰词 `addModifiers`……）。
  判据是「所有调用点能不能改写成『把某个单元交给 `projectNode`』」——能就搬，不能就留。

本文件是 `tests/parse/ts-shape.mjs`（原来那 2464 行 JS）的**逐字搬家**：
表名、函数名、函数体、表体与那份实现逐字符相同，只补了 xl 需要的类型标注。
口径是「**先证明等价，再谈改写**」——搬完用一把一次性尺子
（当时那份逐字节对拍脚本）在全语料上逐字节对拍两份实现的输出：
**1399 个文件、0 处不一致**，结论记在 README 的台账里；那把尺子对拍完就删了，
长期判据是 `cases:tsast`（对 `ts.createSourceFile` 的逐节点对拍）。
所以搬家这一步不夹带任何改写。**第 1026 轮把这里剩下的死代码清干净了**：`stmtLike` / `astMembers` /
`DECLARATION_TAGS` / `skipSourceTrivia` / `firstCodeAfter` / `matchBrace` / `matchingParenOf`
七格**全仓一个消费者都没有**，连同 `ctx` 上那三个同样没人用的出口（`FirstCodeAfter` /
`MatchBrace` / `MatchingParen`）一起删掉——它们是搬家时照原样留的（口径是「先证明等价，再谈改写」，
留着只是因为还没轮到动它们）；**`matchingBrace` 当时留着**（那时 `braceSpanOf` 与
`blockOfBody` / `bodyBlockOf` 的兜底支还在用它），**第 1059 轮随那几支一起删掉了**——
「体是不是一对花括号」今天由 token 自己记的那一格说了算（见下）。
量法是**点号访问与裸调用都算、定义那一行不算**：本文件的每一格 `# const` / `# method`
与它的生成物逐名对账，别处 0 次引用才算死。
`projectLogical`（够不着的那个 `case`）已在第 196 轮随搬迁删掉。

**零改写是字面意思**：连空白都一样——`projectNode` 里那个跨 5 行的嵌套三元照原样搬过来，
它暴露出来的那个 `MethodDeclaration` 缺口是**改规则**修掉的（第 75 轮，
`typescript/tokens/function/method-declaration.xl.md` 的 `ValueOperators`），
不是绕着它写规范。

**比原来多的只有一个成员**：`ToJsonText`（以及它要用的 `Token` import）。
原来那份实现是「库」，序列化（当时是两个调用方各自 `JSON.stringify(Token.ToPlain(…))`——
`ToPlain` 那一层第 1019 轮已随中间层一起删掉，现在是这个函数直接在投影出来的节点上做）；
现在收成一处，`cjcli --ts-ast` 与 `samples/check.mjs` 共用同一个函数。

这是一份**纯函数库**：**42 格声明**（`^# …(method|const)` 逐行数出来的实测值：
39 个 `# method` + 3 个 `# const`）都不依赖 `this`、彼此只靠参数耦合，所以按模块级
陈列，而不是收进一个 class——收进 class 要改掉几百处调用点，
那会把「等价迁移」变成「重写」。**导出面只有 3 个名字**（`projectNode` /
`projectRoot` / `ToJsonText`，由 `xl` 按 `# method` 的可见性生成），其余一律 `# private`。
**量法**：`Select-String -Path typescript\print-ast-common.xl.md -Pattern '^# (private )?(method|const) '`
（`.Count` 就是那一格）；本页从第 1073 轮起一律只写**实测值**，不写「上一轮减去几格」的推算
（第 1062 ~ 1090 轮那一栏曾连续抄错 2 格，第 1091 轮复核时逐行数出来的与那一栏不符）。
**第 1136 轮复核时发现这一句自己就是一处抄错的旧值**：它写的是「43 格 / 40 个 `# method`」，
而第 1131 轮删掉 `nameOf` 那一格之后实测就是 42 格 / 39 个 `# method`——按上面那条规矩改成实测值
（**第 1136 轮没有动声明数**：42 → 42，改的是投影那一侧读的一格属性）。

**第 1141 轮把「投影自己找区间开头那些注释」那一趟收进了被问的那一格**（用户口径 1.1 ~ 1.4：
投影要的信息由**被问的那一页**备齐，投影只读属性）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `let pos = v.start;` + `allKids(v).find((k) => startOf(k) === pos && k.IsCommentUnit)` + `while (at < v.end && /\s/.test(ctx.source[at])) at++;`（`astNode` 里那一趟，`pos` 不落在前导注释上） | `v.ProjectionStart` | `core/syntax/token.xl.md` 的 `## property ProjectionStart:int`（`### get`，读自己的 `AllKids` / 各格的 `IsCommentUnit` / 自己的 `Text`）+ **同一轮新立的 `## property AllKids:Array<Token>`**（各段 + `children`、**不滤 `IsInvisible`**——就是本页 `allKids` 那一格 helper 的同一个读数） |

- **等价是全语料并排量出来的**：`tmp/r1141` 把新旧两套判据挂在同一句上跑了一遍全语料
  （`node tests/parse/direct-ast.mjs --all`，2051 份）⇒ `{"n":261082,"mis":0,"samples":[]}`
  ——这一支进入 **261082** 次、**0 次不一致**。八道门读数一处没动是第二份证据
  （`coverage` **4260 / 4422**）。
- **非 token 的合成语句视图照旧同答**：它不是 `Token`，读 `v.ProjectionStart` 得 `undefined`
  ——那正是原来 `v.start` 在那种视图上的答案（`allKids` 在它身上本来就什么都不收）。
- **本页的声明数**：**42 格**（39 个 `# method` + 3 个 `# const`，实测——这一轮删掉的是
  `astNode` 方法体里的一段算式，不是一格声明）。

**第 1140 轮把「投影拿这一格自己的正文去和尖括号比」那三处收了**（与上一轮同一把尺子：投影要的
信息由**被问的那一页**答，投影只读属性）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `const text = k.IsSymbolToken \|\| k.IsLessThanSymbol ? k.TextValue : "";` 再 `text === ">"`（**三处**：`projectExpression` 尖括号断言那一趟、`chainOnto` 量断言长度那一趟、`projectTypeExpression` 平铺实参段那一趟） | `k.IsGreaterThanSymbol` | `core/syntax/token.xl.md` 的 `## property IsGreaterThanSymbol:bool`（基类默认档 `false`）+ `typescript/tokens/symbol-token.xl.md` 的覆写（读自己的 `TextValue`）——**第 1118 轮 `IsLessThanSymbol` 那一形态补齐的另一半** |

- **等价怎么证的**：`IsLessThanSymbol` 只有符号那一页覆写（基类答 `false`），所以原来那句
  `IsSymbolToken || IsLessThanSymbol` 的守卫与 `IsLessThanSymbol` 本身**逐格同答**；
  `text === ">"` 就是符号那一页的 `TextValue === ">"`。第三处还多一句
  `IsSymbolToken === false → continue`——非符号那几页两面都答 `false`，**不跳与跳逐格同答**，
  那句话随属性读一起删掉。八道门读数一处没动是证据（`coverage` **4260 / 4422**）。
- **本页的声明数**：**42 格**（39 个 `# method` + 3 个 `# const`，实测，**一格没增没减**）。

**第 1139 轮把「投影拿这一格自己声明的名字文本去和语言里的字面量比一遍」那一处收了**（用户口径
1.1 ~ 1.4：投影要的信息由**被问的那一页**在认下名字那一刻记好，投影只读属性）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `v.Parent?.IsClassBody === true && v.DeclaredName === "constructor"`（`projectDeclaration` 判「是不是类体里的构造」那一支） | `v.Parent?.IsClassBody === true && v.IsConstructorName === true` | `typescript/tokens/function/method-declaration.xl.md` 的 `## field IsConstructorName:bool = false`，与同页 `IsNumericLiteralName` **同一趟**（`Process` 里认下 `name` 之后）赋好、`Clone` 抄一格 |

- **等价怎么证的**：这一格的取值就是 `this.name === "constructor"`，而 `DeclaredName` 在这一页上
  给的就是 `this.name`（`NameField` 答的是 `name` 本身；`name` 为空时基类退回 `(this as any).name`，
  两边都答空串）——所以原来那一句与新属性**逐字符同答**。八道门读数一处没动是第二份证据
  （`coverage` **4260 / 4422**，`blocked 28` / `differ 134` / `bad 0`，与第 1106 ~ 1138 轮逐项相同）。
- **这一轮不留新判据**：`direct:lint` 那一族守的是**问句名**（`isDot` / `ctx.IsNameNode` 那种写法）
  与**类名比较**（`X.Tag === "…"`），而这一处是「拿 token 自己的文本去和字面量比」——
  今天扫不到更细的形态（与第 1138 轮同一处境），所以只把判据写进两处台账。
- **本页的声明数**：**42 格**（39 个 `# method` + 3 个 `# const`，实测，**一格没增没减**）。

**第 1138 轮把「按某一格自己的坐标去读 `ctx.source`」这一族**收干净了**（用户口径 1.1 ~ 1.4：
投影要的信息由**被问的那一页**在构造 / 认下名字那一刻记好，投影只读属性）——
最后一只漏网是 `memberNameOf` 里那句「名字两头是不是同一个引号」：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `const before = at.pos > 0 ? ctx.source[at.pos - 1] : "";` + `(before === '"' \|\| before === "'") && ctx.source[at.end] === before`（`memberNameOf` 里**最后 1 处**回原文读） | `v.IsQuotedName === true` | 基类 `core/syntax/token.xl.md` 的 `## property IsQuotedName:bool`（`### get`，与同页 `NameTextSpan` 里那个 `quoted` **同一份算术**）；它的输入是**各页自己**显式声明的 `NameSpan` |

- **为什么它以前留得住**：第 1109 轮记下的理由是「名字那一格**不是每个单元都记着** `NameSpan`
  （`MethodDeclaration` / 方法签名的字符串名没有那一格，实测那一版 `decl-string-name-member`
  一族 5 条当场缺 1 多 1），那时只有原文答得出来」。**这一轮把那个前提消掉了**：
  `typescript/tokens/function/method-declaration.xl.md` 补上 `## field NameAt:TokenField<number>`
  与 `## property NameSpan:Array<int>`（与 `tokens/field.xl.md` **同名同形同条件**：只认
  普通标识符与字符串字面量，私有名 / 关键字名 / 计算名不给这一格），在**认下名字那一趟**
  （`MethodDeclarationCloseRule.Process` 里那段记 `NameStart` / `NameEnd` 的地方）赋好、`Clone` 抄一格。
- **等价分两段量，都过**：
  ① `synthName` 那一侧——本页对字符串方法名从此走 `NameSpan` / `NameTextSpan` 那条路，
  而两条路给出的两对数**逐字相同**（`NameStart = 起 + 1`、`NameEnd = 止 - 1`，见 `synthName` 那一节）；
  ② `memberNameOf` 那一侧——**新旧两个判据并排挂在同一句上跑了一遍全语料**
  （`tmp/r1138`，在构建产物的那一行前挂计数器，跑 `node tests/parse/direct-ast.mjs --all`，2051 份）：
  **进入 42427 次、不一致 0 次**。八道门读数一处没动是第三份证据。
- **判据那一侧不用挂例外了**：`direct:lint` 的两条读数（「按某一格自己的起点读 `ctx.source`」
  「按坐标从 `ctx.source` 切正文」）本来就报 0 处——因为**它们扫的是 `ctx.source[startOf(x)]` /
  `ctx.source[x.start]` 那两种写法**，而这一处写的是 `ctx.source[at.pos - 1]`（`at` 是**投出来的节点**），
  两种写法都不匹配，于是它从那一门漏了过去。这一轮不留新判据（那一族的读取数已经是 0，
  没有更细的形态可扫），只在两处写下「它为什么以前扫不到」。
- **本页的声明数**：**42 格**（**一格没增、一格没减**：改的是一处读数与说明；新立的一格
  `IsQuotedName` 在基类，补的两格在 `MethodDeclaration`）。

**第 1137 轮把「这一格是哪一态括号」那一门**漏掉的第 28 处**收了**，并把那一门补全到
「三种写法都认」（用户口径 1.1 ~ 1.4：投影要的信息由**被问的那一页**那一格答，本页只读属性）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `kids[kids.length - 1].IsBracketUnit && kids[kids.length - 1].startBracket === "("`（`projectExpression` 末尾「对调用结果再调一次」那一支，本页**最后 1 处裸字段读**） | `kids[kids.length - 1].IsParenBracket` | `tokens/bracket.xl.md` 第 1089 轮就立好的那一格（`## field IsParenBracket:bool = false`，`Use` 里 `this.IsParenBracket = this.startBracket === "("`、`Clone` 抄同一格，基类答 `false`） |

- **它为什么漏了**：第 1089 / 1095 / 1109 轮那 27 处写的是 `X.Tag === "Bracket" && X.startBracket === "("`，
  而 `direct:lint` 的 `BRACKET_STATE_CLASSIFY` 两条正则**都要求 `Tag === "Bracket"` 那一半在前面**
  ——这一处没有那一半（守卫写的是 `IsBracketUnit`），所以这一门从来报不出来
  （与第 1115 轮收掉的 `IsCommentUnit` 那一处是同一款漏网）。
- **等价怎么证的**：`IsParenBracket` 只在 `Bracket` 那一页答 `true`（基类 `false`），
  取值就是 `this.startBracket === "("`——所以原式那两句的合取与这一格**逐字同答**，
  「是不是括号」那一半也被蕴含；八道门读数一处没动就是这条的证据。
- **判据这一轮长了**：`BRACKET_STATE_CLASSIFY` 补第三条**裸字段读**
  （`X.startBracket === "[" / "(" / "{"`，接收者连 `kids[kids.length - 1]` 这种下标都算），
  **自验**（`tmp/r1137`，不进仓库）：把那一行写回去 ⇒ 这一门报 **1 处**并点名那一行、退出码 1；
  改回属性读 ⇒ 0 处。本页代码块里 `.startBracket` 从此**一处不剩**（那一格是**存储**，
  三格属性才是入口）。
- **本页的声明数**：**42 格**（**一格没增、一格没减**：改的是一处读数、说明与 `direct:lint` 的判据）。

**第 1136 轮把第 1135 轮「量过、没敢收」的那一处收成了**（用户口径 1.1 ~ 1.4：投影要的信息
由**具体 token 子类**在自己那一页**显式声明**、在**构建过程**里赋好，读的时候备齐）。
收的对象是 `memberNameOf` 里「我声明的这个名字是不是数字字面量」那一句：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `direct === undefined && Identifier.IsNumericLiteral(name)`（`memberNameOf` 里**最后 1 处**，`name` = `v.DeclaredName`） | `direct === undefined && v.IsNumericLiteralName === true` | `Field` / `MethodDeclaration` **各自显式声明** `## field IsNumericLiteralName:bool = false`，并在**认下名字的那一趟**赋好（`FieldCloseRule.Process` 里 `fieldName` 赋值之后 / `MethodDeclarationCloseRule.Process` 里 `name` 那三支之后），`Clone` 各抄一格；取值走同一个静态入口 `Identifier.IsNumericLiteral`、同一段文本 |

- **收件人先量后立**（第 1135 轮的教训写在 `memberNameOf` 那一处）：那一格上的 `v`
  **不是名字单元自己**，而是**声明了这一格名字的那一格**——第 1135 轮把这一格立在基类上，
  于是 `MethodDeclaration` / `Field` 拿到默认档 `false`，`coverage` 当场四条一起 blocked
  （4260 → 4256 / 4422、`blocked` 28 → 32，diff 是 `MISS NumericLiteral` + `EXTRA Identifier`）。
  这一轮先在**构建产物**的那一句上挂一个探针、跑
  `node tests/parse/direct-ast.mjs --all`（2051 份）记下 `v.constructor.name`：
  **`["Field","MethodDeclaration"]`**——就是这两个类，一个不多。名单是量出来的，不是猜的。
- **两页各自显式声明、两处各自赋值**：`field.xl.md` 读自己的 `fieldName`、
  `function/method-declaration.xl.md` 读自己的 `name`——与投影原来那个实参
  `name = v.DeclaredName` 是**同一份文本**（`DeclaredName` 正是这两页的 `NameField`），
  所以两处与原来那一句**逐格同答**；`Clone` 各抄一格（克隆体不走 `Process`，与
  `FunctionFlags` 同一条理由）。
- **同一轮删掉一行 `import`**：这一句是**本页对 `Identifier` 那一页的最后一个代码读者**
  （全仓实测：构建产物里 `identifier_1` 只出现在这一行），所以
  `import { Identifier } from "./tokens/identifier.xl.md"` 同一轮删掉——本页不再 import 那一页。
- **本页的声明数**：**42 格**（**一格没增、一格没减**；新立的那两格在 `Field` /
  `MethodDeclaration` 两页上）。同一轮把这一句自己的旧值「43 格 / 40 个 `# method`」改成实测的
  42 格 / 39 个 `# method`（第 1131 轮删 `nameOf` 之后就该改了，见上面那一句）。
- **实测**：`xl check` 该 3 页 **0 条**、`xl build` 该 3 页 **3 个产物 / 0 error**、
  `npx tsc` 干净；**八道门 7 通过、1 失败**（墙钟 33.9s），读数与第 1106 ~ 1135 轮逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79；唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`。

**第 1109 轮把三格「一格声明、只有本页某两处读者」并进各自那个调用点**（用户口径 1.1~1.4 的
同一把尺子：一格声明若只剩转手与读表、而且读者就在同一个函数里，那它就是多一层间接）：

| 并掉的声明 | 并进哪里 | 为什么它不该单独立一格 |
| --- | --- | --- |
| `fieldNameFor(kind, key, node)`（45 行） | `structuralProps` 里的 `fieldOf`（两处读者都在这一格函数） | 它问的是「这一段是哪个 token 切的、那一格答什么」（`node.SegmentNames`），读者只有本函数那两处 |
| `bindingSpan(from, limit, ctx)`（18 行） | `projectLetFrom` 里的 `bindingSpanOf`（两处读者都在这一格函数） | 解构声明那两个分支各自拿到的就是这个区间，没有第二个调用方 |
| `ownsTrailingSemicolon(node, ctx)` + 数据表 `ENDS_ON_BRACE` | `projectEach` 里的 `ownsTrailingSemicolonOf` / `endsOnBrace`（唯一读者就是那一格函数里的一处） | 数据表的唯一读者就是这一格；两者一起搬，本页少两格声明 |

三格**判据一个字没改**，只是不再单独立声明（与第 1103 / 1104 / 1101 / 1100 轮同一手法）。

**第 1114 轮把第 1100 轮「留作下一轮」的那一格并掉了**——`projectBindingElement`（126 行）
的唯一读者就是 `projectBindingPattern` 里元素循环那一处（第 1100 轮量过：全仓没有第二个读者，
`ctx.BindingPattern` 是**模式**那一格、由 `projectBindingPattern` 答），所以：

| 原来的现场算式 | 今天谁答 |
| --- | --- |
| `projectBindingElement(kid, ctx)`（`v.ProjectableKids` 切冒号 / 等号 / `...`，再按位置出 `BindingElement`） | 算式**连着说明一起**搬进 `projectBindingPattern` 体里的 `projectBindingElementOf(kid)`（三种形态那张表跟着走），形参 `unit` 换成调用点的 `kid`，算式本身一字不动 |

- **为什么这一轮才并**：第 1100 轮记下的理由正是「函数体是 121 行真算式、**不是转手**，
  下一轮要并它就得连着说明一起搬」——所以这一轮搬的是**算式 + 说明**（那一节的三形态表
  与 `[k2]: { a }` 那几条踩坑注释都留在原地，只是从「小节」变成「调用点旁边」）。
- **它不是死代码**（第 1100 轮就写下了）：并的是**多一层间接**，不是删一段没人用的东西；
  判据与第 1103 / 1104 / 1109 / 1110 / 1111 / 1112 / 1113 轮同一把尺子。
- **同一轮改掉两处过期引文**：`ctx` 那一行出口的注释原来写着「第 1100 轮并进了它唯一的调用点
  ……见 `bindingElementOf` 它那一节」（**那一节与那个名字都不存在**），改成事实（第 1114 轮、
  `projectBindingElementOf`、在 `projectBindingPattern` 体里）；上面那一栏「留下没并的一格」
  也按这一轮改写。
- **本页的声明数**：**45 → 44 格**（42 → 41 个 `# method` + 3 个 `# const`，实测）。

**第 1115 轮把第 1099 轮如实记下的「名单之外那两族」一次收干净**（用户口径 1.1 ~ 1.4：
投影要的信息由**具体 token 子类**在自己那一页**显式声明**、在**构造 / `Close` 那一刻**赋好，
读的时候备齐）——两族的答案过去都由投影层现场写类名，而**类名就是被问那一页自己的名字**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `k.Tag === "LineAnnotation" \|\| k.Tag === "AreaAnnotation"`（`astNode` 里跳前导注释那一支，**最后 1 处**） | `k.IsCommentUnit` | `LineAnnotation` / `AreaAnnotation` **各自显式声明** `## field IsCommentUnit:bool = true`（第 1084 轮就立好了，那一处是漏网的**同一句话**） |
| `X.Tag === "BinaryOperator"` / `X.Tag !== "BinaryOperator"`（**9 处**：`headIsBinary` 与它下面那个剥壳循环、`binaryTail` 的取尾链、可选链那一支、折链那一支、`namedSpecifiersOf` 的递归展开、先取局部变量 `kind` 再比的 `chainTailInOperator` / `indexTailInOperator`） | `X.IsBinaryOperatorUnit` | `BinaryOperator` 那一页**显式声明** `## field IsBinaryOperatorUnit:bool = true`（构造时就位；基类默认 `false`，所以 `LogicalOperator` 答 `false`） |
| `X.Tag !== "BinaryOperator" && X.Tag !== "LogicalOperator"`（**5 处**，含先取 `const kind = unit.Tag;` 再比的两处） | `X.IsBinaryOperatorNode !== true` | 两页第 1088 轮**已经**各自显式声明 `## field IsBinaryOperatorNode:bool = true`——本轮只是把那 5 处的**否定形态**也改成属性读（第 1088 轮只改了 `===` + `\|\|` 那一形态） |

- **为什么两族该分开**：注释那一族**只认两页**，二元那一族**两页同答**（`IsBinaryOperatorNode`），
  而窄问的 9 处问的是「这一格是不是 **`BinaryOperator`** 那一页的单元」——剥壳读的是
  `Data` 的**倒数第二格**（运算符在中间），**逻辑单元**把运算符放在最后一格（布局不同），
  所以收成 `IsBinaryOperatorNode` 会把 `LogicalOperator` 一起收进来 = **改语义**。
  第 1088 / 1099 轮两次逐字保留的正是这一点，本轮**照那条判据立一格自己的名字**，
  于是「窄问」与「族那一问」各有各的属性，两页各自显式声明、各自守着自己那一问。
- **`TextValue` 那两处照旧**（第 1107 轮记过，不在这一族里）：`ctx` 之外还有
  `TextValue === "."` 3 处与 `TextValue === ","` 2 处，它们问的是**符号 / 二元运算符那一页**
  的正文，与本轮的类名那一问不是同一件事，**一处没动**。
- **判据跟着长三条**：`direct:lint` 第八条那一族多认一个名字（`IsBinaryOperatorUnit`，
  问句形态 `isBinaryOperatorUnit(…)` / `ctx.IsBinaryOperatorUnit` 写回来当场红）；
  第十七条 `SELF_TAG_CLASSIFY` 补上 `"BinaryOperator"` / `"LineAnnotation"` / `"AreaAnnotation"`
  三个 `<Tag>`（单比形态 0 处）；第十四条 `BINARY_CLASS_DISJUNCTION` 补上 **`!==` + `&&`
  的否定形态**与**先取标签再比**那一形态（它原来只认 `===` + `||`，那 5 处一直不在它的视野里）。
  **自验**（本机探针，不进仓库）：把一处 `k.IsCommentUnit` 写回成两连比类名 ⇒ 第十七条
  报告 0 → 1 处、退出码 1；源文件逐字节还原 ⇒ 回到 0 处。
- **本页的声明数**：**44 格**（**一格没增、一格没减**：改的是 15 处调用点与说明，
  新立的两个属性在基类与那三页；本页 `# const` / `# method` 仍是 41 + 3）。

**第 1116 轮收的是同一句话的第三种写法——「先把 `X.Tag` 取进局部变量、再拿它比类名」**
（用户口径 1.1 ~ 1.4 的同一把尺子；这也是第 1115 轮收完之后，本页代码块里**最后**还在按类名
问话的那一族）。它一直躲着 `direct:lint` 那几条按行匹配的正则：比的是**局部变量**，
`Tag` 早就不在同一行里了。本轮把**6 格局部变量、7 处比较**连同变量本身一起收掉：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `const headType = head.Tag;` + 8 处比较（`"Label"` / `"Export"` / `"Let"` / `"Keyword"` 两处 / `"Statement"` / `"TypeAssign"` / `"Bracket" && startBracket === "{"`） | `head.IsLabelUnit` / `IsExportUnit` / `IsLetUnit` / `IsKeywordUnit` / `IsStatementShell` / `IsTypeAssignUnit` / `IsBraceBracket` | 前六格都是第 1096 / 1099 轮已立的属性；`IsTypeAssignUnit` 是**本轮新立**（`tokens/type-assign.xl.md` 显式声明 `## field … = true`）——那一支要**在投它之前**认出「这一格是不是本页」（`export type T = …` 的起点在外层 `Statement` 上，要把 `ctx.baseStart` 递进去），而同页的 `IsStatementNode` 答的是**投出来的形状**，两问不同 |
| `const instHead = kids[0].Tag;` + 2 处（`"Identifier"` / `"PropertyAccess"` / `"Bracket" && startBracket === "("`） | `kids[0].IsIdentifierUnit` / `IsPropertyAccess` / `IsParenBracket` | 三格都是既有属性（`IsParenBracket` 第 1089 轮在 `Bracket.Use` 里赋好） |
| `const headKind = kids[0].Tag;` + 2 处（`"Keyword"` / `"Identifier" && 正文是 await / yield`） | `kids[0].IsKeywordUnit` / `IsIdentifierUnit` | 两格既有；**正文那一半照旧读 `TextValue`**（同一个词两态都要认，第 739 轮的口径没动） |
| `const tailKind = unit.Tag;` + 4 处（`"Bracket"` / `"PropertyAccess"` / `"Method"` / `"NotNull"` / `"SymbolToken" && 正文是 "."`） | `unit.IsBracketUnit` / `IsPropertyAccess` / `IsMethodNode` / `IsNotNull` / `IsSymbolToken` | 五格既有；末尾那一句**两半都成了属性读** |
| `const kind = one.Tag;` 两处（`tagIsPostfixChain` 的 7 个名字 / `IsChainTail` 的 7 个名字） | 逐名换成 `IsIdentifierUnit` / `IsPropertyAccess` / `IsMethodNode` / `IsBracketUnit` / `IsStringUnit` / `IsGenericType` / `IsExpressionWithTypeArguments`（前者）与 `…IsArrayLiteralUnit` / `IsNullConditionalOperator` / `IsNotNull`（后者） | 除 `IsExpressionWithTypeArguments` 外都是既有属性；那一格是**本轮新立**（`tokens/heritage-clause.xl.md` 的 `ExpressionWithTypeArguments` 类显式声明 `## field … = true`）——它与 `IsGenericType` **不是同一问**（那一行两个名字都要认），所以是两格不是一格 |

- **剩下 5 处 `.Tag` 一处没动，理由是它们是「数据」不是「问话」**：
  `ctx.unmapped.add(v.Tag)`、`mk(v.Tag, { … })`、`kind: unionUnit.Tag`、
  `const tag: any = node.Tag;`、`/(Condition|Statement|Segment)$/.test(first.Tag)`——
  这五处要的是**类名这个字符串本身**（未映射时原样透传的那个 kind、或按后缀判形状），
  不是「这一格是不是某一类」那一问；把它们也改掉就是把**数据**换成问题，方向反了。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认两个名字
  （`IsExpressionWithTypeArguments` / `IsTypeAssignUnit`）；第十七条 `SELF_TAG_CLASSIFY`
  补 `"ExpressionWithTypeArguments"` / `"TypeAssign"` 两个 `<Tag>`；**新立第十八条**
  `TAG_LOCAL_VAR_COMPARE`——`const X = ….Tag;` 之后又拿 `X` 比类名 = **0 处**
  （认法带 240 字的窗口，所以「先声明、隔几行再比」也算）。
  **自验**（本机探针，不进仓库）：把 `const instHead = kids[0].Tag;` + `instHead === "Identifier"`
  写回一处 ⇒ 新门 **0 → 1 处**、退出码 1；源文件逐字节还原 ⇒ 回到 0 处。
- **本页的声明数**：**44 格**（**一格没增、一格没减**：改的是 6 格局部变量与它们比过的 7 处类名，
  新立的两个属性在基类与那两页）。

**第 1117 轮按同一把尺子收掉本页最后一格「只有本页一处读者」的声明**：
`trailingTriviaStart(v, end)`（10 行递归）在本页代码块里**只有 `stmtEndOf` 里那一处**读者
（它自己的递归不算读者），所以算式连着说明一起搬进 `stmtEndOf` 里就地展开成
`trailingTriviaStartOf(unit, at)`——形参 `v` / `end` 换成调用点的 `unit` / `at`，
算式本身一字不动。本页 **44 → 43 格**（40 个 `# method` + 3 个 `# const`，实测）。

- **它是「多一层间接」而不是死代码**：那一格是**真算式**（沿「区间终点正好是这个 `end`」的
  那条链递归找收尾注释），但答案只服务**一个**调用点——判据与第 1103 / 1104 / 1109 ~ 1114
  轮同一把尺子（并的是多一层间接，不是删没人用的东西）。
- **`functionTypeProps` 形状相同、但这一轮没动，理由是它多一个身份**：它在本页也只有
  `projectTypeExpression` 里那一处读者，可它**同时是 `ctx` 上的一个出口**
  （`ctx.FunctionTypeProps`）——`typescript/tokens/function-type.xl.md` 有一处**活读者**
  （`ctx.FunctionTypeProps(ctx.Kids(v))`）。那是**别的页的入口**，按第 1070 轮那把尺子
  （出口**零**读者才收）不该动：并掉实现等于把那一页的入口一起并掉。
- **过期引文一并改掉**：本页三处旧记录（第 1085 轮那一段、`allKids` 那一节的两处）原样写着
  `trailingTriviaStart` 这个名字——**它今天不再是一个声明**，代码在 `stmtEndOf` 里
  （那两处已按这一轮改写；后面再有人读到旧提交信息里的这个名字，按这条口径理解）。
- **同一轮按「过期的过程账不留」这条口径删掉一段散文**：第 1099 轮那条「还有两族在名单之外」的
  现场照录（第 1115 / 1116 两轮已把两族收干净、当时留着当历史）整段删掉——今天的规格是
  **0 处**，历史在 git 提交信息里。
- **本页的声明数**：**44 → 43 格**（40 个 `# method` + 3 个 `# const`，实测；
  删掉的是一格 `# private method`）。

**第 1118 轮把「按正文比那几个词 / 那几个符号」这一族收进被问的那两页**
（用户口径 1.1 ~ 1.4：投影要的信息由**具体 token 子类**在自己那一页**显式声明**，
在**构造 / `Close` / `SetValue` 那一刻**赋好，读的时候备齐）。第 1115 / 1116 两轮收的是
**类名**那一问（`X.Tag === "Label"` 这种），本页代码块里那一族已经 0 处；而**同一句话的
第四种写法**——`X.TextValue === "new"` / `=== "<"` / `=== "#"` 这种**按正文比**——
一直不在任何一条门的视野里（门只认 `Tag`）。本轮把**5 个词 / 符号、9 处现场写法**收干净：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `k.TextValue === "new"`（**3 处**：`projectExpression` 的 `new.target` 那一支、`functionTypeProps` 找构造签名那一格、`projectTypeExpression` 的平铺构造类型那一支） | `k.IsNewKeyword === true` | `Keyword.SetValue` / `Identifier.Close` **各自显式声明**同一格、在**记下正文那一刻**赋好（`TextValue === "new"`）；基类默认 `false` |
| `kids[0].TextValue === "async"`（**2 处**：`projectExpression` 里 `async` 起头的语句壳那一支，含它下面那条三格连写） | `kids[0].IsAsyncKeyword === true` | 同上（`"async"`）——`async` 在本工程里多数时候停在 `Identifier` 上，那一页也答 |
| `k.TextValue === "abstract"`（**1 处**：`functionTypeProps` 里把 `abstract` 收进 `modifiers`） | `k.IsAbstractKeyword === true` | 同上（`"abstract"`） |
| `TextValue === "new" \|\| TextValue === "import"`（**1 处**：`new.target` / `import.meta` 那一支） | `IsNewKeyword` / `IsImportKeyword` | 同上（`"import"`） |
| `k.IsSymbolToken && k.TextValue === "<"`（**2 处**：`projectExpression` 的 `<T>x` 断言那一支、`projectTypeExpression` 平铺的 `A[Lowercase<K>]` 实参段） | `k.IsLessThanSymbol` | `SymbolToken` 那一页 `## property` + `### get`：`return this.TextValue === "<";`（**读时现算**，与 `IsColonSymbol` / `IsAsteriskSymbol` 同一形态；基类 `### get` 答 `false`） |
| `k.IsSymbolToken && k.TextValue === "#"`（**2 处**：`projectExpression` 里表达式位的私有名 `#x`、`chainOnto` 里 `this.#x`） | `k.IsHashSymbol` | 同上（`"#"`） |

而 `TextValue === "."` 的**3 处**本轮**一并收掉**（它们问的是「我这一格的正文是不是那个点号」，
而那一格**早就有了**：`SymbolToken.IsDotSymbol`，`Close()` 里赋的 `## field`，第 1057 轮立的）：
`projectExpression` 里「`.` 不是切点」那一格与「尾巴里有没有平铺的 `.`」那一格、
`projectTypeExpression` 里算点号个数那一格——三处都改读 `unit.IsDotSymbol`。
**`IsDotSymbol` 那半句 `IsSymbolToken` 也随之收掉**（基类默认 `false`，只读那一格就够）。

- **为什么不与 `IsOperatorUnit` / `IsPrefixOperatorUnit` 合并**：那两格问的是「我这一格的正文
  是不是**某一串**词里的一个」（一份名单、一个布尔），而这一轮这五格各自问**一个词**
  （`new` / `async` / `abstract` / `import` / `<` / `#`）——名字各写各的，与
  `IsColonSymbol` / `IsEqualsSymbol` 那一族同一条口径：**一个问题一个名字**，
  免得下一个词进来时去改一格本来答别的问题的属性。
- **词法身份两页各答**（与第 1062 轮 `IsTypeParameterModifier` 同一条口径）：`new` / `import`
  在产物里通常是 `Keyword`，可「还停在标识符上的那一格」也递得到投影（`async` / `abstract`
  尤其如此），所以 `Keyword` 与 `Identifier` 两页各写自己认得的词，**不是同一份名单抄两遍**。
- **判据这一轮没长**（如实记下）：`direct:lint` 那几条门认的是 `Tag` 比类名（`SELF_TAG_CLASSIFY`
  / `TAG_LOCAL_VAR_COMPARE`），**看不见 `TextValue` 比正文**——所以这一族过去与今后都能从门下走过。
  本轮**没有**新立一条扫 `TextValue` 的门：`TextValue === "?"` / `=== ","` / `=== ";"` /
  `=== "is"` / `=== "type"` 那几处问的是**那一格自己的正文**（`SymbolToken` / 二元单元上的
  分隔符、类型谓词那个 `is`、导出子句那个 `type`），与「这是哪个词」是两件事，写成门会一起判红。
  要立门得先给这两类找出可判的形态——留给下一轮。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是 12 处调用点与说明，
  新立的两格属性在基类与 `SymbolToken` 那一页，另外四格在基类与 `Keyword` / `Identifier` 两页）。

**第 1119 轮接着往同一族里收**（用户口径 1.1 ~ 1.4）：第 1118 轮把「按正文比那五个词 /
两个符号」收进了被问的那两页，本轮收的是**同一条尺子下剩下的那几族**——
`direct:lint` 那几条门（认 `Tag` 比类名）依旧看不见它们，所以逐处按代码块数出来是
**6 个词 / 2 个符号、10 处现场写法**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `head.IsKeywordUnit && head.TextValue === "with"`（**1 处**：`projectStatement` 的 `with (obj) { … }` 那一支） | `head.IsWithKeyword === true` | `Keyword.SetValue` 里赋好（基类默认 `false`） |
| `["export", "default"].includes(k.TextValue)`（**1 处**：`projectExport` 给赋值式导出收集修饰词） | `k.IsExportKeyword === true \|\| k.IsDefaultKeyword === true` | 同上（两格同一趟） |
| `word.TextValue === "export" ? "ExportKeyword" : "DefaultKeyword"`（**1 处**：同一个 `map` 里分派） | `word.IsExportKeyword === true ? "ExportKeyword" : "DefaultKeyword"` | 同上 |
| `k.IsKeywordUnit && k.TextValue === "export"`（**1 处**：把 `export` 从 `rest` 里滤掉） | `k.IsExportKeyword !== true` | 同上（`IsKeywordUnit` 那半句一并收掉） |
| `k.IsIdentifierUnit && k.TextValue === "as"`（**1 处**：`namedSpecifiersOf` 找 `{ a as b }` 的 `as`） | `k.IsIdentifierUnit && k.IsAsKeyword === true` | 同上（`as` 是上下文关键字，`Keyword` / `Identifier` 两页各答） |
| `k.TextValue === "as"`（**1 处**：`namedExportClause` 找 `export * as ns` 的 `as`） | `k.IsAsKeyword === true` | 同上 |
| `k.IsNameNode && k.TextValue === "extends"`（**1 处**：`ctx.ConditionalNode` 找条件类型的 `extends`） | `k.IsExtendsKeyword === true` | 同上 |
| `k.IsSymbolToken && k.TextValue === "?"`（**1 处**：`structuralProps` 把可选方法的 `?` 收成 `questionToken`） | `x.IsQuestionSymbol === true` | `SymbolToken` 那一页 `## property` + `### get` 读 `TextValue` 现算（基类 `### get` 答 `false`），与 `IsColonSymbol` 同形态 |
| 局部 `isSymbol(k, "?")` / `isSymbol(k, ":")`（**4 处**：`ctx.ConditionalNode` 里找 `?` 与 `:` 各两次） | `k.IsQuestionSymbol === true` / `k.IsColonSymbol === true` | 同上（`IsColonSymbol` 第 1108 轮已立）——**局部转手 `isSymbol` 整格删掉** |
| `k.IsSymbolToken && k.TextValue === ";"`（**1 处**：`projectExport` 把尾分号从表达式里滤掉） | `k.IsSemicolonSymbol !== true` | 同上（`";"`） |
| `[":", "?"].includes(k.TextValue)`（**1 处**：`ctx.Segment` 只排掉分段自己的标点） | `k.IsColonSymbol === true \|\| k.IsQuestionSymbol === true` | 同上 |
| `unit.IsSymbolToken && unit.TextValue === "."`（**1 处**：`chainTail` 认点号） | `unit.IsDotSymbol` | `SymbolToken` 那一页 `## field`（`Close()` 里赋好，第 1057 轮立）；**这一处里 `IsSymbolToken` 那半句第 1120 轮收掉** |

- **同一轮补掉一处自己造的隐患**：`conditionalNodeOf` 里那个局部 `isSymbol` 换掉之后，
  **同一个函数后半截还有两处调用它**（`tailQuestion` / `tailColon`）——`xl build` 与 `tsc`
  都不会报（那两行在同一个 `const` 作用域里语法合法、`any` 吞掉了名字），可运行时当场
  `isSymbol is not defined`（`coverage` 的 `blocked` 28 → 68、`cases:direct` 25 份抛异常）。
  组件按错误改完再跑一次八道门逐项回到原读数。**这一条写在这里，是因为它是「当场看不见」
  的那一类**：类型标注 `any` 把「名字没了」这半句一起吞了，只有真跑才现形。
- **`TextValue` 还剩的那几处照旧**（第 1118 轮记过，本轮一处没动）：`=== ","`（逗号那个
  二元单元自己的正文，`IsCommaSymbol` 已答、那一处读的是**运算符单元**）、`=== "is"` /
  `=== "type"`（类型谓词与导出子句的标志词）、`=== separator`（`splitTopLevel` 按参数比）、
  `=== text`（`isTypeOp` / `isWord` 按参数比）——它们问的是**那一格自己的正文或调用方给的参数**，
  与「这是哪个词」不是同一件事。
- **判据依旧没长**（与第 1118 轮同一条理由）：这几族都在 `TextValue` 上，门只认 `Tag`。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是 12 处调用点与说明；
  新立的八格属性在基类与 `Keyword` / `Identifier` / `SymbolToken` 三页）。
- **第 1120 轮接着收了两件事**（见下）：本页那一格「局部转手」的 `isSymbol` 也删掉了
  （它的实参恒为 `"."`，12 处改读 `IsDotSymbol`），`IsSymbolToken` 那半句在
  `IsLessThanSymbol` / `IsDotSymbol` / `IsCommaSymbol` 上剩下的四处一并收掉。

**第 1142 轮补掉第 1120 轮漏下的第五处**（用户口径 1.1 ~ 1.4，与上一条同一把尺子）：
下面那张表当时写的是「`IsSymbolToken` 那半句剩下的**四处**」，可本页还有 **1 处**没在那张表上
——`projectExpression` 里 `await` 摊平那一支的 `tailIsOperators`：

| 原来的现场算式 | 今天读的那一格 | 为什么那半句是多余的 |
| --- | --- | --- |
| `!(unit.IsSymbolToken && unit.IsDotSymbol)`（**1 处**：`await` 摊平那一支判「尾巴里有没有平铺的 `.`」） | `!unit.IsDotSymbol` | `IsDotSymbol` 只有 `SymbolToken` 那一页答 `true`（基类默认 `false`、赋在 `Close()` 里，第 1057 轮立）——非符号那半句永远进不来，与上表四例同一条 |

- **它为什么当年从门下走过**：那一处写的是**跨行的三行连写**（`!(unit.IsSymbolToken &&`
  换行 `unit.IsDotSymbol)`），而第 1120 轮那一趟是**按行逐处点名的**——跨行形态不在眼过之处。
  第 1140 轮收 `IsGreaterThanSymbol` 时正是同一形态（那里的 `IsSymbolToken === false` 也写成
  单独一行），所以这一类**下一轮要点名数的就不是「几处」，而是「这一族还剩几处」**。
- **等价**：`IsSymbolToken` 为假 ⇒ 原来整个合取为假、`!` 之后为真，今天 `IsDotSymbol` 也答
  `false`（基类默认档）⇒ 同为真；为真时两式都只由 `IsDotSymbol` 决定。逐格同答
  （`cases:tsast` / `samples` 逐字节那一门一处没动）。
- **同一族里量过、如实没动的一处**：`splitTopLevel` 里那句
  `kid.TextValue === separator && (separator !== "," || kid.IsCommaSymbol)` 看着像同族，
  **其实不是**——`separator` 到这一格时是**运行期字符串**（`","` / `"|"` / `"&"` 都从这里过），
  而逗号与 `|` / `&` **分处两页**（第 1107 轮那一条）：前半句问「正文等于调用方给的那个串」
  （只能读 `TextValue`），后半句才是逗号那一页自己那一问。判据就地写在 `splitTopLevel` 那一节里。
- **判据这一轮没长**（与第 1118 / 1120 两轮同一条理由）：门认 `Tag` 比类名与
  `ctx` 出口表，**看不见 `IsSymbolToken && 属性` 这种两半连写**——所以这一族只能按
  「全页逐处数」来收，数完把「还剩几处」写进这一节。

**第 1120 轮把本页最后那一格「局部转手」删掉，并把 `IsSymbolToken` 那半句剩下的四处收干净**
（用户口径 1.1 ~ 1.4：投影要的信息由**具体 token 子类**在自己那一页**显式声明**、
构造 / `Close` 那一刻赋好，读的时候备齐）。两件事同一个来由——**同一句问话的两半里，
有一半早就由被问的那一页答完了**：

| 原来的现场算式 | 今天读的那一格 | 为什么那半句是多余的 |
| --- | --- | --- |
| `const isSymbol = (k, text) => k.IsSymbolToken && k.TextValue === text;`（`projectExpression` 里那一格局部转手）+ **12 处** `isSymbol(k, ".")`（`import.meta` 那一支、链上找点号那三处、NCO 那两处、链尾那几处、`projectBindingPattern` 那一处、`typeOf` 那一处） | 逐处 `k.IsDotSymbol`，**局部转手整格删掉** | 12 处的实参**全是 `"."`**（逐处量过），而「我这一格的正文是不是那个点号」那一页第 1057 轮就答了（`SymbolToken.IsDotSymbol`，`Close()` 里赋的 `## field`）——第 1118 轮已经这样读过 3 处，本轮把剩下的收尾 |
| `kids[0].IsSymbolToken && kids[0].IsLessThanSymbol`（**1 处**：`<number>1` 里那个平铺的 `<`） | `kids[0].IsLessThanSymbol` | `IsLessThanSymbol` 基类答 `false`（只有符号那一页读 `TextValue` 现算），非符号那半句永远进不来 |
| `opener.IsSymbolToken === false \|\| opener.TextValue !== "<"`（**1 处**：`angleAssertionLength` 认那个 `<`） | `opener.IsLessThanSymbol !== true` | 同上——第 1118 轮立的正是这一格，本条只是把「类名 + 正文」两半换成一次属性读 |
| `unit.IsSymbolToken && unit.IsCommaSymbol === true`（**1 处**：`namedSpecifiersOf` 分段那个逗号） | `unit.IsCommaSymbol === true` | `IsCommaSymbol` 同样只有符号那一页答 `true`（基类默认档，第 1074 轮立） |

- **为什么删的是「局部转手」而不是别的**：`isSymbol` 这一格**没有自己的判据**——它是
  「正文是不是参数给的那串字符」的转手，而 12 处调用点给的字符是同一个 `"."`；
  第 1090 / 1093 两轮把它逐字留下来，理由是当时那两门只认字面量、而它按参数比（见上面
  两节）。本轮量的正是**那个参数**：全是点号 ⇒ 它不再是一句泛问，而是一句已经答好的问话。
- **判据跟着长一处**：`direct:lint` 第八条那一族本来就认 `IsDotSymbol`（第 1057 轮），
  本轮它顺便量到的是**这一格局部转手**——名字没了，`xl build` / `tsc` 都不报（`any` 吞），
  所以**自验按第 1119 轮那条教训来做**：逐处改完直接跑八道门（`coverage` 的 `blocked`
  一涨就说明还有调用点没换）。
- **剩下没换的 `TextValue` 逐处点名**（本页第一趟收完是 11 处比较，第二趟又收掉 `isTypeOp`
  那一格 ⇒ 今天 **9 处**）：`=== separator` 两处
  （`splitTopLevel` / `namedSpecifiersOf` 按**调用方给的参数**比）、`!== ","` 与 `=== ","`
  两处（逗号那个**二元单元**自己的正文，`IsCommaSymbol` 住符号那一页、收件人不同）、
  `=== "is"`（类型谓词那个词，`is` 不是本工程的关键字、产物里停在 `Identifier` 上）、
  `=== "type"`（导出子句的标志词）、`=== lookup`（`ImportClause` 找与参数同名的那一格）。
  **一处没动**：它们问的是「这一格自己的正文是不是**调用方给的那串**」，不是「这是哪个词」
  ——与第 1118 / 1119 两轮的分界同一条（第 1120 轮第二趟收掉的正是这一族里**不再是参数**的那一例）。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：删掉的是一格局部 `const`——它不在
  `# method` / `# const` 的账上；改的是 16 处调用点；`IsDotSymbol` / `IsLessThanSymbol` /
  `IsCommaSymbol` 都是既有属性，新立的零格）。
- **实测**：`xl check typescript core` **0 条**；`xl build typescript` **127 个产物** / 0 error、
  `tsc` 干净；**八道门 7 通过、1 失败**（墙钟 31.3s），读数与第 1106 ~ 1119 轮逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79（唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`）。
  八道门这一轮唯一红的是 `coverage` 那一道——它一直是**尺子不是门**，红的那一条与 HEAD 逐字相同。

**第 1120 轮（第二趟）把联合 / 交叉那一支剩下的那一格局部转手也收了**
（同一把尺子：`isTypeOp(k, text)` 的实参逐处量过只有 `"|"` 与 `"&"` 两个**字面量**，
不是「参数给的那串」）：

| 原来的现场算式 | 今天读的那一格 | 谁声明、什么时候算 |
| --- | --- | --- |
| `const isTypeOp = (k, text) => k.IsSymbolToken && k.TextValue === text;`（`projectTypeExpression` 里那一格局部转手，2 处调用点） | 循环里现拼的 `isThisOp(k)`：`(pipe ? k.IsPipeSymbol : k.IsAmpersandSymbol) === true` | `SymbolToken` 那一页**显式声明** `IsPipeSymbol` / `IsAmpersandSymbol`（`## property` + `### get`，读 `this.TextValue` 现算；基类 `### get` 答 `false`）——与 `IsColonSymbol` / `IsLessThanSymbol` 同一形态、同一条口径 |

- **为什么它该住在符号那一页**：它问的是「我这一格的正文是不是那个竖线 / 那个和号」，
  而正文就在那一页自己的 `Temp` / `value` 上（第 1069 轮起基类那一格 `TextValue` 就是它）。
  投影层重写一遍 `IsSymbolToken && TextValue === "|"` 就是**同一格事实的第二处答案**
  ——判据与第 1074 / 1090 / 1107 / 1108 / 1118 / 1119 轮那几族逐字相同。
- **两格都是 `## property` + `### get`（读时现算）、不是 `## field`**：理由与 `IsEqualsSymbol` /
  `IsArrowSymbol` / `IsNotNullSymbol` 那几节**逐字相同**——符号的正文是**逐字符攒**的、
  而**不是每个符号都会走到 `Close()`**（`let.xl.md` 那格尾巴符号就没关过），
  写成字段会让没关过的那一格停在默认档（第 1063 轮 `OperatorRank` 上量到过这件事）。
- **同一轮实测下来的一处「本仓解析器的缺口」（如实记下，页面上留下了形状）**：
  最初写成 `[(k: any) => k.IsPipeSymbol, "UnionType"], …] as Array<[(k: any) => bool, string]>`
  ——**`tsc` 干净、`node` 跑得对**，可本仓解析器在**类型位**读不了它：
  `as` 后面的类型实参里那个 `(k: any) => bool` 被投成 `ArrowFunction` + `EqualsGreaterThanToken`，
  而 TS 那边是 `FunctionType` + `TypeReference(bool)`。`cases:tsast` 当场报
  **缺 2 / 多 2**（`node tests/parse/ts-ast.mjs --file dist/ts/typescript/print-ast-common.ts`
  逐条点名：`MISS FunctionType` / `MISS TypeReference(bool)` / `EXTRA ArrowFunction` /
  `EXTRA EqualsGreaterThanToken`）——**本页自己的 dist 产物就在语料里**，所以这一页怎么写，
  自己就是被测对象。改成「表里放事实、谓词在循环里现拼」之后逐项回到 **0 / 0**。
  这条缺口的形状与复现留在代码块那一段注释里（没有新立 `xl:known-gap` 用例：
  登记缺口要另起一条语料并逐条核，留给下一轮）。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：删掉的是一格局部 `const`——不在
  `# method` / `# const` 的账上；新立的两格属性在基类与 `SymbolToken` 那一页）。
- **实测**：`xl check typescript core` **0 条**；`xl build typescript` **127 个产物** / 0 error、
  `tsc` 干净；**八道门 7 通过、1 失败**（墙钟 29.3s），读数与第 1106 ~ 1119 轮及本页第一趟
  逐项相同：`coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着（**八项全 0**）、`cases:direct` 1640 份不抛异常、
  `direct:lint` 0 条违反、`samples` 逐字节一致、`cases:check` 1656 / 1656、
  `runtime:check` 243 / 243、`runtime:cli` 79 / 79（唯一那条「倒退」仍是 HEAD 上既有的
  `runtime/round741/002`）。

**第 1120 轮（第三趟）把本页最后三处「按正文比一个**固定**的字面量」收进被问的那两页**
（同一把尺子：实参是字面量 ⇒ 它是「这一格是不是那个词 / 那个符号」那一问；
按**参数**比的仍然留着）：

| 原来的现场算式 | 今天读的那一格 | 谁声明、什么时候算 |
| --- | --- | --- |
| `parts.findIndex((k) => k.TextValue === "is")`（**1 处**：`projectTypeExpression` 里类型谓词被包在联合里那一支，找 `x is T` / `asserts x is T` 那个词） | `k.IsIsKeyword === true` | `Identifier.Close` / `Keyword.SetValue` **各自显式声明**同一格、在**记下正文那一刻**赋好（`is` 不是本工程的关键字，多半停在 `Identifier` 上）；基类默认 `false` |
| `const head = (k) => k.IsNameNode && k.TextValue === "type"`（**1 处**：`namedExportClause` 认 `export { type A }` 段首那个标志词） | `k.IsNameNode && k.IsTypeKeyword === true` | 同上（`"type"`）——`IsNameNode` 那半句照旧（它问的是另一件事：这一格能不能当名字） |
| `unitInner[unitInner.length - 2].TextValue !== ","`（**1 处**：折赋值式那一支认「这一段是不是逗号表达式」）与 `head.TextValue === ","`（**1 处**：往左走到最外层那个逗号单元） | `…IsCommaSymbol !== true` / `head.IsCommaSymbol === true` | `SymbolToken` 那一页**第 1074 轮就答了**这一格（`## property` + `### get` 读 `TextValue`）——这两处问的是**二元运算符单元**的正文，与符号那一页同一格事实，所以读同一格；本轮只是把该页那一句量出来的等价（第 1074 轮记过「逗号那个二元单元自己的正文，`IsCommaSymbol` 已答」）落到实处 |
| `k.IsSymbolToken && k.TextValue === "<"`（**1 处**：`projectTypeExpression` 里平铺的 `<…>` 实参段找那个开括号） | `k.IsLessThanSymbol` | 第 1118 轮立的同一格（`SymbolToken.IsLessThanSymbol`，读时现算）——**这一处是那一轮的漏网**：同一段注释与相邻那一支（`<number>1`，本页第一趟收的）都改了，它没改；第三趟收尾时逐处数 `TextValue` 才发现（**这一条写在页面上，是因为「那一族还有没有漏网的」只能靠逐处数出来**） |

- **两格词属性与 `IsAsKeyword` / `IsExtendsKeyword` 完全同形**（第 1119 轮）：`## field` 默认
  `false`、两页各自在「记下正文那一刻」赋好——`is` / `type` 在本工程里都是**上下文词**
  （都不是保留字：`is` 停在 `Identifier` 上、`type` 在导出子句里才当标志），
  所以两页各写自己认得的词，不是同一份名单抄两遍。
- **判据这一轮照旧没长**（与第 1118 / 1119 两轮同一条理由）：这一族都在 `TextValue` 上，
  `direct:lint` 那几条门只认 `Tag`。
- **今天本页代码块里剩下的 `TextValue` 比较是 5 处**（第一趟收完 11 处、第二趟收掉
  `isTypeOp` 一处、第三趟收掉上面三处、同一趟又收掉平铺泛型那一处
  `k.IsSymbolToken && k.TextValue === "<"`——那是第 1118 轮 `IsLessThanSymbol` 的
  **漏网一处**）：`=== separator` 两处（`splitTopLevel` / `namedSpecifiersOf` 按
  **调用方给的参数**比）、`=== lookup`（`memberNameOf` 找与**算出来的名字**同名的那一格
  ——它**不能**改读本页的 `Is(...)`：那是**方法调用**，而这一族的判据是
  「投影对 token 只读属性不调方法」）、`=== text` 两处（`isWord` 一族按**参数**比）。
  **按参数比的一处没动**——那条分界是第 1118 / 1119 两轮划的。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是 5 处调用点与说明；
  新立的两格词属性在基类与 `Keyword` / `Identifier` 两页）。
- **实测**：`xl check typescript core` **0 条**；`xl build core` **29 个产物** +
  `xl build typescript` **127 个产物** / 0 error、`tsc` 干净；**八道门 7 通过、1 失败**
  （墙钟 32.0s），读数与第 1106 ~ 1119 轮及本页前两趟逐项相同：`coverage` **4260 / 4422**
  （`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着
  （八项全 0）、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79
  （唯一那条「倒退」仍是 HEAD 上既有的 `runtime/741002`）。

**第 1121 轮把 `ctx.HeadDeclare` 里剩下那两个现场闭包也收进被问的那几页**
（用户口径 1.1 ~ 1.4：投影要的信息由**具体 token 子类**在自己那一页**显式声明**、
在**构造 / 记下正文那一刻**赋好，读的时候备齐）——它们各是一行里把几个词 / 几个括号属性
连比一遍的**局部判据**，而**两半事实都在被问的那一页上**（词在哪一态、括号是哪一态）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `isDeclareWord(k)`（**1 格局部闭包、2 处读者**：`ctx.HeadDeclare` 找「名字那一格」与「列表的起点」那两趟都拿它滤一遍）——`const text = k.TextValue; return text === "const" \|\| text === "let" \|\| text === "var" \|\| text === "using";` | `k.IsDeclareWord` | 基类 `Token` 给 `## field … = false`；`Keyword` 在 `SetValue` 里认 keyword 那一态的三个词（`const` / `let` / `var`）、`Identifier` 在 `Close` 里认 `using`（**不是本工程的关键字，多半就停在 `Identifier` 上**）——与 `IsAsKeyword` / `IsTypeKeyword` / `IsExportKeyword` 同一形态、同一条口径 |
| `isPatternKid(k)`（**1 格局部闭包、2 处读者**：同一格函数里选名字那一趟与分派 `NameNode` / `projectBindingPattern` 那一趟）——`k.IsBindingPattern \|\| k.IsIndexBracket \|\| k.IsBraceBracket` | `k.IsPatternKid` | 基类 `Token` 给 `## field … = false`；`ArrayLiteral` / `ObjectLiteral` **显式声明** `## field … = true`（类名就是这一格事实，与同页 `IsBindingPattern` 同款）；`Bracket` 在 `Use` 记下 `startBracket` 那一刻赋好（`this.IsIndexBracket \|\| this.IsBraceBracket`，克隆体在 `Clone` 里抄同一格） |

- **为什么第二问不能读 `IsBindingPattern`**：那一格（第 1074 轮）问的是「我**这一类**
  是不是绑定模式」，可 `for (const [a] of xs)` 里那个 `[` 还**没有**被收成 `ArrayLiteral`
  （第 533 轮那条规则只在有空括号对时才收）——它是 `Bracket`，那一页答的是
  「我是哪一态括号」。把两句合成一格 `IsPatternKid`，**两页各自按自己的事实答**，
  投影层因此少一个把三格拼起来的现场判据（拼法本身就是第二处声明）。
- **`flags` 那一格一处没动**：`headText === "const" ? "Const" : headText === "var" ? "None" : "Let"`
  问的是**那个声明词的正文是什么**（`VariableDeclarationList.flags` 三态），
  与 `IsDeclareWord` 不是同一问——它是「这一格的正文」的第三态读数，
  同页 `TextValue` 那一族（按调用方给的参数比）留着，本轮按那条分界不动。
- **判据这一轮照旧没长**（与第 1118 ~ 1120 三轮同一条理由）：这一族都在 `TextValue` /
  局部名字上，`direct:lint` 那几条门只认 `Tag`。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：删掉的是两格**函数体内的**局部闭包，
  不在 `# method` / `# const` 的账上；新立的两格属性在基类与 `Keyword` / `Identifier` /
  `Bracket` / `ArrayLiteral` / `ObjectLiteral` 五页）。本页当时 10601 行
  （代码块 7794 行，其中不带注释的 4685 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build typescript core`
  **156 个产物 / 0 error**、`npx tsc` 干净；**八道门 7 通过、1 失败**，读数与第 1106 ~ 1120 轮
  逐项相同：`coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79（唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`）。
  这一轮动的文件共 7 个（本页 + `core/syntax/token.xl.md` + `Keyword` / `Identifier` /
  `Bracket` / `ArrayLiteral` / `ObjectLiteral` 五页）。

**第 1122 轮把 `projectTypeArguments` 里那份「第二处切法」删掉**（同一把尺子：
**同一份算式只许有一处**——第 1105 轮合掉 `dottedExpression` / `qualifiedNameFrom` 是同一句话）。
那一格原来自己写了一遍「按逗号攒组、分隔符不进任何一组、末尾补一组、滤掉空组」，
而那正是本页 `splitTopLevel` 那一份算式（它还服务值位那几处：对象成员、数组元素、
类型容器的成员）：

| 原来的现场算式 | 今天谁答 |
| --- | --- |
| `projectTypeArguments(generic, ctx)` 里那个 `for (const kid of generic.ProjectableKids)` 切逗号的循环（13 行） | 交给 `splitTopLevel(generic.ProjectableKids, ",")`——**逐格同答**：`separator` 给 `","` 时两份判据都是「正文等于分隔符」加上「逗号那一态读它自己的属性」（`kid.TextValue === separator && (separator !== "," \|\| kid.IsCommaSymbol)`），而 `splitTopLevel` 末尾那个 `filter` 与这里的 `parts` 逐组对应（空组都挡掉）；这一格因此只剩「把切好的每一组交给类型投影」这一步 |

- **不是改判据、是去重复**：两份切法今天逐字节同答，可**下一处要改「分隔符算不算组的一部分」时
  只有一个地方要改**——这正是「同一份事实一处声明」那一条口径要的东西。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：这一格自己还在，少的是它体内那份重复算式）。
  本页今天 **10632 行**（代码块 7782 行，其中不带注释的 4674 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build` 该页 **1 个产物 / 0 error**、
  `npx tsc` 干净；**八道门 7 通过、1 失败**，读数与第 1106 ~ 1121 轮逐项相同。

**第 1123 轮把 `ctx.ConditionalNode` 里剩下那一格局部转手也收掉**——`isExtends`
（`(k) => k.IsExtendsKeyword === true`，两处读者：条件类型下标的 `extIndex` 与尾段那个
`tailExt`）**不是判据、是转手**：第 1119 轮已经把这件事收成被问那一页的一格属性
（`IsExtendsKeyword`，那一段上的另两处 `IsQuestionSymbol` / `IsColonSymbol` 当时就是这样读的），
只剩它一个还隔着一层包装。两处改读 `k.IsExtendsKeyword === true`，这一格局部转手整格删掉。

- **判据一个字没改**：`findIndex` 收的仍是同一个谓词，两处逐格同答。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：删掉的是函数体内的一格局部转手，
  不在 `# method` / `# const` 的账上）。本页今天 **10651 行**（代码块 7784 行，
  其中不带注释的 4672 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build` 该页 **1 个产物 / 0 error**、
  `npx tsc` 干净；**八道门 7 通过、1 失败**，读数与第 1106 ~ 1122 轮逐项相同。

**第 1126 轮把「最后那个前缀词自己也要吃操作数」那一串 11 个字面量收进被问的那两页**
（用户口径 1.1 ~ 1.4：投影要的信息由**具体 token 子类**在自己那一页**显式声明**、
在**记下正文那一刻**／`Close()` 赋好）——本页「两层前缀叠在同一个一元单元里、操作数却掉在外面」
那一支（第 739 轮）现场比了 11 个字面量，而它们**本来就是住处在两页的两族**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `["await", "yield", "typeof", "void", "delete", "!", "~", "+", "-", "++", "--"].includes(lastText)`（**1 处**，`chainWithOptional` 里「往回退一格」那一支） | `lastUnit.IsPrefixOperatorUnit === true \|\| lastUnit.IsYieldKeyword === true` | 十个字面量是**已有的那一格** `IsPrefixOperatorUnit`（`UnaryOperator` 常量答 `true`、`SymbolToken` 在 `Close()` 认六个符号、`Keyword` 在 `SetValue` 认四个词，第 1057 / 1062 轮）；只剩 `yield` 不在那一格里，于是由 `Keyword` 那一页**本轮另立一格** `IsYieldKeyword`（`SetValue` 里与那几格同一趟赋好），基类默认 `false` |

- **为什么 `yield` 另立一格、不并进 `IsPrefixOperatorUnit`**：那一格在全仓还有**两处活读者**
  （`projectExpression` 与 `chainOnto` 里那两个「跳前缀」的 `while`），把 `yield` 并进去会
  **改语义**（那些位置本来不把 `yield` 当前缀运算符）；所以按被问的那一格各自的收件人分开立。
- **判据一个字没改**：上面那个 `while` 已经保证这一格是**符号或关键字**
  （`IsSymbolToken || IsKeywordUnit`），而这两页各自答的正是这一格自己的正文——
  所以两格属性读与原来那张表**逐格同答**（八道门读数一处没动就是这条的证据）。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是这一处调用点与说明；
  新立的那一格在基类与 `Keyword` 那一页）。本页今天 **10746 行**（代码块 7802 行，
  其中不带注释的 4668 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build core typescript`
  **3 个产物 / 0 error**（`token` / `keyword` / `print-ast-common`）、`npx tsc` 干净；
  **八道门 7 通过、1 失败**（墙钟 30.7s），读数与第 1106 ~ 1125 轮逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79；唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`。

**第 1125 轮把「本层左边有没有一个赋值号」那一格算式收进被问的那一页**（用户口径 1.1 ~ 1.4：
投影要的信息由**具体 token 子类**在自己那一页**显式声明**、读的时候备齐）——本页折逗号那一支
里那段「是不是赋值」的现场算式（6 行，含一张按固定字面量比的比较运算符表）问的是
**这一格符号自己的正文**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `text === "=" \|\| (text.length > 1 && text.endsWith("=") && !["==", "===", "!=", "!==", "<=", ">="].includes(text))`（**1 处**，`projectExpression` 折逗号那一支找**最左边**那个赋值号） | `one.IsAssignmentSymbol === true` | 基类 `Token` 给 `## property` + `### get`（答 `false`）；`SymbolToken` **显式声明**同一格、`### get` 读**基类那一格 `TextValue`** 现算 |

- **为什么是 `## property` + `### get`、不是 `## field`**：与 `IsEqualsSymbol` / `IsCommaSymbol` /
  `IsColonSymbol` 同一件事——符号的正文**未必关过**（`let a = 1` 那一格尾巴符号就是
  `new SymbolToken(…)` + `AppendAndSignOut` + `SignIn`，没有 `TryToClose()`），
  所以「我这一格是不是赋值」只能**读时现算**；第 1063 轮实测过写成 `## field` 的代价
  （`coverage` 从 4260 / 4422 掉到 4058 / 4422）。
- **判据一个字没改**：算式整段搬过去，只把 `text` 换成 `this.TextValue`——两半事实
  （正文以 `=` 收尾、以及那不是那六个比较运算符）本来就是这一页自己的正文上的事。
- **它与 `IsEqualsSymbol` 不是同一问**：那一格只认那个等号 `=`，这一格还认那些**复合赋值**
  （`+=` / `<<=` / `&&=` / `??=` …）并把六个比较运算符排除在外。
- **顺带收掉那半句守卫**：`one.IsSymbolToken === false` 那一句不再需要——基类给这一格
  默认 `false`，非符号永远进不来（与第 1118 / 1124 两轮收掉 `IsKeywordUnit` 那半句同一条口径）。
- **判据这一轮照旧没长**：这一族在 `TextValue` 上，而 `direct:lint` 那几条门只认 `Tag`；
  **没有**新立一条扫固定字面量的门。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是这一处调用点与说明；
  新立的那一格在基类与 `SymbolToken` 那一页）。本页今天 **10707 行**（代码块 7796 行，
  其中不带注释的 4668 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build core typescript`
  **3 个产物 / 0 error**（`token` / `symbol-token` / `print-ast-common`）、`npx tsc` 干净；
  **八道门 7 通过、1 失败**（墙钟 31.5s），读数与第 1106 ~ 1124 轮逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79；唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`。

**第 1124 轮把「`export` / `declare` / `default` 前缀词」那一对现场算式收进被问的那一页**
（用户口径 1.1 ~ 1.4：投影要的信息由**具体 token 子类**在自己那一页**显式声明**、在
**记下正文那一刻**（`Keyword.SetValue`）赋好，读的时候备齐）——本页代码块里还剩两处
**按固定字面量比正文**的写法，两处问的都是同一件事（「你这一格的正文是不是那三个前缀词之一」），
而那个正文只有 `Keyword` 那一页知道：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `["export", "declare", "default"].includes(items[j].TextValue)`（**1 处**：`projectRoot` 认「前缀词 + 一条声明」那一支的 `while`） | `items[j].IsExportKeyword === true \|\| items[j].IsDeclareKeyword === true \|\| items[j].IsDefaultKeyword === true` | 三格都是**已有的那一形态**（第 1119 轮）；`IsDeclareKeyword` 是**本轮新立**（`Keyword` 那一页显式声明 `## field … = false`，在 `SetValue` 里与那两格**同一趟**赋好） |
| `(k) => k.IsKeywordUnit && ["export", "declare", "default"].includes(k.TextValue)`（**1 处**：`projectStatement` 同一套前缀判据那个 `every`） | `(k) => k.IsExportKeyword === true \|\| k.IsDeclareKeyword === true \|\| k.IsDefaultKeyword === true` | 同上；连写的 `k.IsKeywordUnit &&` 半句一并收掉 |

- **为什么 `IsDeclareKeyword` 该由那一页答**：判据是**这一格自己的正文**（`declare`），
  与 `IsExportKeyword` / `IsDefaultKeyword` / `IsExtendsKeyword` / `IsTypeKeyword` 逐字同形
  ——一处声明、一处赋值、多处读，不是每个读者各写一遍三格连比。
- **它与 `IsDeclareWord` 不是同一问**（第 1121 轮那一格）：那一格答「我是不是一个**声明词**」
  （`const` / `let` / `var` / `using`），读它的是 `ctx.HeadDeclare`；这一格答「我是不是
  `declare` 这**一个**词」——收件人不同，各立一格。
- **`IsKeywordUnit` 那半句为什么能收**：两处原来都先过那一半守卫（只有 `Keyword` 那一种
  token 进得来），而基类给这三格默认 `false`、只有 `Keyword` 那一页答 `true`
  ——与第 1118 轮收掉 `IsAsKeyword` / `IsExportKeyword` 那几处的守卫同一条口径。
- **赋值入口只有一个**：`Keyword.Value` 只在一处被写（`SetValue`），`UpgradeAt` 与 `Clone`
  都走它——所以「`IsDeclareKeyword` 与正文同步」是结构上的事，不是靠约定。
- **判据这一轮照旧没长**：这一族都在 `TextValue` 上，而 `direct:lint` 那几条门只认 `Tag`
  （第 1118 / 1119 / 1120 三轮同一条理由）；**没有**新立一条扫固定在字面量上的门。
- **本页的声明数**：**43 格**（**一格没增、一格没减**：改的是 2 处调用点与说明；
  新立的那一格在基类与 `Keyword` 那一页）。本页今天 **10675 行**（代码块 7799 行，
  其中不带注释的 4675 行）。
- **实测**：`xl check typescript core` **156 个文件 / 0 条**；`xl build core typescript`
  **3 个产物 / 0 error**（`token` / `keyword` / `print-ast-common`）、`npx tsc` 干净；
  **八道门 7 通过、1 失败**（墙钟 31.8s），读数与第 1106 ~ 1123 轮逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、
  `runtime:cli` 79 / 79；唯一那条「倒退」仍是 HEAD 上既有的 `runtime/round741/002`。

**第 1113 轮按同一把尺子把「条件类型 → `ConditionalType`」那一格收进它唯一的出口**：
`conditionalNode(kids, start, end, ctx)`（47 行）在本页代码块里**只有 `ctx.ConditionalNode`
这一条出口**一个读者——那一格自己的递归调用不算读者，`projectTypeExpression` 里**没有**它的
调用点（第 1109 轮那一栏写「5 处读者」是把出口的读者与「本页自己那两处」混在一起数了，
本轮按代码块逐处重数：**出口一个**）。所以：

| 原来的现场算式 | 今天谁答 |
| --- | --- |
| `conditionalNode(kids, start, end, ctx)`（`slice = kids.slice(start, end)` + 三个下标 + 右嵌套假分支那一段递归） | 算式整段搬进 `ctx.ConditionalNode` 这条出口（**实参表 `list` / `from` / `to` 与三个调用点一个字不动**），递归改走出口里那一格自己 `conditionalNodeOf` |

- **三个调用点不动**：`conditional-type.xl.md` / `mapped-type.xl.md` / `type-parameter.xl.md`
  走的是 `ctx.ConditionalNode(list, from, to)`——出口的名字、形参个数、返回形状逐字相同，
  所以「搬走的是算式所在的那一页」而不是能力（与第 1112 轮 `ParenthesizedOf` 同一条）。
- **递归那一句逐字节同答**：原来写 `conditionalNode(tail, 0, tail.length, ctx)`，
  今天写 `conditionalNodeOf(tail)`——`tail` 就是 `slice.slice(colonIndex + 1)`，
  而 `slice` 是 `kids.slice(start, end)`；出口那一层先做 `list.slice(from, to)` 再交给它，
  两层 `slice` 合起来与原来那一句逐格同答（`Array.prototype.slice` 对同一段区间是幂等的）。
- **本页的声明数**：**46 → 45 格**（43 → 42 个 `# method` + 3 个 `# const`，实测；
  删掉的是一格 `# private method`）。

**第 1112 轮按同一把尺子把「值位括号 → `ParenthesizedExpression`」那一格收进它的调用点**：
`parenthesizedOf(unit, ctx)`（16 行）的读者在**代码块里只有两处**（`projectExpression` 里
`kids.length === 1 && kids[0].IsParenBracket` 那一支、`chainWithOptional` 里 `let left = …`
那一格），第三处是 `ctx.ParenthesizedOf` 这条出口本身。所以：

| 原来的现场算式 | 今天谁答 |
| --- | --- |
| `parenthesizedOf(unit, ctx)`（`unit.ProjectableKids` + `inner.length > 0 ? projectExpression(inner, ctx) : undefined` + `pos: startOf(unit)` / `end: endOf(unit)`） | 算式**就地展开**在那两个调用点（各一处，逐字相同的四句）；出口原样留在本页 |

- **出口不能一起删**：`ctx.ParenthesizedOf` 在全仓有 **5 页、7 处**活读者
  （`method` / `new` / `heritage-clause` / `enum-member` / `lamda-parameter`），
  按第 1070 轮那条判据（**0 处**才收出口）它不该动——所以出口**名字与实参表一个字不动**，
  只是它自己就地写同一份算式，不再转手那一格声明。
- **为什么它是「多一层间接」**：那一格做的事只有「取这一格的子单元 / 投一次 / 抄两个坐标」，
  三件事的答案都在**被投的那一格自己**身上；留着它，等于本页同一份算式有
  「声明 + 两个调用点 + 出口」四个入口。收掉之后同一份算式只剩**调用点那几处**，
  而出口那一处是**别的页**的入口（不是本页的第二份答案）。
- **一处不按属性读的坐标照旧**：`pos` / `end` 仍读 `startOf(shape)` / `endOf(shape)`
  （本页那两个 `# const` 就是读 token 自己的 `start` / `end`，与搬走之前逐字节相同）。
- **本页的声明数**：**47 → 46 格**（44 → 43 个 `# method` + 3 个 `# const`，实测；
  删掉的是一格 `# private method`，出口那一格不是声明）。

**第 1111 轮按同一把尺子再走一格**：`absorbIntoTypeQuery(node, query, name)`（56 行）并进
`projectTypeExpression` 里的 `absorbIntoTypeQueryOf`——它的读者**全在本函数里**
（含它自己递归走链的那 5 处，`ctx` 上从来没有这个出口），而它做的事就是「把一条类型链上的
名字吸收进 `TypeQuery`」。本页声明 **48 → 47 格**（44 个 `# method` + 3 个 `# const`，实测）。

**同族里量过、但这一轮没有动的三格**（如实记在这里，免得下一位重复走一遍）：
`conditionalNode` 有 5 处读者（`projectTypeExpression` 的 `falseType` 递归那一处 +
`ctx.ConditionalNode` 出口）、`typeOf` 有 7 处（`projectTypeExpression` 与两个 token 页经
`ctx.TypeOf`）——它们**不是**「只有本页某处读者」，按那把尺子不该并。
`parenthesizedOf`（2 处读者都在 `projectExpression` 里）与 `statementOfList`（2 处都在
`projectStatement` 里）**两处看起来合格，本轮试过一版并并掉了**：读数是
`ctx.TypeOf is not a function`（那一版把 `typeOf` 也一起并了，而它有两个 token 页在经出口用），
以及这两个出口本身的零读者状态没变——**试完整段还原**。所以这两格也留着：
它们的 `ctx` 出口今天零读者，但并掉实现会让「下一页要不要用」这件事无处可查，
按第 1070 轮那把尺子（出口零读者才收出口）的顺序，这一族要连同出口一起收、不能只收实现。
**第 1108 轮把同一族剩下的三个符号一次收干净**（用户口径 1.1 ~ 1.4，
尺子与第 1107 轮那一轮逐字相同）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `k.IsSymbolToken && k.TextValue === ":"`（**2 处**：`projectBindingElement` 找冒号那一格、`namedExportClause` 切 `with` / `assert` 子句的键值对） | `k.IsColonSymbol` | `SymbolToken` 那一页**显式声明** `## property`（`### get`：`return this.TextValue === ":";`，基类答 `false`） |
| `k.IsSymbolToken && k.TextValue === "..."`（**2 处**：展开实参 `f(...xs)`、`projectBindingElement` 找 `dots`） | `k.IsDotDotDotSymbol` | 同上（`"..."`）——名字按 TS 那边那个节点取（`DotDotDotToken`） |
| `k.IsSymbolToken && k.TextValue === "*"`（**2 处**：`yield*` 的 `asteriskToken`、`export * as ns` 的 `exportClause`） | `k.IsAsteriskSymbol` | 同上（`"*"`） |

- **取值口径与搬走之前逐字相同**：三格读的都是基类那格 `TextValue`（不是 `Is("…")`）——
  与第 1107 轮那两格同一条理由（不是每个符号都会走到 `Close()`）。六处逐处等价：
  只有符号那一页答 `true`、答的就是原来那半句 `k.TextValue === …`，
  所以原先与它连写的 `k.IsSymbolToken` 半句一并收掉。
- **`IsDotDotDotSymbol` 与 `Spread` 那一页的 `IsSpreadUnit` 不是同一问**：那一格答
  「我是哪一类单元」（产物把 `...` 收成 `Spread` 单元时），这一格答「**我这一格的正文**
  是不是那三个点」（`f(...xs)` 那一格在产物里就是**裸符号**）——两问分处两页，如实写在两页上。
- **判据跟着长三格**：`direct:lint` 第八条那一族多认三个名字，守老问句与出口形态。
  **自验**（本机探针，不进仓库）：把 `isColonSymbol(` / `isDotDotDotSymbol(` /
  `ctx.IsAsteriskSymbol` 各写回一处 ⇒ 报告 **0 → 3 处**、`FAIL`、`exit=1`；
  源文件逐字节还原 ⇒ **3 → 0 处**、`exit=0`。
- **本页的声明数**：**52 → 52 格**（改的全是读数与说明；新立的三格在基类与符号那一页）。

**第 1107 轮把「这一格是不是那个等号 `=` / 那个箭头 `=>`」的现场连写收进符号那一页**
（用户口径 1.1 ~ 1.4：投影要的信息在具体类里**显式声明**、读时备齐）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `k.IsSymbolToken && k.TextValue === "="`（**6 处**：`let` 的初值两处、`projectBindingPattern` 的 `eqAt`、`projectBindingElement` 的 `eqIndex`、`projectExport` 的赋值两处） | `k.IsEqualsSymbol` | `SymbolToken` 那一页**显式声明** `## property IsEqualsSymbol:bool`（`### get`：`return this.TextValue === "=";`，基类答 `false`） |
| `k.IsSymbolToken && k.TextValue === "=>"`（**3 处**：`functionTypeProps` 找箭头那一格、联合 / 交叉那一支排在它前面、`new <T>(x: T) => T` 那一支） | `k.IsArrowSymbol` | 同上（`return this.TextValue === "=>";`） |

- **为什么它该住在符号那一页**：「我这一格的正文是不是那一串」**只有这一页知道**
  （正文就在它自己的 `Temp` 上）——与第 1074 轮 `IsCommaSymbol`（`,`）、第 1090 轮
  `IsNotNullSymbol`（`!`）同一条口径，这一轮收的是 `=` 与 `=>` 两个。
- **取值口径与搬走之前逐字相同**：两格读的都是**基类那一格 `TextValue`**（正是原来
  `k.TextValue` 的后一半），不是本页的 `Is("=")`——后者读 `Temp`，而**不是每个符号都会走到
  `Close()`**（`let.xl.md` 那格尾巴符号、枚举成员之间那个逗号都没关过），两处未必同答；
  所以形态与 `IsNotNullSymbol` 一致（`## property` + `### get`，读时现算），不是 `IsDotSymbol`
  那种 `## field`。
- **两格各认自己那一串**：`=>` 的正文里也有一个 `=`，所以 `IsEqualsSymbol` 与 `IsArrowSymbol`
  **不是同一问**（如实写在两页上）。
- **`=` 那一处的 `IsSymbolToken` 半句一并收掉**（`foldBinaryFrom` 的复合赋值那一支，
  原来写成两行：`rest[2].IsSymbolToken &&` + `rest[2].TextValue === "="`）——
  `IsEqualsSymbol` 答 `true` 就蕴含「我是符号那一页」，两半收成一次属性读（第 1068 轮同一手法）。
- **判据跟着长两格**：`direct:lint` 第八条那一族多认两个名字（`IsEqualsSymbol` /
  `IsArrowSymbol`），守的是**老问句写回投影层**（`isEqualsSymbol(` / `isArrowSymbol(`）与
  出口形态（`ctx.IsEqualsSymbol`）。**自验**（本机探针，不进仓库）：把
  `isEqualsSymbol(` / `isArrowSymbol(` / `ctx.IsEqualsSymbol` 各写回一处 ⇒
  报告 **0 → 3 处**、`FAIL`、`exit=1`；源文件逐字节还原 ⇒ **3 → 0 处**、`exit=0`。
  （**逐格数过剩下没换的**：`TextValue === "."` 还有 **3 处**——那三处问的是符号那一页，
  而 `IsDotSymbol` 是 `Close()` 里赋的 `## field`（读 `Temp`），与现场那半句 `TextValue`
  在没关过的符号上未必同答，所以逐处保留；`TextValue` 与 `","` 比的那 **2 处**问的是
  **`BinaryOperator` 那一页**（逗号表达式那个运算符单元），`IsCommaSymbol` 住在符号那一页，
  盖不到它——同一条理由，保留。）
- **本页的声明数**：**52 → 52 格**（改的全是读数与说明；新立的两格在基类与符号那一页）。

**第 1106 轮收掉的是一格「现场判据」加它自己**：`operatorTokenOf`（21 行）自己按
`op.TextValue` 认 `in` / `instanceof` 两个词、再拼出 `"InKeyword"` / `"InstanceOfKeyword"`
两个字面量——而**两半都是被问那一格的事实**（正文只有那一页知道，那两个 kind 名本来就在
`Keyword` 那一页的 `KEYWORD_KIND` 里）——所以按用户口径 1.1 / 1.3 与第 1041 / 1042 /
1057 / 1062 轮那条判据收成**一格属性**：`core/syntax/token.xl.md` 立基类一格
`OperatorWordKind:string`（默认空串），`Identifier` 在 `Close()`、`Keyword` 在 `SetValue` 里
**各自显式声明同一个属性**并按**自己的正文**赋好（`Keyword` 那一页读的是它自己的
`KeywordKind`，所以那两条词的 kind 仍只有一处声明）；赋值点在「正文攒完 / 记下正文」那一刻
⇒ **构造好之后这一格的信息就是齐的**，本页只读一次。
本页三处读者随之改属性读：`ctx.OperatorNode` 那一行出口（它原来就是那一格唯一的实体）、
`projectExpression` 里 `instanceof` 实例化那一支（原来 `IsOperatorUnit && TextValue ===
"instanceof"` 两行，`OperatorWordKind` 答出名字就蕴含前一半，两半收成一次属性读），以及
`foldBinaryFrom` 里那一处——**helper 一格删掉、本页声明 53 → 52 格**，
`ctx.OperatorNode` 这个名字与它的实参表一个字不动（出口的名字是别的页的调用点）。
**判据跟着长一格**：`direct:lint` 第八条那一族（「这一格是不是某一类 / 这一格的值是什么」
由被问的那一页答）多认一个名字 `OperatorWordKind`，别名就是那一格的老写法
`operatorTokenOf`——**自验**（本机探针，不进仓库）：把 `ctx.OperatorWordKind` 与
`operatorTokenOf(unit, ctx)` 各写回代码块一处，这一门 **0 → 2 处**、退出码 1；
源文件逐字节还原后回到 0 处。
**第 1105 轮合掉的是一对「同形不同 kind」的格**：`qualifiedNameFrom`（16 行）与
`dottedExpression`（17 行）的算式逐行相同（`names[0].NameNode` + 一个从 `i = 1` 起的循环 +
`pos: node.pos` / `end: right.end`），差别只有节点 `kind` 与两个字段名（`left`/`right`
对 `expression`/`name`）——所以留一格、多一个 `kindOf` 形参，`ctx.QualifiedNameFrom` 那一条
出口与两个调用点一个字不动，本页少一格声明。
**第 1104 轮收掉的是两格「只有一个真实调用点、而且读的就是调用点手上那一份」的格**
（尺子与第 1100 ~ 1102 轮同一把，只是这两格的读者**在本页之内**）：
`angleAssertionLength`（52 行，唯一读者 `foldBinaryFrom` 里那一处，而且是**同一格问两次**——
实现整段搬成那个循环前面的一段 `const`，两问收成一问）与
`kindsInAst`（23 行，唯一读者 `projectRoot` 报 `unmapped` 之前那次对账，而它读的正是
**刚造出来的 `ast`**——实现搬成那两行前面的一段局部递归 `collectKinds`，`out` 这个形参随之消失）；
两格的判据一条没改、说明跟着实现走。
**第 1103 轮收掉的是两格「现场判据」**：`IsIndexFirstUnit`（31 行）与 `IsCallFirstUnit`（104 行）
——两格都**只问「这一格自己长什么样」**（读 `Tag` / `IsIndexBracket` / `ProjectableKids` 再递归问
头一格），所以按第 1090 ~ 1099 轮那把尺子（「这一格是不是某一类」由被问的那一页答）搬回各页：
`core/syntax/token.xl.md` 立基类两格 `IsIndexFirstUnit` / `IsCallFirstUnit`（默认 `false`），
`ArrayLiteral` / `Bracket` / `NotNull` / `PropertyAccess` / `Method` **五页各自显式声明同一个属性**
（`## property` + `### get`，与 `IsBareCall` / `IsNotNullSymbol` 同形——子单元是解析期陆续挂上来的，
所以「以什么开头」只能在读的那一刻看一次）；本页 17 处调用点改成属性读。
两格 helper 的第一句守卫（`if (unit === undefined || unit === null) return false;`）随之落在
**调用点**：可能收到 `undefined` 的那几处一律写成 `x?.IsXxxFirstUnit`（`undefined` ⇒ `undefined` ⇒ 假，
与旧 helper 同答），手上已有 token 的那几处保持普通读。
——**判据**：一格 helper 若只读「被问那一格自己的属性与子单元」，它就该住在那一页；
搬迁与改写分开记：这一轮动的是**判据的住处**，不是判据本身。
**第 1100 ~ 1102 三轮收掉的是七格「一格声明、一个真实调用点」的转发**
（尺子与第 1043 / 1044 / 1067 / 1070 / 1080 / 1087 轮并掉那些转发同一把）：
`projectSegment`（唯一读者 `ternary-operator.xl.md` 经 `ctx.Segment`）、
`projectSwitchClause`（唯一读者 `switch.xl.md` 经 `ctx.SwitchClause`）、
`projectHeadDeclare`（唯一读者 `foreach.xl.md` 经 `ctx.HeadDeclare`）、
`bodyBlockOf` / `blockOfBody`（各只有一个出口读者：`while` / `foreach` / `do-while` 三页与
`if-segment` 那一页；两格的实现整段搬进 `ctx.BodyBlockOf` / `ctx.BlockOfBody`）、
`trailingSemicolonOf`（唯一读者 `projectEach` 里那一处，实现**就地**展开成一段立即执行的箭头，
判据逐字搬过去——那里不能引用 `ctx` 上的出口，因为它在 `ctx` 造出来之前就跑）；
**第 1100 轮留着没并的那一格，第 1114 轮并掉了**：`projectBindingElement`（它的唯一读者
`projectBindingPattern` 就在本文件里，而函数体是 126 行真算式、**不是转手**——所以第 1100 轮
只记下判据与「下一轮要并它就得连着说明一起搬」，没有动手）；第 1114 轮把**算式与说明一起**
搬进了 `projectBindingPattern` 体里的 `projectBindingElementOf`（三种形态那张表跟着走），
本页少一格声明。
——**判据**：`ctx` 上那一行出口返回的东西就是那一格的返回值，所以实现搬进出口、声明删掉，
`ctx` 的名字与语义一个字不动（**出口的名字是别的页的调用点**，不是本页可以顺手改的）。
**第 1099 轮之前本页的旧账**（89 → 86 → … → 64 格那一串逐轮记录，以及第 1073 / 1081 /
1091 那三次计数订正）已经整段删掉：它们是**过期的过程账**，不是今天的规格；
每一轮的根因 / 量法 / 实测都留在 git 提交信息里（`git log --oneline` 按「第 N 轮」认），
本页只保留**今天仍然成立的口径**与**实测值**。
类型口径：树上的动态值（token、投影上下文）标 `any`——它们的形状由
[`core/syntax/token.xl.md`](../core/syntax/token.xl.md) 里各页自己声明的那几格给出
（`Token` 的那一批属性 + 每一页自己的段属性）；标量（`source` / `text` / 字段名 / 下标）按中立类型标。
`ctx` 不另立 class：它的几个字段（`source` / `unmapped` / `count` / `direct` / …）在树里
以 `ctx.source` 这种写法出现 30 多处，立 class 就要连名带点一起改——**那属于改写，不属于搬家**。
今天 `ctx` 上一共 **51 个键**（其中 `unmapped` / `count` / `direct` / `typePosition` /
`consumedSemicolons` / `awaitingDeclaration` 六格是**本文件自己的状态**，其余 45 格是出口）。

叶子那张词汇表（数字字面量的写法 `NUMERIC_LITERAL`、`LeafKindOfText`）第 1029 轮搬到了
`tokens/identifier.xl.md`：它标 `RegExp`，TS 目标上这一格是准的；换到 C++ 目标时这一类要另想办法
（登记在 README 的目标差异里），**不为了一个还不存在的目标改动已经量过的实现**。

---

import { projectRoot } from "./ts-shape.mjs"
  const { ast, unmapped } = projectRoot(root, source);   // → { kind, pos, end, …字段 }

这是「完全 follow TypeScript 形状」的落点，也是 `cases:tsast` 量成绩的地方。
它**不重新解析**：产物树是唯一事实来源，这里只做三件事——

  1. **换名**：产物标签 → `SyntaxKind` 名（`Let` → `VariableDeclaration`、
     `BinaryOperator` → `BinaryExpression`、`<Identifier>0</Identifier>` → `NumericLiteral`…）；
  2. **补壳 / 提层**：TS 那边多出来的包装（`VariableStatement` / `VariableDeclarationList` /
     `ExpressionStatement`）在这里补；TS 那边**没有**的包装（`ClassBody` / `ReturnType` /
     `Bracket`…）在这里把内容**提上去**变成父节点的一个字段（提哪一层由 token 自己答，
     见 `Token.WrapperField`）；
  3. **字段名**：按 kind 给 TS 的字段名（`members` / `statements` / `properties` / `types`…）。

**坐标一律来自产物树的 `range`**（闭区间 `[start, end]` → TS 的 `[pos, end)`），
投影自己不发明位置。**但有一处必须转**：TS 的 `getStart()` 不含前导 trivia，
而本工程一个节点常常把前导的 `let `/`const ` 也包在区间里——
实测 `let answer = 0` 的 `Let` 是 `[0,9]`，而 TS 的 `VariableDeclaration` 是 `[4,9)`
（`getStart()` 跳过 `let `）。所以 `VariableDeclaration` 的起点要**推到第一个子节点**，
语句壳（`VariableDeclarationList` / `VariableStatement`）才用 `Let` 自己的起点。

没覆盖的构造**原样透传**（`kind` 保留产物标签名）并记进 `unmapped`——**不猜**：
猜出来的节点会让尺子报出假成绩。

kind 用**名字**（`"VariableStatement"`）而不是数字：名字是规范的一部分，可读可改；
数字由使用方（`tests/parse/ts-ast.mjs`）从 `ts.SyntaxKind` 查出来，
这样本文件不必内建一张 300 条的枚举表，也就不会与 TypeScript 的版本漂移。

**文件级指令 `// @ts-nocheck` 写在 `# dependencies` 的 ```ts` 块里**：
那是一整份产物**最前面**的一段（在 import 之前），所以 tsc 认它。

为什么需要它：这份实现是 JS 的逐字搬家——函数体里那些 `const props = {}` 之后再挂字段、
内层箭头函数不带参数类型之类的写法，在 `strict` 的 TS 里要报一百多处；
**改掉它们就是改写**，不是搬家。所以类型判据放在**下一层**：一次性尺子
当时那份逐字节对拍脚本在全语料上逐字节对拍两份实现的输出，
那才是「搬完了还等价」的证据。类型标注仍然写全，它们是文档，也是将来真要开检查时的起点。

**这一族第 1041 轮又往前走了一步：从「问一格」改成「读一格」**——`AstKind` / `SegmentNames` /
`IsInvisible` / `IsMemberTag` / `IsDeclarationUnit` / `IsMemberList` / `IsSignatureNode` /
`TypeMemberPlan` 这八格**从方法改成了属性**：各具体类在自己那一页**显式声明同名属性**、
**构造时就赋好值**（`## field`），投影只按属性名读一次——不再有 `typeof … === "function"`
那种「有没有这一格」的兜底。答案本来就是**构造时定下来的一格数据**，不是现场计算，
所以它不该长成一个要点一下才有的东西。形态与理由写在 `core/syntax/token.xl.md` 的
`SegmentNames` 一节。

**第 1042 轮把「解析期才定下来」的那几族也收了进来**，规矩因此完整成两条
（下文说「属性」时都指这两条）：

1. **常量答案在构造时赋**（`## field NAME:TYPE = 值`）：`IsStatementNode` / `EndsOnBrace`
   那一族（各体、各语句节点、各裸块自己答 `true`）；
2. **派生答案在「那个事实被记下来的那一刻」赋**：`Keyword` 的
   `KeywordKind` / `StatementKind` / `StatementField` / `IsStatementNode` 是 `Value` 的函数
   ⇒ 都在 `Keyword.SetValue(text)` 里同一趟赋好；`Bracket` 的 `EndsOnBrace` 是 `startBracket`
   的函数 ⇒ 在 `Use` 里同一趟赋好。赋值点与它派生的那个事实**同页、同趟**，两格不会各说各话。

**这一栏原先列着「仍是方法的四格」**（`NameField()` / `WrapperField()` / `BodyField(parentKind)` /
`FunctionFlags()`，各自写着「为什么它还搬不动」）——**第 1045 轮把它们全部收干净了**，
下一节按那两条规矩逐格记着收法与理由。

⇒ 判据不是「它长得多像一个问题」，而是**答案在不在这一格自己身上、以及什么时候定下来**：
在构造（或记下那个事实）那一刻就在的，**收成属性**；只有「读取口本身随页面而异」的
`NameField` 留成 `## property` + `### get`（它读的仍是本页自己的字段，没有第二处存储）。

**第 1048 / 1049 轮把同一条判据推到了「坐标与正文」上**——那一类过去不在这几格里，
因为它的答案是**投影自己回原文算的**（`ctx.source`）。两句新规矩：

3. **这一格自己的正文由这一格自己答**（`Token.Text`，第 1048 轮）：它是**基类**的一格
   `## property` + `### get`，取值走这一格自己的 `SourceRange` 两头——`Source` 在构造时就
   带着自己那份 `Document`，所以「我这段正文是什么」**不必经过外面的字符串**。
   形态与 `Tag` / `start` / `end` 相同（值不随页面而异 ⇒ 声明一处、每个单元自动就位），
   取文本那一格（当年叫 `textOfNode`，**第 1071 轮整格删掉**）的最后一行因此从
   `ctx.source.slice(node.start, node.end)` 改成 `node.Text`；
4. **某一页构造时已经记下的事实，投影不许再回原文推一遍**（第 1049 轮）：
   `String.StringChar`（「本串用的引号字符。它只在构造器里赋一次」）就是这个例子——
   「这一格是不是模板」原来是 `ctx.source[startOf(x)] === "`"`（**回原文读第一个字符**），
   而那一格的反引号**早就记在 token 上了**（投影读 `stringChar`）——九处一处不剩。
   同一轮顺手把 `computedNameUnit` 的 `ctx.source[startOf(first)] === "["` 与
   `projectStatement` 的 `ctx.source[v.start] === ";"` 也换成读这一格自己的 `Text`。

⇒ **「按某一格自己的坐标去读 `ctx.source`」在 print-ast-common 的代码块里成了 0 处**，
`direct:lint` 因此加第四条判据（第 1049 轮）：`ctx.source[` 的下标**不许是某一格自己的 `start`**
（`ctx.source[startOf(x)]` / `ctx.source[x.start]`）——扫描用的游标、别人的终点、成对括号的区间
照旧，而「这一格的正文 / 首字符」只有一处来源：token 自己。
**第 1109 轮把这一族又收掉一处**：`synthName` 的 `ctx.source[unitSpan[0]]`（看名字头一格是不是
引号）改成读这一格自己的那两对数（`Token.NameSpan` / `Token.NameTextSpan`）——**那一格有
`NameSpan` 的页面才走这条路**（当时是 `Field` / `Namespace`），而 `memberNameOf` 同款的一问
**如实保留在原文那一格上**：名字那一格不是每个单元都记着
（`MethodDeclaration` / 方法签名的字符串名没有 `NameSpan`），那时只有原文答得出来。
**第 1138 轮把那句「不是每个单元都记着」的前提消掉了**：`MethodDeclaration` 补上
`## field NameAt` 与 `## property NameSpan`（与 `Field` 同名同形同条件），于是「引号名」这一问
**每一页都答得出来**，`memberNameOf` 那一处改成读基类那一格 `Token.IsQuotedName`。
⇒ 「按某一格自己的坐标去读 `ctx.source`」**今天一处不剩**（这一族收干净了），
判据那一侧的读数也因此不用再挂着一条例外。**等价是量出来的**：`tmp/r1138`（不进仓库）
在那两句上并排挂了一个计数器跑 `direct-ast --all`（2051 份语料），这一支**进入 42427 次、
新旧两个判据 0 次不一致**。

**第 1044 轮按可达性又量了一遍「本页还剩什么用不到」，结论是「一格死代码都没有」**：
以 `projectRoot` / `ToJsonText` 为入口、把**第 1043 轮之后剩下的 100 格声明**连同它们互相的引用
做成图，**100 格全部可达**（第 1043 轮删掉 `textOf` 之后就没有剩下的了）。
两次把 `Nothing` / `ENDS_ON_BRACE` 误判成死代码的原因也记在这里，免得下一位再踩：
**只数「带括号的调用」会漏掉两种真实引用**——`Nothing: NOTHING` 是「值传递」（没有括号），
而 `...namedExportClause(v, ctx)` 是展开进对象字面量；**这两格都有人用**
（`ctx.Nothing` 的读者是 `tokens/statement.xl.md`，`namedExportClause` 的读者是 `projectExport`）。
所以这一轮**没有删死代码**，只并掉三处「只有一格的转发」。

**第 1109 轮再按同一把尺子量了一遍，结论仍然一样**：以 `projectRoot` / `ToJsonText` 为入口
做可达性，**48 格声明全部可达**（那一轮并掉的三格不是死代码，而是「只有本页某两处读者」的
转发/读表，搬进读者之后本页少三格）。**`ENDS_ON_BRACE` 那一格的名字因此不再存在**——
它的唯一读者 `ownsTrailingSemicolon` 已并进 `projectEach`，数据表跟着搬成那一格函数里的
`endsOnBrace`（下面「并掉的三层间接」那一栏里提它的两处，读的时候要按这条口径理解）。
**第 1146 轮它又回到模块级**（名字仍叫 `ENDS_ON_BRACE`）：搬进调用点是「少一层间接」，
可代价变成了**每一趟调用都重建一次**——全语料 1640 份实测 `projectEach` 被调 **4380 次**、
`projectExpression` 被调 **5687 次**（它里面那三张同类名单同样每趟重建），
合计 **17061 个白造的 `Set`**。同一张常量名单因此从「函数里那一格局部 `endsOnBrace`」
改立为**本页一格 `# private const`**。两轮的口径不冲突：第 1109 轮收的是**转手**，
第 1146 轮收的是**每调用一次的重建**。

**这一轮并掉的三层间接**（判据与第 1043 轮同一把尺子：一个声明**只有一个调用点**、
而它自己只是把参数转手——那就把实现搬到那个调用点上）：

- `kindEndsOnBrace(kind)`（全仓一个调用点）**并进 `ownsTrailingSemicolon`**：它本来就是
  `return ENDS_ON_BRACE.has(kind)`，那一格名字的说明搬进 `ENDS_ON_BRACE` 与调用点；
- `astNodeFor(ctx, v)`（一个调用点：`ctx.Make`）**并进那个出口**：它本来就是
  「把同一个 `astNode` 按这一格的坐标闭好」，现在 `Make` 自己返回那个闭包；
- `astNodeHead(kind, props, v, ctx)`（一个调用点：`ctx.NodeHead`）**并进那个出口**：
  实现仍是 `astNode` + 按 `kind` / `pos` / `end` 重排键（第 199 轮的键序理由整段搬进注释）。

⇒ 本页 `# const` / `# method` 声明 **100 → 97 格**，可达性仍是「从入口全部可达」，
四个出口的名字（`ctx.Make` / `ctx.NodeHead` / `ctx.Node`）与行为一格没动。

**第 1045 轮把这四格也收干净了**（它们一直是本页说明里「仍是方法」的那一栏）：

- `NameField`（→ `## property` + `### get`）：名字的**文本**要等解析期认下那个名字才有，
  而且来源不止一个字段（`name` / `fieldName` / `namespace`，其中三页是 `TokenField<string>`）——
  所以它**不另立一格存储**（那就是同一份事实的第二处声明、会漂），而是把「这一页的哪个字段装着
  名字」这一读取口**在自己那一页声明成属性**（与 `Token.children` 同一形态：读的是「这一格有什么」，
  不是「让它去做一件事」）。投影那一侧于是只读 `node.NameField`，不调方法；
- `WrapperField`（→ `## field`）：四处成员表与 `ReturnType` 是常量；`Bracket` 在
  `Use` 记下 `startBracket` 的那一趟同赋；`GenericType` 在
  `TypeParameterCloseRule.AppendSegment` 造出那个 `TypeParameter` 的那一趟同赋；
- `BodyField`（→ `## field`）：四处体是常量；`Namespace` 那唯一带上下文的一态由
  `NamespaceCloseRule` 在**造出内层**的那一趟同赋——父 kind 不再往里递；
- `FunctionFlags`（→ `## field`）：三条收尾规则在**刚造好那一份**的尾巴上把
  `{ generator, async }` 赋好（那一趟正是把 `*` / `async` / `modifiers` 搬进来的那一趟）。

⇒ 判据不是「它长得多像一个问题」，而是**答案在不在这一格自己身上、以及什么时候定下来**：
在构造（或记下那个事实）那一刻就在的，**收成属性**；只有「读取口本身随页面而异」的
`NameField` 留成 `## property` + `### get`（它读的仍是本页自己的字段，没有第二处存储）。

**本页因此少了一格声明**：`functionContextOf`（全仓一个调用点）并进了它唯一的调用点
——`FunctionFlags` 变成属性之后，它只剩「沿 `Parent` 链读一格」，再单独立一格就是多一层间接
（尺子与第 1043 / 1044 轮并掉那三处转发时同一把）。

**第 1057 轮按这两条规矩又收了三个「问句」**——它们是同一族里最后剩下的一批**现场判据**，
全都由「我这一格是不是某一类」+「我这一格自己的正文是什么」拼出来，而那**两半都住在被问的那一页上**：

| 原来的现场判据 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `IsDotSymbol(node)`（`Tag === "SymbolToken"` + 回原文读那一格字符） | `node.IsDotSymbol` | `SymbolToken`（`## field`，`Close()` 里按 `Temp` 赋） |
| `IsTypeSeparator(node)`（同一形状，正文是 `,` / `\|` / `&`） | `node.IsTypeSeparator` | `SymbolToken`（同上，**同一趟**赋——两格都是正文的函数） |
| `IsNameNode(node)`（`Tag` 是 `Identifier` 或 `Keyword`） | `node.IsNameNode` | `Identifier` / `Keyword` 各自声明并答 `true`（`## field`，构造时就赋好） |

判据与第 1041 / 1042 轮那两条**一模一样**：答案在**这一格自己**身上（`SymbolToken` 的正文就是
`this.Temp`；「我能不能当名字」就是那两页自己的类名），而且**构造（收完那一格正文）那一刻**就定下来了
⇒ 收成属性。**「我是不是 `SymbolToken`」这一问本身也一起没了**：那一问的收件人只能是符号，
所以它本来就该由符号那一页答，而不是由投影先问一句「你是什么类」。

⇒ 本页的 `# const` / `# method` 声明 **96 → 93 格**；三格的读者（`IsDotSymbol` 12 处 /
`IsNameNode` 15 处 / `IsTypeSeparator` 1 处）全部改成属性读，`ctx` 上那个 `IsNameNode` 出口
与它在五页里的 7 处调用点一并换成属性读（**出口删了，同一格事实就不会有第二个入口**）。

**第 1059 轮按同一条规矩收的是「体是不是一对花括号」**：`for` / `while` / `do…while` /
`foreach` 四个循环体与 `IfSegment` **各自在挂体那一刻**就把整对区间记进了自己那一格
（`BodyBrace`，读法是那一页自己的 `bodyBraceRange`），克隆体也照抄——
于是投影那一侧「回原文找 `{`、再按深度配对扫一遍」的三支兜底（`blockOfBody` 两支 +
`bodyBlockOf` 一支）**一格读者都没有**，连同 `matchingBrace` 这个 helper 与 `blockOfBody`
那个只服务兜底的 `from` 形参一起删掉。

判据与前面几条一样：那一格的事实**在这一格自己身上**（挂体那一刻那个 `Bracket` 就在手上），
所以它该由这一页答，而不是由投影回原文再猜一遍（`document.GetValue(index + 2) === "{"`
那种输入正是「回原文猜」会翻车的地方）。**量法**：删掉之后八道门读数一处没动
（`coverage` 仍是 4260 / 4422、`cases:tsast` 3 条已知缺口、`samples` 逐字节一致）——
也就是说那三支**早就是死代码**，只是一直没人量它。

⇒ 本页的 `# const` / `# method` 声明 **93 → 92 格**（`matchingBrace`）；`blockOfBody` 少一个形参，
`if-set.xl.md` 里那个只喂它的 `bodyFrom` 也跟着没了。`direct:lint` 因此加第九条判据：
本页代码块里不许再出现「回原文配对 / 找花括号」的形态（`matchingBrace(` /
`ctx.source.indexOf("{")` / `ctx.source.lastIndexOf("{")`）。
自验（`tmp/` 里的探针，不进仓库）：把两种形态各写回一处，这一门**两处全红**；还原后 0 处。

**第 1060 轮是同一族的下一格：「下标那个 `[` 在哪」**。`IndexedAccessType` 是
`TypeBracketCloseRule.Process` 在**手上那个方括号**（`Bracket` 或 `ArrayLiteral`）上造出来的，
所以位置是**造这一格那一刻的事实**——那一页第 1060 轮显式声明了 `## field IndexBracketAt:int`、
在 `Process` 里那一趟赋好、`Clone` 照抄。投影这一侧于是只读 `v.IndexBracketAt`：
本页的 `indexBracketOf`（从终点往回找 `]`、再按深度配 `[`）与 `ctx.IndexBracketOf` 出口
**一并删掉**——又是一处「按字符数括号」的第二份答案（`T["]"]` 那种输入正是它的软肋）。

⇒ 本页的 `# const` / `# method` 声明 **92 → 91 格**（`indexBracketOf`）。
`direct:lint` 第九条因此扩成**一族**：回原文配对 / 找成对符号（花括号、方括号）一律 0 处。

**第 1061 轮收的是「字符串的正文」**：`String` 那段正文（引号里那截）过去是投影回
**这一页的子单元**里翻出来的——本页的 `stringText` = `kidsOf(v, "children").find(k => k.Tag ===
"ConstString")` 再读那一格的 `value`。可这段正文**就是这一页自己的子单元攒下来的**
（`ConstString` 是块单元，文本在 `Temp` 上，`BlockToken` 把它记成 `value`），
所以第 1061 轮把它收成两页各自的属性：`String.StringText`（第一个 `ConstString` 子单元那段，
一个都没有 ⇒ 空串）、`ConstString.StringText`（就是它自己那段）。投影那四处改成属性读，
`stringText` 这个 helper 删掉。

**量过再删**（`tmp/r1061` 的插桩，2051 份语料）：`stringText` 被调 **19335** 次、**每次都是
`String`**（`ConstString` 0 次、别的标签 0 次），其中 **554** 次答空串。所以「一个都没有 ⇒ 空串」
那一档必须保住（`""` / `''` / 空模板），而 `ConstString` 那一档在语料里一次都没走——
它的答案改成「自己那段」**不改任何一格读数**（`samples` 逐字节、`cases:tsast` 全语料都作证）。
那句「没有内容单元 = 一个字都没有」的记录也在这里：`"x"` / `'a\nb'` / `` `t` `` 都有
`ConstString` 子单元，`` `${1}` `` / `` `a${1}` `` 的文本段照样各给一个（空段也在内），
只有 `""` / `''` / `` `` `` 一个都没有——所以「一个都没有」只可能是空串，
**不是「值是一对引号」**（第 119 轮修掉的老缺口：当时退回「原样切源码」，
于是空串在降级层被报成带引号的形式）。

⇒ 本页的 `# const` / `# method` 声明 **91 → 90 格**（`stringText`）。
`direct:lint` 第十条因此立起来：字符串的正文不许再由投影回子单元里翻
（`stringText(` / `ctx.StringText(`）。

**第 1062 轮把「这一格是不是某一类」那一族的最后三个现场判据一次收干净**
（`isOperatorUnit` / `isPrefixOperatorUnit` / `isTypeParameterModifier`）——
三问的答案都只有**两半**：「我这一格是什么类」与「我这一格的正文是什么」，
而**两半都住在被问的那一页上**（这正是第 1057 / 1058 轮收 `IsDotSymbol` /
`IsTypeSeparator` / `IsNameNode` / `IsIndexBracket` 时那句判据），所以三问一起收成属性：

| 原来的现场判据 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `isOperatorUnit(node)`（`Tag === "SymbolToken"` 就真；`Keyword` / `Identifier` 再按文本认 `in` / `instanceof`） | `node.IsOperatorUnit` | `SymbolToken`（`## field … = true`，常量）/ `Keyword`（`SetValue`）与 `Identifier`（`Close()`）按**自己的正文**赋 |
| `isPrefixOperatorUnit(node)`（`UnaryOperator` 就真；符号认 `!` `~` `+` `-` `++` `--`，`Keyword` / `Identifier` 认 `typeof` / `void` / `delete` / `await`） | `node.IsPrefixOperatorUnit` | `UnaryOperator`（常量）/ `SymbolToken`（`Close()`）/ `Keyword`（`SetValue`）/ `Identifier`（`Close()`） |
| `isTypeParameterModifier(node)`（`Keyword` / `Identifier` 的正文是 `in` / `out` / `const`） | `node.IsTypeParameterModifier` | `Keyword`（`SetValue`，认 `in` / `const`）与 `Identifier`（`Close()`，认 `in` / `out` / `const`） |

判据与第 1041 / 1042 / 1057 那几条**一模一样**：答案在**这一格自己**身上
（「我这一格的正文是什么」只有这一页知道），而且**收完正文那一刻**就定下来了
⇒ 收成属性；基类那三格默认 `false`，需要它的页面**各自显式声明**（`## field`）。

- **赋值点与派生它的那个事实同页、同趟**：`SymbolToken.Close()` 与 `Identifier.Close()`
  是「逐字符攒完了」那一刻（与第 1057 轮那两格同一趟），`Keyword.SetValue` 是「记下正文」
  那一刻（与 `KeywordKind` / `IsStatementNode` 那几格同一趟）——所以克隆体照旧自动就位
  （三页的 `Clone` 分别走 `TryToClose()` / `SetValue`，一行都没动）。
- **删掉的出口**：`ctx.IsOperatorUnit` 与 `ctx.IsTypeParameterModifier` 一并删掉
  （读者是 `binary-operator` 1 处、`logical-operator` 1 处、`unary-operator` 1 处、
  `type-parameter` 4 处，全部改成属性读）——**出口删了，同一格事实就不会有第二个入口**。
- **`direct:lint` 第八条因此扩成六个名字**（`IsDotSymbol` / `IsTypeSeparator` / `IsNameNode` /
  `IsOperatorUnit` / `IsPrefixOperatorUnit` / `IsTypeParameterModifier`，第 1062 轮并名单），
  那两个出口补进 `CTX_BANNED`。**自验**（`tmp/r1062-probe.mjs`，不进仓库）：
  四种写法（`isOperatorUnit(` / `isPrefixOperatorUnit(` / `isTypeParameterModifier(` /
  `ctx.IsOperatorUnit`）各写回一处，这一门**每种 0 → 1**、退出码 1；源文件逐字节还原。
- **实测**：`xl check typescript core` 0 条；`xl build typescript core` **9 个产物** / 0 error
  （改动的 9 页：`token` / `symbol-token` / `identifier` / `keyword` / `unary-operator` /
  `binary-operator` / `logical-operator` / `type-parameter` / `print-ast-common`），`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 34.1s），读数与基线逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口还开着、`cases:direct` 1640 份不抛异常、
  `direct:lint` 0 条违反、`samples` 逐字节一致、`cases:check` 1656 / 1656、
  `runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**89 → 86 格**（按 `^# …(const|method|property)` 逐行数；
  上面那条账「91 → 90」是第 1061 轮当时的记录，本轮顺手把本页顶上那句旧账改成了实测值）。

**第 1063 轮把「按文本查词的中央表」剩下的最后一处也收回了它自己那一页**：
运算符优先级 `operatorRank(text)`（一整条 `if` 链）搬进 `typescript/tokens/symbol-token.xl.md`
（`SymbolToken.RankOfText` + `SymbolToken.OperatorRank`），本页的 `# private method operatorRank`
与 `ctx.OperatorRank` 出口一并删掉——**函数体一字没动**（连注释、连 `if` 链的顺序，
用 `tmp/r1063-diff.mjs` 逐行核对过：33 行对 33 行、逐行相同）。

- **键就是那一页自己的正文**：与 `KEYWORD_KIND`（第 1028 轮）、`SYMBOL_TOKEN_KIND`（同页）
  同一条口径——所以这是「投影层不再有按文本查词的中央表」那句话的最后一格。
- **读法只有一处**：本页那六处 `operatorRank(textOfNode(x))` 全部改成 `x.OperatorRank`
  （属性读），`binary-operator` / `logical-operator` 那两页的 `ctx.OperatorRank(kids[i].TextValue)`
  同理——**出口删了，同一格事实就不会有第二个入口**。
- **那一格是 `## property` + `### get`（不是 `## field`），而且这是量出来的**：先按
  `Close()` 里赋值的 `## field` 写过一版，`coverage` 当场从 **4260 / 4422** 掉到
  **4058 / 4422**（`differ` 134 → **328**，`for..of` / 生成器整族红）。根因是**不是每个符号都会
  走到 `Close()`**：`let.xl.md` 那一格尾巴符号（`let a = 1` 里那个 `=`，由 `ReplaceCountAt`
  原样补回 `Let` 右边）是 `new SymbolToken(…)` + `AppendAndSignOut` + `SignIn`、**没有
  `TryToClose()`** ⇒ 字段永远停在默认档，`=` 的优先级从 0 变成 7，切分整族跟着错。
  改成读时现算（`this.Temp`，与 `BlockToken.value` 同一处）之后**与搬走之前逐格等价**：
  八道门全绿、读数一处没动。
- **判据跟着长**：`direct:lint` 第八条那一族多认一格（属性名 `OperatorRank` +
  老问句别名 `operatorRank`），`ctx.OperatorRank` 补进 `CTX_BANNED`。
  **自验**（`tmp/r1063-probe.mjs`，不进仓库）：两种写法各写回一处，这一门**每种 0 → 1**、
  退出码 1；源文件逐字节还原。
- **本页的声明数**：**86 → 85 格**。

**第 1064 轮收掉的是两格「从这一格自己的属性读出来」的小判据**（同一句话的第三种写法：
不是「我是什么类」、也不是「按文本查词」，而是**「我自己记着的那一格」**）：

| 原来的现场判据 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `flagsOf(v)`（读 `v.modifiers` 那串词，映射成 `Const` / `None` / `Let` / `Using` / `AwaitUsing`） | `letView.DeclarationListFlags` | `Let`（`## property` + `### get`，算的就是**本页自己的 `modifiers`**） |
| `labelIsFlat(node)`（`kidsOf(node,"children").length === 0`） | `node.HasChildren` | 基类 `Token`（`## property` + `### get`，读的是**这一格自己的 `children`**——与投影那个读取口同一处、同一个 `instanceof Token` 过滤） |

- **两格都是 `## property` + `### get`，理由与第 1063 轮同一条**：`modifiers` 与 `children`
  都是**解析期陆续写上去**的，「现在是几」只能在**读的那一刻**看一次；写成构造时赋的
  `## field` 就是同一格事实的第二份、而且会停在那一刻的答案上。
- **判据跟着长**：`direct:lint` 第八条那一族多认两个名字（`DeclarationListFlags` 配别名
  `flagsOf`、`HasChildren` 配别名 `labelIsFlat`）。**自验**（`tmp/r1064-probe.mjs`，不进仓库）：
  两种老问句各写回一处，这一门**每种 0 → 1**、退出码 1；源文件逐字节还原。
- **实测**：`xl check typescript core` 0 条；`xl build typescript core` **3 个产物** / 0 error
  （`token` / `print-ast-common` / `let`）、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 29.9s），
  读数与基线逐项相同：`coverage` **4260 / 4422**、`cases:tsast` 3 条已知缺口、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**85 → 83 格**（`flagsOf` / `labelIsFlat` 各一格）。

**第 1065 轮把这一族里最后一份「没人声明的名单」删掉了——段是**反射**出来的那两格**：

| 删掉的那一格 | 原来靠什么 | 今天谁答、什么时候赋 |
| --- | --- | --- |
| `declaredKeysOf(v)`（走 `Object.keys` 与原型链、挑小写开头且带 getter 的名字） | **运行期反射** | 不再存在：它的两个读者各读一格显式声明的属性（见下两行） |
| `segmentKeysOf(v)`（再把「值是单元数组」的留下） | 上一条 + 值长什么样 | `v.Segments`：**每一页自己显式声明、构造时赋好**（只在有段的页面上写，其余照基类那一句从 `SegmentNames` 排） |
| `addModifiers` 里那段「值为 `true` 的属性都是修饰词」 | 上一条 + 值长什么样 | `v.ModifierWords`：那一页自己报出词名（只有 `Lamda` 给 `["async"]`） |

- **为什么这一族非收不可**（它与其他几族不是同一句话）：前面几轮收的是「**某一句判据**住在投影层」，
  这一轮收的是「**一份名单**住在投影层」——而且那份名单**根本没有被写下来过**：
  「哪几段进投影」过去由「这个属性长什么样」碰巧决定（小写开头 + 有 getter + 值是单元数组）。
  后果是**本页新加一个布尔属性就会凭空多出一个修饰词节点**、新加一个段属性就会悄悄改变投影形状，
  而改动现场一个字都不用动投影层。
- **新的一格落在哪一层**：`Segments` 是 `## property` + `### get`（基类那一句按本页的
  `SegmentNames` 排，`children` 补在最后）——**不是 `## field`**，理由与第 1063 / 1064 轮同一条：
  段的**顺序**在六个页面上与 `SegmentNames` 的声明序不同（`Try` / `Lamda` / `New` /
  `Switch` / `TernaryOperator` / `IfSegment`），那六页**各自显式声明 `## field Segments:…`**
  并给出自己的顺序；其余页面由基类那一句算出来——**同一份事实仍然只有一处声明**
  （`SegmentNames` 里已经写全了段名与顺序，再抄一遍才是第二处）。
  `ModifierWords` 是 `## field`（常量，构造时赋好）：`["async"]` 是 `Lamda` 那一页的常量事实。
- **量过再删**：`tmp/r1065-probe.mjs` / `tmp-r1065b.mjs`（只读探针，不进仓库）在 1640 份用例语料上
  逐类对账「派生值 vs 今天 `segmentKeysOf` 给的键」——**117 个类、0 处不一致**；
  十个真有段的类里，只有上面那六页需要显式声明顺序（其余四页 `For` / `While` / `DoWhile` /
  `Foreach` 的 `SegmentNames` 声明序恰好就是段序）。
- **判据跟着长**：`direct:lint` 第八条那一族多认两个名字（`Segments` 配别名 `segmentKeysOf`、
  `ModifierWords` 配别名 `declaredKeysOf`）——下一轮谁把反射写回来，这一门当场红。
- **本页的声明数**：**83 → 81 格**（`declaredKeysOf` / `segmentKeysOf` 各一格；
  `allKids` / `structuralProps` / `addModifiers` 三处调用点改成属性读）。

**第 1066 轮接着收的是同一族的下半句：「这一格下面哪些子单元进投影」**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `allKids(v).filter((k) => !k.IsInvisible)`（`unwrapNodes` 与 `projectableKids` 两格一字不差的同一句） | `v.ProjectableKids` | 基类 `Token`（`## property` + `### get`：`Segments` 的顺序、`children` 在最后，逐格滤掉 `IsInvisible`） |

- **为什么它该住在 token 上**：那一格的算式是**三件 token 自己的事实**拼起来的——
  「我有哪些段」（`Segments`）、「我的子单元」（`children`）、「我在投影里出不出现」
  （`IsInvisible`）。三件都在 token 上，拼起来这件事却留在投影层，于是**同一件事有两个名字**
  （`unwrapNodes` / `projectableKids`），而且投影得自己知道「段要按这个顺序收、`children` 收在最后」。
- **形参表那一族也跟着长**：第 1050 轮那把尺子（「声明了形参却一处不用」）这一轮又扫出两处，
  一并收掉——`projectHeadDeclare` 的第三个形参 `container`（全函数一处不用）、
  `bindingSpan` 的第一个形参 `v`（只用在「取不到时给零宽占位」那一句上，而那个位置
  由 `from` 给更贴题）。**`xl check` 的 E1205 也当场逮到一次重名**：`Switch` 早就有一个
  装单元的 `Segments`，与基类新加的段名表撞名 ⇒ 装单元的那一格让位改叫 `CaseSegments`。
- **两处「不是 token」的东西要跟着补齐**：`statementOfList` 造的**合成语句视图**现在要同时给出
  `Segments: ["children"]` 与 `ProjectableKids: list`（`allKids` 与 `ProjectableKids` 都只认
  这一格自己声明的东西，不再反射、也不再兜底）；**标签那一支的两个调用点则要分清哪一串**——
  判形状照旧读 `HasChildren`（含 trivia），而交给 `statementOfList` 的必须是
  `head.ProjectableKids`（`lab: /*c*/ for (;;) break lab;` 里那个 `Label` 的 `children` 是
  `[AreaAnnotation, For]`，把注释一起交过去会多投一条语句；实测这一族 5 条，已逐条转绿）。
- **两个 helper 的算式搬走了、名字留着**：本页声明数**仍是 81 格**（`unwrapNodes` /
  `projectableKids` 两格还在，但都成了**一行转调** `node.ProjectableKids`）——
  留着是因为调用点的读法本来就分成两族（「拆包装再取」与「取进投影的那一串」），
  而**算式只有 token 上那一处**了。
  调用点 **139 处**（`projectableKids` 123 + `unwrapNodes` 11 + 另外四页 5 处）
  全改成属性读，另外 6 处「数组接收者」按同一句算式就地写（`projectExpression` 的段过滤、
  `bodyBlockOf` / `blockOfBody` / `typeOf` 的入参归一）。
- **判据跟着长**：`direct:lint` 第八条那一族再认一格（`ProjectableKids`，别名
  `projectableKids` 与 `unwrapNodes`）。**自验**（`tmp-r1066-probe6.cjs` 同一手法，不进仓库）：
  两个老名字以调用形态写回一处 ⇒ 0 → 1 处、退出码 1；还原后逐字节相同。
- **实测**：`xl check typescript core` 0 条；`xl build typescript core` **2 个产物** / 0 error、
  `tsc` 干净；**八道门 8 通过、0 失败**（墙钟 32.8s），读数与基线逐项相同：
  `coverage` **4260 / 4422**（`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、
  `cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
  （中途撞过两次：`self[key] is not iterable`——段属性可能整个没赋值，读之前要判 `Array.isArray`；
  以及一处**数组接收者**被当成 token（`kids = kids.ProjectableKids`），
  两次都是 `coverage` 当场报出来、按同一句算式改回去的。）

**第 1067 轮把「顺手拿完整子单元表遍历一遍」的最后一批评干净**：
`ProjectableKids` 立起来之后，`allKids` 只剩「找 trivia」这一处真的需要它，
其余调用点都是在**已经滤过的那一串**上再找可见的东西——同一份读数、两种写法。
**注意分界**：`ProjectableKids` 是**某一格 token** 的属性，所以能改的只有
「接收者就是那一格 token」的那几处；手上是**一段单元数组**时（`typeOf` 的入参、
`projectExpression` 开头那一段）**只能照那一格的算式就地写一遍**：

| 改掉的调用点 | 原来 | 今天 |
| --- | --- | --- |
| `addDecorators`（找 `Decorator`） | `allKids(v).filter(…)` | `v.ProjectableKids.filter(…)` |
| `projectRoot` 的**未映射透传支** | `projectEach(allKids(v), ctx)` | `projectEach(v.ProjectableKids, ctx)` |
| `moduleSpecifierIn` / `moduleHolderOf`（找 `String`） | `for (const inner of allKids(one))` | `for (const inner of one.ProjectableKids)` |
| **一段单元数组**（`typeOf` 的入参、`projectExpression` 的段过滤） | `kids.filter((k) => k instanceof Token && !k.IsInvisible)` | **原样保留**：数组没有那一格 |
| `trailingSemicolonOf`（末尾那个 `;` 落在谁里面） | `for (const k of allKids(item))` | **原样保留**：它要问的正是「那个 `;` 是不是落在**注释**里」，而注释正是 `IsInvisible` 的那一类——改成 `ProjectableKids` 之后注释里收尾的 `;` 当场不再被排除（`lx-comments` / `type-tail-linecomment` 一族 7 条一起红，按实测撤回） |

- **`ctx.AllKids` 这个出口随之删掉**：三处调用点（`try` ×2 / `if-set` ×1）查的都是可见的东西，
  `ctx.Kids` 就是同一格读数的另一个名字、语义逐字相同。名字补进 `direct:lint` 的 `CTX_BANNED`
  ——留一个「我也看得见 trivia」的出口，等于给下一页留了一条「自己滤一遍」的现成入口。
- **实测**：`xl check typescript core` 0 条；`xl build typescript core` **4 个产物** / 0 error
  （`print-ast-common` / `try` / `if-set` / `namespace`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 28.4s），读数与基线逐项相同：`coverage` **4260 / 4422**
  （`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**81 格**（这一轮一格没增、一格没减：删掉的是一个 `ctx` 出口，
  宿主 `allKids` 那一格还在，只是读者从「三处」收成「一处」）。

**第 1070 轮收的是 `ctx` 上「别的页一处不用」的那五个出口——判据是「数得出来的 0 处」**：

| 删掉的出口 | 原来唯一还看得见它的地方 | 今天谁答 |
| --- | --- | --- |
| `ModuleSpecifierIn` / `ModuleHolderOf`（在一串单元里找模块路径那个 `String`） | 本页 `namedExportClause` | 全仓只有那两处调用，出口删掉、实现留在本页 |
| `ComputedNameUnit`（计算名那个 `ArrayLiteral`） | 本页 `memberNameOf` | **就地展开**进 `memberNameOf`（见那一节），本页少一格声明 |
| `TrailingSemicolonOf`（末尾那个 `;` 落在谁里面） | 本页 `projectEach` | 出口删掉，实现留在本页 |
| `SpecifierNameOf`（一个名字单元 → `StringLiteral` / `Identifier`） | 本页 `namedSpecifiersOf` 两处 | 出口第 1070 轮删掉、实现**第 1080 轮就地展开**（判据与记录见那一节） |
| `KindsInAst`（把投影出来的 `kind` 收进一个集合） | 本页 `projectRoot` | 出口删掉、实现**第 1104 轮就地展开**（`collectKinds`，判据与记录见那一节） |

- **为什么这五个该删**：`ctx` 是**跨页**的那条路（`PrintAst` 拿不到本文件的 import，
  只能经它转调），而每一页自己在用的名字**个个都有本页之外的读者**——只有这五个是
  `ctx` 上有、别的页一次都不用的。删掉它们不牵动任何调用点，只是把「只有本页能用」
  的能力从公共面上收回来：**出口删了，同一格事实就不会有第二个入口**（与第 1044 ~ 1069
  轮删各页出口同一条口径）。
- **量法**（递归扫，不是扫一层）：把全仓（`core` / `typescript` / `typescript-exec` / `runtime`
  的**全部** `*.xl.md`，除本文件外，共 181 份）里 `ctx.<名字>` 的出现次数数一遍，
  **0 处**才算没人用。**这一轮第一次量错了**：只扫了一层目录（`-Path core,typescript` 没带
  `-Recurse`），于是把 `heritage-clause` / `type-parameter` / `new` / `method` / `switch` /
  `enum-member` / `signature` / `type-operator` / `type-assign` / `mapped-type` /
  `conditional-type` / `label` / `field` / `lamda-parameter` / `import` / `import-type` 十六页
  真在用的 `ctx.DottedExpression`（2）/ `ctx.TypeOf`（6）/ `ctx.QualifiedNameFrom`（3）/
  `ctx.ParenthesizedOf`（7）/ `ctx.SwitchClause`（1）/ `ctx.ConditionalNode`（3）/
  `ctx.Segment`（3）/ `ctx.StatementOfList`（1）/ `ctx.ComputedNameExpression`（1）
  也当成「没人用」删掉了——`cases:direct` 当场 **415 处异常**（`ctx.DottedExpression is not a
  function` 一族），按读数逐格还原。所以这一步的判据是**递归扫全部 `*.xl.md`**，
  少扫一层就会把「别人在用」读成「没人用」。
- **`ComputedNameUnit` 就地展开**：它**全仓一个调用点**（`memberNameOf`）而函数体只有三句
  （取这一格的子单元、第一格不是 `ArrayLiteral` 就给零、原文那个位置不是 `[` 也给零）——
  与第 1043 / 1044 / 1056 轮并掉那些转发同一把尺子。展开时名字不能撞：`memberNameOf` 里
  已经有一个 `const direct`，所以新变量取 `nameKids` / `nameFirst`，第三句就着空列表写成
  `nameKids.length > 0 ? nameKids[0] : undefined`（`undefined` 与原来的 `null` 一样过
  `!== null`，判据一个字没动）。
- **两处「一格声明、一个读者」第 1070 轮当时没动**，第 1080 轮按同一把尺子收掉了：
  `specifierNameOf`（两个调用点都在 `namedSpecifiersOf` 的 `flush` 里，而且它承载的是
  「引号名 → `StringLiteral`、其余 → `NameNode`」这一条）与
  `typeMemberGroups`（一个读者 `projectEachIn`）**都已就地展开**——展开的是算式，
  判据仍由被问的那一页答（`Token.TypeMemberPlan`），原记录留在各自那一节的记账里。
- **`StatementOfList` 与 `SwitchClause` 留着**：它们各自有本页之外的读者
  （`label.xl.md` / `switch.xl.md`），按上面那条判据**不算**「没人用」。
- **实测**：`xl check typescript core` 0 条；`xl build --force` **156 个产物** / 0 error、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 32.6s），读数与基线逐项相同：`coverage` **4260 / 4422**
  （`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**81 → 80 格**（`computedNameUnit` 一格搬进调用点；
  另外五格是删掉 `ctx` 出口，宿主声明都还在）。

**第 1081 轮收的是「投影拿 token 印出来的产品格式当输入」这一族**（用户口径 1.1~1.4：
token 子类**构造完**，信息就得齐；要读的那一格由**具体页显式声明**、且**构造时**赋好）。
本页原来拆两串 `"起,止"`——`braceSpanOf` 一处拆**名字那一格**、一处拆**体那一对花括号**，
而**两串都是产品格式**（XML 那一侧直接用构造时那两格印，页内也自己从同一格拼），
投影拿它再拆一遍就是**同一格事实的第二处答案**：

| 原来拆的那一串 | 今天读的那一格（哪一页声明、什么时候赋） |
| --- | --- |
| `v.nameRange`（`"起,止"`） | `v.NameSpan:Array<int>` —— `Field` / `Namespace` **各自显式声明**（`## property`，读的是构造时那两格：`Field.NameAt:TokenField<number>`、`Namespace.NameAt` + `NameEnd`）；**第 1138 轮 `MethodDeclaration` 也补上同一格**（`## field NameAt` + `## property NameSpan`，与 `Field` 同条件同算式） |
| `v.bodyBraceRange`（`"起,止"`） | `v.BodyBrace:TokenField<number>` —— `While` / `For` / `Foreach` / `DoWhile` / `IfSegment` / `Lamda` **各自早就显式声明**、挂体那一刻赋好 |

- **一格新声明都没有**：`BodyBrace` 六页本来就有（第 641 轮那一族），`NameSpan` 是那两页原来
  `nameRange` 那一格的**换形**（字符串 → 一对数，声明数 1 → 1）——只是不再经过产品格式。
  `braceSpanOf` 因此只剩**一个**读者口径（体那一对花括号），它的形参从字符串改成
  `BodyBrace` 那一格自己；`bodyBlockOf` / `blockOfBody` 的第四个形参、`ctx.BodyBlockOf` /
  `ctx.BlockOfBody` 两个出口跟着改收那一格（**出口名字与条数一格没动**）。
- **删掉的字符串格**：六页的 `## property bodyBraceRange:string` + 两页的
  `## property nameRange:string`，共 **8 格**（`if-segment` 那一格只是 `BraceRangeText()` 的转手，
  而那个方法**留着**——它是 XML 那一侧的产品格式）。
- **中途量到一个真问题并修掉（这一轮最值得记的一句）**：先把 `braceSpanOf` 收成只认
  `TokenField`、只改了「体」那三处调用，**名字那一处还在递字符串** ⇒ `brace.IsSet` 恒不是 `true`
  ⇒ 名字区间整格落空 ⇒ `namespace N { … }` 投出来**没有 `name`**、降级层当场报
  `unimplemented: namespace declaration without a name`（`runtime:check` 1 条红、`coverage`
  4261 → 4180）。所以**同一条口径必须一次收干净**：名字那一半（`Field` / `Namespace` 的 `NameSpan`）
  与体那一半在同一轮里一起改，改名之后八道门立刻回到基线读数。
- **实测**：`xl check` 10 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 30.1s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（这一轮只改形参与方法体，一格声明没增没减）。

**第 1082 轮把「投影要读的那一格挂在没声明它的那个类上」这一条收掉**（用户口径 1.3）：
`Token.ModifierSpanList` 是第 1079 轮立的基类属性，可它读的 `modifierSpans` 是**各页那个小写的
投影面属性**——基类里没有这个名字，所以当时是经 `(this as any).modifierSpans` 读的。
这一轮把**输入那一格收到基类声明上**（`## field ModifierSpans:string = ""`，各页本来就各自
显式声明同一格、并在认下声明那一刻赋好），于是：

| 改掉的 | 怎么改的 |
| --- | --- |
| 基类 `ModifierSpanList` 的 `(this as any).modifierSpans` | 读 `this.ModifierSpans`（第 1082 轮在基类声明的那一格） |
| 各页 10 处 `## property modifierSpans:string`（`let` / `field` / `type-assign` / `class` / `enum` / `function` / `method-declaration` / `interface` / `lamda` / `namespace`） | **整格删掉**：全仓只有基类那一格读它（量法：`-cmatch 'modifierSpans'` 逐行看，代码里的读者只有 `token.xl.md` 那一行；其余全是 XML 属性名与散文） |

- **为什么这一格该在基类声明**：读它的那一格（`ModifierSpanList`）在基类，而「读的东西要在
  读的那个类里有声明」——小写那一格是第 1018 轮留下的**投影面读法**，`ModifierSpans` 才是
  各页构造时赋好的**事实**。收完之后**同一份事实只剩一处声明、一处入口**。
- **实测**：`xl check` 12 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 27.8s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（改的是别的页与基类）。

**第 1083 轮把「投影自己拆 `modifiers` 那一串」的两处收进基类**（用户口径 1.1 / 1.4：
投影要的东西，token 子类**构造完**就该齐；拆法只有一处）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `String(v.modifiers ?? "").split(",")`（`projectDeclaration` 的 `get` / `set` 那一支） | `v.ModifierTextWords` | 基类 `Token`（`## property` + `### get`，拆的就是**基类声明的 `modifiers`**） |
| `v.modifiers.split(",").filter((word) => word !== "")`（`addModifiers`） | 同上（分支条件仍看那一格事实在不在：`typeof v.modifiers === "string" && v.modifiers !== ""`） | 同上 |

- **`modifiers` 那一格第 1083 轮在基类立起来**（`## field modifiers:string = ""`）：各页本来
  就各自显式声明同一格、并在**认下声明那一刻**赋好（`DeclarationModifiers(...).join(",")`），
  XML 那一侧（`modifiers="…"`）读的也是它——与第 1082 轮 `ModifierSpans` 那一条同款：
  **读的东西必须在读的那个类里有声明**。
- **两个形参名字不同、来源也不同的「修饰词」**：`ModifierTextWords`（文本那一档，
  `"export,const"` → `["export","const"]`）与 `ModifierWords`（布尔属性那一档，`Lamda` 给
  `["async"]`）——`addModifiers` 里那两支的先后与判据一个字没动。
- **顺带收掉本页之外的一处第二读法**：`Let.DeclarationListFlags` 原来自己
  `String(this.modifiers).split(",")`，第 1083 轮起也读 `ModifierTextWords`。
- **实测**：`xl check` 3 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 30.6s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（这一轮改的是两处算式与注释）。

**第 1084 轮把 `bodyBlockOf` 里最后那一处「回原文」的兜底删掉了**（用户口径
1.1 / 1.4：投影需要的信息，token 子类**构造完**就该齐——齐了就不必再回原文找）：

| 删掉的 | 凭什么能删 |
| --- | --- |
| `bodyBlockOf` 的 `from:int` 形参 | 它**只**喂下面那一支，那一支没了它就没有读者（`direct:lint` 第五条判据：形参表就是这一格需要什么） |
| 「`projections.length === 0` ⇒ 从 `from` 起跳空白、撞上 `;` 就出 `EmptyStatement`」整支 | 空体语句那一格**早在 token 上**（`EmptyBodyAt`，第 590 / 619 / 635 轮），而三个调用点（`While` / `Foreach` / `DoWhile` 的 `PrintAst`）**都在调本方法之前就读完了它并直接出了 `EmptyStatement`** ⇒ 走到本方法时它必然 `-1` |
| `ctx.BodyBlockOf` 的第一格实参 | 出口跟着少一格（`(list, brace)`）；`while` / `foreach` / `do-while` 三页的实参跟着少一格 |

- **这一条是量出来的**（`tmp/r1084/probe.cjs`，本仓一贯的「先量死再删」）：给编译产物
  `build/ts/typescript/print-ast-common.js` 里那一支插一句计数，跑
  `node tests/parse/direct-ast.mjs --all`（**2051 份语料 / 517596 个节点**）——
  进入那一支 **0 次**、命中 `;` **0 次**。所以删掉的是一格**没有任何输入能走到**的兜底，
  不是「很少走」的兜底。
- **为什么它本来就到不了**：这一支要求「体段投不出任何单元」且「头部之后第一个非空白字符是 `;`」。
  后半句正是 `EmptyBodyAt` 的**定义**（`while` 那一页写着「体为空、`endIndex` 退到 `)` 那一格；
  `;` 由投影侧读 `EmptyBodyAt` 补成 `EmptyStatement`」），而三个调用点都把那一格读在**前面**。
  前半句剩下的那一档（体起点落在注释上、`EmptyBodyAt` 记不下）也不命中：这一支只跳**空白**、
  不跳注释，撞上的是 `/` 而不是 `;` ⇒ 删前删后都落到同一个 `undefined`。
- **收尾那一格照旧**：`headerCloseAt` 那一问（`While` / `Foreach` 的「字段缺了就不猜、交回
  `PrintAst`」）**留着没动**——它是「这一页记全了没有」的判据，不是 `from` 的搬运。
- **改了哪四个文件**：本页（形参、兜底、出口实参）、`tokens/while`、`tokens/foreach`、
  `tokens/do-while` 三页的 `PrintAst` 各少一格实参（`ctx.BodyBlockOf(body, brace)`）。
- **实测**：`xl check` 4 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 29.5s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（改的是一个形参、一支兜底与两个出口/调用点的实参）。

**第 1085 轮把 `trailingTriviaStart` 里那句「这一格是不是一条注释」收进被问的那一页**
（用户口径 1.1 / 1.3：投影要的东西在具体类里**显式声明**、构造时就赋好）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `k.Tag === "LineAnnotation" \|\| k.Tag === "AreaAnnotation"` | `k.IsCommentUnit` | 基类 `Token` 给默认 `false`；`LineAnnotation` / `AreaAnnotation` **各自显式声明** `## field IsCommentUnit:bool = true`（构造时赋好的常量） |

- **为什么这不是 `IsInvisible`**：那一格答的是「我在投影里出不出现」，四页答 `true`
  （还有 `LineWrap` 软换行与 `PreprocessorDirectives` 预处理指令），而收尾 trivia 只认
  **两种注释**——两问是两句话。**把它们并成一格会当场红**：`A.x = 1` 换行那一族会把软换行
  当成收尾注释，`stmtEndOf` 于是把语句终点退到换行上（`samples` 是逐字节比的，躲不过）。
  所以这一族是**新立一格**，而不是把 `IsInvisible` 钉进判据（那一格在投影层是允许读的：
  `Kids` / `ProjectableKids` 那一族就靠它）。
- **`direct:lint` 第八条判据跟着多认一个名字**（`IsCommentUnit`）：名字一旦被写回成
  **问句**（`isCommentUnit(k)` 或 `ctx.IsCommentUnit`），这一门当场红。自验过
  （`tmp/r1084/lint-selfcheck.cjs`）：那一行改成 `isCommentUnit(k)` ⇒ 报告 **1 处**、
  `FAIL … 又在投影层写成问句`、`exit=1`；改回属性读 ⇒ **0 处**、`exit=0`。
  **这一条看不见「匿名比类名」**（`k.Tag === "LineAnnotation"` 那种写法是第 9 条那一族的对象），
  如实记下：被守的是「名字」这一形态，与前面十几个名字同款。
- **改了哪四个文件**：本页（那一行读数）、`core/syntax/token.xl.md`（新立基类那一格）、
  `tokens/line-annotation` / `tokens/area-annotation`（各自显式声明并答 `true`）。
- **实测**：`xl check` 4 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 30.4s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（新立的那一格在 `core/syntax/token.xl.md` 与它那两页）。

**第 1086 轮把 `allKids` 最后一处「不是要找 trivia」的读者收掉**（用户口径 1.1：
投影要的东西由 token 那一格答；顺带把一处**说明与代码不一致**修平）：

| 原来的现场算式 | 今天读的那一格属性 | 凭什么 |
| --- | --- | --- |
| `addDecorators` 的 `allKids(v).filter((k) => k.Tag === "Decorator")` | `v.ProjectableKids.filter((k) => k.Tag === "Decorator")` | `Decorator` **不是** trivia（它进投影、不答 `IsInvisible`），所以「含 trivia 的完整表」与「进投影的表」在这一处**逐处同答** |

- **这一条是量出来的**（`tmp/r1084/decor-probe.cjs`）：给编译产物的那一处插一句，把两条路
  （`allKids(v)` 与 `v.ProjectableKids`）滤出来的 `Decorator` 逐格记成 `start:end:Tag` 序列再比——
  跑 `node tests/parse/direct-ast.mjs --all`（**2051 份语料**），这一处被调 **42158 次**、
  **DIFF 0**。所以这是「同一份答案的第二条路」，不是「多半一样的近似」。
- **第 1067 轮的说明本来就写着这一处已经改了**，而代码里读的仍是 `allKids(v)`
  （第 1072 轮按代码块重数时**如实记下过**这条不一致，只记不改）。这一轮按当时那句说明
  把代码改平——`allKids` 因此在代码块里的真读者只剩 **3 处**，三处问的都是「含 trivia 的那一份」。
- **改了哪一处**：只有本页的 `addDecorators`（声明数一格没动；`allKids` 这一格照样留着，
  它是那三处唯一的事实来源）。
- **实测**：`xl check` 1 个文件 0 条；`xl build --force`（`core` / `typescript` / `runtime` /
  `typescript-exec`）**180 个产物** / 0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 32.2s），
  读数与基线逐项相同：`coverage` **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、
  加权 95.7%）、`cases:tsast` 3 条已知缺口、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、
  `samples` 逐字节一致、`cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**69 → 69 格**（改的是一处读数与两段说明）。

**第 1087 轮按同一把尺子并掉三处「一格声明、一个调用点 / 两个转手读者」的壳**
（用户口径 1.1~1.4 的另一半：投影要的东西由 token 子类在构造时备齐，投影这一侧就**不该再留
一层只为读它而存在的壳**；判据与第 1043 / 1044 / 1070 / 1080 轮并掉那些转发**逐字相同**）：

| 删掉的那一格 | 原来有几个读者 | 今天谁答 |
| --- | --- | --- |
| `moduleSpecifierIn(kids)` | 1（`namedExportClause`） | 就地并进 `namedExportClause`（先在 `kids` 这一层找 `String`，找不到才往 `Method` 里面看一层） |
| `moduleHolderOf(kids, target)` | 1（同上，同一处） | 就地并进 `namedExportClause`（同一个字符串装在谁里面 ⇒ 那一格是 `ParenthesizedExpression`） |
| `braceSpanOf(brace)` | 2（`bodyBlockOf` / `blockOfBody`） | 两处各自就地读 `BodyBrace` 那一格的两头（`brace.Range.Start.Index` / `.End.Index`，构造时赋好） |

- **同一个形状、同一个理由**：三格都**不产生新的事实**——它们只是把 token 已经记好的一格
  （`String` 子单元的位置 / `Method` 包的层 / `BodyBrace` 的两头）转手给唯一的那一两个读者。
  按这一族一贯那把尺子（**只有转手、没有独立判据的声明就是多一层间接**），实现搬到读者那里，
  声明收回本页——**判据仍然由被问的那一格自己答**（`moduleSpecifier` 仍是「哪个 `String`」，
  `ParenthesizedExpression` 仍是「它装在 `Method` 里」，`Block` 的两端仍是 `BodyBrace`）。
- **`moduleSpecifierIn` 的两次扫描不能合成一句 `find`**（这一轮实测撞到过一次，如实记下）：
  口径是**先**在 `kids` 这一层找、**找不到才**往 `Method` 里面看一层。第一版写成
  `kids.find((k) => k.Tag === "String")` 之后，`from("m")` 那种形态（字符串装在
  `Method(name="from")` 里、而 `kids` 这一层还有别的 `String` 子单元）**先后一颠倒**：
  `cases:tsast` 片 8 当场红——`tests/cases/token/modules/gap-r68-9-exp-named-nlw-in-then-from-like.ts`
  的 `moduleSpecifier` 漂成 `moduleSpecifiers`（字段名不一致 1 处）。按原口径写成两段循环之后
  那一片转绿（`--shard 8/16` 退出码 0），八道门随之全绿。**「逐字照抄」在这一处不是保守，是必需的**。
- **删掉的散文**：`braceSpanOf` 那一整节并进 `bodyBlockOf` / `blockOfBody` 的说明与代码块
  （它原来写的「为什么要这一格」「第 1081 轮换形」两段一字没丢，只是换了主语）；
  `moduleSpecifierIn` 那一节里「为什么要递归 / 不能一律递归」两句搬进 `namedExportClause`
  的代码块注释（连那条实测 `mod-export-string-name` 的红账一起）。
- **量法**：改完八道门读数**一处没动**（基线是第 1086 轮那一份）——`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` **3 条已知缺口还开着**、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
  删掉的三格在**全语料上逐格等价**：`cases:direct` 的固定样本点名与 `cases:tsast` 的
  16 片逐文件对拍都作证（`namedExportClause` 那一处改动最重，改的正是被对拍的那一格）。
- **实测**：`xl check typescript core` **0 条**；`xl build --force`（`typescript`）**127 个产物** /
  0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 30.0s）。
- **本页的声明数**：**69 → 66 格**（`moduleSpecifierIn` / `moduleHolderOf` / `braceSpanOf` 各一格；
  三格的读者一个没增——`ctx` 上那三个出口第 1070 轮早就删了，留下的宿主声明只是本页的 helper）。

**第 1087 轮（同一轮第二处）接着并掉两处同形状的壳**（判据、尺子与上一处逐字相同：
**只有转手、没有独立判据的一格声明就是多一层间接**；用户口径 1.1~1.4 的另一半一样成立——
两格要的东西（`ProjectableKids` / `TextValue` / `start` / `end`）**都已经是 token 构造完就备齐的**）：

| 删掉的那一格 | 原来有几个读者 | 今天谁答 |
| --- | --- | --- |
| `asStatement(body, end)` | 1（`projectEach` 里「顶层标签」那一支） | 就地并进那一支（`ExpressionStatement` 那一层壳照旧只在这一支补） |
| `projectSignedLiteralType(v, ctx)` | 1（`projectTypeExpression` 里 `LiteralType` 那一档） | 就地并进那一档（`LiteralType > [符号, 数字]` → `PrefixUnaryExpression`） |

- **`asStatement` 那一格的 `end` 只有一种来法**：并进来之后写的是 `statement.end ?? 0`
  ——与原来调用点递进去的那一格**同一个表达式**（壳体那一路从来不走它：
  `projectStatement` 自己有语句壳，`labeled` 那一处用的是体自己的 `end`）。
- **`projectSignedLiteralType` 的「不是这个形状」**：并进来之后是「什么都不做、照下面那条路走」
  （原来给的是 `undefined`、调用方 `if (signed !== undefined) return signed;`）——**同一句话**。
  它读的 `startOf(head)` 就是 `signedHead.start`、`stmtEndOf(list[0], ctx)` 原样保留。
- **两格的判据都没有搬去 token 那一侧、理由写在并进来的注释里**：它们要的是
  「**一串子单元凑出来的形状**」（表达式结果 + kind 后缀 / 两个子单元 + 头一个是符号），
  不是「某一个 token 自己的事实」——按第 1041 / 1042 / 1057 那几条判据，它们属于投影这一侧，
  只是不再单独立一格声明。
- **一处旧账顺手改平**：`projectSignedLiteralType` 里那句「**临时标记**（第 66 轮）」的注释
  是当年一次性探针的说明，随整格删除（并进来的那一份里留了一句交代它去哪了）。
- **量法**：改完八道门读数**一处没动**——`coverage` **4261 / 4422**（`blocked 28` /
  `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` **3 条已知缺口还开着**、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **实测**：`xl check typescript` **0 条**；`xl build --force`（`typescript`）**127 个产物** /
  0 error、`tsc` 干净；**八道门 8 通过、0 失败**（墙钟 31.3s）。
- **本页的声明数**：**66 → 64 格**（`asStatement` / `projectSignedLiteralType` 各一格）。

**第 1088 轮把投影层「这一格是不是一个二元 / 逻辑运算单元」的十几处两连比类名收进被问的那两页**
（用户口径 1.1~1.4：投影要的东西在**具体类**里显式声明、构造时就赋好；判据与第 1057 / 1062 /
1076 那几轮**逐字相同**——「我这一格是什么类」就是那一页自己的类名）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "BinaryOperator" \|\| X.Tag === "LogicalOperator"`（本页 **19 处**，其中 1 处跨行） | `X.IsBinaryOperatorNode` | 基类 `Token` 给默认 `false`；`BinaryOperator` / `LogicalOperator` **各自显式声明** `## field IsBinaryOperatorNode:bool = true`（构造时赋好的常量，与 `AstKind` 同一形态——两页的节点名本来就是同一个 `BinaryExpression`） |
| `const kind = unit === undefined ? "" : unit.Tag;` + `return kind === "BinaryOperator" \|\| kind === "LogicalOperator";`（`await` 那一支的局部闭包） | `unit === undefined ? false : unit.IsBinaryOperatorNode` | 同上；顺带把只转手一次的局部变量 `kind` 收掉 |
| `const oneKind = one.Tag;` + `(oneKind === "BinaryOperator" \|\| oneKind === "LogicalOperator") &&`（链尾摊开那一支） | `one.IsBinaryOperatorNode &&` | 同上；局部变量 `oneKind` 一并收掉 |

- **为什么它该住在 token 上**：那一问的两半（「我这一格是什么类」与「我投成哪个节点」）
  **都在被问的那一页上**——`Tag` 就是这一页的类名、`AstKind` 就是 `"BinaryExpression"`；
  投影层重写一遍就又是两处会漂的地方（改一页的类名、或让第三页也当二元运算节点，
  都要回来改这十几处）。
- **它与 `IsOperatorUnit` 不是同一问**：那一格答「**裸符号**能不能当一个运算符」
  （`SymbolToken` / `in` / `instanceof`），且**明确把二元运算符排除在外**（第 1062 轮那一节）；
  这一格答「**这一格整个单元**是不是一个二元运算节点」——所以是新立一格，不是把旧那格扩宽。
- **5 处单比 `BinaryOperator`，第 1115 轮收进那一页自己的那一格**（第 1088 轮曾逐字保留，
  理由今天仍然成立、只是住处换了）：`headIsBinary` 与它下面那个剥壳循环、链尾那一支的
  `kids[0].Tag === "BinaryOperator"`、`prefixHasOperator` 里那一处、以及
  `type === "Statement" || type === "BinaryOperator"`（那一处比的是 kind 字符串，不是 token）
  ——问的都是「这一格是不是 `BinaryOperator` 那一页的单元」（剥壳用的是
  `headInner[length - 2]`，运算符在中间；而**逻辑单元的 `Data` 最后一格才是运算符**，
  布局不同），所以它们读的是 `BinaryOperator` 那一页新立的 `IsBinaryOperatorUnit`，
  **不是**上面这一格（把 `LogicalOperator` 一起收进来是改语义）。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认一个名字（`IsBinaryOperatorNode`，
  问句形态 `isBinaryOperatorNode(…)` / `ctx.IsBinaryOperatorNode` 写回来当场红），
  另立第十四条 `BINARY_CLASS_DISJUNCTION`——**两连比类名**那一形态（两种次序、跨行写法都算）
  在代码块里必须恰好 0 处。**自验**（`tmp/r1088/` 的探针，不进仓库）：把一处写回成两连比类名
  ⇒ 报告 **0 → 1 处**、`FAIL … 又在比类名了`、`exit=1`；逐字节还原 ⇒ **1 → 0 处**、`exit=0`。
- **改了哪五个文件**：本页（21 处读数 + 3 处说明）、`core/syntax/token.xl.md`（新立基类那一格）、
  `tokens/binary-operator` / `tokens/logical-operator`（各自显式声明并答 `true`）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十四条判据 + 一行读数）。
- **量法**：改完八道门读数**一处没动**（基线是第 1087 轮那一份）——`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` **3 条已知缺口还开着**、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
  21 处逐处等价：接收者都是**手上那一格 token**，两页答 `true`、其余页由基类答 `false`
  ⇒ 与两条 `===` 的合取逐格同答（`cases:direct` 的固定样本与 `cases:tsast` 那 16 片都作证）。
- **实测**：`xl check typescript core` **156 个文件 0 条**；`xl build typescript core`
  **4 个产物** / 0 error（`token` / `binary-operator` / `logical-operator` / `print-ast-common`）、
  `tsc` 干净；**八道门 8 通过、0 失败**（墙钟 30.4s）。
- **本页的声明数**：**66 → 66 格**（改的全是读数与说明；新立的那一格在基类与那两页）。

**第 1089 轮把「这一格是哪一态括号」的现场连写收进 `Bracket` 那一页，并顺手删掉那个
不再有人用的 `ctx.IsIndexBracket` 出口**（用户口径 1.1~1.4：投影要的东西在具体类里显式声明、
构造时就赋好；第 1058 轮已经为 `[` 那一态立过 `IsIndexBracket`，这一轮把另外两态补齐、
把三种形态的**匿名连写**一起收干净）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "Bracket" && X.startBracket === "("`（本页 **27 处**：同行 15 + 跨行 12） | `X.IsParenBracket` | `Bracket` 那一页**显式声明** `## field IsParenBracket:bool = false`，在 `Use` 记下 `startBracket` 的那一刻赋好、`Clone` 照抄（与 `IsIndexBracket` 同页同趟）。**第 1137 轮补上第 28 处**：`projectExpression` 末尾那一支写的是同一句话的**第三种写法**（`IsBracketUnit && …startBracket === "("`，**没有 `Tag` 那一半**），从上面那两条正则里漏了过去——已改读同一格，`BRACKET_STATE_CLASSIFY` 也补了第三条（裸字段读） |
| `X.Tag === "Bracket" && X.startBracket === "{"`（同行 2 + `String(… ?? "")` 兜底 1） | `X.IsBraceBracket` | 同上（`## field IsBraceBracket:bool = false`，同一趟赋好） |
| `X.Tag === "Bracket" && X.startBracket === "["`（同行 6 + 跨行 3） | `X.IsIndexBracket` | 第 1058 轮那一格（本页这一轮只是把**同一格事实的匿名连写**也改成属性读） |

- **为什么那两半是多余的/该由 Bracket 答**：`Tag === "Bracket"` 那一半是前缀——别的页答不出
  `IsParen…` / `IsBrace…` / `IsIndexBracket`（`undefined` ⇒ 假），所以「我是什么类」不必先问一遍；
  而 `startBracket` 只有 `Bracket` 有（合成视图上没有它 ⇒ `undefined`，两种写法同答 false）。
  第 1464 行那处 `String(v.startBracket ?? "")` 的兜底就是为「没有这一格」写的，属性读天然同答。
- **`IsBraceBracket` 与 `EndsOnBrace` 不是同一问**（如实写进两页）：后者是**基类**的一格、
  别的页（各循环体、各语句节点）也答 `true`，问句里少掉 `Tag === "Bracket"` 那一半就会把别的东西
  认成花括号；它是「我是不是那对花括号**本身**」，不是「我的内容是不是收在花括号里」。
- **那三处两态写法逐字保留**（实测点名）：`(k.Tag === "Bracket" && (k.startBracket === "[" ||
  k.startBracket === "{"))` 问的是另一句话（值位那两种括号凑成的形状），判据不同、不该并进来。
- **顺手删掉 `ctx.IsIndexBracket` 出口**（它就是「清理用不到的方法」那一半）：第 1058 轮起它的
  实现只有一行转手 `(node) => node.IsIndexBracket`，当时留着是因为 `json/object-literal` 在用它；
  这一轮把那一处（唯一一个真实读者）改成属性读 ⇒ 出口**零真实读者**（全仓实测活代码 0 处），
  于是删掉，名字补进 `direct:lint` 的 `CTX_BANNED`（ctx 出口 52 → 51）。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认两个名字（`IsParenBracket` / `IsBraceBracket`，
  问句形态写回来当场红），另立第十五条 `BRACKET_STATE_CLASSIFY`——**匿名连写**那一形态
  （同行与跨行都算，`String(… ?? "")` 那种兜底写法也算）在代码块里必须恰好 0 处。
  **自验**（`tmp/r1089/` 的探针，不进仓库）：把一处属性读写回成现场连写 + 把 `ctx.IsIndexBracket`
  写回表里 ⇒ 两条读数各 **0 → 1 处**、两行 `FAIL`、`exit=1`；逐字节还原 ⇒ 双双归零、`exit=0`。
- **改了哪四个文件**：本页（39 处读数 + 一处出口 + 几段说明）、`tokens/bracket.xl.md`
  （两格新属性 + `Use` / `Clone` 两处赋值）、`tokens/json/object-literal.xl.md`（那一处改属性读）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十五条判据 + `CTX_BANNED` + 一行读数）。
- **量法**：改完八道门读数**一处没动**（基线是第 1088 轮那一份）——`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` **3 条已知缺口还开着**、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
  39 处逐处等价：三种括号态各只有一格答 `true`，与「比类名 + 比 `startBracket`」的合取逐格同答。
- **一处量法要如实记下**（第一次跑这一门时逮到）：题面只按**行**扫，于是漏了 12 处**跨行**连写
  （`X.Tag === "Bracket"` 换行到 `&& X.startBracket === "("`）——是这一门自己报出来的 15 处
  （含 3 处 `[`）把它们补齐的；改写脚本因此改成**在 ```ts 围栏内整段**匹配（散文里那句历史
  `node.Tag === "Bracket" && node.startBracket === "["` 一个字没动）。
- **同一门第 1137 轮又逮到一处漏网**：上面那两条正则都要求 `X.Tag === "Bracket"` 那一半在前面，
  于是**没有那一半的写法**（`kids[kids.length - 1].IsBracketUnit && …startBracket === "("`，
  `projectExpression` 末尾「对调用结果再调一次」那一支）这一门从来报不出来。
  这一轮把它改读 `IsParenBracket`（见 `BRACKET_STATE_CLASSIFY` 第三条与那一处的注释），
  **自验过**：把那一行写回去 ⇒ 这一门报 **1 处**并点名 `kids[kids.length - 1].startBracket === "("`，
  退出码 1；改回属性读 ⇒ 0 处。这一门因此第一次真正覆盖「三态括号」的**三种写法**。
- **实测**：`xl check typescript core` **156 个文件 0 条**；`xl build typescript core`
  **3 个产物** / 0 error（`print-ast-common` / `bracket` / `object-literal`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 31.0s）。
- **本页的声明数**：**66 → 66 格**（改的全是读数与说明；新立的两格在 `tokens/bracket.xl.md`）。

**第 1090 轮把「这一格是不是非空断言那个 `!`」的现场连写收进符号那一页**
（用户口径 1.1~1.4：投影要的东西在具体类里显式声明、读时/构造时备齐；
它跟第 1074 轮 `IsCommaSymbol` 是同一句话的另一个符号）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候算 |
| --- | --- | --- |
| `(k) => !(k.IsSymbolToken && k.TextValue === "!")`（**9 处过滤器**：`NotNull` 单元的核要从子单元里滤掉收尾那个 `!`） | `(k) => !k.IsNotNullSymbol` | `SymbolToken` 那一页**显式声明** `## property IsNotNullSymbol:bool`（`### get`：`return this.TextValue === "!";`，基类答 `false`） |
| `X.find((k) => k.IsSymbolToken && k.TextValue === "!")`（**2 处**：把那个 `!` 找出来） | `X.find((k) => k.IsNotNullSymbol)` | 同上 |

- **为什么它该住在符号那一页**：「我这一格的正文是不是 `!`」**只有这一页知道**
  （正文就在它自己的 `Temp` / `value` 上）——投影层重写一遍就是同一格事实的第二处答案
  （第 1074 轮 `IsCommaSymbol` 收的正是同一句话的 `,`，这一轮收的是 `!`）。
- **为什么是 `## property` + `### get` 而不是 `## field`**：第 1074 轮**量到过**那件事
  ——符号的正文是逐字符攒起来的，而**不是每个符号都会走到 `Close()`**（枚举成员之间那个逗号
  就没关过），按字段写会让没关过的那一格停在默认档。所以这里与 `IsCommaSymbol` 同一形态：
  基类给默认档 `false`、符号那一页读时现算。
- **取值口径与搬走之前逐字相同**：读的是**基类那一格 `TextValue`**（正是原来那个
  `k.TextValue === "!"` 的后一半），不是本页的 `Is("!")`——后者读 `Temp`，与 `TextValue`
  在**没关过**的符号上未必同答（`IsCommaSymbol` 那一格读的正是 `Temp`，两页口径因此不同，
  这一条如实记在两页上）。
- **它与 `IsPrefixOperatorUnit` 不是同一问**：那一格答「我是不是一个前缀运算符」（一串
  `!` `~` `+` `-` `++` `--`），这一格只认那一个 `!`（`x!` 的收尾、`a!()` 的断言位）。
- **泛型那一形态当时逐字保留、第 1120 轮收干净了**：`const isSymbol = (k, text) => k.IsSymbolToken &&
  k.TextValue === text` 问的是「正文是不是**参数给的那个**」，第 1090 轮没有第二处答案、
  所以当时不动（新判据只认字面量 `"!"`）。**第 1120 轮按「唯一一个实参恒为 `"."`」量过**：
  剩下的 12 处调用点实参全是那个点号，于是这一格连同局部转手一起删掉、逐处改读
  `k.IsDotSymbol`（见下面第 1120 轮那一节）。第 1093 轮记的「本页 2 处」是两段里各一处
  同形声明，第 1119 轮已随 `ctx.ConditionalNode` 里那一份删掉一处，这是最后一处。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认一个名字（`IsNotNullSymbol`），
  另立第十六条 `NOT_NULL_SYMBOL_CLASSIFY`——**匿名连写**那一形态（同行与跨行、
  被 `!(…)` 包起来的写法都算）在代码块里必须恰好 0 处。**自验**（`tmp/r1090/` 的探针，
  不进仓库）：把一处属性读写回成现场连写 ⇒ 报告 **0 → 1 处**、`FAIL`、`exit=1`；
  逐字节还原 ⇒ **1 → 0 处**、`exit=0`。
- **改了哪三个文件**：本页（11 处读数 + 说明）、`core/syntax/token.xl.md`（那一格虚属性，
  基类答 `false`）、`typescript/tokens/symbol-token.xl.md`（显式声明并读时现算）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十六条判据 + 一行读数）。
- **量法**：改完八道门读数**一处没动**（基线是第 1089 轮那一份）——`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` **3 条已知缺口还开着**、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
  11 处逐处等价：只有符号那一页答 `true`、且答的就是 `TextValue === "!"`。
- **实测**：`xl check typescript core` **156 个文件 0 条**；`xl build typescript core`
  **3 个产物** / 0 error（`token` / `symbol-token` / `print-ast-common`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 30.4s）。
- **本页的声明数**：**66 → 66 格**（改的全是读数与说明；新立的那一格在基类与符号那一页）。

**第 1091 轮把「这一格是不是一条成员访问链 / 一次非空断言」的两连比类名收进被问的那两页**
（用户口径 1.1~1.4：token 子类**构造完**信息就得齐；要读的那一格由**具体页显式声明**、
构造时赋好）：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "PropertyAccess"`（**14 处**：`projectExpression` 一族折链时要认「手上这一格是不是一条链」） | `X.IsPropertyAccess` | `PropertyAccess` 那一页**显式声明** `## field IsPropertyAccess:bool = true`（常量，构造时就位、克隆体照抄） |
| `X.Tag === "NotNull"`（**19 处**：折链、折调用、断言位那几族） | `X.IsNotNull` | `NotNull` 那一页**显式声明** `## field IsNotNull:bool = true`（同上） |

- **为什么这两问该住在被问的那一页**：两句问的都是「**你这一格是什么类**」，而那两个名字
  **就是那两页自己的类名**（`constructor.name` 就是产物的标签名）——投影先问一句「你是什么类」
  再自己拿名字去比，等于把那一页自己的事实抄在投影里（与第 1088 轮 `IsBinaryOperatorNode`、
  第 1085 轮 `IsCommentUnit` 同一把尺子）。
- **两格都是 `## field`（常量）、不是 `## property` + `### get`**：与 `IsDotSymbol` /
  `IsCommaSymbol` 那一族的分界同一条理由——**那两格不是「正文的函数」**（正文是逐字符攒的、
  未必关过），而是「这一格整个单元是不是某一类」，类名在构造那一刻就定下来、之后不会改
  （`IsChainBaseNode` / `IsBinaryOperatorNode` 也是这么写的）。
- **名字为什么不与既有两格共用**（抄一次会漂）：`IsChainBaseNode` 答的是「手上这一格的
  **形状**够不够当一整条链的基名」（八页答 `true`，**不认** `Bracket` / `NotNull` / `RegexToken`）；
  `IsNotNullSymbol` 答的是「**符号的正文**是不是那个 `!`」（第 1090 轮，读 `TextValue`）。
  这一轮的两格答的是「**你这一格是不是那一类单元**」——名单与收件人都不同，所以各立一格。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认两个名字（`IsPropertyAccess` / `IsNotNull`），
  另立第十七条 `SELF_TAG_CLASSIFY`——**匿名连写**那一形态（`.Tag === "PropertyAccess"` /
  `.Tag === "NotNull"`，`!==` 也算）在代码块里必须恰好 0 处。**自验**（本机探针，不进仓库）：
  两种连写各写回一处 ⇒ 报告 **0 → 1 处**、`FAIL`、`exit=1`；逐字节还原 ⇒ 0 处、`exit=0`。
- **改了哪四个文件**：本页（33 处读数 + 这一节）、`core/syntax/token.xl.md`（那两格虚属性，
  基类各答 `false`）、`typescript/tokens/property-access.xl.md` 与
  `typescript/tokens/not-null.xl.md`（各自显式声明并答 `true`）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十七条判据 + 一行读数）。
- **实测**：`xl check` 4 个文件 0 条；`xl build`（`core` / `typescript`）**4 个产物** / 0 error
  （`token` / `property-access` / `not-null` / `print-ast-common`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 30.6s），读数与基线逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**66 → 64 格**（**如实记下**：第 1090 轮那一栏写「66 格」比实测多 2 格
  ——照顶上那条命令逐行数，第 1090 轮当时就是 **64 格**，与第 1087 轮那一栏的收尾数一致；
  差的那两格是更早某一轮把某些行重复算了一次，这一轮起按实测值记。本轮一格声明没增没减：
  新立的两格都在别的页与基类）。

**第 1092 轮把同一句话剩下的两大片一次收干净**（用户口径 1.1~1.4：token 子类**构造完**
信息就得齐；要读的那一格由**具体页显式声明**、构造时赋好）——第 1088 / 1091 轮收的是
「两连比类名」与「最简单的两个面」，这一轮收的是**折链 / 折调用 / 投类型那几族里出现最多的
两个名字**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "Method"`（**25 处**：折调用、折链、裸调用、断言位那几族） | `X.IsMethodNode` | `Method` 那一页**显式声明** `## field IsMethodNode:bool = true`（常量，构造时就位） |
| `X.Tag === "GenericType"` / `X.Tag !== "GenericType"`（**23 处**：滤掉泛型段、按泛型段找类型实参、`<T>` 那一支） | `X.IsGenericType` / `X.IsGenericType === false` | `GenericType` 那一页**显式声明** `## field IsGenericType:bool = true`（同上） |

- **两句问的都是「你这一格是什么类」**，而那两个名字**就是那两页自己的类名**
  （`constructor.name` 就是产物的标签名）——判据与第 1088 / 1090 / 1091 轮同一条。
  这一轮是**名字最长的那两片**：本页代码块里 `Method` 与 `GenericType` 的现场比类名
  因此从 55 处收成 **0 处**。
- **两格都是 `## field`（常量）、不是 `## property` + `### get`**：与第 1091 轮那两格同一条
  理由——答的不是「正文是什么」（正文是逐字符攒的、未必关过），而是「这一格整个单元是不是
  某一类」，类名在构造那一刻就定下来（`IsChainBaseNode` / `IsBinaryOperatorNode` 也是这么写的）。
- **名字为什么不与那两页既有那几格共用**（抄一次会漂）：`Method` 那一页的 `IsBareCall` 答
  「我这一格的**子单元形状**够不够当一次裸调用」（读自己的 `ProjectableKids`）；
  `GenericType` 那一页的 `WrapperField` 答「投出来时我这一层**是不是包装**、内容提到哪个字段」
  （装 `TypeParameter` 时才是）。这一轮两格答的是「**你这一格是不是那一类单元**」——
  名单与收件人都不同，所以各立一格（`IsMethodNode` 带 `Node` 后缀，与 `IsChainBaseNode` /
  `IsBinaryOperatorNode` 同一拼法）。
- **判据跟着长**：`direct:lint` 第八条那一族多认两个名字（`IsMethodNode` / `IsGenericType`），
  第十七条 `SELF_TAG_CLASSIFY` 的名单从两个 `<Tag>` 扩到**四个**（`PropertyAccess` /
  `NotNull` / `Method` / `GenericType`，`!==` 也算）——四种现场算式在代码块里都必须恰好 0 处。
  **自验**（本机探针，不进仓库）：把一处 `IsMethodNode` 与一处 `IsGenericType` 分别写回现场算式
  ⇒ 报告 **0 → 1 处**、`FAIL`、`exit=1`；逐字节还原 ⇒ 0 处、`exit=0`。
- **改了哪五个文件**：本页（48 处读数 + 这一节；另 7 处是散文里的名字）、
  `core/syntax/token.xl.md`（那两格虚属性，基类各答 `false`）、
  `typescript/tokens/method.xl.md` 与 `typescript/tokens/generic-type.xl.md`（各自显式声明
  并答 `true`）、`tests/parse/direct-lint.mjs`（第八条名单 + 第十七条那四个 `<Tag>` + 一行读数）。
- **实测**：`xl check` 5 个文件 0 条；`xl build`（`core` / `typescript`）**4 个产物** / 0 error
  （`token` / `method` / `generic-type` / `print-ast-common`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 29.8s），读数与基线逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的两格都在别的页与基类；
  本页 48 处改的是读数算式）。

**第 1093 轮把这一族里出现最多的两个名字也收了**（用户口径 1.1~1.4：token 子类**构造完**
信息就得齐；要读的那一格由**具体页显式声明**、构造时赋好）——收的是本页代码块里
**剩下最多的两片现场比类名**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "SymbolToken"` / `X.Tag !== "SymbolToken"`（**39 处**：折链、折调用、切类型实参、找标点那一族） | `X.IsSymbolToken` / `X.IsSymbolToken === false` | `SymbolToken` 那一页**显式声明** `## field IsSymbolToken:bool = true`（常量，构造时就位） |
| `X.Tag === "NullConditionalOperator"`（**15 处**：折可选链那一族） | `X.IsNullConditionalOperator` | `NullConditionalOperator` 那一页**显式声明** `## field IsNullConditionalOperator:bool = true`（同上） |

- **两句问的都是「你这一格是什么类」**，而那两个名字就是那两页自己的类名——判据与
  第 1088 / 1090 / 1091 / 1092 轮同一条。收完这两片之后，本页代码块里 `SymbolToken` 与
  `NullConditionalOperator` 的现场比类名从 **56 处收成 0 处**。
- **当时有两处逐字保留、第 1120 轮都收了**（`const isSymbol = (k, text) => k.IsSymbolToken &&
  k.TextValue === text`）：第 1090 轮留着它的理由写在这里——它问的是「正文是不是**参数给的那个词**」，
  不是某一个具体符号，第 1093 轮那一门又只认字面量。第 1120 轮把**实参**量了一遍
  （剩下 12 处全是 `"."`），于是这一族改读 `k.IsDotSymbol`、局部转手整格删掉；
  第 1119 轮删掉的是 `ctx.ConditionalNode` 里那一份（`"?"` / `":"` 两态）。
- **两格都是 `## field`（常量）**：与第 1091 / 1092 轮那几格同一条理由——答的不是
  「正文是什么」（正文是逐字符攒的、未必关过；`SymbolToken` 那一页的 `IsDotSymbol` /
  `IsTypeSeparator` / `IsPrefixOperatorUnit` 正是为此住在 `Close()` 里），而是「这一格整个
  单元是不是某一类」，类名在构造那一刻就定下来。
- **名字为什么不与那两页既有那几格共用**：`SymbolToken` 那一页的三格（`IsDotSymbol` /
  `IsTypeSeparator` / `IsPrefixOperatorUnit`）与 `IsNotNullSymbol`（第 1090 轮）答的都是
  「**这一格的正文**是不是某一串字符」——本轮的 `IsSymbolToken` 答的是「**我这一格是什么类**」，
  两问的收件人一个是「正文」、一个是「类名」，所以各立一格（第 1093 轮起该页四问并列）。
  `NullConditionalOperator` 那一页的 `IsChainBaseNode` 答「形状够不够当一条链的基名」
  （八页答 `true`），同样不是同一问。
- **判据跟着长**：`direct:lint` 第八条那一族多认两个名字（`IsSymbolToken` /
  `IsNullConditionalOperator`），第十七条 `SELF_TAG_CLASSIFY` 的名单从四个 `<Tag>` 扩到
  **六个**（再加 `SymbolToken` / `NullConditionalOperator`，`!==` 也算）——六种现场算式
  在代码块里都必须恰好 0 处。**自验**（本机探针，不进仓库）：把一处 `IsSymbolToken` 与
  一处 `IsNullConditionalOperator` 分别写回现场算式 ⇒ 报告 **0 → 1 处**、`FAIL`、`exit=1`；
  逐字节还原 ⇒ 0 处、`exit=0`。
- **改了哪五个文件**：本页（**54 处**现场算式改成属性读——按行数是 **55 行**，
  `X.Tag === "SymbolToken"` 那一串里没有跨行的那几处；再加这一节）、`core/syntax/token.xl.md`（那两格虚属性，
  基类各答 `false`）、`typescript/tokens/symbol-token.xl.md` 与
  `typescript/tokens/null-conditional-operator.xl.md`（各自显式声明并答 `true`）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十七条那六个 `<Tag>` + 一行读数）。
- **实测**：`xl check` 5 个文件 0 条；`xl build`（`core` / `typescript`）**4 个产物** / 0 error
  （`token` / `symbol-token` / `null-conditional-operator` / `print-ast-common`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 31.4s），读数与基线逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的两格都在别的页与基类；
  本页 54 处改的是读数算式）。

**第 1094 轮收的是字符串那一族**（用户口径 1.1~1.4：token 子类**构造完**信息就得齐；
要读的那一格由**具体页显式声明**、**构造时**赋好）——本页代码块里 `String` / `ConstString`
的现场比类名一共 **16 处**，一次收干净：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "String"`（**2 处**：`namedExportClause` 在子单元里找那个字符串单元） | `X.IsStringUnit` | `String` 那一页**显式声明** `## field IsStringUnit:bool = true`（常量，构造时就位） |
| `X.Tag === "String" \|\| X.Tag === "ConstString"`（**5 处**：在一串子单元里找字符串单元） | `X.IsStringLiteralUnit` | `String` / `ConstString` **两页各自显式声明** `## field IsStringLiteralUnit:bool = true`（同上——两者在产物里同属一段 `StringLiteral` 的正文） |
| `X.Tag === "String" && X.stringChar === "`"`（**8 处**同行 7 + 跨行 1，其中 1 处是否定式） | `X.IsTemplateString` | `String` 那一页**显式声明** `## field IsTemplateString:bool = false`，在**构造器里与 `StringChar` 同一趟**赋好（`this.IsTemplateString = stringChar === "`"`）；其余页由基类答 `false` |

- **三问的两半都住在被问的那一页**：`Tag` 就是那一页的类名、`stringChar` 就是它构造时记下的
  引号（`## property stringChar` 读 `this.StringChar`，第 1049 轮起投影读的就是它）——
  投影层重写一遍就是**同一格事实的第二处答案**。判据与第 1088 / 1091 / 1092 / 1093 轮同一条。
- **`IsTemplateString` 是 `## field`、在构造器里赋**（与第 1090 / 1094 那几格的 `## property` 分界）：
  `String` 的引号是**构造器参数**（`constructor(template, stringChar)`，`Clone` 也走同一个构造器），
  不像符号的正文那样「逐字符攒、未必关过」——所以它在构造那一刻就定下来，读时不必现算。
  顺带把 `X.Tag === "String" && X.stringChar === "`"` 里**多余的那一半守卫**收掉：
  `stringChar` 只在这一页有，基类那一格默认 `false` 已经把别的类答完了。
- **`IsStringLiteralUnit` 与 `IsStringUnit` 不是同一问**：前者答「我是不是**一段字符串字面量**」
  （两页答 `true`），后者只认 `String` 那一页（`namedExportClause` 那两处找的正是**模块路径那个
  `String`**，不能把常量块也算进去）——两格各立、各自显式声明。
- **判据跟着长两条**：`direct:lint` 第八条那一族多认三个名字（`IsStringUnit` /
  `IsStringLiteralUnit` / `IsTemplateString`），第十七条 `SELF_TAG_CLASSIFY` 的名单从六个
  `<Tag>` 扩到 **八个**（再加 `String` / `ConstString`，`!==` 也算）。**自验**（本机探针，
  不进仓库）：把一处属性读写回成 `k.Tag === "String" || k.Tag === "ConstString"` ⇒ 报告
  **0 → 2 处**（两连比类名按两处计）、`FAIL`、`exit=1`；逐字节还原 ⇒ 0 处、`exit=0`。
- **顺手改平了别的页两处同类遗留**（`typescript/tokens/heritage-clause.xl.md`）：
  那里 `k.Tag === "GenericType"`（第 1092 轮已立 `IsGenericType`）与
  `k.Tag === "String" && k.stringChar === "`"` 各一处，一并改成属性读——判据同一条，
  只是那一门只扫本页，所以它们留到了这一轮。
- **改了哪六个文件**：本页（**16 处**现场算式改成属性读 + 这一节）、`core/syntax/token.xl.md`
  （三格虚属性：两个 `## field` 默认 `false` + `IsTemplateString` 的默认档）、
  `typescript/tokens/string/string.xl.md`（三格显式声明 + 构造器多赋一趟）、
  `typescript/tokens/string/const-string.xl.md`（`IsStringLiteralUnit`）、
  `typescript/tokens/heritage-clause.xl.md`（两处遗留）、
  `tests/parse/direct-lint.mjs`（第八条名单 + 第十七条那八个 `<Tag>` + 一行读数）。
- **实测**：`xl check` 156 个文件 0 条；`xl build`（`core` / `typescript`）**5 个产物** / 0 error
  （`token` / `print-ast-common` / `string` / `const-string` / `heritage-clause`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 30.2s），读数与基线逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的三格都在别的页与基类；
  本页 16 处改的是读数算式）。

**第 1095 轮接着收括号 / 数组字面量 / 类型参数三族**（用户口径 1.1~1.4：token 子类**构造完**
信息就得齐；要读的那一格由**具体页显式声明**、构造时赋好）——本页代码块里这三个名字的
现场比类名一共 **22 处**：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "Bracket"`（**5 处**：找 `find` 出来那一格、判「这一格是不是括号」那几族） | `X.IsBracketUnit` | `Bracket` 那一页**显式声明** `## field IsBracketUnit:bool = true`（常量，构造时就位） |
| `X.Tag === "Bracket" && X.startBracket === "("`（**1 处**） | `X.IsParenBracket` | 同页第 1089 轮那一格（`Use` 记下 `startBracket` 那一趟赋好）——本轮只是把**同一格事实的匿名连写**也改成属性读 |
| `X.Tag === "Bracket" && (X.startBracket === "[" \|\| X.startBracket === "{")`（**3 处**） | `(X.IsIndexBracket \|\| X.IsBraceBracket)` | 同页第 1058 / 1089 轮那两格（同一趟赋好）——第 1089 轮逐字保留的那三处，这一轮收成一格 |
| `X.Tag === "ArrayLiteral"`（**8 处**：值位那几种括号凑成的形状、绑定模式那一族） | `X.IsArrayLiteralUnit` | `ArrayLiteral` 那一页**显式声明** `## field IsArrayLiteralUnit:bool = true`（常量） |
| `X.Tag === "TypeParameter"`（**5 处**：`X.ProjectableKids.filter((k) => …)` 取泛型段里那几格参数） | `X.IsTypeParameterUnit` | `TypeParameter` 那一页**显式声明** `## field IsTypeParameterUnit:bool = true`（常量） |

- **三问都是「你这一格是什么类」**，那三个名字就是那三页自己的类名——判据与第 1088 / 1091 /
  1092 / 1093 / 1094 轮同一条。三格都是 `## field`（常量、构造时赋好），与 `IsMethodNode` /
  `IsGenericType` 同一形态。
- **三态括号那一族因此只剩「我是哪一态」这一半**：`Tag === "Bracket"` 那一半由 `IsBracketUnit`
  顶掉，后半由同页三格自己答——**同一格事实的现场连写一处不剩**（第 1089 轮留着的那三处两态
  写法也在这一轮改成两格属性读：`IsIndexBracket` 与 `IsBraceBracket` 本来就是同一趟赋好的）。
- **判据跟着长**：`direct:lint` 第八条那一族多认三个名字，第十七条 `SELF_TAG_CLASSIFY` 的名单从
  八个 `<Tag>` 扩到 **十一个**（再加 `Bracket` / `ArrayLiteral` / `TypeParameter`）。
  **自验**（本机探针，不进仓库）：三族的属性读**各**写回一处 ⇒ 三次都是报告 **0 → 1 处**、
  `FAIL`、`exit=1`；逐字节还原 ⇒ 0 处、`exit=0`（三次自查一并通过、源文件逐字节相同）。
  另外把 `BRACKET_STATE_CLASSIFY` 那条判据的说明改平（它原来写着「两态写法本轮逐字保留」）。
- **改了哪六个文件**：本页（**22 处**现场算式改成属性读 + 这一节）、`core/syntax/token.xl.md`
  （三格虚属性，基类各答 `false`）、`typescript/tokens/bracket.xl.md`、
  `typescript/tokens/json/array-literal.xl.md`、`typescript/tokens/type-parameter.xl.md`
  （各自显式声明并答 `true`）、`tests/parse/direct-lint.mjs`（第八条名单 + 第十七条那十一个
  `<Tag>` + 一行读数 + 第十五条那一句说明）。
- **实测**：`xl check` 156 个文件 0 条；`xl build`（`core` / `typescript`）**5 个产物** / 0 error
  （`token` / `bracket` / `array-literal` / `type-parameter` / `print-ast-common`）、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 29.6s），读数与基线逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的三格都在别的页与基类；
  本页 22 处改的是读数算式）。

**第 1096 轮收的是「名字 / 声明头」那一族**（用户口径 1.1~1.4：token 子类**构造完**信息就得齐；
要读的那一格由**具体页显式声明**、构造时赋好）——本页代码块里这一族一共 **31 处**现场比类名：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "Keyword"`（**6 处**：声明头、`new` / `abstract` / `export`、`in` / `instanceof` 那几族） | `X.IsKeywordUnit` | `Keyword` 那一页**显式声明** `## field IsKeywordUnit:bool = true`（常量） |
| `X.Tag === "Identifier"`（**5 处**：找那一格名字、比对名字文本）＋ `X.Tag !== "Identifier"`（1 处） | `X.IsIdentifierUnit` / `!X.IsIdentifierUnit` | `Identifier` 那一页**显式声明** `## field IsIdentifierUnit:bool = true`（常量） |
| `head.Tag !== "Identifier" && head.Tag !== "Keyword"`（**1 处**） | `!head.IsNameNode` | **第 1057 / 1076 轮那一族的否定式**——问的是「这一格**不是**一个名字」，所以读 `IsNameNode` 的否定，不是新格 |
| `X.Tag === "Let"`（**2 处**） | `X.IsLetUnit` | `Let` 那一页**显式声明** `## field IsLetUnit:bool = true` |
| `X.Tag === "ObjectLiteral"`（**2 处**） | `X.IsObjectLiteralUnit` | `ObjectLiteral` 那一页**显式声明** `## field IsObjectLiteralUnit:bool = true` |
| `X.Tag === "Decorator"`（**2 处**） | `X.IsDecoratorUnit` | `Decorator` 那一页**显式声明** `## field IsDecoratorUnit:bool = true` |
| `X.Tag === "As"` / `X.Tag !== "As"`（**3 处**）、`X.Tag === "Satisfies"` / `X.Tag !== "Satisfies"`（**3 处**） | `X.IsAsUnit` / `X.IsSatisfiesUnit`（否定式写 `!…`） | `As` / `Satisfies` **两页各自显式声明**同名属性（各答自己的类名，构造时赋 `true`） |
| `kids[0].Tag === "Spread"`（**1 处**） | `kids[0].IsSpreadUnit` | `Spread` 那一页**显式声明** `## field IsSpreadUnit:bool = true` |

- **八问都是「你这一格是什么类」**，那八个名字就是那八页自己的类名——判据与第 1088 / 1091 /
  1092 / 1093 / 1094 / 1095 轮同一条；八格都是 `## field`（常量、构造时赋好）。
- **否定式一律写成 `!x.IsXxxUnit`，不是 `x.IsXxxUnit === false`**：这一族里手上有几格**不是
  token**（合成语句视图），`!undefined` 与 `Tag !== "…"` 逐格同答，而 `=== false` 不是。
  第 1092 / 1093 轮那几处用的是 `=== false`（收件人保证是 token），这一轮按同一句话的更强写法收。
- **`IsKeywordUnit` / `IsIdentifierUnit` 与 `IsNameNode` 不是同一问**（三页的说明里都写清了）：
  `IsNameNode` 答「能不能当一个名字」（`Keyword` 与 `Identifier` 都答 `true`），这两个各认自己
  那一页——所以「两连比类名」的**肯定式**读 `x.IsNameNode`、**否定式**读 `!x.IsNameNode`。
- **顺手改平了别的页两处同类遗留**：`typescript/tokens/decorator.xl.md` 的
  `k.Tag === "SymbolToken"`（第 1093 轮已立 `IsSymbolToken`）改成属性读。
- **判据跟着长三条**：`direct:lint` 第八条那一族多认八个名字；第十七条 `SELF_TAG_CLASSIFY` 的名单
  从十一个 `<Tag>` 扩到 **十九个**；`NAME_CLASS_DISJUNCTION` 补上**否定形态**
  （`Tag !== "Identifier" && Tag !== "Keyword"`，两种次序）——它原来只守 `=== || ===`。
  **自验**（本机探针，不进仓库）：`IsKeywordUnit` / `IsIdentifierUnit` 各写回一处、
  以及把 `!head.IsNameNode` 写回成两连比类名 ⇒ 三次都是报告 **0 → 1 处**、`FAIL`、`exit=1`；
  逐字节还原 ⇒ 0 处、`exit=0`（三次自查一并通过、源文件逐字节相同）。
- **改了哪十一个文件**：本页（**31 处**现场算式改成属性读 + 这一节）、`core/syntax/token.xl.md`
  （八格虚属性，基类各答 `false`）、`keyword` / `identifier` / `let` / `json/object-literal` /
  `decorator` / `as` / `satisfies` / `spread` 八页（各自显式声明并答 `true`；`decorator` 另改一处
  `SymbolToken` 遗留）、`tests/parse/direct-lint.mjs`（第八条名单 + 第十七条那十九个 `<Tag>` +
  一行读数 + `NAME_CLASS_DISJUNCTION` 的两种否定形态）。
- **实测**：`xl check` 156 个文件 0 条；`xl build`（`core` / `typescript`）**10 个产物** / 0 error、
  `tsc` 干净；**八道门 8 通过、0 失败**（墙钟 31.5s），读数与基线逐项相同：`coverage`
  **4261 / 4422**（`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口
  还开着、`cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的八格都在别的页与基类；
  本页 31 处改的是读数算式）。

**第 1097 轮收的是「只可能做值」那一族**（同一句话、同一形态）——本页代码块里一共 **11 处**
现场比类名：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `X.Tag === "Function"` / `X.Tag === "Class"` / `X.Tag === "Lamda"`（**11 处**：补 `FunctionExpression` / `ClassExpression` 那两格、泛型箭头那两族、折链那一族「链头只可能做值」那一档） | `X.IsValueOnlyUnit`（否定式写 `!X.IsValueOnlyUnit`） | `Function` / `Class` / `Lamda` **三页各自显式声明** `## field IsValueOnlyUnit:bool = true`（常量，构造时就位） |

- **三页答同一问**：函数 / 类 / 箭头函数**根本不可能是一条语句的头**——所以三页共用一格
  （与 `IsStringLiteralUnit` 两页共用同一格局），而「**是函数还是类**」那两处改问
  `v.AstKind`（`FunctionDeclaration` / `ClassDeclaration`，同一页自己的另一格事实）。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的那一格在三页与基类；
  本页 11 处改的是读数算式）。

**第 1098 轮收的是「类型位那一族」**（同一句话、同一形态）——本页代码块里一共 **16 处**
现场比类名：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `k.Tag === "TypeDefine"` / `"ArrayType"` / `"IndexedAccessType"` / `"TypeOperator"` / `"TypeQuery"` / `"TypePredicate"` / `"UnionType"` / `"IntersectionType"` / `"FunctionType"` / `"ImportType"` / `"LiteralType"` / `"Parameter"`（**16 处**：`projectTypeExpression` 那一族成片都是） | 族那一问读 `x.IsTypeUnit`；**要在族里认出「就是这一个」**的那几处读 `x.IsTypeDefine` / `IsArrayType` / `IsIndexedAccessType` / `IsFunctionType` / `IsParameterUnit` / `IsTypeOperator` / `IsTypeQuery` / `IsTypePredicate` / `IsUnionType` / `IsIntersectionType`；`typeof a.b[]` 那一处的尾缀读 `k.IsTypeSuffixUnit`；`typeof X<Y>` 那一处读 `x.IsTypeWithTypeArguments` | **十二页各自显式声明** `## field IsTypeUnit:bool = true`（`TypeDefine` / `ArrayType` / `IndexedAccessType` / `TypeOperator` / `TypeQuery` / `TypePredicate` / `UnionType` / `IntersectionType` / `FunctionType` / `ImportType` / `LiteralType` / `Parameter`，常量）；其中十页**另外各立一格自己的名字**（同一趟赋 `true`），`ArrayType` / `IndexedAccessType` 两页另各答 `IsTypeSuffixUnit`，`TypeQuery` / `ImportType` 两页另各答 `IsTypeWithTypeArguments` |

- **为什么有一格族、又有九格单页**：族那一问（「我是不是类型位的一员」）只够用在
  **形状唯一**的那几处（`let a: T` 那一格、带类型实参的 `typeof` / `import()`、
  `A.B[C]` 那一串的头一格……）；剩下那几处是**在一整串类型单元里挑出某一个**
  （`A<T>[]` 的数组壳、`A.B[C]` 的第三格、「类型参数 + 函数类型」的第二格、平铺形参里的
  `: T`、`readonly X[]` 的头一格、联合里那一格谓词、以及联合 / 交叉的分辨）——
  读族那一问会**把邻近的另一族成员一起收进来**，所以那几处必须读**单页那一格**。
- **`IsTypeSuffixUnit` 是第三种形状**：它答的不是「我是什么类」，而是「我是不是**挂在基名
  后面的那种尾缀**」——两页（`ArrayType` / `IndexedAccessType`）答 `true`，
  与 `IsStringLiteralUnit` 同格局（两页答同一问）。`IsTypeWithTypeArguments` 也是这一形状
  （`TypeQuery` / `ImportType` 两页答同一问：「我能不能挂一段平级的类型实参」）。
- **`typeof a.b` 那一处为什么不能读族那一问**（第 1098 轮的实测）：那一支的判据是
  「`list[0]` 是类型单元、`list[1]` 是点号」——`A.B[] & C` 里那个 `list[0]` 是**别的**
  类型单元（`ArrayType` / `IntersectionType`），读族那一问会把点号后面那串名字整段收进
  `exprName`，于是数组 / 限定名 / 标识符**一起丢**（对拍实测 4 片红：缺 `ArrayType` /
  `QualifiedName` / `Identifier`，漂移 2）。所以那一处读 `IsTypeQuery`（单页那一格）。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的十一格都在别的页与基类；
  本页 16 处改的是读数算式）。

**第 1099 轮把剩下那九处收尾**（同一句话、同一形态）——本页代码块里最后 **9 处**现场比类名：

| 原来的现场算式 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `v.Tag === "MethodDeclaration"`（**3 处**：签名那一支、`get` / `set` 那一支、构造那一支） | `v.IsMethodDeclaration` | `MethodDeclaration` 那一页**显式声明** `## field IsMethodDeclaration:bool = true`（常量） |
| `kids[0].Tag === "UnaryOperator"` / `ck[0].Tag === "UnaryOperator"`（**2 处**：折链时「一元前缀 + 操作数在外」那两格） | `kids[0].IsUnaryOperator` | `UnaryOperator` 那一页**显式声明** `## field IsUnaryOperator:bool = true` |
| `item.Tag === "Statement"`（**1 处**，且与 `item instanceof Token` 连写：成员表里把包着语句的壳摊平） | `item.IsStatementShell` | `Statement` 那一页**显式声明** `## field IsStatementShell:bool = true` |
| `items[i].Tag === "Label"` / `items[j].Tag === "Label"` / `kids[at].Tag === "Label"`（**3 处**：语句串里连着的那几格标签） | `items[i].IsLabelUnit` / `items[j].IsLabelUnit` / `kids[at].IsLabelUnit` | `Label` 那一页**显式声明** `## field IsLabelUnit:bool = true` |
| `items[i].Tag === "Export"` / `k.Tag === "Export"`（**2 处**：声明头那一串里认 `export`、导出那一支按词尾比对） | `items[i].IsExportUnit` / `k.IsExportUnit` | `Export` 那一页**显式声明** `## field IsExportUnit:bool = true` |
| `kid.Tag === "BindingElement"`（**1 处**：解构模式里认出绑定元素） | `kid.IsBindingElement` | `BindingElement` 那一页**显式声明** `## field IsBindingElement:bool = true` |
| `k.Tag === "SwitchCase"` / `k.Tag === "SwitchStatement"`（**2 处**：一个 `switch` 段的两个子单元） | `k.IsSwitchCaseUnit` / `k.IsSwitchStatementUnit` | `SwitchCase` / `SwitchStatement` 两页**各自显式声明**同名属性（各答自己的类名） |

- **`Statement` 那一格为什么叫 `IsStatementShell` 而不是 `IsStatementUnit`** ✗：那一页上
  已经有一个 `static method IsStatementUnit`（解析期判「这一格算不算一条语句级单元」，四个
  调用点共用一份名单），同名会在同一页里撞两次（`xl check` 报 `E1205`）——**字段与静态方法
  是两件事、两问也不同**，所以字段叫 `StatementShell`。
- **`MethodDeclaration` 那一问为什么不读同页的 `AstKind`** ✗：那一格在**关闭那一刻**会被
  改写成 `Constructor` / `GetAccessor` / `SetAccessor`（按 `get` / `set` 与父单元是不是类体），
  所以「我是不是方法声明」读不出来——两问各自一格。
- **第 1099 轮把这一族的点名范围收在这里**：`direct:lint` 第十七条那名单因此扩到 **45 个
  `<Tag>`**（三十七 + 八）。**它守的是这 45 个名字**，不是「本页代码块里一个 `<Tag>` 都没有」
  ——**第 1099 轮如实记下的那两族，第 1115 / 1116 两轮已经收干净**（那两轮的现场与量法
  写在下面那两节里，这里不再抄第二遍）：
  - 「这一格是不是一条注释」：`pos` 那一支最后那一处（与 `startOf(k) === pos` 连写、跨行）
    改读 `k.IsCommentUnit`——`IsCommentUnit` 第 1084 轮就立好了，只是**同一句话还剩这一处**；
    今天这一个属性**一个现场写法都不剩**；
  - 「这一格是不是 `BinaryOperator` 那一页的单元」：那一族 **9 处**（原来是 5 处单比 +
    4 处两连比；第 1099 轮数成「11 处」是把两连比里两条一行当成两处数的）改读
    `BinaryOperator` 那一页新立的 `IsBinaryOperatorUnit`；**只认二元那一页**这一点没变
    （改成 `IsBinaryOperatorNode` 会把 `LogicalOperator` 一起收进来，是改语义不是搬家）；
  - 同一轮把**两连比里的否定形态**（`X.Tag !== "BinaryOperator" && X.Tag !== "LogicalOperator"`，
    含**先取进局部变量 `kind` 再比**那两处）也收成 `x.IsBinaryOperatorNode !== true`——
    第 1088 轮那条 `BINARY_CLASS_DISJUNCTION` 只认 `===` + `||`，**看不见它们**，本轮补上。
  - **第 1117 轮把这一段里那几行「第 1099 轮的现场照录」整段删掉**：两族都收完了，
    今天的规格是**0 处**，历史在 git 提交信息里（本页的规矩：过期的过程账不留）。
- **本页的声明数**：**64 格**（一格声明没增没减：新立的八格都在别的页与基类；
  本页 9 处改的是读数算式）。

**第 1071 轮把「取这一格的正文」那两跳收成一跳**：`textOfNode`（本页一格 helper）+ `ctx.TextOf`
（它的出口）**整对删掉**，全仓改成读 **`Token.TextValue`**（第 1069 轮立的基类属性）。

| 原来 | 今天 | 量出来的规模 |
| --- | --- | --- |
| `textOfNode(x)`（本页 helper：叶子读自己的 `value`、其余读 `Token.Text`） | `x.TextValue` | 本页代码块 **99 处调用点**（原报 100 处，另一处是散文里的名字） |
| `ctx.TextOf(x)`（递给 `Label.PrintAst` 那一层的出口） | `x.TextValue` | 全仓 **0 处活代码** |

- **为什么它该删**：这一格的答案是**两层事实**——「叶子自己记的 `value`」与「其余读 `Token.Text`」
  ——而第 1069 轮把前一层收成了 `Token.TextValue`（基类 `## property` + `### get`，
  取值口径与 `textOfNode` 逐字符相同：`typeof this.value === "string"` 才给、否则给空串）。
  于是 helper 只剩「一行转手」，与第 1068 / 1069 轮删掉的那些同一条口径。
- **`ctx.TextOf` 是**零真实读者**（量法见下）**：全仓 `ctx.TextOf(` 的 32 处**全在注释里**——
  它们记的是第 993 / 1015 轮把这一格改成 `ctx.ValueOf`、第 1069 轮又收成 `TextValue` 的账
  （`// **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` …` 那一行在 15 页里各抄了一遍）。
  所以删出口**不动任何一页**，只是把「没人调用的入口」从表上拿掉。
- **量法**（这一轮要分辨「代码块里的调用」与「散文/注释里的名字」，所以先把围栏算出来）：
  逐行判行首三反引号进出围栏，只在**围栏内**数 `ctx.TextOf` / `ctx.Text` / `ctx.StringText` ⇒
  **围栏内 21 处、围栏外 21 处，而围栏内那 21 处全是 `//` 注释行**（真正的调用 0 处）。
  本页的 `textOfNode(` 也照同一口径数：**代码块内 99 处、散文 1 处**（第 1063 轮那一段台账）。
- **改写是逐处机械替换**：99 处的实参都是**单个标识符或下标表达式**（`k` 48 / `kids[0]` 8 /
  `head` 7 / `unit` 4 / …），没有一处带副作用、也没有一处把结果当**左值**用，
  所以 `f(x)` → `x.TextValue` 逐处等价（`f` 是纯函数、实参是投影手上那一格 token）。
- **`TextValue` 里那个「记不到时给空串」这一档照旧**：`node.Text` 那一层是基类属性、
  取值走 `SourceRange` 两头（第 1048 轮），所以两层的合取仍然是原来那两句。
- **实测**：`xl check typescript core` 0 条；`xl build --force` **156 个产物** / 0 error、`tsc` 干净；
  **八道门 8 通过、0 失败**，读数与基线逐项相同：`coverage` **4260 / 4422**
  （`blocked 28` / `differ 134` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **一处**读数漂移**如实记下**（不是本轮改动带来的，也不改变任何判据）：这一轮跑 `coverage` 时
  报告落地成 **4261 / 4422**（`differ` **134 → 133**、加权 95.68 → 95.71，`runtime` 那一栏
  736 → 737），少的那一条是 `runtime/round741/003-optional-call-after-member-chain-differ`。
  它**是这条用例自己在批量裁判里的抖动**，同一份产物上重跑会来回：直接跑
  （`node build/ts/tsrun.js <用例>` 与 `node <用例.ts>`）连跑三次两边都答 `3 3 3` / `undefined 3`、
  与用例登记的那份 `1,2` 差着——也就是说**它有时被算成 pass、有时被算成 differ**。
  本轮**没有**把它当成绩记：报告是新跑出来的那一份，判据（八道门）与「读数一处没动」的结论
  都不依赖这一格；下一位若要拿 4261 当基线，先按这一条复核。
- **本页的声明数**：**80 → 79 格**（删掉 `textOfNode` 一格；`ctx.TextOf` 只是出口，
  宿主那一格本来就只剩这一行转手）。

**第 1072 轮把第 1067 轮「完整子单元表」那一批的最后一处调用点收完，顺手把那一节的账改成实测值**：

| 改掉的调用点 | 原来 | 今天 |
| --- | --- | --- |
| `projectDeclaration` 的**未映射透传支**（`AstKind` 也没有的那一档） | `projectEach(allKids(v), ctx)` | `projectEach(v.ProjectableKids, ctx)` |

- **判据与第 1067 轮那句话逐字相同**：`projectEach` 头一件事就是
  `list.filter((item) => item instanceof Token && !item.IsInvisible && !(…逗号…))`，
  所以「先拿含 trivia 的完整子单元表、再滤一遍」与「直接拿已经滤过的那一串」逐字节同答。
  第 1067 轮已经按同一句改过 `projectRoot` 的未映射透传支——这一处是当时漏下的**同一个形状**
  （`projectDeclaration` 里那一支也是「没映射的标签原样透传」）。
- **改完 `allKids` 的读者只剩「要找 trivia / 看不见的单元」那几处**（代码块内 **7 → 6 处**）：
  `trailingTriviaStart`（2）、`trailingSemicolonOf`（末尾那个 `;` 有没有落在注释里）、
  `astNode` 开头那段「跳过前导注释」——这三处**要的正是**含 trivia 的完整表，
  所以它们照旧读 `allKids`（第 1066 / 1067 轮已经把「不是要找 trivia」的那批全改完了）。
- **同一轮把 `allKids` 那一节的说明改成实测值**：它原来写着「第 1067 轮起它只服务
  `trailingTriviaStart` 那一格……这一格留着是因为 `addDecorators` 问的正是有没有装饰器」——
  **两半都过时了**：`addDecorators` 第 1067 轮起读的是
  `v.ProjectableKids.filter((k) => k.Tag === "Decorator")`，而读者是上面那三处（含
  `astNode`）。**这一节是按代码块重数出来的**（散文里的调用字样不算），
  量法与第 1071 轮同一条：逐行判行首三反引号进出围栏，只在围栏内数。
- **还发现一处「说明与代码不一致」，第 1072 轮只记不改，第 1073 轮量完改掉了**（它不影响任何读数）：
  第 1067 轮那张表第 454 行写着 `moduleSpecifierIn` / `moduleHolderOf` 已经
  `for (const inner of allKids(one))` → `one.ProjectableKids`，而那时这两格**仍写着
  `allKids(one)`**。这两支找的是 `Method` 内部的 `String` 子单元；`Method` 那一页
  **没有声明 `Segments`**，所以 `ProjectableKids` 在它身上是不是同一个集合**没量过**——
  按这一族的规矩（「先证明等价，再谈改写」）第 1072 轮没有猜着改。
  **第 1073 轮把这一问量掉了**：在构建产物上把这两处换成 `one.ProjectableKids`，
  跑 `cases:tsast`（16 片全绿、3 条已知缺口不变）、`samples`（逐字节一致）、
  `cases:direct`（1640 份 0 抛异常）——**读数一处没动** ⇒ 两个集合在这一格上同答，
  源码照改，探针还原。**这一处对账因此从「没量过」变成「量过等价」。**
- **实测**：`xl check typescript core` 0 条；`xl build --force` **156 个产物** / 0 error、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 32.2s），读数与第 1071 轮逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**79 格**（这一轮一格没增、一格没减；改的是调用点与说明）。

**第 1073 轮把「模板串投成什么形状」那一格整格搬回它自己那一页**——本页的
`projectString` 与 `ctx` 上那个 `Template` 出口一并删掉，算式（连同它每一句为什么这么写的注释）
**一字不改**地搬进 `typescript/tokens/string/string.xl.md` 的 `String.PrintAst`。
那一页原来只有一句 `return ctx.Template(v);`。

| 改掉的那一格 | 原来 | 今天 |
| --- | --- | --- |
| 「字符串 / 模板串 → `StringLiteral` / `NoSubstitutionTemplateLiteral` / `TemplateExpression`…」 | 本页 `projectString`，`String.PrintAst` 经 `ctx.Template` 转过来 | `String.PrintAst` 自己算（`ctx.Template` 与 `projectString` 都不存在了） |

- **为什么它属于那一页**（判据与前几轮同一条：**答案在这一格自己身上、而且构造那一刻就定下来**）：
  这一格的**每一半事实都是 `String` 自己的**——「我是不是模板」= `String.StringChar`
  （构造器里赋一次，第 1018 / 1049 轮就是这么读的）、「我攒下哪些段」= 自己的 `ConstString` /
  `InterpolationString` 子单元、「我的正文与坐标」= 自己的 `Text` / `start` / `end`、
  内插里要递归投的那两格 = 自己的 `ProjectableKids`。本页留着它，等于**替那一页记第二遍**。
- **搬走的是算式所在的那一页，不是能力**：那一页仍然经 `ctx.Expression` / `ctx.TypeExpression`
  递归投内插里的表达式或类型（`token` 层不能 import 投影层，会成环），节点仍经 `ctx.Node` 造、
  尾部坐标仍经 `ctx.StmtEndOf` 剪——**与共享层是同一份实现**，所以「两条路同答」是结构上的事。
- **两处替换是机械的**：`startOf(x)` / `endOf(x)` → `x.start` / `x.end`（本页那两个 `# const`
  本来就只是读这两格属性）；`astNode(kind, props, v, ctx)` → `ctx.Node(kind, props, v)`、
  `stmtEndOf(v, ctx)` → `ctx.StmtEndOf(v)`。`v.stringChar` / `v.Text` / `v.StringText` /
  `v.ProjectableKids` 原样保留（本来就是属性读）。
- **量法**：改完八道门读数**一处没动**——`coverage` **4261 / 4422**（`blocked 28` /
  `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`samples` 逐字节一致、`cases:check` 1656 / 1656、
  `runtime:check` 243 / 243、`runtime:cli` 79 / 79。这就是「搬走之后逐格等价」的证据。
- **判据跟着长**：`direct:lint` 的 `CTX_BANNED` 补进出口名 `Template`（第 1073 轮那一节写了理由）
  ——下一轮谁往 `ctx` 里补一行 `Template: …` 把这段算式请回共享层，这一门当场红。
- **本页的声明数**：**79 → 78 格**（`projectString` 一格；`ctx.Template` 只是出口，
  它本来就是一行转手、不留实现）。

**第 1073 轮（同一轮第二处）把最后两个「取这一串」的别名也收成属性读**——原型是第 1066 轮
留下的那两个**一行转调**：`unwrapNodes` / `projectableKids` 都只是 `node.ProjectableKids`。
这一轮把它们的读者全部改成属性读，然后删掉：

| 删掉的那一格 | 原来 | 今天 | 调用点数 |
| --- | --- | --- | --- |
| `projectableKids`（本页 helper：一行转调 `v.ProjectableKids`） | 被第 1066 轮的台账记着 | 不再存在 | 本页代码块 **0 处**（只剩注释里的名字） |
| `ctx.UnwrapNodes`（递给 token 页面的出口） | `(unit) => unit.ProjectableKids` | 不再存在 | 全仓 **5 处**（`lamda` 2 / `signature` 2 / `mapped-type` 1 / `type-assign` 1） |

- **`projectableKids` 为什么是死代码**：第 1066 轮把 139 处调用点改成属性读之后，
  这一格**一个真实读者都没有**了（第 1066 轮留它是为了「读法分两族」，而这一轮数出来
  两族都已经是属性读）。按第 1043 / 1044 / 1068 那一族的尺子——**只有转调、没有读者的声明
  就是多一层间接**——它该删。
- **`ctx.UnwrapNodes` 为什么也该删**：它与 `ctx.Kids` 读的是**同一格**（`ProjectableKids`），
  两个名字并存只会让下一页在「拆包装」与「取进投影的那一串」之间二选一（那是同一件事）。
  5 处调用点逐处机械替换：`ctx.UnwrapNodes(x)` → `x.ProjectableKids`（实参都是单个标识符，
  没有一处带副作用、也没有一处当左值用）。
- **`signature` 那两处的 `.filter((k) => !k.IsInvisible)` 原样保留**：`ProjectableKids`
  已经滤过一遍，这一句是**幂等的**——不动它，改写面就只剩「接收者」一处（少动一处就少一处漂的机会）。
- **判据跟着长**：`UnwrapNodes` 补进 `direct:lint` 的 `CTX_BANNED`（与 `Template` 同一趟），
  名字写回来这一门当场红；`direct:lint` 第八条那一族里 `UnwrapNodes` 的老别名也随之失效——
  它现在只认 `ProjectableKids`（那一格本来就在名单里）。
- **实测**：`xl check typescript core` 0 条；`xl build --force` **156 个产物** / 0 error、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 32.2s），读数与第 1072 轮逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**78 → 77 格**（`projectableKids` 一格；`ctx.UnwrapNodes` 只是出口）。
- **本文件的角色因此更窄了一格**：`ctx` 上那两个「取一串子单元」的名字（`AllKids` 第 1067 轮、
  `UnwrapNodes` 这一轮）都不在了，今天取子单元只有**一格事实的一处读法**：
  `token.ProjectableKids`（与 `IsInvisible` / `Segments` 同在 `core/syntax/token.xl.md`）。

**第 1073 轮（同一轮第三处）把第 1072 轮留给下一位的那一问量掉了**——`moduleSpecifierIn` /
`moduleHolderOf` 里那两处 `allKids(one)`（找 `Method` 里面的 `String`）：

- **问题是什么**：第 1067 轮那张表写着这两处已经改成 `one.ProjectableKids`，而代码里**仍是
  `allKids(one)`**；`Method` 那一页**没有声明 `Segments`**，所以「基类那句 `ProjectableKids`
  在 `Method` 身上是不是同一个集合」**没有量过**。按这一族的规矩（「先证明等价，再谈改写」），
  第 1072 轮如实记下、没有猜着改。
- **怎么量的**（一次性探针，不进仓库）：在**构建产物** `build/ts/typescript/print-ast-common.js`
  上把那两处 `for (const inner of allKids(one))` 换成 `for (const inner of one.ProjectableKids)`，
  坐标不动、源码不动，然后跑三门对拍：
  `cases:tsast` **16 片全绿、3 条已知缺口不变**、`samples` **逐字节一致**、`cases:direct`
  **1640 份 0 抛异常**——**读数一处没动**。探针随即还原（先备份、再 `Move-Item` 覆盖回去，
  已复核产物里不再有裸 `allKids(one)`）。
- **结论**：两个集合在这一格上同答（`Method` 的子单元里没有 `IsInvisible` 的那一类），
  **等价是量出来的、不是推出来的**；源码照改，两处都成了属性读。
- **`allKids` 的读者因此只剩 2 处**（代码块内 6 → 4 处）：`stmtEndOf` 里那段收尾 trivia
  （**第 1117 轮就地展开**，原来是单独一格 `trailingTriviaStart`）与
  `trailingSemicolonOf` 那一处、`astNode` 开头那段「跳过前导注释」——**要的正是含 trivia 的
  完整表**的地方，这一格因此照旧留着（第 1066 / 1067 / 1072 / 1073 四轮已经把「不是要找 trivia」
  的那批全改完了）。
- **实测**：`xl check typescript core` 0 条；`xl build --force` **156 个产物** / 0 error、`tsc` 干净；
  **八道门 8 通过、0 失败**（墙钟 32.4s），读数与第 1072 轮逐项相同：`coverage` **4261 / 4422**
  （`blocked 28` / `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**77 格**（这一处一格没增、一格没减；改的是两处调用点与三节说明）。

**「哪些标签在投影里不出现」那一格第 1030 轮也搬走了**（`# const INVISIBLE:Set<string>` →
`Token.IsInvisible`，四个类各自覆写，见 `core/syntax/token.xl.md`）：
名单的键就是**那些类自己的名字**，所以它本来就是那四页的事实；投影这一侧过去用
`INVISIBLE.has(k.Tag)` 过滤子单元（十五处），现在是 `k.IsInvisible`——
而且 `typescript/text-common-util.xl.md` 的 `IsTriviaUnit` 也改成转调同一格，
**同一份名单从三处声明收成一处**（那一页的注释原来写着「两处必须一起改」）。

**叶子那张词汇表第 1029 轮也搬走了**（`NUMERIC_LITERAL` 与 `leafKindOfText` →
`typescript/tokens/identifier.xl.md` 的 `NUMERIC_LITERAL` / `LeafKindOfText` / `IsNumericLiteral`）：
键是**叶子自己的正文**、值是「这一格在 TS 那边叫什么」，本来就是那一页的事实。
投影这一侧只剩两处按**文本**问它（`projectBindingElement` 的默认值、
`synthName` 的私有名），走的是那一页自己的静态入口——**一份词汇、一个入口**。
**第 1135 轮试过把第三处（`memberNameOf` 的数字名）也收进那一格自己**
（基类 `IsNumericLiteralName` + `Identifier` / `Keyword` 两页覆写）：**当场被 `coverage` 抓住、
如实还原**。**第 1136 轮换了收件人再收一次、收成了**：那一处的 `v` 是**声明名字的那一格**
（不是名字单元自己），所以按量到的名单把这一格立在 `Field` / `MethodDeclaration` 两页上
（各 `## field`，在认下名字的那一趟赋好），投影改读 `v.IsNumericLiteralName`——
本文件对 `Identifier` 那一页的**最后一个代码读者**随之消失（`import` 同一轮删掉）。
判据与读数写在 `memberNameOf` 那一处与本页上半部分的台账里。

**这张表第 1025 轮整张删掉了**：79 档里 **77 档说的是「标签 → 节点名」**，
而标签就是 token 自己的类名（`Token.Tag`）——每一档说的都是**某一页自己的事实**，
却被写在投影层这一页里。现在改由各 token 自己记 `Token.AstKind`
（`core/syntax/token.xl.md`；第 1041 轮起它是**构造时就赋好的属性**，与 `SegmentNames` /
`IsInvisible` 同一形态），投影只读这一格：**同一份事实只有一处声明**，改一个 token 的名字
不必再跑两个地方。

**余下那两档是死档、随表一起没了**：`LamdaParameter` 与 `LambdaBody` **没有对应的类**——
`Tag` 答的是 `this.constructor.name`，而全仓没有一个类叫这两个名字
（真名是 `Parameter`，它自己那一档就在表里；`LamdaBody` 从来不在表里——它走的是
`Token.BodyField` 那一格）。所以这两档**永远查不到**，删掉它们不改变任何一格读数。

**两张按文本查的词汇表第 1028 轮搬回各自那一页**（原先它们就摆在这里，与投影层那个
`tokenKind(text)` 一起构成同一件事的第二份声明）：

- `KEYWORD_KIND`（44 档：关键字文本 → `SyntaxKind` 名）→
  `typescript/tokens/keyword.xl.md` 的 `# private const KEYWORD_KIND`，读法是那一页自己的
  `Keyword.KeywordKind`——投影**唯一**的用法就是 `Keyword.PrintAst` 拿自己的
  `Value` 去查（现在是 `this.KeywordKind`）；
- `TOKEN_KIND`（45 档：符号文本 → `SyntaxKind` 名）→
  `typescript/tokens/symbol-token.xl.md` 的 `# private const SYMBOL_TOKEN_KIND`，读法是
  `SymbolToken.KindOfText(text)`（静态：投影折叠二元表达式时手上只有**一段文本**，
  问的就是这一格）与它转调的 `SymbolToken.TokenKind`（第 1127 轮起是**属性**；
  它有读者的那一处是 `SymbolToken.PrintAst` 拿自己的正文问，投影那一侧不再调它）。

两张表的**键都是那一页自己的正文**（`Keyword.Value` / `SymbolToken.TempToString()`），
所以「这份词汇是什么」与「我这一格是什么」本来就是同一页的事实。搬完之后投影层不再有
按文本查词的中央表，`ctx` 上那两个纯分类器出口（`KeywordKind` / `TokenKind`）也一并删掉——
出口删了，`direct:lint` 那条方法体判据守的东西才从「大家记得别用」变成结构上做不到。

投影这一侧**只剩三处按文本问符号**的调用（`foldBinaryFrom` 一族给「手上只有一段运算符文本」
的那种格里造 `operatorToken`），走的是本文件 `# dependencies` 里 import 进来的
`SymbolToken.KindOfText(text)`——**一份词汇、一个入口**（不是投影自己再存一份表的副本）。

**第 1075 轮把「这一格能不能当一条链的基名」也收进被问的那一页**：本页的 `IsChainBaseNode`
整格删掉，两处调用点改读 **`Token.IsChainBaseNode`**（基类默认 `false`、
八页常量答 `true`、`Identifier` / `Keyword` 在 `Close()` / `SetValue` 那一刻按自己的正文赋）。

| 原来的现场判据 | 今天读的那一格属性 | 谁声明、什么时候赋 |
| --- | --- | --- |
| `IsChainBaseNode(node)`（`node instanceof Token` + `Tag` 比类名 + 回读 `node.value` 排掉 17 个词） | `node.IsChainBaseNode` | 基类 `Token`（`## field … = false`）；`Method` / `PropertyAccess` / `NullConditionalOperator` / `New` / `ArrayLiteral` / `ObjectLiteral` / `String` / `ConstString` 八页常量 `= true`；`Identifier`（`Close()`）与 `Keyword`（`SetValue()`）按自己的正文赋 |

- **判据与第 1041 / 1042 / 1057 / 1062 那几条一模一样**：两半都住在被问的那一页上——
  「我这一格是什么类」就是那一页自己的类名，「我这一格的正文是什么」只有那一页知道
  （`Identifier` 读 `Temp`、`Keyword` 读 `Value`），而且**都收完正文那一刻就定下来** ⇒ 收成属性。
- **两处调用点**（`projectExpression` 的 0a0 那一支与标签模板那一支）改成属性读：
  `IsChainBaseNode(kids[ncoIndex - 1])` → `kids[ncoIndex - 1].IsChainBaseNode`、
  `IsChainBaseNode(tagUnit)` → `tagUnit.IsChainBaseNode`。**`instanceof Token` 那一句一起没了**：
  两处的实参本来就是从 `kids` 里取出来的单元。
- **名字差一个 `Node` 不是笔误**：`tokens/property-access.xl.md` 的 `IsChainBase` 是**解析期**
  那一问（要不要把这一格收进链里：`Bracket` 按 `endBracket` 分岔、`NotNull` 在 NCO 里让路），
  与这里的**投影期**名单**本来就不一样**（这里认 `NullConditionalOperator` / `ObjectLiteral`，
  不认 `Bracket` / `NotNull` / `RegexToken`）——两者不能合并，理由写在 `core/syntax/token.xl.md`
  那一格上。原文那句「这里判的是产物的一格（`Map`）」当时就已经与代码不符（代码判的是
  `node instanceof Token` 的 token），本轮按实测改正。
- **`Identifier` / `Keyword` 那一格的默认值是 `true`（不是 `false`）**：正文还没攒完时投影读到的
  文本是空串、而空串不在名单里 ⇒ 那时的答案是 `true`；默认值取 `true` 才与「读这一格自己的正文」
  逐格等价。这一条与 `IsOperatorUnit` 那两格**方向相反**，所以两页的注释里都写明了。
- **量法**：改完八道门读数**一处没动**——`coverage` **4261 / 4422**（`blocked 28` /
  `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **判据跟着长**：`direct:lint` 第八条那一族多认一格（`IsChainBaseNode` 配别名
  `isChainBaseNode`）——下一轮谁把这一问写回投影层，这一门当场红。
- **本页的声明数**：**75 → 74 格**（`IsChainBaseNode` 一格；两处调用点改成属性读）。

**第 1076 轮把「我是不是一个名字」在投影层剩下的**另一种写法**也收干净了**——
第 1057 轮把 `isNameNode(node)` 收成了 `Token.IsNameNode`（`Identifier` / `Keyword` 两页各自在
构造时答 `true`），可同一句话还以**内联比类名**的样子留在本页 12 处——老写法是
「`k.Tag === "Identifier"` 或 `k.Tag === "Keyword"`」，今天一律读 `k.IsNameNode`
（示例不写进代码块：那正是这一轮要禁掉的连写形态，写进去这一门就自己红了）。

- **十二处**（按代码块逐处改，注释里的引文不算）：私有名 `#x` 那一格（`named`）、
  `import.meta` / `new.target` 那一格（`kids[0]`）、NCO 那支的成员名（`first`）、
  `assertedMember` 的续格（`member`）、下标访问类型那一支（`head`）、平铺形参那一支
  （`part.find(…)`）、类型位那个名字（`head`）、分段壳判据（`first`）、
  `namedSpecifiersOf` 的 `type` 标志（`head`）、`conditionalNode` 的 `extends`（`k`）、
  `projectExport` 的词表（`k`）、`namedExportClause` 的 `isWord`（`k`）。
- **判据与第 1057 / 1062 / 1075 那几条一模一样**：那两半**都住在被问的那一页上**，
  而且**构造时就定下来**——`IsNameNode` 本来就是「构造时赋好的属性」（第 1057 轮），
  本页只是还没把它读全。所以这一轮**没有新声明、没有改口径**，只是把老的写法换成属性读。
- **`Tag === "Keyword"` / `Tag === "Identifier"` 单独出现的不动**（本页还剩 13 处）：
  那些问的是「是不是**那一个**类」（`as` / `new` / `abstract` / `export` / `declare` 那些格），
  不是「是不是一个名字」——判据不同，混进这一条会**换掉行为**（`as` 在产物里是 `Identifier`、
  `new` 在链基名那一处是 `Keyword`，各自都有它的理由）。
- **判据跟着长**：`direct:lint` 新立第十三条——`X.Tag === "Identifier" || X.Tag === "Keyword"`
  （两种次序）在本页代码块里必须恰好 0 处。**自验**（`tmp/r1076-probe.mjs`，不进仓库）：
  把老写法写回一处 ⇒ 0 → 1 处、退出码 1；还原后逐字节相同。
- **量法**：改完八道门读数**一处没动**——`coverage` **4261 / 4422**（`blocked 28` /
  `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**74 格**（一格没增、一格没减；改的是 12 处调用点与这一节）。

**第 1077 轮把「这一格是不是一次裸调用」整格搬回 `Method` 那一页**——本页的
`isBareCallMethod(unit)` 整格删掉，唯一的调用点改读 **`unit.IsBareCall`**。

| 改掉的那一格 | 原来 | 今天 |
| --- | --- | --- |
| 「名字为空、第一个实义子单元是内层 `Method` / 实参括号 / `NotNull`」 | 本页 `isBareCallMethod`（第一句先问 `unit.IsMethodNode === false`） | `Method.IsBareCall`（`## property` + `### get`，基类默认 `false`） |

- **为什么它属于那一页**（判据与第 1041 / 1057 / 1062 / 1075 那几条同一条）：那一格的**每一半
  事实都是 `Method` 自己的**——「我是不是 `Method`」就是这一页的类名、「我的名字空不空」读
  `DeclaredName`、「我下面第一个实义子单元是什么」读自己的 `ProjectableKids`。本页留着它，
  等于**替那一页记第二遍**。
- **`unit.IsMethodNode === false` 那一句搬过去就没了**（不是漏写）：它是**基类那一格默认 `false`**
  现在的职责——不是 `Method` 的 token 拿到的是默认档，而这里读的是属性、不必先问一句
  「你是什么类」（与第 1074 轮 `IsCommaSymbol` 把 `Tag === "SymbolToken"` 那半句收进基类默认档
  是同一手法）。
- **为什么是 `## property` + `### get` 而不是构造时赋的 `## field`**：这一格读的是
  `ProjectableKids` / `DeclaredName`——子单元与名字都是**解析期陆续挂上来**的，所以
  「我这一格现在长什么样」只能在**读的那一刻**看一次（与基类 `HasChildren` /
  `ProjectableKids` 同一形态，第 1064 / 1066 轮立的规矩）。
- **判据跟着长**：`direct:lint` 第八条那一族多认一格（`IsBareCall` 配别名 `isBareCallMethod`）
  ——下一轮谁把这一问写回投影层，这一门当场红。
- **量法**：改完八道门读数**一处没动**——`coverage` **4261 / 4422**（`blocked 28` /
  `differ 133` / `bad 0`、加权 95.7%）、`cases:tsast` 3 条已知缺口还开着、
  `cases:direct` 1640 份不抛异常、`direct:lint` 0 条违反、`samples` 逐字节一致、
  `cases:check` 1656 / 1656、`runtime:check` 243 / 243、`runtime:cli` 79 / 79。
- **本页的声明数**：**74 → 73 格**（`isBareCallMethod` 一格；唯一的调用点改成属性读）。

# private method synthName:(name:string, v:any)=>string

---------------------------------------------------------------------------

取值助手

---------------------------------------------------------------------------

合一个**声明名**的节点（`class A` / `function f` / `x: T` 的 `x`…）。

**这一格的名字与 kind 都只读 token 自己的属性**（第 1068 轮）：名字是**参数给的那个串**
（调用方从 `v.DeclaredName` 读出来），kind 是 **`v.NameKind`**——那一页构造时就赋好的一格。
两件事都不回原文查、也不把名字文本拿去别的页问一遍。

**位置只有一个来源：token 认下名字那一刻记下的那一格**——`Class` / `Interface` / `Enum` / `Let` /
`TypeAssign` / `Field` / `MethodDeclaration` / `NamespaceExport` 都在那一刻把名字的下标记成
`nameStart` / `nameEnd`（闭区间，见各自的 `NameStart`），于是这里**不做任何猜测**。

**第 1051 轮把「按原文猜」的那一套整段删掉了**。它原先的样子是一条三级兜底：
先按最后一次 `indexOf` 搜，搜之前还要推过修饰词（`modifiers="const"`）与装饰器
（`@observable` 换行 `a = 1` 里 `indexOf("a")` 会先命中装饰器名里的那个 `a`），
而上界又不能用声明自己的 `end`（`const f` 里那个 `f` 正好落在 `Let` 的末字符上）。
三条都踩过坑，所以每一条都留了一句注释——但它们**一次都不跑**：

**量法**（`tmp/r1051/probe.cjs`）：把构建产物里本函数的每个 `return` 前面插一句计数，
跑 `node tests/parse/direct-ast.mjs --all`（2051 份语料），读数是
`{"calls":160491,"hits":{"emptyName":53497,"nameRange":21373,"nameStartField":32124}}`。

三级兜底**一级都没进过**（读数里没有它们的标签）。所以「字段那条路」不是在**多数时候**替掉
这套近似，而是**完全替掉了**：留着一个不走的兜底，等于给「回原文猜」留一条路，
而那条路只会在坏输入上给出**第二份答案**（名字的首字母落在修饰词里、注释里有同样的词）。
删掉之后本函数的形状只剩三句：空名 ⇒ `undefined`；`NameSpan` 在 ⇒ 按它推；
`nameStart` / `nameEnd` 在 ⇒ 直读——都不在就 `undefined`（这一格没带位置，不替它近似）。

**字符串名那一档**（`"a-b" = 2`）走的是第一条（那一格第 645 轮叫 `nameRange`、第 1081 轮换成
一对数的 `NameSpan`）：它是**含引号**的整段区间，开头是引号 ⇒ 文本在引号之间。
**第 1138 轮起 `MethodDeclaration` 也答这一格**（字符串方法名 `{ "a-b"() {} }`）：
它补上了 `NameAt` / `NameSpan`，于是与 `Field` 的字符串字段名走同一条路——
两条路给出的两对数**逐字相同**（`NameStart = 起 + 1` / `NameEnd = 止 - 1`）。

```ts
  // **私有名 `#x` 的 kind 是 `PrivateIdentifier`**（第 131 轮）：类字段 / 私有方法的名字
  // 由这一页的判断合成。**判据第 1068 轮收进了被问的那一页**：`v.NameKind` 是
  // 那一页**构造时就赋好**的一格（`core/syntax/token.xl.md` 的 `NameKind`）——
  // 投影不再把名字文本拿去问 `Identifier.LeafKindOfText` 再贴一个 kind 回来。
  // **位置用「原文」，`text` 用解开的**（第 381 轮）——两件事要的字符串不一样：
  // `\u0066` 这个名字在源码里占 **6 个字符**（`indexOf` 与 `end` 都按它算），
  // 而它的**名字**是 `f`（TS 的 AST `text` 也是 `f`）。
  // **这一格踩过**：第一版在调用点就把名字解开了 ⇒ `end` 按解开的长度算
  // ⇒ 函数声明的名字区间短一截 ⇒ 参数表跟着错位（`function f\u0066() {}` 报
  // `unimplemented: parameter without a name`）。
  const nameText = Translate.DecodeIdentifierEscapes(name);
  const nameKind = v.NameKind === "PrivateIdentifier" ? "PrivateIdentifier" : "Identifier";
  if (name === "") return undefined;
  // **名字那一格的整段区间**（`NameSpan`，第 645 / **1081** 轮）：闭区间 `[起, 止]`、
  // **引号也在里面**。有它就能**按那一格自己**推出文本区间——
  // **第 1109 轮起「要不要去掉那对引号」也由那一格自己答**（`NameTextSpan`，
  // 见 `core/syntax/token.xl.md`）：这一页只读那一对数，不再回原文看头一个字符。
  // **这是「token 出字段、投影直读」那一格**：`Namespace` 的字符串模块名、`Field` 的字符串名
  // 都从这里出——它们原先只能回原文 `indexOf(名字文本)` 猜，而带转义的名字 `indexOf` 根本找不到。
  // **第 1081 轮起这一格自己就是一对数**（`Field` / `Namespace` 各自显式声明的那一格
  // `## property NameSpan:Array<int>`，读的都是**构造时**记下的 `NameAt` / `NameAt`+`NameEnd`）：
  // 从前它是 `"起,止"` 那串**产品格式**（`nameRange`），投影拿到它还得拆一遍——
  // 同一格事实的第二处答案（用户口径 1.1~1.4：token 子类构造完，信息就齐）。
  const unitSpan = v.NameSpan;
  if (Array.isArray(unitSpan) && unitSpan.length === 2) {
    // **引号由这一格自己答**（第 1109 轮）：原来这里读 `ctx.source[unitSpan[0]]` 看头一个字符
    // 是不是引号——而「我这一格的名字带不带引号」正是**这一格自己记下的那一段**的形状，
    // 所以它收成了 `Token.NameTextSpan`（基类：`## property` + `### get`，按 `NameSpan`
    // 与那一格自己的 `Document` 现算，口径与这里原来那两行逐字符相同）。
    // 本页于是**一处都不按某一格自己的坐标去读 `ctx.source`**（第 1049 / 1109 轮那条判据）。
    const span = v.NameTextSpan;
    if (Array.isArray(span) && span.length === 2) {
      const pos = span[0];
      const end = span[1];
      if (end >= pos) {
        return { kind: nameKind, text: nameText, pos, end };
      }
    }
  }
  // **位置只有一个来源：token 认下名字那一刻记下的那一格**（各页的 `NameStart` / `NameEnd`，
  // 闭区间下标）。它在构造时就赋好了，所以这里**不做任何猜测**。
  // **第 1051 轮把「猜」的那一段整段删掉了**：原来下面还有一套补偿——推过修饰词、推过装饰器、
  // 再回原文 `indexOf(名字)` 搜一遍——量出来**一次都没走**（全语料 2051 份、本函数被调 160491 次，
  // 三个出口的计数是 `NameSpan` 21373 / `nameStart` 32124 / 空名 53497，兜底 0 处）。
  // 留在投影里就是给「回原文猜」留一条路，而那条路只会在坏输入上给出**第二份答案**；
  // 记不到位置就是 `undefined`——这一格**根本没带名字的位置**，不必替它近似一个。
  const start = v.nameStart;
  const end = v.nameEnd;
  if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= start) {
    return { kind: nameKind, text: nameText, pos: start, end: end + 1 };
  }
  return undefined;
```


# private method kidsOf:(v:any, key:string)=>Array<any>

**这一格的那一段子单元**：段名就是这一页声明出来的那个属性名（`compare` / `body` / `parameters` …），
所以这里是**读这一页自己的一个属性**——属性名是编译期就知道的那个词，不经任何字符串键。

```ts
  const raw = v[key];
  return Array.isArray(raw) ? raw.filter((x) => x instanceof Token) : [];
```

# private method allKids:(v:any)=>Array<any>

**这一格下面所有的子单元**：自己声明的那些段（`children` 除外）先收，`children` 最后收——
段名与顺序都来自**这一页自己声明的那一格**（`v.Segments`，第 1065 轮：
口径见 `core/syntax/token.xl.md` 的 `Segments`），不是投影反射出来的。

**第 1067 / 1072 / 1086 三轮把它在代码块里的真读者收成 3 处、第 1149 轮再收成 1 处**——
最后那一处问的是同一件事：「**含 trivia 的完整子单元表**」（`allKids` 不过滤，
`Token.ProjectableKids` 过滤 `IsInvisible`；这是两件事）：

| 谁（代码块内 1 处） | 为什么要含 trivia 的那一份 |
| --- | --- |
| `stmtEndOf` 里那段收尾 trivia（**第 1117 轮就地展开**，原来是单独一格 `trailingTriviaStart`） | 它找的正是注释（`k.IsCommentUnit`，第 1085 轮） |

- **第 1149 轮少掉的那一处**是 `projectEach` 里「这一格末尾那个 `;` 是不是落在注释里」——
  它连 `ctx.source` 一起收进了**被问的那一格**（`core/syntax/token.xl.md` 的
  `Token.TrailingSemicolonAt`，读数记在那一页）：那一问的每一件事实都是那一格自己的
  （末字符读自己的 `Text`、有没有被盖住读自己的 `AllKids`），投影这一侧只剩一次属性读。
  **注意它不是「投影不能用 `allKids`」**：那一页答这一问时读的是 `Token.AllKids`（同一批
  子单元，只是长在 token 上），所以本页那一格 helper 少一个读者、`AllKids` 那个 getter
  多一个读者——两边的构造次数逐次相同。
  另一处 `astNode` 开头「跳过前导注释」**在这一轮之前就已经不是本页 helper 的读者**了
  （第 1141 轮起读 `Token.ProjectionStart`），所以这里只少了这一处。
- **量法**：逐行判行首三反引号进出围栏，只在**围栏内**数 `allKids(` —— **5 处，其中 4 处是
  `//` 注释行**（记的是第 1067 / 1072 / 1073 / 1149 轮那几笔账），真正的调用 **1 处**。
  **投影要的数**是「会进投影的子单元」，而那一格由 token 自己答（`Token.ProjectableKids`）——
  第 1067 轮把「顺手拿完整子单元表遍历一遍」的那批调用点全改成了属性读，
  第 1072 轮又收掉 `projectDeclaration` 的未映射透传支，**第 1086 轮收掉最后一处
  `addDecorators`**（第 1067 轮那一批漏下的）：那一处找的 `Decorator` **不是** trivia，
  两条路逐处同答（量法见 `addDecorators` 那一节）。
- **这一节原来写着「它只服务 `trailingTriviaStart`，因为 `addDecorators` 问的正是有没有装饰器」
  ——两半都过时了**：`addDecorators` 那一格当时读的仍是 `allKids(v).filter(…)`
  （**说明与代码不一致**，第 1072 轮已如实记下），第 1086 轮把**代码改成与说明一致**。

```ts
  const out = [];
  for (const key of v.Segments) {
    if (key === "children") continue;
    for (const x of kidsOf(v, key)) out.push(x);
  }
  for (const x of kidsOf(v, "children")) out.push(x);
  return out;
```

**`projectString` 第 1073 轮整格删掉了**（连同 `ctx` 上那个 `Template` 出口）。
它原来是「字符串 → `StringLiteral` / `NoSubstitutionTemplateLiteral` / 模板字面量」那一格，
`String.PrintAst` 只有一句 `return ctx.Template(v);` 转过来。

**为什么该搬走**：这一格的**每一半事实都在被投的那一页自己身上**——「我是不是模板」
是 `String.StringChar`（构造器里赋好）、「我攒下哪些段」是自己的 `ConstString` /
`InterpolationString` 子单元、「我的正文与坐标」是自己的 `Text` / `start` / `end`、
内插里那两格是自己的 `ProjectableKids`。按本文件这一族一贯的判据
（第 1041 / 1042 / 1057 / 1068 / 1069 那几条：**答案在这一格自己身上、而且构造那一刻
就定下来的，就收进那一页**），它该由 `typescript/tokens/string/string.xl.md` 的
`String.PrintAst` 自己算，而不是由共享层**替它记第二遍**。

**搬走的是算式，不是能力**：那一页仍然经 `ctx.Expression` / `ctx.TypeExpression` 递归投
内插里的正文（`token` 层不能 import 投影层，会成环），节点仍经 `ctx.Node` 造、
尾部坐标仍经 `ctx.StmtEndOf` 剪——**与共享层是同一份实现**，所以「两条路同答」是
结构上的事。改模板形状从此只需改那一页。

**两处替换是机械的**（与 `projectString` 逐格等价）：`startOf(x)` / `endOf(x)` →
`x.start` / `x.end`（本文件那两个 `# const` 本就只是读这一格的两个属性），
`astNode(kind, props, v, ctx)` → `ctx.Node(kind, props, v)`、`stmtEndOf(v, ctx)` →
`ctx.StmtEndOf(v)`。原来那一格的算式（含它每一句为什么这么写的注释）原样搬到了
`String.PrintAst`——**一个字符的解释都没丢**，所以这一页不再留第二份。


# private const startOf:(node:any)=>int = (node) => node.start

# private const endOf:(node:any)=>int = (node) => node.end

# private const NCO_BASE_OPERATORS:Set<string> = new Set(["+", "-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "!=", "===", "!==", "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof", "="])

**四张常量名单**（第 1146 轮从各自的调用点搬回模块级）：它们是**常量数据**
（基础运算符词、运算符词、一元表达式 kind、收在 `}` 上的节点 kind），而过去每一趟
`projectExpression` / `projectEach` 都要把其中一张 `new Set([...])` 重建一遍。
**实测**（官方用例语料 1640 份 / 21793 个节点）：`projectExpression` 被调 **5687 次**
（里面三张）、`projectEach` 被调 **4380 次**（一张）⇒ 每投一趟白造 **17061 个 `Set`**。
四条判据一个字没动（名单、顺序、`has` 的读法全原样）。**如实记下**：同一进程里两版各投
40 遍，best-of-4 提上去的 3090.7ms vs 每趟重建的 3068.9ms——**墙钟上量不出差别**
（差 −21.8ms，两次测量之间的波动 ±300ms）；省掉的是**构造次数**，不是可测量的时间。
各张名单**为什么是这些档**写在它们各自的调用点旁边（`projectExpression` 的 NCO 那一支、
`projectEach` 的尾分号那一支），这里只记「它们今天是模块级的常量」。

# private const OP_TEXTS:Set<string> = new Set(["+", "-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "!=", "===", "!==", "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof"])

# private const UNARY_KINDS:Set<string> = new Set(["DeleteExpression", "TypeOfExpression", "VoidExpression", "PrefixUnaryExpression"])

# private const ENDS_ON_BRACE:Set<string> = new Set(["Block", "ClassDeclaration", "EnumDeclaration", "ForInStatement", "ForOfStatement", "ForStatement", "FunctionDeclaration", "IfStatement", "InterfaceDeclaration", "ModuleDeclaration", "SwitchStatement", "TryStatement", "WhileStatement"])

**四张正则也立在这里**（第 1147 轮，与上面四张集合同一把尺子）：它们是**常量**
（不变量、不带 `g` / `y` 那一类有状态的标志），而原来它们写在方法体里——每一趟调用都要
重新求值一次字面量、造一个 `RegExp` 对象。**实测**（官方用例语料 1640 份，逐处挂计数器）：
`WHITESPACE` 那一张在三处共被求值 **17091 次**（`stmtEndOf` 的收尾空白 16230、
`stmtEndOf` 的同一趟里往前跳空白 20、`projectStatement` 的补分号那一支 841）；
`SEMICOLONS_AND_SPACES` 29 次、`ONLY_CONDITION_STATEMENT_SEGMENT` 2 次、
`DEFAULT_TAIL` **0 次**（那一支要「`export` 单独一格 + 后面跟一条声明」，用例语料里没有这种排版
——它在真实语料上照样可能响，判据一个字没动）。
⇒ 每投一趟少造 **17122 个 `RegExp` 对象**。**判据一个字没改**：四张的正文与标志全原样。
**如实记下**（与上一轮同一条）：第 1146 轮的 A/B 量过同一类改动，**墙钟在噪声里**
（±300ms 的测量波动 vs 十几毫秒的账）；这一轮不再重复量同一件事，
记的是**构造次数**这一本账。

# private const WHITESPACE:RegExp = /\s/

# private const DEFAULT_TAIL:RegExp = /\bdefault$/

# private const ONLY_CONDITION_STATEMENT_SEGMENT:RegExp = /(Condition|Statement|Segment)$/

# private const SEMICOLONS_AND_SPACES:RegExp = /^[;\s]*$/

# private const NOTHING:any = { __nothing: true }

**「这一格没有节点」的哨兵**（第 198 轮）：token 的 `PrintAst` 返回 `undefined` 时，
`projectNode` 认为「它没覆写这一格」、于是落到通用投影——但有几处出口是**故意**
一个节点都不出的（例如 `projectStatement` 对那些「已经是上一条语句终结符」的空语句
返回 `undefined`）。所以那些出口改为返回 `ctx.Nothing`，`projectNode` 见到它就**直接返回
`undefined`**，不再往下走通用支。

# private method astNode:(kind:string, props:any, v:any, ctx:any)=>any

**造一个投影节点**：`pos` 取视图的起点，`end` 由 `stmtEndOf` 剪掉尾部 trivia，
没有函数体的可调用签名再带上尾随分号。

这是 `projectNode` 里那个 `mk` 的**唯一实现**（`mk` 现在只是转调它）：逐节点出口
（token 自己的 `PrintAst`）与通用支**必须是同一份坐标口径**，否则两条路的坐标会悄悄漂开——
而这只会在 `cases:tsast` 的百分比上表现出来，看不出根因。

`props` 为 `undefined` 时只出 `{ kind, pos, end }`（自闭合那一类节点，例如 `EndOfFileToken`）。

```ts
  let end = stmtEndOf(v, ctx);
  // **没有函数体的可调用签名要带上尾随分隔符**（第 134 轮）：`;` 与 **`,`** 都算——
  // 接口 / 类型字面量里的成员可以用逗号分隔，TS 那边那条 `MethodSignature` 的 `end`
  // **含那个逗号**（实测 `undici-types/cache.d.ts` 的
  // `match (…): Promise<…>, has (…): Promise<…>,` 一族：漂移 10 + 多出 10）。
  //
  // **带体的不收**（第 838 轮）：判据与文字写的一致——「**没有函数体**的可调用签名」。
  // 带体的函数 / 方法收在自己的 `}` 上、**不调 `parseSemicolon`**，紧跟的那个 `;`
  // 在 TS 那边是一条新的 `EmptyStatement`（`function f() {};` ⇒ `FunctionDeclaration[0,15)`
  // + `EmptyStatement[15,16)`）。原来只看 `SIGNATURE_KINDS` ⇒ 带体的一律多算一格，
  // 于是「空语句」既缺、声明又漂（实测 `stmt-generator-trailing-semicolon` 一族）。
  //
  // **「我这种节点算不算签名」第 1040 轮改由那一格 token 自己记**（`IsSignatureNode`，
  // 见 `core/syntax/token.xl.md`）：那五个 kind 名就是几页自己的节点名每一态
  // （`MethodDeclaration` 那一页在签名位答 `MethodSignature`），所以名单搬回了各自那一页。
  // **第 1041 轮起它是一格属性**（在那几页构造时就赋好），这里读属性、不问问题。
  if (
    v.IsSignatureNode &&
    (props === undefined || props.body === undefined) &&
    (ctx.source[end] === ";" || ctx.source[end] === ",")
  ) {
    end += 1;
  }
  // **`pos` 不落在前导注释上**（第 140 轮）：对拍那一侧取的是 `node.getStart()`，
  // 它**跳过**节点前面的注释；而产物常把一整行注释收进**后一个单元**的区间里——
  //
  //     Readable | null,
  //     // stdin
  //     Readable | null,
  //
  // 那个 `UnionType` 的区间就从前一行那条注释开始（实测 `@types/node/child_process.d.ts`
  // 缺 7 + 多出 7，样本全是这一族）。判据只看**本节点自己的第一个子单元**是不是注释，
  // 是就跳到它后面第一个非空白字符；连着几条注释也一起跳。
  // 整段都是注释时不动（否则 `pos` 会越过 `end`）。
  // **这一趟第 1141 轮收进了被问的那一格**（用户口径 1.1 ~ 1.4）：原来这里是现场写的一趟
  // （`allKids(v)` 找「起点正好落在我这个 `pos` 上」的注释格、再用 `ctx.source` 读注释后面的空白），
  // 而三件事实全在这一格自己身上（`AllKids` / `IsCommentUnit` / `Text`）——见
  // `core/syntax/token.xl.md` 的 `ProjectionStart`，这里只读一个属性。
  // **非 token 的合成语句视图没有这一格**：读出来是 `undefined`，与原来 `v.start` 在那种视图上
  // 的答案（也是 `undefined`）逐个相同——那一趟的 `allKids` 在那种视图上本来就什么都不收。
  const pos = v.ProjectionStart;
  return Object.assign({ kind }, props === undefined ? {} : props, { pos, end });
```

# method projectNode:(node:any, ctx:any)=>any

---------------------------------------------------------------------------

投影

---------------------------------------------------------------------------

一个产物节点 → 一个 TS 形状节点。

**「父 kind」第 1056 轮起不再作为参数递进来**：过去它是 `projectNode` / `projectEach` /
`projectEachIn` 一路转手的第三个参数，而**今天它只剩一个消费者**——
`projectEachIn` 里 `ArrayLiteralExpression` 那一支（数组里的洞要补零宽的 `OmittedExpression`）。
那一格的事实**就在手上那个父单元的 `AstKind` 上**（`JsonArray` 那一页自己答
`"ArrayLiteralExpression"`，见 `tokens/json/array-literal.xl.md`），所以参数整条撤掉：
`projectEachIn(list, ctx, parent)` 收的是**父单元那一格 token**，要问什么就问它自己。

```ts
  if (node === null || node === undefined) return undefined;
  // **节点就是 token 自己**（第 1018 轮）：接收者只有一种——这一格的 token 本身。
  const v = node;
  ctx.count++;
  // **问这个节点自己**（第 77 轮起）：`node` 就是产出这一格的那个 token
  // （见 `core/syntax/token.xl.md` 的 `PrintAst`）。
  // 它覆写了这一格就由它自己出这一格——出口因此是**逐节点**的，而不是一张中央表说了算；
  // 没覆写（基类返回 `undefined`）就落到下面这份通用支：换名表 + 提层 + 字段名。
  //
  // **第 1013 轮起这里只问一格**：原先这里是「先问 `PrintAst`、再问 `PrintAst`」
  // 的两问（以及 `ctx.directEnabled` 那道开关），那两问整段删掉——
  // 两份写法逐字节同答是既成事实，留下来的就是有判据的那一份。
  // 现在这一格只有这一个入口：`PrintAst` 答 `undefined` 直接落通用支。
  // **老名字不再出现在这一页的理由里**：`PrintAst` 已经不存在了，
  // 再写它只会让读者去索引一个查不到的方法。
  //
  // **第 1043 轮：那一问也不需要了**——`node` 就是一个 token（第 1018 轮起接收者只有这一种），
  // 而 `PrintAst` 是基类上的一格方法、每一页都有，所以「它有没有这一格」不是一个问题；
  // 少一层 `if` 就少一处「两份读法」的余地。
  const owner: any = node;
  const own = owner.PrintAst(ctx, v);
  // **`ctx.Nothing` 表示「这一格故意不出节点」**（见 `NOTHING` 的说明）：
  // 与 `undefined`（＝没覆写、请走通用支）是两回事。
  if (own === ctx.Nothing) return undefined;
  if (own !== undefined) {
    ctx.direct++;
    return own;
  }
  // **直出版「回落到形状」那一格**（第 1002 轮）：声明族的直出版算完 kind 之后
  // 要**自己**把形状造出来，而那件事与通用支是同一份实现（`projectDeclaration`）——
  // 于是它经 `ctx.Declaration` 转回来。这里必须**跳过 `PrintAst` 那一问**，
  // 否则「自己问自己」：直出版 → 回落 → 又问直出版 → … 无限递归。
  //
  // **为什么是「换成局部闭包」而不是一个布尔标记**：这个回落只对**这一格**成立——
  // 直出版回落之后要走的那条路会去投它的**子节点**，而那些子节点各有自己的直出版、
  // 必须照常被问。闭包只认自己那一格（**参数只有节点**，`ctx` 已经闭在里面），
  // 于是「只跳这一问、不跳后面的」是结构上的事；换成标记就得额外管一层栈。
  const awaiting = ctx.awaitingDeclaration;
  let made;
  try {
    made = awaiting === undefined ? undefined : awaiting(v);
  } finally {
    ctx.awaitingDeclaration = undefined;
  }
  if (made !== undefined) return made;
  // **尾部 trivia 一律剪掉**：TS 的节点 `end` **从不含尾部 trivia**，而本工程的区间常常含
  // （语句行尾的软换行、正则字面量后面的换行…）。第 23 轮只修了语句族，实测还漏着
  // 正则（`Δ1`）等零散几类——所以这里**不再按 kind 白名单**，改成统一剪：
  // 往回吃掉空白即可，节点里不会有一类「合法地以空白结尾」的情况。
  //
  // 反过来，**没有函数体的可调用签名要带上尾随分号**：`declare function f(): void;` 的 TS 是
  // `FunctionDeclaration[23,51)`（含 `;`），而产物那个 `Function` 到 `void` 就结束了——
  // 分号是它的平级兄弟。真实语料里 `FunctionDeclaration` 缺的近两千处基本是这一条。
  const mk = (kind, props) => {
    return astNode(kind, props, v, ctx);
  };
  // **裸块语句 `{ … }` 就是一个 `Block`**（第 123 轮）：产物那边它是一对花括号
  // （`BlockCloseRule` 在语句位给它补了语句队列，里面的东西已经是 `Statement`），
  // 而 TS 那边它是一个 `Block` 节点、有自己的 `statements`。照通用支投会**原样透传**
  // 一个未映射的 `<Bracket>`，外层还多套一个 `ExpressionStatement`
  // （实测 `{ let y = 2; f(y); }` / `case "a": { … }` / `switch` 分支体三族全中）。
  //
  // **只认 `{`**：`(` / `[` 是分组括号，它们由 `projectExpression` / 类型那几条路径摊平，
  // 走到这里的一律是块。判据取 `startBracket` 属性（与 `projectExpression` 里
  // 那个值位括号分支同一个来源）。
  // **第 1089 轮起读 `v.IsBraceBracket`**：这一格由 `Bracket` 那一页在 `Use` 记下
  // `startBracket` 的那一刻赋好（原来这里写的是 `v.Tag === "Bracket" && String(v.startBracket
  // ?? "") === "{"`——`Tag` 那一半是多余的前缀，`?? ""` 那半是给「合成视图没有这一格」兜底的，
  // 而属性读在那种接收者上同样答假）。
  if (v.IsBraceBracket) {
    return {
      kind: "Block",
      statements: projectEach(kidsOf(v, "children"), ctx),
      pos: v.start,
      end: stmtEndOf(v, ctx),
    };
  }
  // **声明族**（第 1002 轮整段搬进 `projectDeclaration`）：`MethodDeclaration` / `Function` /
  // `Class` / `Interface` / `TypeLiteral` / `Enum` 六页现在**自己覆写了 `PrintAst` 与
  // `PrintAst`**（两半一起写，见 `core/syntax/token.xl.md` 的 `PrintAst`）。
  // 这一支是那六页的**共享实现**——`ctx.Declaration` 与它们自己的 `PrintAst` 都落在它上面，
  // 所以两条路出的形状是**同一份实现**，不是各写一遍再对拍。
  //
  // **两档「谁在投它」第 1054 / 1055 轮起都由单元自己答**（父单元那一格：
  // `ClassBody.IsClassBody` / `IsSignatureList`），所以这里不再往 `projectDeclaration`
  // 递一个父 kind——**第 1056 轮连那个参数一起删掉了**（它当时只剩 `ArrayLiteralExpression`
  // 一个消费者，而那一格在父单元自己的 `AstKind` 上）。
  return projectDeclaration(v, ctx, mk);
```


# private method projectDeclaration:(v:any, ctx:any, mk?:any, kind?:string)=>any

**声明族那一格的形状**（第 1002 轮从 `projectNode` 整段搬来）：
换 kind（`FunctionExpression` / `ClassExpression` / `Constructor` / `GetAccessor` / `SetAccessor`）
+ `structuralProps` 给字段名 + 三处收尾（摘 `get` / `set`、摘生成器的 `*`、对象字面量成员不吃尾随逗号）。

**第四个参数 `kind` 是可选的**：不给就问**这一格自己的 `AstKind`**（这是通用支与 `ctx.Declaration`
走的那条路——产物标签自己说明了它是什么，第 1025 轮起这件事由 token 自己声明）；给了就是**调用方已经算好了这一格该出的 kind**
（声明族的直出版走这条：它按自己的属性与父单元判一次，而「按上下文换 kind」的规则写在下面这几行里，
所以这里**仍然会把规则跑一遍**——两边因此不可能对同一种上下文给出两个答案）。

**为什么单独成一份**：这六页现在**两半一起写**（`PrintAst` + `PrintAst`），
而直出版只许用 token 自己的东西 ⇒ 它**不能再顺着 `projectNode` 走一遍**
（那条路会先问 `PrintAst`，于是自己问自己）。所以把这一格抽出来，
两条路**都调它**——同答就成了结构上的事实，而不是两处各写一遍再靠对拍发现漂移。

**「谁在投它」那两档第 1054 / 1055 轮起都由单元自己答**（读的是**父单元那一格**）：
类体里的 `constructor` 读 `v.Parent.IsClassBody`（见 `class-body.xl.md`）；
接口 / 类型字面量里的成员读 `v.Parent.IsSignatureList`（见 `core/syntax/token.xl.md`）——
所以 `ctx` 上那两格状态（`parentKind` / `signature`）**一格都不剩**，
**第 1056 轮连那个参数也删掉了**（它当时只剩 `ArrayLiteralExpression` 一个消费者，
而那一格在父单元自己的 `AstKind` 上）。

**`mk` 由调用方递进来**：它就是 `projectNode` 里那个「带着这一格坐标与尾部 trivia 剪裁」
的造节点闭包（`astNode`），换一份写就是两份坐标口径。

```ts
  if (kind === undefined) {
    kind = v.AstKind;
    if (kind === undefined) {
      ctx.unmapped.add(v.Tag);
      // **这一支读的也是那一格「进投影的子单元」**（第 1072 轮，与第 1067 轮改
      // `projectRoot` 的未映射透传支同一句）：原来这里是 `projectEach(allKids(v), ctx)`——
      // 而 `projectEach` 头一件事就是滤掉 `IsInvisible` 与顶层逗号（见那一节），
      // 于是「先拿完整子单元表、再滤一遍」与「直接拿滤过的那一串」逐字节同答。
      // 这一支是**唯一剩下**的一处，改完 `allKids` 的读者只剩「要找 trivia 的那几处」。
      return mk(v.Tag, { children: projectEach(v.ProjectableKids, ctx) });
    }
  }
  // **接口 / 类型字面量里的方法声明是 `MethodSignature`**（类里才是 `MethodDeclaration`）；
  // **类里那个叫 `constructor` 的是 `Constructor`**（另一个 kind、没有名字字段）——
  // 两处都是「同一个产物标签、按上下文换 kind」（真实语料 `Constructor` 缺 269，全挂在 `ClassDeclaration` 下）。
  // **签名那一支认的是 `v.type`、不是已经算出来的 `kind`**：声明族的 `PrintAst` 会把
  // `kind` 一起递进来（`ctx.Declaration(v, kind)`），那时 `kind` 可能已经是 `Constructor`——
  // 而这一条说的是「这个产物标签在签名位叫什么」，判据本来就在标签上。
  // **「父单元是不是签名表」第 1055 轮改由父单元自己答**（`v.Parent.IsSignatureList`，
  // 见 `core/syntax/token.xl.md`）：那三页（`InterfaceBody` / `TypeLiteralBody` / `MappedType`）
  // 各自声明了这一格常量，投影不再维护 `ctx.signature` 那个上下文标记
  //（它还要靠 save / restore 才不会被嵌套的成员表覆盖）。
  if (v.Parent?.IsSignatureList === true && v.IsMethodDeclaration && kind === "MethodDeclaration") kind = "MethodSignature";
  // **表达式位的函数 / 类**（第 141 轮）：`(function () {…})()` / `const c = class {}` 在
  // TS 那边是 `FunctionExpression` / `ClassExpression`（带名字的也一样——`(function f(){})()`
  // 还是 `FunctionExpression`），而 `AstKind()` 给的是**声明**名。
  // 判据是「谁在投它」：走 `projectExpression` 的就是表达式位
  // （与模板字面量靠 `ctx.typePosition` 分辨 `TemplateLiteralType` 是同一手法）。
  // 少了这一条，`fn-iife` / `stmt-paren-start` / `cls-expression` / `samples/generic.ts`
  // 这些地方各成一族（实测 `FunctionExpression` 缺 4、`ClassDeclaration` 多出 11）。
  //
  // **第 1097 轮把判据收进被问的那两页**：`v.Tag === "Function"` / `"Class"` 换成了
  // `v.IsValueOnlyUnit`（`Function` / `Class` / `Lamda` 三页构造时就答 `true` 的一格，
  // 口径见 `core/syntax/token.xl.md`）——函数 / 类**只可能做值**，而这里要分辨
  // 「是函数还是类」问的是**它投成哪个声明节点**（`v.AstKind`：`FunctionDeclaration` /
  // `ClassDeclaration`），不再回比类名。
  if (ctx.expressionPosition === true) {
    if (v.IsValueOnlyUnit && v.AstKind === "FunctionDeclaration") kind = "FunctionExpression";
    else if (v.IsValueOnlyUnit && v.AstKind === "ClassDeclaration") kind = "ClassExpression";
    // **用完就还回去**（第 134 轮修的）：这个标记说的是「**这一个**节点在表达式位」，
    // 不是「它的整棵子树也在」。不还的话，`(function () { function f() { … } … })()`
    // 里**体里那条函数声明会被当成表达式**——它投成 `FunctionExpression`，
    // 降级层于是报 `unimplemented: statement FunctionExpression`。
    // 而那是**普通代码里遍地都是**的形状（匿名 IIFE 里写一个辅助函数）。
    // **为什么以前没露**：只有 `kids.length === 1` 那一条才会置这个标记，
    // 而**带名字**的函数声明有两个子单元（名字 + 体）——于是「声明里套声明」一直是对的，
    // 只有**匿名**的 IIFE（一个子单元）才把标记漏下去。
    ctx.expressionPosition = false;
  }
  else if (
    v.IsMethodDeclaration &&
    // **「这是不是类体里的构造」问这一格的父单元自己**（第 1054 轮）：`ClassBody` 那一页
    // 声明了 `IsClassBody`（构造时就赋好的一格常量，与 `WrapperField` 同一形态），
    // 于是这一支**不再读投影自己记的 `ctx.parentKind`**——同一格事实过去在两处各存一份
    // （上下文标记一份、树的形状一份）。产物树里 `constructor` 的方法单元**就挂在
    // `ClassBody` 底下**（`structuralProps` 提层时递下去的父单元也是那一格 `v`），
    // 所以父单元读得到。
    v.Parent?.IsClassBody === true &&
    // **「这个名字是不是那个构造词」由被问的那一页自己答**（第 1139 轮，用户口径 1.1 ~ 1.4）：
    // 这一句过去是 `v.DeclaredName === "constructor"`——投影拿**这一格自己声明的名字文本**
    // 去和语言里的那个词比一遍，而「我这一格叫什么」是 `MethodDeclaration` 在认下名字那一趟
    // 就赋好的一格（`IsConstructorName`，与同页 `IsNumericLiteralName` 同一趟），
    // 取值与原来那一句**逐字符相同**。投影从此只读属性。
    v.IsConstructorName === true
  ) {
    // **判据是「这一格叫什么」那一格事实、不是 `textOf`**（第 1008 轮；第 1139 轮起
    // 这一问由 `MethodDeclaration.IsConstructorName` 答）：它问的仍然是 token 自己声明的名字
    // （第 1068 轮：那一格已经把「名字住在哪个字段上」与「问不到时退回 `name` 段」两跳都
    // 收进 token 里了，见 `core/syntax/token.xl.md`）——只是这一问的答案现在由那一页在
    // 认下名字那一趟算好，投影不再自己拿名字文本比一遍；直接写 `v.name` 会**绕开那一格事实**
    // ——这条口径对 **helper** 一样成立
    // （直出版那一趟投一个类要经过 `projectDeclaration`，它就在这条 helper 里）。
    // 方法单元自己没有 `value`，
    // `textOf` 会退回 `source.slice(v.start, v.end)`（那是整段方法体，不是名字）。
    //
    // kind 名是 **`Constructor`**（`ts.SyntaxKind[177]` 印出来就是 `Constructor`；
    // `ConstructorDeclaration` 在这个 TypeScript 里是 `undefined`——按后者投，
    // 尺子上 269 处构造签名会一直算作「缺 `Constructor`」）。
    //
    // **`ClassExpression` 是第 301 轮补上的**——原来只认 `ClassDeclaration`，
    // 于是**类表达式里的 `constructor` 一直是 `MethodDeclaration`**
    //（判据 `ex-index-and-call-signatures` 现场红的：`const K: Ctor = class { n: number;
    //  constructor(n) { this.n = n } }` 之后 `new K(4).n` 给 `undefined`，
    //  Node 给 `4`）。**TS 那边两种都投 `Constructor`**（`ClassExpression` 的成员
    // 就是 `ConstructorDeclaration`）——所以这是**投影漏了一格**，不是「两种口径」。
    //
    // **不补这一格的后果离现场很远**：降级层按 `NodeKind(members[i]) === "Constructor"`
    // 找显式构造函数（`LowerClass`）——找不到就**合成一个空的**，
    // 于是**写着的构造函数整条不跑**，字段初始化式还照常发
    // ⇒ `n: number`（无初始化式）留下 `undefined`、`n = 1` 把构造函数的赋值**盖掉**
    //（实测 `class { n = 1; constructor(v) { this.n = v } }` 给 `1`，Node 给 `7`）。
    // **一句异常都没有**——只有与 `node` 逐字节对拍才看得见。
    kind = "Constructor";
  }
  // **取值器 / 设值器**（`get x(): A { … }` / `set x(v) { … }`，第 93 轮）：
  // 产物把 `get` / `set` 记成 `modifiers="get"`，而 TS 那边 **kind 自己**就说明了是哪一个，
  // `get` / `set` **不是修饰词节点**——照 `modifiers` 投会多出 `GetKeyword` / `SetKeyword`
  // （实测多出 102 + 缺 `GetAccessor` / `SetAccessor`）。所以换 kind 并把那个词从修饰词里摘掉。
  let stripModifier;
  if (v.IsMethodDeclaration) {
    // **拆 `modifiers` 那一串的地方第 1083 轮收进了基类**：`Token.ModifierTextWords`
    // （读的是本类声明的 `modifiers`，各页构造时赋好）——这里不再自己 `split(",")`。
    const words = v.ModifierTextWords;
    if (words.includes("get")) {
      kind = "GetAccessor";
      stripModifier = "GetKeyword";
    } else if (words.includes("set")) {
      kind = "SetAccessor";
      stripModifier = "SetKeyword";
    }
  }
  const props = structuralProps(v, kind, ctx);
  if (stripModifier !== undefined && Array.isArray(props.modifiers)) {
    // **按文本摘，不按 kind 摘**（第 67 轮）：`get` / `set` 是**上下文关键字**——
    // `keyword.xl.md` 那边现在一律把它们投成 `Identifier`（引用位必须是普通标识符，
    // `const set = 1;` / `f(set)` 都要对），所以这里再按 `kind` 摘就**摘不掉了**，
    // 访问器会多留一格 `Identifier`。按**文本**摘与 kind 无关，两边都对。
    const word = stripModifier === "GetKeyword" ? "get" : "set";
    props.modifiers = props.modifiers.filter((m) => m.text !== word);
  }
  // **生成器记号的 `*` 是 `asteriskToken`**（第 130 轮）：`function* g() {}` 的产物把
  // `*` 记成一个平级的 `SymbolToken`，它会跟着形参一起落进 `parameters`——而 TS 那边
  // 它是 `FunctionDeclaration.asteriskToken`（**不是**形参，`forEachChild` 单独访问它）。
  // 摘出来之后字段名与 TS 一致，节点本身也还在（`AsteriskToken`）。
  if (Array.isArray(props.parameters)) {
    const star = props.parameters.findIndex((p) => p !== undefined && p.kind === "AsteriskToken");
    if (star >= 0) {
      props.asteriskToken = props.parameters[star];
      props.parameters.splice(star, 1);
    }
  }
  // **对象字面量成员不吃尾随逗号**（第 142 轮）：见 `projectObjectLiteral` 那一处的说明。
  const built = mk(kind, props);
  if (
    ctx.inObjectLiteral === true &&
    built !== undefined &&
    typeof built.end === "number" &&
    ctx.source[built.end - 1] === ","
  ) {
    built.end -= 1;
    while (built.end > built.pos && WHITESPACE.test(ctx.source[built.end - 1])) built.end -= 1;
  }
  return built;
```

**`typeMemberGroups` 那一格第 1080 轮就地展开了**（它原来占第 1361~1418 行，全仓只有 `projectEachIn` 一个调用点）： 展开的是**算式**，不是判据——「哪三种容器要切、按哪个符号切」仍然由容器自己答 （`Token.TypeMemberPlan`，第 1035 轮），`separator` 只可能来自那一格。 所以原来那一节里的记录一并搬到这里（下一段），展开处只留一句指回本节的说明。  **原记录（第 76 / 164 / 1035 / 1074 轮）**：类型容器的一批子单元 → 切好的若干组，每组是「一个类型」的全部单元。  - **分隔符是问容器自己要来的**（第 1035 轮）：过去这里按 `parentKind` 查投影层那张 `TYPE_MEMBER_SEPARATORS`   （`UnionType` → `|`、`IntersectionType` → `&`、`TupleType` → `,`），而**那些 kind 名就是那些类自己的名字、   那个符号就是那些类自己的符号**——所以它搬回了各自那一页（`Token.TypeMemberPlan`），展开处只收一个 `separator`。 - **第 76 轮的根因**：原来对类型容器的子单元**逐个**投（`projectTypeExpression([item])`），可产物在类型位把   「名字 + 实参」摆成**平级的两格**（`ArrayLike` 与 `GenericType(<number>)` 是兄弟），于是   `ArrayLike<number> | string` 投成「只有名字的 `TypeReference` + 一个盖住 `<number>` 的 `TypeReference` + `StringKeyword`」，   而 TS 那边是 `UnionType > [TypeReference(ArrayLike<number>), StringKeyword]`。同一类根因还压在**限定名**上：   `ArrayBuffer | NodeJS.TypedArray` 的点号两边是两个平级单元，`projectTypeExpression` 里那个限定名循环**一次都进不去**   （`QualifiedName` 缺 844 处、`TypeReference` 漂移 1761 处，实测数字见 README 第 76 轮）。 - **只有三种容器要切**（它们的成员之间**真的有**分隔符）：`separator` 是 `null` 时整批子单元合起来就是**一个**类型   （`T[]` / `(A | B)` / `keyof T` / `A[K]` / `A?` / `...A` / `name: T`），没有「同级的另一个类型」这回事——那里维持整段一个。 - **分隔符那一格不进任何一组**：它不是类型的一部分（与 `projectTypeArguments` 切逗号同一口径），   留下的空组（`type A = | B` 的前导 `|`、尾随逗号）由 `filter` 挡掉。
# private method projectEachIn:(list:Array<any>, ctx:any, parent:any)=>Array<any>

投影一批子单元，并在**成员位**上按父单元自己的两格属性切换形状。

接口 / 类型字面量的成员在 TS 那边叫 `PropertySignature` / `MethodSignature`，
而类里的同名成员叫 `PropertyDeclaration` / `MethodDeclaration`——同一个产物标签、
两种上下文两种 kind（声明文件里签名那套是绝大多数）。**那两格判据第 1054 / 1055 轮起
由父单元自己答**（`parent.IsClassBody` / `parent.IsSignatureList`），所以这一格收的是
**父单元那一格 token**、不再收一个 kind 名；`ArrayLiteralExpression` 那一支也从
`parent.AstKind` 读同一格事实（第 1056 轮）。

```ts
  // **成员位没有语句**（第 79 轮）：成员表里遇到 `<Statement>` 就**摊开**——
  // 它下面那些单元本身就是成员。
  //
  // **「我这一格是不是成员表」第 1039 轮改由那一格自己答**（`parent.IsMemberList`，
  // 见 `core/syntax/token.xl.md`）：名单里那四个 kind 名（`InterfaceDeclaration` /
  // `TypeLiteral` / `ClassDeclaration` / `EnumDeclaration`）**就是那四个类自己的名字**，
  // 所以它住在各自那一页，投影这一侧不再存第二份（原来这里是
  // `# private const MEMBER_LIST_KINDS:Set<string>` 那张按 kind 查的集合，第 79 轮
  // 为接口 / 类型字面量建立、第 86 轮补上枚举体那一条——枚举成员之间带 `,`，
  // 不摊开的话那个 `,` 会把成员们折成一个 `BinaryOperator`，投出来是
  // `ExpressionStatement > BinaryExpression`）。
  //
  // 摊开放在最前面：它比类型容器那一条更靠外（成员表 vs 类型位）。
  if (parent.IsMemberList) {
    const flat = [];
    for (const item of list) {
      if (item instanceof Token && item.IsStatementShell) {
        const inner = item.ProjectableKids;
        // **只有整层都是成员才摊开**：`interface` / `type` / `class`
        // 的成员位在 TS 里放不下语句，可本工程自己的样本里出现过 `{ let value: T }` 这种写法。
        //
        // **「哪些标签算成员」这件事第 1033 轮改由单元自己答**（`Token.IsMemberTag`）：
        // 名单里的键（`IndexSignature` / `Field` / `MethodDeclaration` / `Signature` /
        // `EnumMember`）**就是那些类自己的名字**，所以它住在各自那一页，
        // 投影这一侧不再存第二份（原来这里是 `MEMBER_TAGS` 那个集合）。
        // **摊开的判据要窄**是实测补的守卫：`samples/generic.ts` 里有一句
        // `class Foo<T> { let value: T }`（本工程的样本，不是合法 TS）——成员位的
        // `<Statement>` 里装的是个 `Let`，无脑摊开会把它当成成员投出去，而 `projectLet`
        // 那条路本来只服务语句位、容器类型不设防，当场 `TypeError: node.get is not a function`。
        //
        // **成员之间的 `,` 不算内容**（第 86 轮）：枚举体的那一层 `Statement` 里是
        // `[EnumMember, SymbolToken(,), EnumMember, …]`——`every` 不认逗号的话枚举永远摊不开，
        // 于是一个 `,` 把成员们折成 `BinaryOperator`、投成 `ExpressionStatement > BinaryExpression`。
        if (
          inner.length > 0 &&
          inner.every(
            (k) =>
              k.IsMemberTag || k.IsCommaSymbol,
          )
        ) {
          for (const one of inner) flat.push(one);
          continue;
        }
      }
      flat.push(item);
    }
    list = flat;
  }
  // 类型容器的子单元按**类型位**投，而且**按成员切好再投**——
  // **「哪些是类型容器、按哪个符号切」这一格第 1035 轮改由容器自己答**
  // （`parent.TypeMemberPlan`，见 `core/syntax/token.xl.md`）：名单里的 kind 名
  // （`UnionType` / `IntersectionType` / `ArrayType` / …）**就是那些类自己的名字**、
  // 分隔符也是它们自己的符号，所以它住在各自那一页，投影这一侧不再存第二份
  // （原来这里是 `TYPE_MEMBER_KINDS` / `TYPE_MEMBER_SEPARATORS` 两张按 kind 查的表）。
  //
  // **为什么这一格要收「父单元」而不是一个 kind 名**：判据的主人是那一格 token 自己。
  // 三处调用点给的都**就是**投影意义上的父单元：段循环给的是正在投的那一格 `v`、
  // 包装提层给的是**外层声明**（`ClassBody` 的成员属于 `ClassDeclaration`）、
  // 直出版给的是 `ctx.Each(view)` 里那个 `view`（第 1056 轮起它只收这一格）。
  const typePlan = parent.TypeMemberPlan;
  if (typePlan !== undefined) {
    // **`typeMemberGroups(list, separator)` 第 1080 轮就地展开**（它全仓只有这一个调用点）：
    // 下面这一段的判据与那一格逐字相同——没有分隔符的容器整段算一个类型、
    // 分隔符那一格不进任何一组、留下的空组由 `filter` 挡掉；
    // `,` 那一态读的是 `SymbolToken.IsCommaSymbol`（第 1074 轮），`|` / `&` 仍按正文比。
    // 那段「为什么只有三种容器要切」的记录留在原来那一格的记账里（见本文件 `typeMemberGroups` 那一节）。
    const separator = typePlan.separator;
    const groups: any[] = [];
    if (separator === null) {
      if (list.length > 0) groups.push(list);
    } else {
      let current: any[] = [];
      for (const item of list) {
        if (
          item instanceof Token &&
          item.TextValue === separator &&
          (separator !== "," || item.IsCommaSymbol)
        ) {
          groups.push(current);
          current = [];
          continue;
        }
        current.push(item);
      }
      groups.push(current);
    }
    const out = [];
    for (const group of groups) {
      if (group.length === 0) continue;
      const projected = projectTypeExpression(group, ctx);
      if (projected !== undefined) out.push(projected);
    }
    return out;
  }
  // **数组里的洞是 `OmittedExpression`**（第 176 轮）：`[1, , 3]` 在 TS 那边是
  // `[NumericLiteral, OmittedExpression[39,39), NumericLiteral]`——一个**零宽**节点。
  // 产物在那个位置什么都没有（逗号之间是空的），所以空组要补一个零宽节点，
  // 位置取**后面那个逗号**的起点（TS 就是这么放的；末组的空位取列表末尾）。
  // 实测 `ex-array-holes.ts` / `expr-array-holes.ts` 各缺 1 个 `OmittedExpression`
  // ——值位数组字面量走的是 `projectArrayLiteral`（不是 `projectEachIn`），所以这一条
  // 写在两处；这里管绑定位与嵌套走 `List` 的那条路。
  //
  // **判据读父单元自己的 `AstKind`**（第 1056 轮）：`JsonArray` 那一页答
  // `"ArrayLiteralExpression"`（见 `tokens/json/array-literal.xl.md`），所以「我这一格的
  // 父单元是不是数组字面量」不必由调用方递一个 kind 名进来——那是同一格事实的第二处存储。
  if (parent.AstKind === "ArrayLiteralExpression") {
    const out = [];
    let group = [];
    let lastEnd = list.length > 0 ? startOf(list[0]) : 0;
    // **上一个逗号的下标**（第 933 轮）：与 `tokens/json/array-literal.xl.md` 那一处同一份口径
    // ——洞的起点是「上一个**逗号**之后那一格」，而 `lastEnd + 1`（上一个元素的终点 + 1）
    // 在元素与逗号之间夹着注释 / 换行时差一格。
    let previousSeparator = -1;
    const flush = (separator) => {
      if (group.length === 0) {
        const at = previousSeparator === -1 ? lastEnd : previousSeparator + 1;
        out.push({ kind: "OmittedExpression", pos: at, end: at });
      } else {
        const one = projectExpression(group, ctx);
        if (one !== undefined) out.push(one);
        lastEnd = endOf(group[group.length - 1]);
      }
      group = [];
      if (separator !== undefined) previousSeparator = startOf(separator);
    };
    for (const item of list) {
      // **逗号那一格自己答**（第 1074 轮）：见 `SymbolToken.IsCommaSymbol`。
      if (item.IsCommaSymbol) {
        flush(item);
        continue;
      }
      group.push(item);
    }
    if (group.length > 0) flush(undefined);
    return out;
  }
  // **类型容器的子单元按类型位投**（见下）之前，先摊平成员表那一步已经做完了。
  // **`signature` 那一格上下文标记第 1055 轮删掉了**：要它的两处（`Field` 的
  // `PropertySignature`、`MethodDeclaration` 的 `MethodSignature`，外加这一格自己的
  // `TypeLiteral` 那一句）现在都读**父单元自己的 `IsSignatureList`**——
  // 所以这一格不必再记住并还原一份状态。
  return projectEach(list, ctx);
```

# private method projectEach:(list:Array<any>, ctx:any)=>Array<any>

```ts
  // **「上一条语句会不会吞掉紧跟的 `;`」就地取**（第 1109 轮）：它原来是本页一格
  // `ownsTrailingSemicolon(node, ctx)` 连同数据表 `ENDS_ON_BRACE`（两者的读者都只有本函数里
  // 那一处），按第 1103 / 1104 轮那把尺子整段搬进这个调用点，本页少两格声明。
  // 判据仍只有一份：问 kind、不问原文（四档的说明见第 838 / 663 / 1040 轮的台账）。
  //
  // **那张名单第 1146 轮搬到模块级**（用户口径 1.6「投影成本趋于 0」）：它是**常量数据**，
  // 而原来每一趟 `projectEach` 都要重建一次（`new Set` + 13 个字面量 + 一次哈希表构造）
  // ——全语料 1640 份实测本函数被调 **4380 次**，就是四千多次白造的集合。
  // 判据一个字没改：名单仍是那 13 档、仍是 `!ENDS_ON_BRACE.has(kind)`。
  const ownsTrailingSemicolonOf = (node: any, ctx: any): bool => {
    const kind = String(node.kind);
    if (kind === "EmptyStatement") return false;
    if (typeof node.end === "number" && node.end > 0 && ctx.source[node.end - 1] === ";") return false;
    if (kind === "LabeledStatement" && node.statement !== undefined && node.statement !== null) {
      return ownsTrailingSemicolonOf(node.statement, ctx);
    }
    if (kind === "FunctionDeclaration" && node.body === undefined) return true;
    // **这个目标语言节点名收在 `}`（块尾）上吗**（第 1040 轮）：就是原来那张按 kind 查的
    // `NO_TRAILING_SEMICOLON` 集合（下面那一格是它的数据）。**第 1044 轮把它并了进来**：
    // 全仓只有这一个调用点，拆成 `kindEndsOnBrace` 只是多一层间接——「同一件事一处读法」。
    //
    // **它不是第二份声明**：每一档对应的 token 页面都自己答 `Token.EndsOnBrace`
    // （`core/syntax/token.xl.md`；空语句那一页答 `false`、带体的函数答 `true`、裸块由 `Bracket`
    // 按 `startBracket` 答），这里的每一档都是那一页的 **`AstKind()` 名字**。
    //
    // **这一格为什么还是按 kind 问**（第 1040 轮实测）：调用点手上那一格 token 与 `out` 末尾那个
    // 节点**不再是同一个单元**——`projectStatement` 会把一条声明包进语句壳（`function f() {}` 的
    // 上一格是 `Statement`，而它的 `EndsOnBrace()` 是「不收在 `}` 上」），照 token 问会让
    // `stmt-semicolon-after-declaration` 那一族 5 条用例当场倒退。名字与答案仍分处两页、
    // **名字就是那一页答的**，所以这里只读一次名字，不在这里判「我这一格长什么样」。
    return !ENDS_ON_BRACE.has(kind);
  };
  // **顶层逗号是分隔符，不是 TS 的语义子节点**（第 84 轮）：TS 的 `parameters` / `arguments` /
  // `elements` / `properties` / `types` 里都**没有**逗号子节点（逗号**运算符**是另一回事——
  // 那种早被 token 层折成 `BinaryOperator op=","`、走 `projectBinary` 那条路，不经过这里）。
  // 实测「投影后多出来的节点」里 `CommaToken` 占 **18568 个**（第一名），全是各处平级列表漏掉的。
  // **第 1146 轮删掉了这一段的一份逐字重复**：同一段话在下面 `const items = list.filter(` 前面
  // 又写了一遍（第 84 轮搬家时留下的），两处字字相同——留一处。
  if (Array.isArray(list) === false) return [];
  const out = [];
  const items = list.filter(
    (item) =>
      item instanceof Token &&
      !item.IsInvisible &&
      // **逗号那一格自己答**（第 1074 轮）：见 `SymbolToken.IsCommaSymbol`。
      !item.IsCommaSymbol,
  );
  let i = 0;
  while (i < items.length) {
    // **带标签的语句要合并**：产物那边 `outer: for (…) {}` 是**两个平级的单元**
    // （`Label[0,5]` 与 `For[7,36]`），而 TS 是 `LabeledStatement[0,37) > [Identifier, ForStatement]`——
    // 一个包住另一个。早先按 `Label` 单独投出一个 `LabeledStatement`，于是它的区间只盖住标签本身
    // （实测 `Δ-125` / `-64` / `-48` / `-33` … 一整族）。
    // 连续多个标签（`a: b: for`）从右往左套：最外层是第一个标签。
    // **只认「还没包住语句」的标签**（第 929 轮）：`Label` 现在**包住**它标的那条语句
    // （`Statement.AbsorbLabels` 折的），那一格由标签自己的 `PrintAst` 出形状；
    // 这一支留下来管**老形状**（标签与被标语句是平级兄弟，`HasChildren` 为假）。
    // 少了这个条件，包好的标签会去跟**后面那条平级语句**合并（整棵被标的子树丢掉）。
    if (items[i].IsLabelUnit && items[i].HasChildren === false) {
      const labels = [];
      let j = i;
      while (j < items.length && items[j].IsLabelUnit) {
        labels.push(items[j]);
        j++;
      }
      const statement = j < items.length ? projectNode(items[j], ctx) : undefined;
      if (statement !== undefined) {
        // **体必须是「语句」**（第 566 轮，与 `projectStatement` 那一支同一句）：
        // 这一路是根列表 / 段，手里没有语句壳 ⇒ 终点就取体自己的。
        //
        // **这一格第 1087 轮就地展开**（原来是本页那一格 `asStatement`，全仓只有这一个读者；
        // 判据与第 1043 / 1044 / 1070 / 1080 轮并掉那些「一格声明、一个调用点」的转发同一把尺子）：
        // TS 的 `LabeledStatement.statement` 是 `Statement` —— 体是**表达式**时
        // （`done: f()`）那边是 `ExpressionStatement > 表达式`，而产物给的是「裸表达式」
        // ⇒ 少一整层壳（实测 `stmt-label-statement` / `am-object-vs-block` /
        // `stmt-object-vs-block` 三份各缺一个 `ExpressionStatement`）。
        // **判据是 kind 的后缀**、不是「那一格自己答的那一句」：`IsStatementNode`（第 1039 轮）
        // 是「**单个子单元**是它时不再套壳」的名单，它漏了 `ExpressionStatement` 自己、
        // `ForInStatement`、`WithStatement` 这些（`projectStatement` 那一支只在
        // `kids.length === 1` 时才用它，而这里的体是**投影结果**，范围大得多）。
        // TS 那边「本来就是语句」的 kind 只有三类：`*Statement` / `*Declaration` /
        // 以及 `Block` / `ModuleBlock`——表达式 kind 一个都不沾，所以后缀判据不会误判。
        // **终点取体自己的**（根列表这一路没有语句壳）。
        let wrapped = statement;
        const bodyKind = wrapped.kind;
        if (
          typeof bodyKind === "string" &&
          bodyKind !== "Block" &&
          bodyKind !== "ModuleBlock" &&
          !bodyKind.endsWith("Statement") &&
          !bodyKind.endsWith("Declaration")
        ) {
          wrapped = {
            kind: "ExpressionStatement",
            expression: wrapped,
            pos: wrapped.pos,
            end: statement.end ?? 0,
          };
        }
        for (let k = labels.length - 1; k >= 0; k--) {
          wrapped = labeled(labels[k], wrapped);
        }
        out.push(wrapped);
        i = j + 1;
        continue;
      }
    }
    // **`export` / `declare` / `default` 前缀 + 一条声明**（第 124 轮）。
    //
    // `projectStatement` 里早就有这一支，但它只在「整条语句被包在一个 `Statement` 单元里」
    // 时才有机会跑。而顶层（根那一层）**有些声明单元根本不在 `Statement` 里**：
    // `export import X = ts.Y;` 实测就是
    // `[Keyword(export), Import(X = ts.Y)]` 两个**平级**的顶层单元，
    // 于是 `export` 被投成一个孤零零的 `ExportKeyword`、`ImportEqualsDeclaration`
    // 从 `import` 起算（实测 `typescript.d.ts` 的二十来条 `export import … = …` 全中：
    // 缺 `ImportEqualsDeclaration` 21 + 多出 21）。
    //
    // 判据与 `projectStatement` 那一支**同一套**：前缀词只能是 export / declare / default，
    // 后面那一格投出来必须是一条**语句**——**问那一格 token 自己**
    // （`IsStatementNode()`，第 1039 轮；原来是投影层那张按 kind 查的 `STATEMENT_KINDS`）。
    //
    // **第 1124 轮**：那三个前缀词改读被问那一页的**属性**（`IsExportKeyword` /
    // `IsDeclareKeyword` / `IsDefaultKeyword`，都在 `Keyword.SetValue` 记下正文那一刻赋好）
    // ——原来是 `["export", "declare", "default"].includes(items[j].TextValue)` 这种
    // **按固定字面量比正文**的写法，而「我这一格的正文是什么」只有那一页知道。
    // 原来连写的 `items[j].IsKeywordUnit &&` 半句一并收掉：基类给那三格默认 `false`
    // （只有 `Keyword` 那一页答 `true`），非关键字永远进不来——与第 1118 轮同一条口径。
    if (items[i].IsKeywordUnit) {
      let j = i;
      while (
        j < items.length &&
        (items[j].IsExportKeyword === true ||
          items[j].IsDeclareKeyword === true ||
          items[j].IsDefaultKeyword === true)
      ) {
        j++;
      }
      if (j > i && j < items.length) {
        if (items[j].IsStatementNode) {
          const declaration = projectNode(items[j], ctx);
          if (declaration !== undefined) {
            const leading = [];
            for (let k = i; k < j; k++) {
              const one = projectNode(items[k], ctx);
              if (one !== undefined) leading.push(one);
            }
            const modifiers = [...leading, ...(declaration.modifiers ?? [])];
            modifiers.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
            declaration.modifiers = modifiers;
            declaration.pos = startOf(items[i]);
            out.push(declaration);
            i = j + 1;
            continue;
          }
        }
      }
    }
    // **`export default` + 一条声明**（第 579 轮）：与上面那一支**同一件事**，
    // 缺的是「前缀词住在 `Export` 单元里」这一形状。
    //
    // `export default interface I {}` 的产物是 `[Export(export default), Interface]` **两格平级**：
    // `Interface.Success` 只往前吃**一个** `export` 词（`interface.xl.md`），吃不下 `default`
    // ⇒ 两个词留在外面成了 `Export` 单元；而 `export default class C {}` 走的是 `Class` 自己那条
    // `modifiers="export,default"` 的路（**一个单元**）⇒ 只有接口这一族露出来
    // （实测 `decl-interface-export-default.ts`：缺 `InterfaceDeclaration`、
    // 多出 `ExportDeclaration` + 平级的 `InterfaceDeclaration`）。
    //
    // 合并那一套**不在这里重写**：`projectExport` 里第 153 轮就有一支
    // 「`Export` 单元 + 一条声明 ⇒ 修饰词并进声明、起点从 `export` 起」，它只挂在
    // `projectStatement` 那一支上——而这一格**根本没有语句壳**（顶层平级）。两个入口问同一句
    // （与第 507 / 556 轮同一条理由：各写一份会漂）。
    //
    // **「哪些标签算声明单元」这件事第 1036 轮改由单元自己答**（`Token.IsDeclarationUnit`）：
    // 名单里那五个标签（`Interface` / `Class` / `Function` / `Enum` / `Namespace`）
    // **就是那五页自己的类名**，所以它住在各自那一页，投影这一侧不再存第二份
    // （原来这里是 `DECLARATION_UNITS` 那个集合）。
    // **名单仍是第 153 轮那一份**（第 579 轮试过收窄到 `interface` / `class` / `function`
    // 三种，又放回来了）：TS 那边能把 `export default` 收成**修饰词**的确实只有这三种，
    // 可三种别的形状一量，收窄的净效果是**一处变好、一处变差**——
    //
    // | 形状（`tmp/recon/r579-shapes/`） | 第 578 轮 | 收窄后 |
    // | --- | --- | --- |
    // | `export default interface I { … }` | 缺 1 / 多 2 | **四栏全零** |
    // | `export default namespace N { … }` | 缺 4 / 多 4 | 缺 3 / **漂 1** / 多 3 |
    // | `export default enum E { A }` | 缺 3 / 多 3 | 缺 3 / 多 3 |
    //
    // 后两种本来就**不是合法 TS**（`export default enum` 两个词实测在 `ts.createSourceFile`
    // 那边是**一个 `ExportAssignment`**：`MISS ExportAssignment TS[0,14)` +
    // `MISS Identifier TS[14,14)`），两版都不可能是零；而「漂移」比「缺 + 多」难收拾
    //（一个区间要挪、两个节点要挪），所以那一轮不动名单——只把「哪一格问哪一份」收成一份。
    //
    // 判据两道：① 这一格的文本以 `default` 收尾（`export = X` / `export { a }` 都排除在外——
    // `export { a }` 后面跟一条声明时**不是**这个形状，语料里有那种排版）；
    // ② 紧跟那一格**自己答**它是一个声明单元（`IsDeclarationUnit`，第 1036 轮——
    // 名单里的五个标签就是那五页自己的类名，所以它住在各自那一页）。
    if (items[i].IsExportUnit && i + 1 < items.length) {
      const unitText = items[i].Text.trim();
      if (DEFAULT_TAIL.test(unitText) && items[i + 1].IsDeclarationUnit) {
        const merged = projectExport(items[i], ctx, items.slice(i + 1), endOf(items[i + 1]));
        if (merged !== undefined) {
          out.push(merged);
          i += 2;
          continue;
        }
      }
    }
    // `undefined` = 这个单元在 TS 那边不是它自己的一格（只有注释的语句、孤零零的 `;`）。
    //
    // **这一格里那个收尾 `;` 归谁**（第 838 轮）：`projectStatement` 那一支只看得到原文里
    // 前面那一格字符（`;` 前面是 `}`），而 TS 问的是**上一条语句自己调不调 `parseSemicolon`**——
    // `const o = { a: 1 }` 换行 `;` 里那个 `;` 归 `VariableStatement`（它的区间含 `;`），
    // 而 `function f() {}` 换行 `;` 里那个是**新的空语句**（带体的声明收在 `}` 上）。
    // 两种形状的前一格都是 `}`，所以这一问必须由**知道上一条是什么**的这一层来问，
    // 判据只有一份：`ownsTrailingSemicolon`（`ENDS_ON_BRACE` 那一份名单 + 三档特例）。
    //
    // **只在「这一格自己不成节点」或「它投出来的就是那个空语句」时接管**：
    // 别的一律照旧走 `projectStatement` 的读数（`;;` 那一格、`;` 顶一条语句那一格都在里面）。
    const projected = projectNode(items[i], ctx);
    // **`trailingSemicolonOf` 那一格第 1101 轮并进了这个唯一调用点**（判据与第 1043 /
    // 1044 / 1067 / 1070 / 1080 / 1087 / 1100 轮并掉那些转发同一把尺子：全仓只有这一处
    // 真实读者，而且拿到的就是它返回的那个数）。判据原样保留，写在下面这几行旁边：
    //
    // **这一格（一个产物单元）末尾那个 `;` 的位置**：第 1149 轮起由**被问的那一格自己答**
    // （`Token.TrailingSemicolonAt`）——算式、判据、每一句为什么这么写都搬到了那一页，
    // 投影这一侧只剩一次属性读。读数（全语料 1640 份）记在那一页。
    // 判据落在**这一格自己的原文区间**上，而不是「这一格的起点是不是 `;`」：注释会把紧跟的
    // `;` 一起收进同一格（`function f() {} /*c*/;` 的那一格起点在注释上、`;` 在末尾），
    // 按起点判就会把整格当成 trivia 丢掉（第 838 轮，实测那一格缺一个 `EmptyStatement`）。
    // **落在注释里面的 `;` 不算**（这一条是**普查当场红的**）：一整行注释以 `;` 收尾时
    // （`//     : never;` 这种行——`dist/ts` 里成片都是），这一格的末字符也是 `;`，
    // 可它属于注释、不是语句终结符。
    const semi = items[i].TrailingSemicolonAt;
    if (
      semi !== undefined &&
      !ctx.consumedSemicolons.has(semi) &&
      (projected === undefined || (projected.kind === "EmptyStatement" && projected.pos === semi))
    ) {
      const previous = out.length > 0 ? out[out.length - 1] : undefined;
      // **上一条已经把这一格盖住了**（那个 `;` 落在它的区间里）：`import { a } from "m"`
      // 换行 `;` 里导入声明自己就吃着那个 `;`（它的区间到 `;` 为止），这一格什么都不出
      // ——原来那一支只写「并进上一条」，就是靠这一问把这种格子挡在外面的。
      const covered = previous !== undefined && typeof previous.end === "number" && semi < previous.end;
      if (
        !covered &&
        previous !== undefined &&
        typeof previous.end === "number" &&
        semi >= previous.end &&
        ownsTrailingSemicolonOf(previous, ctx)
      ) {
        // **被吃掉的 `;` 要算进上一条语句的终点**（第 167 轮）：`let a = 1` 换行 `;[1, 2].forEach(f)`
        // 里那个 `;` 在 TS 那边是上一条 `VariableStatement` 的**终结符**（`tryParseSemicolon`
        // 不看换行），所以上一条的区间要含它（实测 `st-asi-array.ts` / `st-asi-paren.ts`：
        // 上一条语句的终点各短一格）。
        previous.end = semi + 1;
        i++;
        continue;
      }
      // **不成节点的**那一档要在这里补出空语句（`function f() {} /*c*/;` 里那一格是
      // 「注释 + `;`」：`projectStatement` 按起点判、起点在注释上，于是整格被丢掉）。
      if (projected === undefined && !covered) {
        out.push({ kind: "EmptyStatement", pos: semi, end: semi + 1 });
        i++;
        continue;
      }
    }
    if (projected !== undefined) {
      out.push(projected);
    }
    i++;
  }
  return out;
```

（**`asStatement` 这一格第 1087 轮删掉了**：它全仓只有 `projectEach` 里「顶层标签」那一支一个读者，
所以连同这一节一起并进了那个唯一的调用点——判据与第 1043 / 1044 / 1070 / 1080 轮那把尺子
（**只有转手、没有独立判据的一格声明就是多一层间接**）逐字相同。它原来答的那一句没有变：
**标签右边那一格必须是「语句」**（第 566 轮）——TS 的 `LabeledStatement.statement` 是 `Statement`，
体是**表达式**时（`done: f()`、`{ a: 1 }` 里的 `a: 1`）那边是 `ExpressionStatement > 表达式`，
而产物给的是「`Label` 平级兄弟 + 裸表达式」⇒ 少一整层壳（实测三份用例各缺一个
`ExpressionStatement`：`stmt-label-statement`、`am-object-vs-block`、`stmt-object-vs-block`）。
**判据是 kind 的后缀**：`IsStatementNode`（第 1039 轮）是「**单个子单元**是它时不再套壳」的名单，
它漏了 `ExpressionStatement` 自己、`ForInStatement`、`WithStatement` 这些（`projectStatement`
那一支只在「`kids.length === 1`」时才用它，而那里的体是**投影结果**，范围大得多）。
TS 那边「本来就是语句」的 kind 只有三类：`*Statement`、`*Declaration`、
以及 `Block` / `ModuleBlock` —— 表达式 kind 一个都不沾这三类，所以后缀判据不会误判。
**`end` 由调用点给**：壳体那一路（`projectStatement`）不在这一格里——它自己就带着语句壳，
走的是另一条路（`labeled` 那一处用的是体自己的 `end`）；根列表这一路（`projectEach`）
没有壳，就从体自己的终点算，也就是并进来那一句 `statement.end ?? 0`。）

# private method labeled:(labelUnit:any, statement:any)=>any

一个标签 + 它标的语句 → `LabeledStatement`。

标签名那个 `Identifier` 的区间**不含冒号**：产物给的是 `Label[0,5]`（盖住 `outer:`），
而 TS 的 `Identifier(outer)` 是 `[0,5)`——所以按**名字宽度**切，不从标签单元直接抄。

```ts
  const text = String(labelUnit.label ?? "");
  const at = startOf(labelUnit);
  return {
    kind: "LabeledStatement",
    label: { kind: "Identifier", text, pos: at, end: at + text.length },
    statement,
    pos: at,
    end: statement.end,
  };
```

# private method stmtEndOf:(v:any, ctx:any)=>int

语句的**投影终点**：把尾部的 trivia（换行 / 空白）剪掉。

本工程的语句区间**含尾部的换行**（ASI 断句时那一行软换行算在语句里），
而 TS 的语句**从不含尾部 trivia**——实测 `A.x = 1`（无分号，下一行是 `}`）：
产物给 `[82,90)`，TS 的 `ExpressionStatement` 是 `[82,89)`，差的就是那个换行符。

注意**不能顺手剪分号**：TS 的语句是**含**分号的（`x = 1;` ⇒ `ExpressionStatement[0,6)`），
分号的归属只在 `let` 那三层的**内两层**上另有口径（见 `projectLet`）。

```ts
  let end = v.end;
  // **尾部注释也要剪掉**（第 132 轮）：TS 的节点终点**从不含 trivia**，而产物常把
  // **下一个声明的 JSDoc** 收进本声明的区间——
  //
  //     declare function request<…>(…): Promise<…>;
  //
  //     /** A faster version of `request`. */
  //     declare function stream<…>(…): …;
  //
  // 上面那条 `FunctionDeclaration` 的区间一直撑到那段注释结束（实测 `undici-types/api.d.ts`
  // 四条函数声明、`cache-interceptor.d.ts` 的 `type GetResult` 一族：漂移 + 多出各一份）。
  // 注释可能嵌得很深（上面那条是落在 `ReturnType > TypeDefine` 里的），所以沿
  // 「区间终点正好等于当前 `end`」的那条链**递归**找下去——每层最多命中一个孩子，
  // 代价与一个节点到它最后一个叶子的深度成正比。
  // **收尾 trivia（注释）在这条区间链上的起点**（第 1117 轮就地展开；它原来是本页单独一格
  // `trailingTriviaStart`，**唯一读者就是下面这一处**）：只在「区间终点正好是这个 `at`」的
  // 子孙里找，所以每一层至多一个候选——这既是正确性（别的注释不属于本节点的尾巴），
  // 也是代价的上界。
  // **「这一格是不是一条注释」第 1084 / 1085 轮收进了被问的那一页**（用户口径 1.1 / 1.3）：
  // 判据原来是两连比类名 `k.Tag === "LineAnnotation" || k.Tag === "AreaAnnotation"`，
  // 而**类名就是那两页自己的名字**——今天基类默认 `false`、`LineAnnotation` / `AreaAnnotation`
  // 各自显式声明 `## field IsCommentUnit:bool = true`（构造时就赋好的常量），这里只读这一格。
  // **它不是 `IsInvisible`**：那一格答 `true` 的有四页（还有 `LineWrap` 软换行与
  // `PreprocessorDirectives` 预处理指令），而收尾 trivia 只认两种注释——两问是两句话。
  const trailingTriviaStartOf = (unit: any, at: int): int => {
    for (const k of allKids(unit)) {
      // **这一格自己的两头**（第 1018 轮）：不再有 `range` 那一层，问单元自己的 `start` / `end`。
      if (k.end !== at) continue;
      if (k.IsCommentUnit) return k.start;
      const inner = trailingTriviaStartOf(k, at);
      if (inner !== undefined) return inner;
    }
    return undefined;
  };
  while (end > v.start) {
    while (end > v.start && WHITESPACE.test(ctx.source[end - 1])) end--;
    const at = trailingTriviaStartOf(v, end);
    if (at === undefined || at < v.start) break;
    end = at;
  }
  return end;
```

# private method projectStatement:(v:any, ctx:any)=>any

```ts
  // **这一串是「进投影」的那些**（第 1066 轮，`v.ProjectableKids`）：注释 / 软换行这类 trivia
  // 不在里面——这一格下面的每一档判据与投法要的都是滤过的那一串（老代码是两个 helper，
  // 现在是 token 自己的那一格）。**要「含 trivia 的全部」时另外读 `v.children`**，
  // 例如标签那一支里交给 `statementOfList` 的那一串（见那一处说明）。
  const kids = v.ProjectableKids;
  // **只有注释的语句不是语句**：`// xl:expect …` 这样的行在本工程是一层 `Statement`
  // 包着一个注释单元，而 TS 那边注释是 **trivia**、`forEachChild` 完全看不见它。
  // 早先这里退回一个 `ExpressionStatement`，于是每份用例文件都凭空多两个节点
  // （顶层 `pos=0` 的 `ExpressionStatement`），连 `SourceFile.getStart()` 都被带歪。
  //
  // **但空语句 `;` 是一个 `Statement`**（第 141 轮）：语句规则把孤零零的 `;` 收成一个
  // **没有内容**的 `Statement`（`;` 是语句终结符、不进 `Data`），而 TS 那边它就是
  // `EmptyStatement`（区间正好是那个 `;`）。三处形态都在语料里：`;` 顶一条语句、
  // `if (a) ;` 的体、函数体里的空语句。
  if (kids.length === 0) {
    if (v.Text.startsWith(";")) {
      // **已经被上一条语句吃掉的 `;` 不再是空语句**：TS 的 `parseExpressionStatement`
      // 收尾会把紧跟的那个 `;` 算作自己的终结符（`tryParseSemicolon` 不看换行），
      // 所以 `;(function(){})()` 换行 `;…` 里第二行的 `;` 属于**上一条**语句。
      // `semicolonEndOf` 吃掉它时在这里记了一笔（见那一处说明）。
      if (ctx.consumedSemicolons !== undefined && ctx.consumedSemicolons.has(v.start)) {
        return undefined;
      }
      // **判据落在原文排版上**：真正的空语句（防御性分号）永远写在**行首**——
      // `;` 顶一条语句、`if (a) ;` 的体、函数体里的空语句都是这一形状。
      // 而 `.d.ts` 里「成员声明后面那个 `;`」写在**行尾**（`a: string;`），TS 那边它不是节点。
      // 语句规则分不出这两者（都只是「孤零零一个 `;`」），所以在这里按行首 / 行尾筛：
      // 一刀切收下来会让整个语料多出 3439 个 `EmptyStatement`（实测，第一次就是这么翻车的）。
      // **中间那些 `;` 归上一条还是自成一条，由列表那一趟按 kind 定**（见 `projectEach` 的
      // 「被吃掉的 `;`」那一支）—— 这里只把「行首的」放行，其余交出去。
      let lineStart = v.start;
      while (lineStart > 0 && ctx.source[lineStart - 1] !== "\n") lineStart--;
      // **前面只有别空语句时也算行首**（第 179 轮）：`;;` 的第二个 `;` 前面那格是第一个 `;`，
      // 而 TS 那边两个各是一个 `EmptyStatement`（实测 `stmt-empty-semicolon.ts`：
      // 只投出第一个）。所以「行首」的判据放宽成「这一行到这里为止只有空白与 `;`」。
      const beforeOnLine = ctx.source.slice(lineStart, v.start);
      if (beforeOnLine.trim() !== "" && !SEMICOLONS_AND_SPACES.test(beforeOnLine)) {
        return undefined;
      }
      // **行首的 `;` 也可能是上一条语句的终结符**（第 167 轮）：TS 的 `tryParseSemicolon`
      // 不看换行——`let a = 1` 换行 `;[1, 2].forEach(f)` 里那个 `;` 属于 **VariableStatement**
      // （TS 的区间 [26,37) 把它算进去了），紧跟的 `[1, 2]…` 才是新语句。
      // 判据是**上一个有内容的行**：那行是代码（`const x = f`）时这个 `;` 就是它的终结符；
      // 是注释行或空行时（`// 注释` 换行 `;(function(){})()`、文件开头的 `;;`）才是真空语句
      // （实测 `st-asi-array.ts` / `st-asi-paren.ts` 与反例 `fn-iife.ts` / `stmt-empty-semicolon.ts`）。
      let previousChar = v.start - 1;
      while (previousChar >= 0 && WHITESPACE.test(ctx.source[previousChar])) previousChar--;
      if (previousChar >= 0) {
        // **块 / 语句之后的分号照收**（第 178 轮）：`function f() {` 换行 `;` 里那个 `;` 是
        // TS 的 `EmptyStatement`（`st-misc-keywords.ts` 缺的就是它），`;;` 的第二个同理。
        // 只有前面是**一个表达式的结尾**（名字 / 数字 / 引号 / `)`…）时，这个 `;` 才是
        // 上一条语句的终结符。
        if (";}{".includes(ctx.source[previousChar])) {
          return { kind: "EmptyStatement", pos: v.start, end: v.start + 1 };
        }
        let previousLineStart = previousChar;
        while (previousLineStart > 0 && ctx.source[previousLineStart - 1] !== "\n") previousLineStart--;
        const previousLine = ctx.source.slice(previousLineStart, previousChar + 1).trim();
        const commentOnly =
          previousLine === "" ||
          previousLine.startsWith("//") ||
          previousLine.startsWith("/*") ||
          previousLine.endsWith("*/");
        if (!commentOnly) {
          return undefined;
        }
      }
      return { kind: "EmptyStatement", pos: v.start, end: v.start + 1 };
    }
    return undefined;
  }
  const head = kids[0];
  // **已经包住语句的标签：在这一层把它展开**（第 1022 轮）。`Statement.AbsorbLabels`
  // 会把被标的语句折进标签里（`<Label label="a"><For>…</For></Label>`，第 929 轮），
  // 于是这一格是一个单元、而它的形状**不是**声明族那一档 —— 让它落到通用支会投成
  // `ExpressionStatement > LabeledStatement`（被标语句整棵子树丢掉：实测 label 一族
  // 5 条各漂 1~6 多 1~6）。
  //
  // **为什么在这里展开、而不是 `return projectNode(head)`**：后者会绕回
  // `projectNode(head)` → 「通用支 ⇒ `projectDeclaration`」→ 又回到 `projectNode`
  // ⇒ 当场无限递归（实测 `Maximum call stack size exceeded`）。
  // 这一格要的是**语句**那一套口径，而 `projectStatement` 正是它 —— 把标签自己的子单元
  // 当成平铺的一串交回 `statementOfList`（与下面平级那一支**同一份实现**），再套上标签。
  // **判形状照旧读 `HasChildren`**（它答的是「我下面**有没有**东西」，含 trivia）。
  if (head.IsLabelUnit && head.HasChildren) {
    // **交给 `statementOfList` 的是「进投影的那一串」**（第 1066 轮）：标签与它标的语句之间
    // 夹着注释时，`head.children` 是 `[AreaAnnotation, For]`——注释是 trivia，交给那一条
    // 会让它去投一整条语句（实测多出 `ExpressionStatement`，`gap-a-comment-01` 一族 5 条）。
    // 老代码走的是 `projectableKids(head)`（滤过的那一串），所以这里读同一格
    // `head.ProjectableKids`。
    const body = statementOfList(head.ProjectableKids, ctx);
    if (body !== undefined) {
      return labeled(head, body);
    }
  }
  // **带标签的语句：壳里是 `[Label, 被标的语句]`**（第 536 轮）——
  // 与 `projectEach` 里那条「连续标签从右往左套」**同一件事**，只是那一条只在
  // **顶层列表 / 段**上跑（根那一层），而这里的 `Statement` 壳
  // **整条被当成一个单元**递进来 ⇒ 那一条永远看不到它。
  //
  // **少了它会怎样**（实测 `decl-label-break-continue.ts` 一族 **19 份**文件）：
  // 整条落进通用支 ⇒ 投出 `ExpressionStatement > LabeledStatement(只盖标签)`
  // ⇒ 被标的那条语句（`ForStatement` / `WhileStatement` …）连它整棵子树一起丢
  //（一鱼多吃：`BreakStatement` 22 份 + `Block` 20 份 + `CallExpression` 23 份都在这一族里）。
  // **只认「还没包住语句」的标签**（第 929 轮，与 `projectEach` 那一支同一句）：
  // 包好的标签是**一个**单元（`kids.length === 1`），由它自己的 `PrintAst` 出形状；
  // 这一支管的是老形状（标签 + 被标语句平级，`kids.length >= 2`）。
  if (head.IsLabelUnit && kids.length >= 2 && head.HasChildren === false) {
    const labels = [];
    let at = 0;
    while (at < kids.length && kids[at].IsLabelUnit) {
      labels.push(kids[at]);
      at++;
    }
    // **体要按「一条语句」投影，不能只投紧跟的那一个单元**（第 778 轮，**普查当场红的**）。
    // 标签在产物里**只收前缀**（`label.xl.md`：名字 + 冒号折成自闭合的 `Label`），
    // 被标的那条语句与它**平级**——于是 `lab: s += "1"` 在壳里是
    // `[Label, Identifier(s), SymbolToken(=), BinaryOperator(+)]` 四个单元。
    // 早先这里 `projectNode(kids[at])` **只投第一个单元** ⇒ 整条语句被换成那个孤零零的
    // `Identifier`（实测：`cjcli --ts-ast` 给 `ExpressionStatement > Identifier`，
    // 区间还盖着整条语句；执行侧于是把 `s += "1"` 整条丢掉、只剩下一行 `s += "2"`）。
    // 循环 / 分支 / 块那几档看不出来——它们是**已经成形的一个单元**，
    // 一个单元本来就是一条语句（`outer: for (…)` / `blk: { … }` 一直是对的）。
    //
    // **判据是「剩下的那一串按一条语句投」**，与 `lab: { … }` 那一格同源：
    // 这里把剩下那些单元交回**同一个** `projectStatement`（`statementOfList` 造的合成视图，
    // 原来这几行内联在这里；第 929 轮 `Label.PrintAst` 也要同一件事 ⇒ 收成一份）
    // ——那里已经有「语句壳 / 表达式壳 / `;` 归属」的全套口径，另写一份就是第二处会漂的答案。
    // **不会复发**：剩下那一串的**第一个单元不再是 `Label`**
    //（上面那个 `while` 已经吃掉了连续的标签）。
    const restKids = kids.slice(at);
    if (restKids.length > 0) {
      const body = statementOfList(restKids, ctx);
      if (body !== undefined) {
        let wrapped = body;
        for (let k = labels.length - 1; k >= 0; k--) {
          wrapped = labeled(labels[k], wrapped);
        }
        return wrapped;
      }
    }
  }
  // **`export = X` / `export default X`**：产物那边表达式是 `Export` 单元的**平级兄弟**
  // （`Statement > [Export(export/=), 表达式]`），所以整条语句要交给 `projectExport`。
  //
  // **`kids.length >= 1`，不是 `> 1`**（第 87 轮修）：具名导出 `export { a as b }` 的语句里
  // 只有 `Export` **一个**单元（`{…}` 在它里面），`> 1` 的判据把它漏给了通用投影——
  // 于是括号里每个单元（含 `as` / `type` 两个词）都成了平级子节点，
  // 而 `ExportSpecifier` 一个也没投出来。
  if (head.IsExportUnit && kids.length >= 1) {
    // **语句那一格的终点**要一起递进去（第 548 轮）：具名导出的尾分号不在
    // `Export` 单元自己的区间里（见 `projectExport`）。
    return projectExport(head, ctx, kids.slice(1), stmtEndOf(v, ctx));
  }
  if (head.IsLetUnit) {
    // `Let` 不只是一个节点：`=` 与初始化式是它的**平级兄弟**，所以整串交给列表版
    // `projectLetFrom`（**注意这里传的是「语句」的整串子单元**，不是 `Let` 那一个单元——
    // 那个单元自己的 `PrintAst` 只拿得到 `const f` 那一段，见 `tokens/let.xl.md`）。
    return projectLetFrom(v.ProjectableKids, ctx, v).statement;
  }
  // **`with (obj) { … }`**（第 137 轮）：产物是 `Statement > [Keyword(with), Bracket((obj)), Bracket({…})]`，
  // 而 TS 那边是 `WithStatement{ expression, statement }`。照通用支会整条投成一个
  // `ExpressionStatement`（实测 `st-with` / `stmt-with` 两族共 20 处）。
  // 体那个 `{` 里的语句由 `IsStatementStart` 新加的那一条（`with` 后面的括号）负责成形成 `Statement`。
  // **第 1119 轮**：「这一格的正文是不是那个 `with`」改由被问的那一页答
  // （`Keyword.SetValue` 里赋好的 `IsWithKeyword`；`IsKeywordUnit` 那半句随之收掉）。
  if (head.IsWithKeyword === true) {
    const header = kids.find((k) => k.IsParenBracket);
    const body = kids.find((k) => k.IsBraceBracket);
    const withProps = {};
    if (header !== undefined) withProps.expression = projectExpression(header.ProjectableKids, ctx);
    if (body !== undefined) {
      withProps.statement = {
        kind: "Block",
        statements: projectEach(kidsOf((body), "children"), ctx),
        pos: startOf(body),
        end: endOf(body),
      };
    }
    return { kind: "WithStatement", pos: v.start, end: stmtEndOf(v, ctx), ...withProps };
  }
  // ---- 关键字开头的语句（`return` / `throw` / `break` / `continue` / `debugger`）----
  if (head.IsKeywordUnit) {
    // **`export` / `declare` 前缀 + 一条声明**（第 100 轮）：`export declare namespace Client {…}`
  // 的产物是 `Statement > [Keyword(export), Namespace(modifiers="declare")]`，而 TS 那边是
  // `ModuleDeclaration.modifiers = [ExportKeyword, DeclareKeyword]`（前缀词进**修饰词**、
  // 声明自己就是那条语句）。照下面的通用支会整条投成一个 `ExpressionStatement`
  // ——实测「多出 `ExpressionStatement`」410 里的一片（`undici-types` 整个 `export declare
  // namespace` 家族、`@types/node` 的 `declare module` 家族都在里面）。
    const prefixWords = kids.slice(0, kids.length - 1);
    const last = kids[kids.length - 1];
    // **第 1124 轮**：三个前缀词改读被问那一页的属性（与上面 `projectRoot` 那一支同一份判据、
    // 同一条理由）——`IsKeywordUnit` 那半句一并收掉，非关键字由基类的默认 `false` 挡住。
    const allPrefixes = prefixWords.every(
      (k) =>
        k.IsExportKeyword === true || k.IsDeclareKeyword === true || k.IsDefaultKeyword === true,
    );
    // **「后面那一格是不是一条语句」问它自己**（`IsStatementNode()`，第 1039 轮）：
    // 原来是投影层那张按 kind 查的 `STATEMENT_KINDS`，而 kind 名就是各页自己的节点名。
    if (prefixWords.length > 0 && allPrefixes && last.IsStatementNode) {
      const declaration = projectNode(last, ctx);
      if (declaration !== undefined) {
        const leading = prefixWords.map((k) => projectNode(k, ctx)).filter((k) => k !== undefined);
        const modifiers = [...leading, ...(declaration.modifiers ?? [])];
        modifiers.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
        declaration.modifiers = modifiers;
        declaration.pos = v.start;
        return declaration;
      }
    }
    // **头部那个词决定整条语句是什么**（第 34 轮；第 1027 轮改成问 token 自己）：
    // 「哪几个词能当语句头、各自叫什么节点」是 `Keyword` 那一页自己的事实
    // （`Keyword.StatementKind`，键就是它的 `Value`），投影不按文本查第二张表。
    const kind = head.StatementKind;
    if (kind !== undefined) {
      const rest = kids.slice(1);
      const props = {};
      // **没有表达式的 `throw`：TS 补一个零宽 `Identifier`**（第 906 轮）。
      //
      // `throw` 是 ASI 的**受限产生式**（换行就断句），而后面没有表达式时本仓的产物是
      // 光秃秃一个 `Keyword(throw)`（合法 TS 里不会出现——它是一条语法错，TS 那边
      // `parseDiagnostics` 只在**同一行**那种写法上报 "Expression expected."，
      // 换行那种写法**一条诊断都不报**，所以它可以是一条普通语料用例）。
      // TS 仍然建了一个**零宽** `Identifier` 当 `expression`（`forEachChild` 会访问它），
      // 于是尺子上报「缺 1 格 + 字段名不符 1 处」——`FIELD ThrowStatement 产物[] vs TS[expression]`。
      //
      // **位置取 `stmtEndOf`（不含尾分号的那一格）**，实测就是 TS 放那一格的地方：
      // `function f(){ throw` 换行 `}` ⇒ `ThrowStatement [13,19)`、`Identifier [19,19)`；
      // `const a = 1; throw;` ⇒ `Identifier [18,18)`（`;` 那一格）；文件末尾的 `throw` ⇒ [`5,5`)。
      // 三处都与「语句自己那一段的末尾」重合（本仓的语句壳本来就**不含**尾随 trivia），
      // 所以这一格不必回原文再扫一遍。
      //
      // **与数组的洞那一条同一个先例**（第 176 轮的 `OmittedExpression`）：
      // 产物里那一格什么都没有时，补一个零宽节点把「这一段是空的」这件事说出来。
      const bareEnd = stmtEndOf(v, ctx);
      if (rest.length > 0) {
        const value = projectExpression(rest, ctx);
        // **载荷进哪个字段由那一格自己答**（第 1037 轮）：`return` / `throw` 是 `expression`、
        // `break` / `continue` 是 `label`（`head.StatementField`）。这一支只在
        // `head.StatementKind` 有答案时进来，而那一格**只有 `Keyword` 那一页覆写**——
        // 所以 `field` 在这里一定有值，与原来那张 `KEYWORD_STATEMENT_EXPRESSION` 同答；
        // 那份名单搬回了它该在的地方（那些 kind 名就是那一页词汇表的值）。
        const field = head.StatementField;
        if (value !== undefined && field !== undefined) props[field] = value;
      } else if (kind === "ThrowStatement") {
        props["expression"] = [{ kind: "Identifier", pos: bareEnd, end: bareEnd }];
      }
      // **收尾那个 `;` 归它自己**（第 838 轮）：`parseBreakOrContinueStatement` /
      // `parseReturnStatement` 收尾都调 `parseSemicolon()`，所以 TS 的区间含 `;`——
      // 而这一族的产物是「`Keyword` + 一段平级兄弟」、`;` **根本不在壳里**
      // （`for (;;) break;` 那个 `;` 被外层 `For` 收走，`break label;` 那个落在兄弟格上）
      // ⇒ 只按壳算就短一格。实测 `gap-m-misc-01`（`break;`）/ `-02`（`continue;`）/
      // `gap-a-comment-01`（`break label;`）各漂 1。
      return Object.assign({ kind }, props, {
        pos: v.start,
        end: semicolonEndOf(bareEnd, ctx),
      });
    }
  }
  // `head` 是不是名字上的**类型别名**（`TypeAssign`，`export type T = …` 的外壳还是 `Statement`）。
  if (kids.length === 1) {
    // **语句壳套语句壳是透明的**（第 929 轮）：上游会把「注释 + 被标的语句」先收成一条壳
    // （`blk :/*c*/{ … }` 里注释落在标签与块之间 ⇒ `Statement > [AreaAnnotation, Bracket]`），
    // 而那一格自己会投（`Statement.PrintAst` → `StatementOf`）⇒ 这里**直接交回它**。
    // 少了这一条，它会落到下面的表达式支 ⇒ 多一层 `ExpressionStatement`
    // （实测 `blk :/*c*/{ … }` / `lbl :/*c*/class C { … }` / `lbl :/*c*/function f() { … }` 一族 8 条）。
    if (head.IsStatementShell) {
      return projectNode(head, ctx);
    }
    const kind = head.AstKind;
    if (kind !== undefined) {
      // **`export type T = …` 的 `pos` 在外层 `Statement` 上、修饰词在 `TypeAssign` 上**：
      // 起点取外层的 `v.start`，所以把外层起点**经 `ctx.baseStart` 递进去**
      // （`TypeAssign` 的投影已搬进 `tokens/type-assign.xl.md`，入口在那边，见第 197 轮）。
      let projected;
      if (head.IsTypeAssignUnit) {
        const savedBaseStart = ctx.baseStart;
        ctx.baseStart = v.start;
        try {
          projected = projectNode(head, ctx);
        } finally {
          ctx.baseStart = savedBaseStart;
        }
      } else {
        projected = projectNode(head, ctx);
      }
      // 单个子单元**本身就是语句**（`if` / `class` / `import`…）⇒ 不再套壳；
      // 是**表达式**（`f(1)` / `a + b` / `new X`）⇒ TS 那边是 `ExpressionStatement > 表达式`。
      //
      // **类型别名要把尾分号吃进来**（第 535 轮）：`type F = (a) => B;` 在 TS 那边
      // `TypeAliasDeclaration` 的区间是 `[239,281)`（**含 `;`**，`Node.end` 就是分号之后），
      // 而产物这边 `TypeAssign` 自己的区间只到 `B` ⇒ 差一格
      //（实测 `expr-arrow-body-nested-ternary.ts` 一族 **21 份**文件各一处，
      //  修完全语料 850 → **871**）。别的语句族（`if` / `class` / `import` / `function`…）
      // **不能**这么吃 —— 它们的尾分号 TS 那边不算在自己身上（`class A {};` 的
      // `ClassDeclaration` 到 `}` 为止），所以只对 `TypeAliasDeclaration` 开这一档。
      // **「单个子单元本身就是语句」问那一格自己**（`IsStatementNode()`，第 1039 轮）：
      // 原来是投影层那张按 kind 查的 `STATEMENT_KINDS`，而 kind 名就是各页自己的节点名。
      if (head.IsStatementNode) {
        if (kind === "TypeAliasDeclaration") {
          projected.end = semicolonEndOf(
            Math.max(stmtEndOf(v, ctx), projected === undefined ? 0 : (projected.end ?? 0)),
            ctx,
          );
        }
        // **没体的函数声明也要吃尾分号**（第 838 轮）：`declare function f(): void /* c */ ;`
        // 在 TS 那边 `FunctionDeclaration` 的区间到 `;` 为止（第 663 轮那张表里它就写着
        // 「没体的是环境签名 / 重载，那个 `;` 归它自己」），而产物这边声明自己的区间只到
        // 最后一个实义单元（`;` 前面那条注释被 `stmtEndOf` 剪掉了）⇒ 整条短一大截
        // （实测 `decl-declare-function-trailing-comment`：缺 1 漂 1 多 1）。
        // **带体的那一档不在这一档**：它收在 `}` 上，`;` 是另一条 `EmptyStatement`。
        if (kind === "FunctionDeclaration" && projected.body === undefined) {
          projected.end = semicolonEndOf(projected.end ?? 0, ctx);
        }
        return projected;
      }
      // **终点不能早于表达式自己**（第 141 轮）：IIFE `(function () {…})()` 里那个 `Statement`
      // 单元的区间只到函数体那个 `}`，调用自己的 `()` 挂在 `Method` 上——见下面那一支的说明。
      // 收尾那个 `;` 也按 TS 的口径吃掉（见 `semicolonEndOf`）。
      return {
        kind: "ExpressionStatement",
        expression: projected,
        pos: v.start,
        end: semicolonEndOf(
          Math.max(stmtEndOf(v, ctx), projected === undefined ? 0 : (projected.end ?? 0)),
          ctx,
        ),
      };
    }
    // **裸块语句**（第 123 轮）：`{ … }` 在 TS 那边**本身就是一条语句**，
    // 不能再套 `ExpressionStatement`——`Bracket` 的 `AstKind()` 答 `undefined`，
    // 所以上面那一支漏掉它，整块会被套上一层壳。
    if (head.IsBraceBracket) {
      return projectNode(head, ctx);
    }
  }
  const expression = projectExpression(kids, ctx);
  return {
    kind: "ExpressionStatement",
    expression,
    pos: v.start,
    // **终点不能早于表达式自己**（第 141 轮）：IIFE `(function () {…})()` 里那个 `Statement`
    // 单元的区间只到函数体那个 `}`，而调用自己的 `()` 在 `Method` 上——
    // 于是表达式语句比 TS 短两个字符（实测 `fn-iife.ts` / `stmt-paren-start.ts` 各 2 处漂移）。
    end: semicolonEndOf(
      Math.max(stmtEndOf(v, ctx), expression === undefined ? 0 : expression.end),
      ctx,
    ),
  };
```

# private method semicolonEndOf:(end:int, ctx:any)=>int

`end` 之后跳过空白与注释，如果紧跟着一个 `;` 就把它算进来；否则原样返回。

**这是 TS 自己的口径**：`parseExpressionStatement` 收尾时调 `parseSemicolon()`，
而 `tryParseSemicolon` **不看换行**——当前 token 是 `;` 就吃掉。所以

    ;(function () { return 1 })()
    ;(function (a) { return a })(1)

第一行那条 `ExpressionStatement` 的区间是 `[1,31)`（**含下一行行首**那个 `;`），
而产物那边那个 `;` 根本不在树里（它是独立的一条空语句），于是短两格
（实测 `fn-iife.ts` / `stmt-paren-start.ts` 各 2 处漂移）。

**自己已经以 `;` 收尾的不再往后找**（第 838 轮）：`parseSemicolon` 只吃**紧跟**的那一个
`;`，吃过就不再吃第二个——`f();` 换行 `;` 里第二行那个 `;` 是**新的空语句**，
原来的写法一路跳过去把它算成了上一条的终结符（实测 `f();` 换行 `;`：上一条漂 1、
空语句缺 1）。判据落在**这一条自己的原文**上，与 `ownsTrailingSemicolon` 那一格同源。

```ts
  if (end > 0 && ctx.source[end - 1] === ";") return end;
  let at = end;
  for (;;) {
    while (at < ctx.source.length && WHITESPACE.test(ctx.source[at])) at++;
    if (ctx.source.startsWith("//", at)) {
      while (at < ctx.source.length && ctx.source[at] !== "\n") at++;
      continue;
    }
    if (ctx.source.startsWith("/*", at)) {
      const close = ctx.source.indexOf("*/", at + 2);
      at = close < 0 ? ctx.source.length : close + 2;
      continue;
    }
    break;
  }
  return ctx.source[at] === ";" ? (ctx.consumedSemicolons.add(at), at + 1) : end;
```

# private method callArgumentsOf:(bracket:any, ctx:any)=>Array<any>

**一次调用右边那个括号里的实参**（第 1151 轮）：切顶层逗号 → 每组投成表达式 → 挡掉空组。

**为什么立这一格**：这一段算式在本页出现过 **18 次**（`projectExpression` 里「紧跟一对圆括号
就是一次调用」的每一条支），逐字重复的只有括号那一格的名字；按本文件一贯的口径
（同一份事实一处声明），把它收成一格——18 处各留一次调用。
判据一个字没改：`splitTopLevel` 仍按 `","` 切、空组仍给 `undefined`、`undefined` 仍然滤掉。

```ts
  return splitTopLevel(bracket.ProjectableKids, ",")
    .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
    .filter((a) => a !== undefined);
```

# private method projectExpression:(kids:Array<any>, ctx:any)=>any

一串单元 → 一个表达式。

四种折叠，按优先级从高到低：

1. **链**（成员访问与下标访问混排）`a.b.c` / `a[i].b` ⇒ **左结合的嵌套**
   （`PropertyAccessExpression` / `ElementAccessExpression`）。产物那边链是一个
   `PropertyAccess` 单元、子单元按原文顺序排；早先这里按「找第一个标点当运算符」处理，
   于是 `.` 被当成了二元运算符、折出一个 `BinaryExpression`：**heads 和 tails 两头都错**
   （TS 既没有那个 `BinaryExpression`，也没有 `.` 这个运算符节点）。
2. **二元 / 赋值** ⇒ `BinaryExpression`（`x = 1` / `a + b`）。
3. **后缀下标**（链没成形、只有平级两格时）⇒ `ElementAccessExpression`。
4. 单个单元 ⇒ 直接投影。

```ts
  // **注释是 trivia，不进表达式**（第 143 轮）：段里常夹着一整行注释——
  //
  //     ? // **数字键是 `NumericLiteral`**
  //       NUMERIC_LITERAL.test(…) ? { … } : nameUnits[0].NameNode
  //
  // 不过滤的话这一串会以注释打头，通用支把它投成一个 `LineAnnotation` 节点、
  // 后面真正的表达式整段丢掉（实测 `dist/ts/typescript/ts-ast.ts` 缺 15 / 多出 3）。
  // 那正是 `Token.ProjectableKids` 那一格的算式（逐格过滤），只是这里手上是**一段单元数组、
  // 不是某一格 token**，所以照它那一格写一遍（第 1066 轮起 `ProjectableKids` 是 token 上的属性，
  // 数组没有这一格）。
  kids = kids.filter((k) => k instanceof Token && !k.IsInvisible);
  if (kids.length === 0) return undefined;
  // ---- 0a'。**隔空格的 async 泛型箭头** `async <T>(x: T) => x`（第 860 轮）----
  //
  // 这一档必须**排在 0a 前面**：它的产物是**三格** `[Identifier(async), GenericType(<T>), Lamda(…)]`，
  // 而 0a 的判据只问「头一格是 `Identifier`、第二格是 `GenericType`」——它当场把 `async <T>`
  // 认成实例化表达式（`ExpressionWithTypeArguments`），剩下的 `Lamda` 再走 `foldBinaryFrom`
  // ⇒ 实测 `expr-async-generic-arrow-spaced`：**缺 8 多 2**（`ArrowFunction` / `AsyncKeyword` /
  // `Parameter` / `EqualsGreaterThanToken` 整片缺，多出 `ExpressionWithTypeArguments` 与 `async`）。
  //
  // **与紧贴那一档的分工**：`async<T>(x) => x`（`async` 与 `<` 紧贴）在 `lamda.xl.md` 的
  // `Process` 里已经把泛型段**收进 `Lamda` 的替换范围**（那一档的产物只有一格 `Lamda`，
  // 本条一次都不会响）；隔空格那一档 `IsAsync` 仍是假、泛型段仍是**平级兄弟**，
  // 所以这里要自己把 `async` 与 `typeParameters` 两样补上，并把 `pos` 挪到 `async` 那一格
  //（`Lamda` 自己的起点是形参表）。
  // **`async` 与 `Lamda` 之间夹注释时是两格**（第 928 轮第二趟）：
  // `const g = async /*c*/ x => x;` 与 `const f = async/*c*/(): Promise<void> => {};` 里，
  // `LamdaCloseRule.Process` 找 `async` 的那一跳只跳软换行 ⇒ `IsAsync` 是假、`async`
  // 留在外面当**平级兄弟**（与「隔空格的泛型箭头」同一形状，只是中间那格是**注释**
  // ——它在投影前已被 `IsInvisible()` 滤掉，所以到这里是**两格**）。
  // 判据与上面那一档同源：头一格是 `Identifier(async)`、末一格是 `Lamda`，
  // 中间那格（如果有）必须是 `GenericType`。**两格 / 三格两种排版走同一段补法**。
  //
  // **为什么两格不会误伤**（`[async, () => 1]` / `f(async, () => 1)`）：那些地方的逗号
  // 是**平级的一格 `SymbolToken`**（逗号表达式成形的除外），kids 长度不是 2；
  // 两条语句（`async;` 换行 `() => 1`）也不会落进同一串单元。
  const asyncHead = kids[0].IsIdentifierUnit && kids[0].IsAsyncKeyword === true;
  const asyncPlain = asyncHead && kids.length === 2 && kids[1].IsValueOnlyUnit;
  if ((kids.length === 3 && kids[0].IsIdentifierUnit && kids[1].IsGenericType && kids[2].IsValueOnlyUnit && kids[0].IsAsyncKeyword === true) || asyncPlain) {
    const arrow: any = projectNode(kids[kids.length - 1], ctx);
    if (arrow !== undefined) {
      if (kids.length === 3) {
        const typeParams = kids[1].ProjectableKids.filter((k) => k.IsTypeParameterUnit);
        if (typeParams.length > 0) arrow.typeParameters = projectEach(typeParams, ctx);
      }
      // **`AsyncKeyword` 得自己补进 `modifiers`**：那一格平时由 `Lamda.IsAsync` 那条路合成，
      // 而这条路的 `IsAsync` 是假（隔空格那一档规矩如此）⇒ 只在投影这一层补一个节点，
      // 位置就取 `async` 那一格自己的两端（与 `async x => x` 合成出来的形状逐格相同）。
      const asyncNode = { kind: "AsyncKeyword", text: "async", pos: startOf(kids[0]), end: endOf(kids[0]) };
      if (Array.isArray(arrow.modifiers)) arrow.modifiers.push(asyncNode);
      else arrow.modifiers = [asyncNode];
      arrow.pos = startOf(kids[0]);
      return arrow;
    }
  }
  // ---- 0a。泛型实例化表达式 `f<string>`（第 850 轮）----
  //
  // TS 4.7 的 instantiation expression：`f<string>` 本身就是一个表达式，
  // TS 那边是 `ExpressionWithTypeArguments`（`expression` = 名字、`typeArguments` = 实参段）。
  // 产物那边它是**平级的两格**——`Identifier(f)` + `GenericType(<string>)`：
  // 泛型实参段在 token 层是主机的一个子单元（见 `generic-type.xl.md` 的名字闸），
  // 不是名字的孩子。
  //
  // 走通用支的后果（实测四条用例）：`f` 投成 `Identifier`、`GenericType` 投成 `TypeReference`，
  // 于是「缺 `ExpressionWithTypeArguments` + 缺实参的关键字 + 多出两格」。
  //
  // **这一格凭什么敢认**：token 层的 `IsAllowedFollower` 只在「`>` 后面那一格接不上表达式」时
  // 才让 `<…>` 成形（`;` / `)` / `,` / `??` / `(`），所以走到这里的两格**就是**实例化表达式；
  // 比较式（`a < b > c`）在 token 层就已经退回裸符号了，根本到不了这一支。
  // 带 `(` 的那一路仍然走链 / 调用那一支（`f<string>(x)` 是 `CallExpression`）。
  //
  // `endOf` 就是 TS 的 `end`（`range[1]`）——`startOf` / `endOf` 这一对在下面写着，
  // 全文件的口径一致（第 850 轮第一版多加了 1，实测四条用例一起报区间漂移）。
  // **被实例化的那头不止是个名字**（第 888 轮）：`g<number>` 之外还有
  // `a.b.c<string>`（链在 token 层已经折成**一格** `PropertyAccess`）与
  // `(a.b)<string>`（一格 `Bracket`，值位投出来是 `ParenthesizedExpression`）。
  // 原来这一格只认 `Identifier` ⇒ 那两格落到通用支：头一格投成 `PropertyAccessExpression`、
  // `GenericType` 投成 `TypeReference` ⇒ 缺 `ExpressionWithTypeArguments` + 缺实参里的关键字
  // （实测 `const f = a.b.c<string>;`：缺 2 / 多 0；`a[c]<string>` 同形——下标链折出来的
  // 也是 `PropertyAccess`）。
  // **为什么敢把这两类一起放进来**：`IsAllowedFollower` 那道闸在 token 层，
  // 走到这里的两格**就是**实例化表达式（第 850 轮那句话在这一格同样成立）；
  // 而比较式（`a.b.c<string> + 1`）在 token 层已经退回裸符号 ⇒ 产物里没有 `GenericType`，
  // 这一支一次都不会响（实测那一份的产物与 TS 逐格相同）。
  // `Bracket` 只认**圆括号**：`[a]<string>` / `{ a }<string>` 不是这条形状。
  const instCallee =
    kids[0].IsIdentifierUnit ||
    kids[0].IsPropertyAccess ||
    kids[0].IsParenBracket;
  if (kids.length >= 2 && instCallee && kids[1].IsGenericType) {
    // **圆括号那一格要走 `projectExpression`**：`(a.b)<string>` 里的头一格是值位括号，
    // 而 TS 那边它是 `ParenthesizedExpression`（`ExpressionWithTypeArguments > ParenthesizedExpression`）。
    // `projectNode(Bracket, …)` 不认这一层（那一支在 `projectExpression` 里，
    // 见它那句「值位括号 `(expr)`」）⇒ 直接把括号单元原样投出来 ⇒ 实测「缺
    // `ParenthesizedExpression` 1 / 多一个未映射的 `Bracket` 1」。
    const expression =
      kids[0].IsParenBracket ? projectExpression([kids[0]], ctx) : projectNode(kids[0], ctx);
    if (expression !== undefined) {
      const args = projectTypeArguments(kids[1], ctx);
      // ---- 0a-1。**`callee<…>` 后面紧跟模板串 ⇒ 一条 `TaggedTemplateExpression`**（第 979 轮）----
      //
      // `f<T>`t`` 在 TS 那边**不是**「实例化表达式 + 模板」两格，而是**一条**
      // `TaggedTemplateExpression{ tag: Identifier(f), typeArguments: [TypeReference(T)],
      // template: NoSubstitutionTemplateLiteral }`——`<…>` 是**这条标签模板自己的**类型实参
      // （与 `f<T>(1)` 那条 `CallExpression{ expression, typeArguments, arguments }` 同一个口径）。
      // 拿真 TS 复量过（`tmp-r979/ts-shapes.cjs`）：`f<T>`t`` / `f<A, B>`t`` / `f<T>`${1}``
      // 三条的形状都是这一份，`x < y > `t`` 也一样（TS 把它读成 tag=`x`、typeArguments=`<y>`）。
      //
      // 原来这一支**先响**：`callee<…>` 投成 `ExpressionWithTypeArguments`，剩下的模板串交给
      // `foldBinaryFrom` ⇒ 模板那一格**整片丢**（登记的三条缺口：`gap-r977-inst-tagged*`，
      // 缺 `TaggedTemplateExpression` + `NoSubstitutionTemplateLiteral`、多一格 `ExpressionWithTypeArguments`）。
      //
      // 判据与 0b / 0c **同源**，只是标签那一串以 `GenericType` 收尾：
      //   · 模板**直接**是第三格（`f<T>`t``，与 0b 那一档同一个问题）；
      //   · 或者**装在第三格的 `PropertyAccess` 里**（`` f<T>`t`.c `` 的产物是
      //     `[Identifier(f), GenericType, PropertyAccess(String, ., c)]`——与 0c 一字不差）。
      // 两档的分工照抄 0b / 0c：直接那一档把剩下的一串交给 `chainOnto`，装在 `PropertyAccess`
      // 里那一档先 `chainOnto` 那一格自己的续格、再把外面的兄弟交给 `foldBinaryFrom`。
      //
      // 模板那一格凭什么敢认：与 0b 同一条——**引号**（反引号才是模板，`"` / `'` 是普通字符串，
      // 产物里两者属性一模一样）；**而那个引号由 token 自己记着**（`String.StringChar`，
      // 构造器里赋好、投影读 `stringChar`，第 1049 轮）——不再回原文读第一个字符。
      // 而 `<…>` 能成形本身就说明 token 层的 `IsAllowedFollower`
      // 认了「`>` 后面接不上普通表达式」（见 `generic-type.xl.md` 的名字闸）。
      const instTemplateDirect =
        kids.length >= 3 && kids[2].IsTemplateString
          ? kids[2]
          : undefined;
      const instTemplateChain =
        instTemplateDirect === undefined && kids.length >= 3 && kids[2].IsPropertyAccess
          ? kids[2].ProjectableKids
          : [];
      const instChainHasTemplate =
        instTemplateChain.length >= 2 &&
        instTemplateChain[0].IsTemplateString;
      // **第三档：模板被包在运算符单元的**左脊柱**里**（`` f<T>`t` + 1 ``）：产物是
      // `[Identifier(f), GenericType, BinaryOperator(String(反引号), +, 1)]`——
      // 走法与 0d 那一支**一字不差**（沿途把每一层的 `(运算符, 右操作数)` 从里往外收起来），
      // 区别只在标签那一串以 `GenericType` 收尾（0d 那一支的标签是 `kids.slice(0, 1)`）。
      // 脊柱上任何一层不满足就整个让开——宁可维持原来的错，也不把别的形状认成标签模板。
      let instSpineTemplate: any = undefined;
      let instSpineMembers: Array<any> = [];
      const instSpineLayers: Array<Array<any>> = [];
      if (
        instTemplateDirect === undefined &&
        !instChainHasTemplate &&
        kids.length >= 3 &&
        (kids[2].IsBinaryOperatorNode)
      ) {
        let spine: any = kids[2];
        while (spine !== undefined) {
          const inner = spine.ProjectableKids;
          if (inner.length < 3) break;
          const spineHead = inner[0];
          const spineHeadKids = spineHead.IsPropertyAccess ? spineHead.ProjectableKids : [spineHead];
          if (spineHeadKids[0]?.IsTemplateString) {
            instSpineTemplate = spineHeadKids[0];
            instSpineMembers = spineHeadKids.slice(1);
            instSpineLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
            break;
          }
          if (spineHead.IsBinaryOperatorNode !== true) break;
          instSpineLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
          spine = spineHead;
        }
      }
      if (instTemplateDirect !== undefined || instChainHasTemplate || instSpineTemplate !== undefined) {
        const templateUnit =
          instTemplateDirect !== undefined
            ? instTemplateDirect
            : instChainHasTemplate
              ? instTemplateChain[0]
              : instSpineTemplate;
        const template = projectNode(templateUnit, ctx);
        if (template !== undefined) {
          const head: any = {
            kind: "TaggedTemplateExpression",
            tag: expression,
            template,
            pos: startOf(kids[0]),
            end: endOf(templateUnit),
          };
          if (args.length > 0) head.typeArguments = args;
          if (instTemplateDirect !== undefined) {
            const tail = kids.slice(3);
            return tail.length === 0 ? head : chainOnto(head, tail, ctx);
          }
          if (instChainHasTemplate) {
            const chained = chainOnto(head, instTemplateChain.slice(1), ctx);
            const tail = kids.slice(3);
            if (tail.length === 0) return chained;
            // **尾巴第一格又是模板 ⇒ 接着接链，不当二元**（第 979 轮）：
            // `` f<T>`a`.b`c` `` 的产物是 `[Identifier, GenericType, PropertyAccess(`a`, ., b), String(`c`)]`
            // ——第二格模板是对**整条属性访问**再标一次（TS 是外面再套一层
            // `TaggedTemplateExpression`），交给 `chainOnto` 那一档；交给 `foldBinaryFrom`
            // 会把它当成一个操作数（实测那一格整片丢）。
            if (tail[0].IsTemplateString) {
              return chainOnto(chained, tail, ctx);
            }
            return foldBinaryFrom(chained, tail, ctx);
          }
          // 脊柱那一档：先把标签与模板合成一条，再把沿途每一层从里往外折回去。
          const spineLeft = chainOnto(head, instSpineMembers, ctx);
          const spineRest: Array<any> = [];
          for (let q = instSpineLayers.length - 1; q >= 0; q--) {
            spineRest.push(instSpineLayers[q][0], instSpineLayers[q][1]);
          }
          for (const k of kids.slice(3)) spineRest.push(k);
          return foldBinaryFrom(spineLeft, spineRest, ctx);
        }
      }
      const self: any = {
        kind: "ExpressionWithTypeArguments",
        expression,
        pos: startOf(kids[0]),
        end: endOf(kids[1]),
      };
      if (args.length > 0) self.typeArguments = args;
      const rest = kids.slice(2);
      if (rest.length === 0) return self;
      return foldBinaryFrom(self, rest, ctx);
    }
  }
  // ---- 0a2。`instanceof` 右边那个实例化表达式 `b instanceof C<D>`（第 894 轮）----
  //
  // **与 0a 同一族，只是被实例化的那头不在开头**：产物是四格
  // `[Identifier(b), Keyword(instanceof), Identifier(C), GenericType(<D>)]`，
  // 而 0a 的判据只看**头一格** ⇒ 这一形状落到通用支：
  // `C` 投成 `Identifier`、`GenericType` 投成 `TypeReference` ⇒ 缺
  // `ExpressionWithTypeArguments`（实测片段 `const a = b instanceof C<D>;`：缺 2 / 漂 2 / 多 1）。
  //
  // **TS 那边怎么读**：`BinaryExpression(b, InstanceOfKeyword, ExpressionWithTypeArguments(C<D>))`——
  // 语法上就是实例化表达式，TS 另外用一条**语法错**把它拦下来
  //（`checkExpressionWithTypeArguments`：`The right hand side of an instanceof expression
  // must not be an instantiation expression`），说明解析这一层确实这么读。
  //
  // **为什么敢在投影这一层认**：`instanceof` 右边那一格的 `<…>` 只有在
  // token 层的 `IsTypePosition` 认了「`instanceof` 后面是类型位」时才成形
  //（见 `generic-type.xl.md` 第 894 轮那一支），所以走到这里的三格**就是**它。
  // 比较式（`a instanceof b < c`）在那一层根本没让 `<…>` 成形 ⇒ 这一支一次都不会响。
  //
  // **被实例化的那头只认名字**（与 0a 的豁免不同）：`a instanceof b.c<D>` 里 `c` 前面是 `.`
  // ⇒ token 层那一支不响 ⇒ `GenericType` 根本不存在；`a instanceof (b)<D>` 在 TS 里
  // 也不是实例化表达式。所以这里只列 `Identifier` 一格。
  //
  // **左边可能已经被收成 `BinaryOperator`**（实测）：`instanceof` 那一趟照样折，
  // 所以产物落下来是**两格** `[BinaryOperator(b, instanceof, C), GenericType(<D>)]`——
  // 那个 `BinaryOperator` 是**左操作数 + 运算符 + 被实例化的名字**，正好是本支要的前三格。
  // 两种形状（摊开的四格 / 折好的两格）在这里**先并成一条**再判，
  // 免得同一句话写两遍（写两遍就是两处会漂）。
  let instanceKids =
    kids.length >= 4 ? kids : [];
  if (
    kids.length === 2 &&
    (kids[0].IsBinaryOperatorNode) &&
    kids[1].IsGenericType
  ) {
    const folded = kids[0].ProjectableKids;
    if (folded.length === 3) {
      instanceKids = [...folded, kids[1]];
    }
  }
  if (
    instanceKids.length >= 4 &&
    // **「是不是 `instanceof` 这个词」由那一格自己答**（第 1106 轮）：原来这里是
    // `IsOperatorUnit && TextValue === "instanceof"` 两行，而 `OperatorWordKind` 答出名字
    // 就蕴含了「是词形运算符」那一半——两半收成一次属性读（第 1068 轮同一手法）。
    instanceKids[1].OperatorWordKind === "InstanceOfKeyword" &&
    instanceKids[2].IsIdentifierUnit &&
    instanceKids[3].IsGenericType
  ) {
    const callee = projectNode(instanceKids[2], ctx);
    if (callee !== undefined) {
      const args = projectTypeArguments(instanceKids[3], ctx);
      const self: any = {
        kind: "ExpressionWithTypeArguments",
        expression: callee,
        pos: startOf(instanceKids[2]),
        end: endOf(instanceKids[3]),
      };
      if (args.length > 0) self.typeArguments = args;
      // **这一格不能交回 `foldBinaryFrom` 去折**（实测）：那个函数的 `rest` 是**原始单元**
      // （`Map`，它按 `k.Tag` 问类型），而这里要交给它的是一个**已经投好的节点**
      // ——折到那一格会当场 `TypeError: opener.get is not a function`
      //（`angleAssertionLength` 那一格当时对着一格普通对象问 `.get`）。
      //
      // 所以这里自己把这一层二元折出来（与 `foldBinaryFrom` 的二元那一支同一个形状：
      // `pos` 取左操作数、`end` 取右操作数），尾巴上还有运算符（`as` 那种）时才交回它。
      // 运算符节点仍走 `ctx.OperatorNode`——`instanceof` 在这一层常常还是 `Identifier`，
      // 而那一格自己按正文答 `OperatorWordKind`（第 1106 轮）。
      const binary: any = {
        kind: "BinaryExpression",
        left: projectNode(instanceKids[0], ctx),
        operatorToken: ctx.OperatorNode(instanceKids[1]),
        right: self,
        pos: startOf(instanceKids[0]),
        end: self.end,
      };
      const rest = instanceKids.slice(4);
      if (rest.length === 0) return binary;
      return foldBinaryFrom(binary, rest, ctx);
    }
  }
  // ---- 0。尖括号类型断言 `<T>x`（第 144 轮）----
  //
  // TS 那边是 `TypeAssertionExpression > [type, expression]`，而产物把它记成**平级两格**：
  // `<T>` 是一个 `GenericType`（token 层的 `IsTypePosition` 放行的那种表达式最开头的 `<`，
  // 见 `generic-type.xl.md`），后面才是被断言的那个表达式。
  // 直接照链 / 二元那一支投会把它读成比较式（`<string` `>` `x`）。
  //
  // **泛型箭头函数不走这里**（`<T>(x: T): T => x` 也是 `[GenericType, Lamda]` 两格）——
  // 那一支在后面，这里先让开（判据是第二格是不是 `Lamda`）。
  if (kids[0].IsGenericType && kids.length >= 2 && !kids[1].IsValueOnlyUnit) {
    // **被断言的是「一个一元表达式」，不是后面全部**（第 379 轮）。
    //
    // TS 里 `<T>expr` 是**前缀**那一档（与 `!x` / `typeof x` 同一档）——
    // 所以 `<number>a + b` 是 `(<number>a) + b`，**不是** `<number>(a + b)`。
    // **原来把后面整段都吞了**（`projectExpression(kids.slice(1))`）：`<number>a + <number>b`
    // 于是投成「一个断言套住整个加法」——**值看着一样**（两边都算 `3`），
    // 可节点形状与区间都错，落到降级层就报 `name is not a local or a capture: number`
    //（判据 `c371-ex-type-assertions-in-operands`、`ex-angle-bracket-assertion` 那一族）。
    //
    // **修法**：断言只吃**一个操作数**（前缀运算符连着算），剩下那几格交给
    // `foldBinaryFrom`——第 141 / 180 轮那两处用的就是它（这里不另写一份折叠）。
    const assertedTypeKids = kids[0].ProjectableKids;
    let asserted = projectTypeExpression(assertedTypeKids, ctx);
    // **「参数表」那层包装不是断言的类型**（第 890 轮）。
    //
    // `type-parameter.xl.md` 的 `IsParameterList` 有一条判据是「泛型段后面紧跟 `(`」——
    // 那是给泛型箭头 / 函数类型（`const g: <T>(x: T) => T`、`<T>(x: T) => x`）用的。
    // 可**定下它的时候后面那对括号还没扫完**（`=>` 也还没出现），所以那一格只能猜；
    // 断言正好撞在同一形状上：`<T>(x) > y` 里 `<T>` 后面也是 `(`。
    // 能分辨这件事的**只有这一层**：走到这里时括号已经成形，而**第二格不是 `Lamda`**
    //（上面那条判据）⇒ 这次 `<…>` 不可能是参数表。于是把包装拆掉、按**类型**重投一遍
    //（`<T>` 的内容是名字 ⇒ `TypeReference`，TS 那边正是它）。
    //
    // 实测：`<T>(x) > y` 修前缺 `TypeReference(T)` 多 `TypeParameter(T)`（缺 1 多 1）。
    if (asserted !== undefined && asserted.kind === "TypeParameter" && assertedTypeKids.length === 1) {
      asserted = projectTypeExpression(assertedTypeKids[0].ProjectableKids, ctx);
    }
    // **操作数有多长**：前缀运算符一串，然后**一格**就是整个操作数——
    // 后缀链（`.b` / `(…)` / `[…]`）在产物里**已经折成一格**了
    //（`PropertyAccess` / `Method` / `Bracket`），所以不必在这里再拼后缀。
    let operandEnd = 1;
    while (operandEnd < kids.length && kids[operandEnd].IsPrefixOperatorUnit) {
      operandEnd += 1;
    }
    if (operandEnd < kids.length) {
      operandEnd += 1;
    }
    const expression = projectExpression(kids.slice(1, operandEnd), ctx);
    if (asserted !== undefined && expression !== undefined) {
      const assertedNode = {
        kind: "TypeAssertionExpression",
        type: asserted,
        expression,
        pos: startOf(kids[0]),
        end: expression.end,
      };
      const rest = kids.slice(operandEnd);
      if (rest.length === 0) {
        return assertedNode;
      }
      return foldBinaryFrom(assertedNode, rest, ctx);
    }
  }
  // **`GenericType` 没成形的那种**（第 152 轮）：`<number>1` 里 `>` 后面跟着一个**数字**，
  // 而 `IsAllowedFollower` 的白名单刻意不含数字（`foo(bar) > 3` 要能退回比较式），
  // 于是产物是一段平的 `[<, number, >, 1]`。判据仍然只看「第一个单元是不是 `<`」——
  // 有左操作数的比较式（`a < b > c`）第一个单元是那个 `a`，撞不到这里。
  // **`IsSymbolToken` 那半句第 1120 轮收掉**：`IsLessThanSymbol` 基类答 `false`、
  // 只有符号那一页答「正文是不是那个 `<`」——只读这一格就够（与第 1118 轮
  // `IsEqualsSymbol` / `IsArrowSymbol` 同一形态）。
  if (kids[0].IsLessThanSymbol && kids.length >= 3) {
    let depth = 0;
    let close = -1;
    for (let i = 0; i < kids.length; i++) {
      // **两头都由那一格自己答**（第 1139 轮，用户口径 1.1 ~ 1.4）：这一趟原来现场拼一句
      // `kids[i].IsSymbolToken || kids[i].IsLessThanSymbol ? kids[i].TextValue : ""` 再和
      // `"<"` / `">"` 比一遍——「我这一格的正文是不是那个尖括号」是符号那一页自己的事实
      // （`IsLessThanSymbol` 第 1118 轮立的、`IsGreaterThanSymbol` 第 1139 轮补齐），
      // 投影只读属性；非符号那几页两面都答 `false`（基类默认档），逐格等价。
      const one = kids[i];
      if (one.IsLessThanSymbol) {
        depth++;
      } else if (one.IsGreaterThanSymbol) {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close > 0 && close + 1 < kids.length) {
      const asserted = projectTypeExpression(kids.slice(1, close), ctx);
      const expression = projectExpression(kids.slice(close + 1), ctx);
      if (asserted !== undefined && expression !== undefined) {
        return {
          kind: "TypeAssertionExpression",
          type: asserted,
          expression,
          pos: startOf(kids[0]),
          end: expression.end,
        };
      }
    }
  }
  // **值位括号 `(expr)`**（第 81 轮）：TS 那边是 `ParenthesizedExpression`（区间含那对括号、
  // `expression` 是里面那段），产物那边就是一个 `(` 括号单元。
  //
  // 判据能这么简单（只认「一个 `(` 括号」），是因为**实参表 / 形参表 / 类型括号不会走到这里**：
  // 那些括号的父单元是 `Method` / `Function` / `Lamda` / `Signature` / 类型容器，
  // 由各自的投影路径摊平；`projectExpression` 收到的单元一律是**操作数**。
  //
  // **这一格第 1112 轮并进这个调用点**（判据与第 1103 / 1104 / 1109 / 1110 / 1111 轮同一把尺子）：
  // 「值位括号 → `ParenthesizedExpression`」的算式原来单独立着一格 `parenthesizedOf`，
  // 而它在**代码块里只有本函数这两处读者**（另一处是下面 `let left = …` 那一格，见那里）
  // 与 `ctx.ParenthesizedOf` 那一条出口——出口留着（`method` / `new` / `heritage-clause` /
  // `enum-member` / `lamda-parameter` 五页经它走），所以这里就地展开的是**算式本身**。
  if (kids.length === 1 && kids[0].IsParenBracket) {
    const shape = kids[0];
    const inner = shape.ProjectableKids;
    return {
      kind: "ParenthesizedExpression",
      expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
      pos: startOf(shape),
      end: endOf(shape),
    };
  }
  // ---- 0b0. `await x` / `yield x`（第 130 轮）----
  //
  // 产物把 `await` / `yield` 记成一个 `Keyword`，与它的操作数**平级**；TS 那边它们是
  // `AwaitExpression` / `YieldExpression`，而那两个词**不是子节点**（`forEachChild`
  // 只访问 `expression`）。照通用支投会多出一个 `AwaitKeyword` / `YieldKeyword`、
  // 又缺整个表达式与它里面的调用（实测 `await g(a)`：缺 `AwaitExpression` /
  // `CallExpression` / 两个 `Identifier`，多出 `AwaitKeyword`）。
  //
  // **必须排在下面那句「单个单元直接投」之前**：`yield;` 的产物就是**一格**
  // `Keyword(yield)`，走到那一句会把它投成 `Identifier`。
  //
  // **那两个词不一定是 `Keyword`**（第 739 轮）：`x && await y` 里**内层那个 `await`**
  // 在产物里是 `Identifier`（逻辑段是从**外层那个前缀词**后面起算的，内层那一个
  // 还没被 `KeywordCloseRule` 升上去）——只认 `Keyword` 时这一格投成**一个光秃秃的标识符**、
  // 它的操作数 `y` 一个字都不留下，降级期报 `name is not a local or a capture: await`
  //（**整份文件跑不进来**）。与 `IsOperatorUnit` 那一格按文本认 `in` / `instanceof`
  // 是同一个手法：**同一个词两态都要认**（在模块 / 异步函数里 `await` 不可能是一个变量名）。
  const headWord = kids[0].TextValue;
  if (kids[0].IsKeywordUnit || (kids[0].IsIdentifierUnit && (headWord === "await" || headWord === "yield"))) {
    const word = headWord;
    // **第三态：裸的那个词**（第 960 轮，缺口 `gap-r955-yield-await-outside-context`）。
    //
    // 这个分支到第 959 轮为止只认「这一格是不是 `yield` / `await` 这个词」，而 TS 那边
    // 这两种写法**各自有两态**，分界**不在「我在不在生成器 / `async` 里」，而在「这个词有没有操作数」**：
    //
    // | 写法 | TS |
    // | --- | --- |
    // | 生成器里 `yield 1` / `yield* g()` | `YieldExpression` |
    // | **非生成器**的 `function f() { yield g(); }` | `YieldExpression`（TS 照收，运行期才报） |
    // | **两处都算**的裸 `yield`（`const v = yield;` / `return (yield);`） | **`Identifier`** |
    // | `async` 函数里 `await 1` | `AwaitExpression` |
    // | **非 async** 的 `function f() { await g(); }` | `AwaitExpression`（同上） |
    // | **两处都算**的裸 `await`（`const w = await;` / `return await;` / 顶层 `await;`） | **`Identifier`** |
    //
    // 所以判据是**两条一起**：①这一格**只有那个词**（`kids.length === 1`，没有操作数、
    // 没有 `*`）；②我**不在**那个上下文里（见下）。两条都成立才是普通标识符。
    // 只看 ② 会把 `await 0;` 这种**模块顶层 await** 一起判掉（那一条 TS 是 `AwaitExpression`），
    // 只看 ① 会把生成器里的裸 `yield` 判掉（那一条 TS 是 `YieldExpression`）。
    //
    // **`word` 这一道不能省**：这一格拿到的 `Keyword` **不止这两个词**——
    // `this` 在产物里也是一格 `Keyword`（`Identifier.LeafKindOfText` 把它投成 `ThisKeyword`），
    // 只按 `kids[0].IsKeywordUnit` 放行就会把每一格 `this` 都投成普通的 `Identifier`
    //（实测：整份文件的 `ThisKeyword` 全没了、降级期报 `name is not a local or a capture: this`）。
    //
    // **区间必须收在词自己身上**：不折时这一格是**一个标识符**，TS 的 `Identifier[9,15)`
    // 就是那个词；而下面 `yield` 那一支的 `end` 会拉到操作数末尾，照抄过来就会多出一段。
    // 所以这一支**自己造 `Identifier`**、不落下去。
    if (kids[0].IsKeywordUnit && (word === "yield" || word === "await") && kids.length === 1) {
      // **这一格自己就是 token**（第 1022 轮）：`v = view(node)` 那一层早就删了
      // （见 `projectNode` 开头那条「节点就是 token 自己」），所以这里直接问它。
      // 原来写的是 `kids[0].__token`——这个字段**在 token 自己身上是 `undefined`**
      // ⇒ 这一格一次都没被问到 ⇒ 上下文外的 `yield` / `await` 判不出来
      //（实测 `expr-yield-await-context`：缺 1 多 1）。
      //
      // **第 1045 轮：沿 `Parent` 链读那一格属性**（`FunctionFlags` 从方法改成属性）——
      // 函数体的那三页在**造出自己的那一趟**就把 `{ generator, async }` 赋好了
      // （见 `core/syntax/token.xl.md` 的 `FunctionFlags`），所以这里只读、不问。
      // 这一趟过去是本文件的一个私有方法（`functionContextOf`，全仓一个调用点，
      // 判据是 960 / 1031 两轮定下来的）：它只做「往上走、读一格」，
      // 并进调用点就少一层间接**且少一格声明**——链上没有可漏的地方这条理由不变。
      let cursor = kids[0];
      let context: any = null;
      while (cursor !== null && cursor !== undefined) {
        if (cursor.FunctionFlags !== undefined) {
          context = cursor.FunctionFlags;
          break;
        }
        cursor = cursor.Parent;
      }
      const inContext = context !== null && (word === "yield" ? context.generator === true : context.async === true);
      if (inContext === false) {
        return {
          kind: "Identifier",
          text: word,
          pos: startOf(kids[0]),
          end: endOf(kids[0]),
        };
      }
    }
    // **`yield` 可以没有操作数、也可以带 `*`**（第 130 轮）：`yield;` 的 TS 是
    // `YieldExpression[146,151)`（就是那个词），`yield* other()` 的 `*` 进
    // `asteriskToken`、`other()` 进 `expression`。少了这两支，裸 `yield` 会被投成
    // `Identifier`、带 `*` 的那条只在 `yield*` 处收尾（`CallExpression` 整片丢）。
    if (word === "yield") {
      const props: any = {};
      let rest = kids.slice(1);
      if (rest.length > 0 && rest[0].IsAsteriskSymbol) {
        props.asteriskToken = projectNode(rest[0], ctx);
        rest = rest.slice(1);
      }
      const value = rest.length > 0 ? projectExpression(rest, ctx) : undefined;
      if (value !== undefined) props.expression = value;
      return {
        kind: "YieldExpression",
        ...props,
        pos: startOf(kids[0]),
        end: value === undefined ? endOf(kids[kids.length - 1]) : value.end,
      };
    }
    // **`await` 是一元前缀、比二元与逻辑都紧**（第 739 轮）：`await x + 1` 是 `(await x) + 1`，
    // 而 token 层**已经把 `await` 后面那一整段折成了一个单元**（`BinaryOperator(x + 1)`）——
    // 照原样投就是把二元那一段整个塞进 `await` 的操作数（**静默错值**：
    // `await Promise.resolve(1) + 1` 在 Node 里给 `2`、本仓给 `[object Promise]1`；
    // `await Promise.resolve(0) && "T"` 在 Node 里给 `0`、本仓给 `"T"`）。
    //
    // **做法**：沿那个单元的**最左边那条脊**剥下去，剥到第一个不是运算符单元的操作数为止
    //（`await x * 2 + 3` 剥出 `x`、尾巴是 `* 2 + 3`；`await o.m() + 1` 剥出那一条链），
    // 剥出来的当 `await` 的操作数，剩下的连同本层后面的兄弟交给 `foldBinaryFrom` 照常折。
    // 这与第 711 轮收 `typeof o[k]().v` 那一格**是同一个形状**（一元前缀 + 操作数在后），
    // 只是这里操作数与 `await` **平级**、而那里操作数在那个一元单元**里面**。
    //
    // **尾巴里那格 `As` 不归 `foldBinaryFrom` 管**：`await x as T` 是平级两格 `[x, As]`
    //（摊平之后一个运算符都没有），`await x + 1 as any` 的尾巴里也有 `As`——
    // 这两种一律回落到下面那条老路（`as` 的结合性本仓另有口径，抢过来会把那一格丢掉）。
    if (word === "await" && kids.length >= 2) {
      // **这一问第 1088 轮改成读 token 自己那一格**：原来是本页**两连比类名**
      //（`unit.Tag === "BinaryOperator" || unit.Tag === "LogicalOperator"`），
      // 而那两个名字就是那两页自己的类名（两页各自答 `IsBinaryOperatorNode`）——
      // 顺带把只转手一次的局部变量 `kind` 收掉（口径见 `Token.IsBinaryOperatorNode`）。
      const isOperatorFold = (unit:any):bool => {
        return unit === undefined ? false : unit.IsBinaryOperatorNode;
      };
      // **先把最左边那条脊摊平**：`await x * 2 + 3` 的产物是
      // `BinaryOperator(+)( BinaryOperator(*)(x, *, 2), +, 3 )`——一直摊到「头一格不是
      // 运算符单元」为止，摊出来的那份平铺串里**第一个运算符**就是 `await` 该停的地方。
      // 左操作数**自己也可能是一段**（`await a && await b` 里那一格是
      // `Keyword(await) + 那个调用`），所以剥出来的是一段 **list**、不是一个单元。
      // **右边那一格不一定是运算符单元**：`await x > 0` 的产物是平铺的
      // `[await, x, >, 0]`（关系运算符那一族没折进单元），所以这一支不设「头一格是运算符」
      // 这道门——摊平之后找不到运算符就自然回落到下面那条老路。
      let flat = kids.slice(1);
      while (isOperatorFold(flat[0])) {
        const inner = flat[0].ProjectableKids;
        if (inner.length < 2) break;
        flat = [...inner, ...flat.slice(1)];
      }
      let opAt = -1;
      for (let at = 0; at < flat.length; at++) {
        const unit = flat[at];
        // **运算符单元本身也是切点**（第 741 轮）：`await o?.p + 1` 里那个
        // `BinaryOperator` 单元的**第一个孩子是链的续接**（`?.p`），它就是 `await`
        // 该停的地方（摊平那一趟只摊**头一格**，所以它留在了 `flat` 里）。
        if (isOperatorFold(unit)) {
          opAt = at;
          break;
        }
        if (!unit.IsOperatorUnit) continue;
        // **`.` 不是切点**（第 740 轮，**实测踩过一次**）：`typeof (await Promise.resolve("s"))`
        // 里那对括号的子单元是**平铺的一串**（`[await, Promise, ., resolve(…)]`，链没折成
        // `PropertyAccess` 单元）——把那个 `.` 当成运算符切开会折出
        // `(await Promise) . resolve`，降级期报 `name is not a local or a capture: resolve`。
        // 它是**成员访问的续接**、不是二元运算符，跳过它之后这一支自然回落到老路
        //（老路把 `[Promise, ., resolve(…)]` 折成一条链，正是要的形状）。
        if (unit.IsDotSymbol) continue;
        opAt = at;
        break;
      }
      // **只有在摊平之后真的能在运算符处切开、而且尾巴里没有 `As` / `Satisfies` / 平铺的 `.`
      // 时才走这一支**：`await x as T` 是平级两格 `[x, As]`（摊平之后一个运算符都没有），
      // 那两格的结合性本仓另有口径，抢过来说会把 `as` 那一格丢掉
      //（`await x + 1 as any` 也是同一形状：尾巴里那格 `As` 不归 `foldBinaryFrom` 管）；
      // 尾巴里有**平铺的 `.`**（`[+, b, ., c]`）时 `foldBinaryFrom` 会把那个 `.` 当成
      // 运算符（`OperatorRank` 给不出名字的一律 7）⇒ 右操作数被切在半截上，也回落。
      const tail = opAt > 0 ? flat.slice(opAt) : [];
      const tailIsOperators =
        opAt > 0 &&
        tail.length >= 2 &&
        tail.every(
          (unit) =>
            !unit.IsAsUnit &&
            !unit.IsSatisfiesUnit &&
            // **「这一格是不是那个点号」由被问的那一格答**（第 1142 轮，用户口径 1.1 ~ 1.4）：
            // 原来写成 `!(unit.IsSymbolToken && unit.IsDotSymbol)` 两半——而 `IsDotSymbol`
            // 只有 `SymbolToken` 那一页答 `true`（基类默认 `false`、赋在 `Close()` 里），
            // 所以那半句是**同一格事实的第二处答案**，与第 1120 轮 `chainTail` 那一处同一条收法。
            !unit.IsDotSymbol,
        );
      if (tailIsOperators) {
        const operand = projectExpression(flat.slice(0, opAt), ctx);
        if (operand !== undefined) {
          const awaited = {
            kind: "AwaitExpression",
            expression: operand,
            pos: startOf(kids[0]),
            end: operand.end,
          };
          return foldBinaryFrom(awaited, tail, ctx);
        }
      }
      // **`await` 的操作数是一条 `?.` 链、而那个运算符单元把链的续接装在自己第一个孩子里**
      // （第 741 轮，收掉第 739 轮登记的 `p739a-a14`）：`await o?.p + 1` 的产物是
      // `[Keyword(await), Identifier(o), BinaryOperator(+( NCO(p), +, 1 ))]`——
      // `?.p` 属于 **`await` 的操作数**那一截链（JS 里是 `(await (o?.p)) + 1`），
      // 而它在那个二元单元的**第一个孩子**位置上（与 `t?.get(k) ?? d` 那一族同一形状）。
      // 少了这一支，老路会把 `?.p` 接到**整个 `await` 节点的结果**上（`(await o)?.p`）⇒
      // 本仓给 `[object Promise]1`、Node 给 `3`（**静默错值**）。
      if (tail.length === 1 && isOperatorFold(tail[0])) {
        const inner = tail[0].ProjectableKids;
        if (inner.length >= 2 && inner[0].IsNullConditionalOperator) {
          const base = projectExpression(flat.slice(0, opAt), ctx);
          if (base !== undefined) {
            let chained = chainWithOptional(base, inner[0], ctx);
            let chainAt = 1;
            while (chainAt < inner.length && inner[chainAt].IsNullConditionalOperator) {
              chained = chainWithOptional(chained, inner[chainAt], ctx);
              chainAt += 1;
            }
            const awaited = {
              kind: "AwaitExpression",
              expression: chained,
              pos: startOf(kids[0]),
              end: chained.end,
            };
            return foldBinaryFrom(awaited, inner.slice(chainAt), ctx);
          }
        }
      }
      const value = projectExpression(kids.slice(1), ctx);
      if (value !== undefined) {
        return { kind: "AwaitExpression", expression: value, pos: startOf(kids[0]), end: value.end };
      }
    }
  }
  // **表达式里的私有名 `#x`**（第 131 轮）：`#x in o` 的产物是
  // `[SymbolToken(#), Identifier(x), Keyword(in), Identifier(o)]`——`#` 与名字是两格。
  // 合成一个 `PrivateIdentifier` 之后，后面的运算符与操作数照常折（`in` 走
  // `IsOperatorUnit` 那一格：它是 `Keyword` 不是 `SymbolToken`）。
  if (kids.length >= 2 && kids[0].IsHashSymbol) {
    const named = kids[1];
    const simple = named.IsNameNode;
    if (simple) {
      const head = {
        kind: "PrivateIdentifier",
        text: "#" + named.TextValue,
        pos: startOf(kids[0]),
        end: endOf(named),
      };
      const rest = kids.slice(2);
      if (rest.length === 0) return head;
      return foldBinaryFrom(head, rest, ctx);
    }
    // **名字被折进了二元单元**（第 131 轮）：`#x in o` 的产物是
    // `[SymbolToken(#), BinaryOperator(in)( Identifier(x), «in», Identifier(o) )]`——
    // 那个二元单元的**第一个孩子才是名字**，其余是运算符与右操作数。
    // 不拆的话整个 `x in o` 会被当成名字（`PrivateIdentifier` 的区间一路撑到 `o`）。
    if (named.IsBinaryOperatorNode) {
      const inner = named.ProjectableKids;
      if (inner.length >= 2) {
        const head = {
          kind: "PrivateIdentifier",
          text: "#" + inner[0].TextValue,
          pos: startOf(kids[0]),
          end: endOf(inner[0]),
        };
        return foldBinaryFrom(head, [...inner.slice(1), ...kids.slice(2)], ctx);
      }
    }
  }
  // **泛型箭头函数的类型参数段是平级兄弟**（第 134 轮）：`const f = <T>(x: T): T => x` 的产物是
  // `[GenericType(<T>), Lamda(…)]`——`<T>` **不在** `Lamda` 里面。TS 那边它是
  // `ArrowFunction.typeParameters`。照通用支投会把它当成一个类型引用（`TypeReference`），
  // `ArrowFunction` 与它的形参、返回类型整片丢（实测 `expr-arrow-generic.ts` 缺 16）。
  if (kids.length === 2 && kids[0].IsGenericType && kids[1].IsValueOnlyUnit) {
    const arrow: any = projectNode(kids[1], ctx);
    if (arrow !== undefined) {
      const typeParams = kids[0].ProjectableKids.filter((k) => k.IsTypeParameterUnit);
      if (typeParams.length > 0) arrow.typeParameters = projectEach(typeParams, ctx);
      arrow.pos = startOf(kids[0]);
      return arrow;
    }
  }
  // **带 `async` 的泛型箭头函数**（第 856 轮）：`async<T>(x) => x` 的产物是
  // `[Identifier(async), GenericType(<T>), Lamda(…)]`——上面那一支只认**两格**
  // （`<T>` + `Lamda`）。**这一格在实测里没有跑到**（第 856 轮拿探针对过：
  // `const h = async<T>(x) => x;` 那条路根本不进本方法，`ARROW-TP` 那条临时诊断
  // 一次都没响），所以**不在这里落代码**——留下的只是这条经度过的结论：
  // 要收这一档得先找到是谁投的这条 `Lamda`（`IsAsync` 与起点已经在
  // `lamda.xl.md` 的 `Process` 里补齐了，`typeParameters` 那一格仍缺）。
  // **表达式位的标记**（第 141 轮）：`Function` / `Class` 这一个产物标签在
  // 声明位是 `FunctionDeclaration` / `ClassDeclaration`、在表达式位是
  // `FunctionExpression` / `ClassExpression`，产物同形——唯一可靠的区分是「谁在投它」。
  // 与 `ctx.typePosition` 同一手法（见 `projectTypeExpression` 那一处）。
  if (kids.length === 1) {
    const savedExpression = ctx.expressionPosition;
    ctx.expressionPosition = true;
    try {
      return projectNode(kids[0], ctx);
    } finally {
      ctx.expressionPosition = savedExpression;
    }
  }
  // ---- 0。`import.meta` / `new.target`（第 141 轮）----
  //
  // TS 那边它们是 `MetaProperty`（**只有 `name` 一个子节点**——`forEachChild` 对
  // `MetaProperty` 只访问 `name`，`new` / `import` 那个词**不出节点**），外面那一层
  // 属性链再套 `PropertyAccessExpression`：
  //
  //     import.meta.url  ⇒  PropertyAccessExpression[MetaProperty(meta), Identifier(url)]
  //     new.target       ⇒  MetaProperty[Identifier(target)]
  //
  // 产物那边是 `[Keyword(import), ., PropertyAccess(meta . url)]` 与
  // `[Keyword(new), ., Identifier(target)]` 两种形状，照链那一支走会投成
  // `PropertyAccessExpression` 并多出 `ImportKeyword` / `NewKeyword`
  // （实测 `ex-meta-props.ts`：缺 2 + 多出 4）。
  if (
    kids[0] !== undefined &&
    kids[0].IsNameNode &&
    (kids[0].IsNewKeyword === true || kids[0].IsImportKeyword === true) &&
    kids[1].IsDotSymbol &&
    kids.length >= 3
  ) {
    const named = kids[2];
    // `import.meta.url` 的 `meta.url` 被收成了一个 `PropertyAccess`；`new.target` 只是名字。
    //
    // **名字那一格也可能是一个 `BinaryOperator`**（第 539 轮实测）：关掉 reorg 之后
    // `new.target === A` 里 `target === A` 被折成了一个 `BinaryOperator`
    //（`new` 不再当链底之后，二元那条规则把 `target` 与它右边整段收在一起）。
    // 照整格投影会把 `=== A` 一起卷进 `MetaProperty` ⇒ **只取它的第一个操作数**
    //（运算符左边那一格就是名字）。探针现场（`tmp/recon/probe-meta.cjs`）：
    //
    //     MP1DBG kids=Keyword(new),SymbolToken(.),BinaryOperator()
    const namedKids = named.IsPropertyAccess ? named.ProjectableKids : [named];
    // **「名字那一格是不是被折进了二元单元」要单独记下来**（第 560 轮）：
    // 下面那个「一直往左走到不是二元运算符为止」的循环只有在**第一格就是二元单元**时才有意义
    //（`new.target === A`：`target === A` 被折成一格，名字要从它左边取）。
    // 原来那一句 `inner` 的写法**没有把这件事记下来** —— 它写的是
    // 「`firstName` 不是二元单元 ⇒ `inner = [firstName]`」，而那对**普通名字**也成立
    // ⇒ `import.meta.url` 的 `meta.url` 是**一个 `PropertyAccess`**、`namedKids` 是
    // `[meta, ., url]`，`firstName` 就是那个 `meta` ⇒ `inner` 被砍成 `[meta]`
    // ⇒ 下面那个「往后接 `.名字`」的循环一格都接不上 ⇒ 投出来只有 `MetaProperty(meta)`
    //（实测 `expr-call-import-meta.ts` / `ex-meta-props.ts`：缺 `PropertyAccessExpression`
    //  + `Identifier(url)` 两个 ——而 `[PropertyAccessExpression, Identifier]` 正好是
    //  「`.url` 整段丢了」的形状）。
    // **这两处问的是「这个名字是不是被折进了二元单元」**（第 1088 轮逐字保留，第 1115 轮
    // 收进被问的那一页）：判据不是「是不是二元运算节点」，而是「这一格是不是
    // `BinaryOperator` 那一页的单元」——剥壳用的是 `headInner[length - 2]`，
    // 而**逻辑单元**的 `Data` 最后一格才是运算符（布局不同），所以读的是
    // `BinaryOperator` 那一页的 `IsBinaryOperatorUnit`（`LogicalOperator` 答 `false`），
    // **不是** `IsBinaryOperatorNode`（那一格两页都答 `true`）。
    const headIsBinary =
      namedKids.length > 0 &&
      namedKids[0] instanceof Token &&
      namedKids[0].IsBinaryOperatorUnit === true;
    // **一直往左走到不是二元运算符为止**（第 539 轮实测）：那个 `BinaryOperator` 是**嵌套**的
    //（`target === A` 折了好几层，探针打出来 `first` 仍然是 `BinaryOperator`）——
    // 只剥一层不够，要剥到最左边那个真正的名字。
    let firstName = namedKids.length > 0 ? namedKids[0] : undefined;
    let guard = 0;
    while (
      firstName instanceof Token &&
      firstName.IsBinaryOperatorUnit === true &&
      guard < 32
    ) {
      const down = firstName.ProjectableKids;
      if (down.length === 0) break;
      firstName = down[0];
      guard = guard + 1;
    }
    // **只有「剥过」才把 `inner` 收成一格**：`new.target === A` 的名字是剥出来的那一格
    //（运算符与右操作数属于**外面**那一折，第 539 轮把区间修对、接运算符那一截是另一笔账）；
    // 其余情形 `inner` 就是**整个 `namedKids`** ——`meta.url` 那两格要在下面接上。
    const inner = headIsBinary && firstName !== undefined ? [firstName] : namedKids;
    let meta: any = {
      kind: "MetaProperty",
      name: inner[0].NameNode,
      pos: startOf(kids[0]),
      end: endOf(inner[0]),
    };
    let at = 1;
    while (at < inner.length) {
      if (!inner[at].IsDotSymbol || at + 1 >= inner.length) break;
      const member = inner[at + 1];
      meta = {
        kind: "PropertyAccessExpression",
        expression: meta,
        name: member.NameNode,
        pos: meta.pos,
        end: endOf(member),
      };
      at += 2;
    }
    // **后面那些 `.名字` 也要继续接上**（第 346 轮，**实测撞到的**）：
    // 原来到这里直接 `kids.slice(3)` 丢给 `foldBinaryFrom`——而 `.` 在那一支里
    // 会当成**二元运算符** ⇒ `new.target.name` 投出来是一个**光秃秃的 `Identifier(name)`**
    //（症状：降级期报「name is not a local or a capture: name」——
    //  **一句话里没有一个字提到 `new.target`**）。
    // 所以先把点号链**走完**，再把手里的余下部分交给二元那一支。
    let after = 3;
    while (after + 1 < kids.length && kids[after].IsDotSymbol) {
      const member = kids[after + 1];
      meta = {
        kind: "PropertyAccessExpression",
        expression: meta,
        name: member.NameNode,
        pos: meta.pos,
        end: endOf(member),
      };
      after += 2;
    }
    const rest = kids.slice(after);
    // **`new.target === A`：运算符那一截要接回来**（第 580 轮，第 539 轮把区间修对时
    // 把这一条留给了后面的轮次）：
    //
    // 名字那一格被折成 `BinaryOperator(target === A)` 之后，`kids.slice(after)` 里
    // **只剩运算符本身**（`===` 与 `A` 在那一格的 `Data` 里）⇒ 照「`rest` 为空就
    // `return meta`」收尾就是**把整个右半截丢掉**。实测（第 580 轮，
    // `decl-class-new-target.ts`）：投影只投出一个 `MetaProperty [112,122)`，
    // 缺 `BinaryExpression` / `EqualsEqualsEqualsToken` / `Identifier(A)` 三个
    // ——TS 那边是 `BinaryExpression [112,128) > [MetaProperty, «===», Identifier(A)]`。
    //
    // 取法：从那一格二元单元**最左边那条脊**（一直往左的第一格）递归收它的**其余兄弟**，
    // 收出来的正是 `foldBinaryFrom` 要的 `[运算符, 操作数, …]`（与下面 `.名字` 那一支同源）。
    // **必须递归**：这条脊是左嵌套的（`a === b === c` 折成 `(a === b) === c`）——
    // 逐层往下 `push` 会把两层的顺序搞反（`[===, c, ===, b]`），而
    // `[…内层, 本层运算符, 本层右操作数]` 这个顺序正好就是它。
    const binaryTail = (unit: any, depth: int): any[] => {
      if (depth > 32 || unit instanceof Token === false) return [];
      if (unit.IsBinaryOperatorUnit !== true) return [];
      const down = unit.ProjectableKids;
      if (down.length === 0) return [];
      return [...binaryTail(down[0], depth + 1), ...down.slice(1)];
    };
    const tail = headIsBinary ? [...binaryTail(named, 0), ...rest] : rest;
    if (tail.length === 0) return meta;
    return foldBinaryFrom(meta, tail, ctx);
  }

  // ---- 0a. 可选链 / 可选调用（第 107 轮）----
  //
  // 产物把 `?.` 之后的**每一格**收成一个 `NullConditionalOperator` 单元，而且它**不一定
  // 跟在点号链后面**：`list?.push(1)` 是 `[Identifier(list), NCO(Method(push))]`、
  // `x?.y?.(1)` 是 `[Identifier(x), NCO(y), NCO(Bracket(1))]`。
  // 原来只在「链」那一支里处理 NCO（那一支要求 `kids[1]` 是 `.` 或 `[`），这两种形状
  // **整段丢掉**——实测缺 `CallExpression` 49 / `QuestionDotToken` 40 /
  // `PropertyAccessExpression` 189 里成片，而且都会连带多出未映射的
  // `<NullConditionalOperator>` 与 `<Bracket>`。
  const ncoIndex = kids.findIndex((k) => k.IsNullConditionalOperator);
  // **链后面还挂着 `as` / `satisfies` 时，0a0 / 0a 两条都要让开**（第 664 轮）：
  // `a?.b as T` 的产物是 `[Identifier(a), NullConditionalOperator(b), As(T)]` 三格 ——
  // 那两条支路的收尾都是「把 NCO 接到左边、剩下的交给 `foldBinaryFrom`」，
  // 而 `As` / `Satisfies` **不是二元单元** ⇒ 那一格整格丢掉
  //（实测缺 `AsExpression` + `TypeReference` + `Identifier`，四个方向里只有「缺」这一栏响）。
  // 让开之后落到主流程第 2 节（`asIndex` 那一支），`As` / `Satisfies` 的折法只有那一份。
  // **`f(o?.a as T)` 那种实参位同样受益**：让开之后 0a0 不再抢，主流程照折。
  const asAfterNco = kids
    .slice(ncoIndex + 1)
    .some((k) => k.IsAsUnit || k.IsSatisfiesUnit);
  // ---- 0a0. **基名与 `?.` 平级**：`f(o?.a)` 那一种（第 143 轮）----
  //
  // **症状**：`?.` 出现在**实参位 / 下标位 / 模板插值位**时，产物是
  // `[Identifier(o), NCO(a)]` **两个平级单元**（基名留在外面），而
  // `projectExpression` 走到通用支只会取 `kids[0]`——**基名在、`?.a` 整个没了**：
  //   · 投影层报「未映射标签 `NullConditionalOperator`」，
  //   · 降级层当场报 `unimplemented: expression NullConditionalOperator`
  //     （`console.log(f?.(o?.a))` 与 `console.log([o?.a])` 就是这么红的）。
  //
  // **为什么语句位一直是对的**：`a?.b` 在语句位由 **`PropertyAccess` / 二元那一支**接手
  // （上面 0a / 0a2 两条），它们的判据都看「NCO 前面那个兄弟」——而**实参位**这一层
  // 只看得到一个「实参段」，前面没有兄弟可看。
  //
  // **判据**（三条都要）：
  //   1. `ncoIndex > 0`——NCO 前面确实有个兄弟；
  //   2. 那个兄弟是**链基名**（第 1075 轮起读的是**那一格自己的属性** `kids[…].IsChainBaseNode`；
  //      口径见 `core/syntax/token.xl.md` 与 `tokens/property-access.xl.md` 的 `IsChainBase`
  //      ——**两张名单不是一张**：这里认 `NullConditionalOperator` / `ObjectLiteral`，
  //      不认 `Bracket` / `NotNull` / `RegexToken`，所以名字差一个 `Node`）；
  //   3. **NCO 的第一个子单元不是 `Method`**——这一条是**让路**用的：`a.Start?.Document`
  //      的形状是 `[a, ., Start, NCO(Document)]`，那里 NCO 的成员名恰好也是 `Identifier`，
  //      照这一支折会把 `.Start` 与 `?.Document` 之间的那层链**搅散**
  //      （实测 `dist/ts/core/syntax/source-range.ts`：`QuestionDotToken` 与 `Identifier`
  //      各缺一片）。而 `?.(…)` / `?.[…]` 那一族（`NCO` 的第一个子单元是 `Method` / 括号）
  //      不属于本支，它们由下面 0a 与 `Method` 自己那两条接手。
  //   4. **前缀里没有顶层二元运算符**（`BinaryOperator` / `LogicalOperator` 单元，
  //      或者光秃秃的运算符符号）——有的话这条 `?.` 属于**右边那个操作数段**，
  //      要交给下面 0a 在运算符处切开那一支：
  //      `this.Start?.Document === other.Start?.Document` 照本支走会把前面那一整段
  //      （连同那个二元单元）吞进一个 `PropertyAccessExpression`
  //      （实测 `source-range.ts` 漂移 2 + 多出 2）。
  const prefixHasOperator = kids.slice(0, ncoIndex).some(
    (k) =>
      k.IsBinaryOperatorNode ||
      (k.IsSymbolToken && NCO_BASE_OPERATORS.has(k.TextValue)),
  );
  if (
    ncoIndex > 0 &&
    asAfterNco === false &&
    prefixHasOperator === false &&
    kids[ncoIndex - 1].IsChainBaseNode &&
    kids[ncoIndex].ProjectableKids[0]?.IsMethodNode === false
  ) {
    let optional = projectExpression(kids.slice(0, ncoIndex), ctx);
    if (optional !== undefined) {
      let at = ncoIndex;
      while (at < kids.length && kids[at].IsNullConditionalOperator) {
        optional = chainWithOptional(optional, kids[at], ctx);
        at++;
      }
      if (at >= kids.length) return optional;
      return foldBinaryFrom(optional, kids.slice(at), ctx);
    }
  }
  // **「二元单元里包着 NCO」那一形状要让给下面 0a2 那一支**（第 145 轮）：
  //
  //     x.Start?.Document === y.Start?.Document
  //
  // 的产物是 `[x, ., Start, BinaryOperator(===)(NCO(Document), ===, y), ., Start, NCO(Document)]`——
  // 末尾那个 NCO 属于**右边那条链**（`y.Start?.Document`），但这一支会先把前缀投成二元表达式、
  // 再往上套一层属性访问，右边那条链整个错位
  // （实测 `dist/ts/core/syntax/source-range.ts`：漂移 2 + 多出 3，`PropertyAccessExpression`
  // 的区间一直撑到整条比较式末尾）。0a2 那一条正是为这个形状写的：它把 NCO 接回基名、
  // 再连**后面的兄弟**一起折。
  const hasNcoInBinary = kids.some(
    (k) =>
      (k.IsBinaryOperatorNode) &&
      k.ProjectableKids[0]?.IsNullConditionalOperator,
  );
  // **尾巴上还挂着 `as` / `satisfies` 时，这一支也要让开**（见上面 `asAfterNco` 那一处）。
  if (ncoIndex > 0 && hasNcoInBinary === false && asAfterNco === false && !(kids[0].IsBinaryOperatorUnit && kids.slice(1).some((k) => k.IsNullConditionalOperator || k.IsDotSymbol))) {
    // **前缀里有顶层二元运算符时，NCO 要并进「右边那个操作数段」**（第 145 轮）：
    //
    //     x.Start === y.Start?.Document
    //
    // 里 `?.Document` 属于**右操作数**（TS：`BinaryExpression(x.Start, ===, y.Start?.Document)`），
    // 而直接 `chainWithOptional(projectExpression(整个前缀), nco)` 会把整条比较式包进属性访问
    // （实测 `cy.ts` 的 a3：漂移 1 + 多出 2，区间一路撑到表达式末尾）。
    // 做法与 0a2 同款：在运算符处切开，把 NCO 接到尾巴上再交回 `foldBinaryFrom`。
    const prefix = kids.slice(0, ncoIndex);
    let opAt = -1;
    let bestRank = 99;
    for (let i = 1; i < prefix.length; i++) {
      const k = prefix[i];
      if (k.IsBinaryOperatorNode) {
        opAt = i;
        break;
      }
      const text = k.TextValue;
      if (k.IsSymbolToken === false || OP_TEXTS.has(text) === false) {
        continue;
      }
      const rank = k.OperatorRank;
      if (rank < bestRank) {
        bestRank = rank;
        opAt = i;
      }
    }
    if (opAt > 0) {
      const base = projectExpression(prefix.slice(0, opAt), ctx);
      if (base !== undefined) {
        let optional = foldBinaryFrom(base, [...prefix.slice(opAt), kids[ncoIndex]], ctx);
        let at = ncoIndex + 1;
        while (at < kids.length && kids[at].IsNullConditionalOperator) {
          optional = chainWithOptional(optional, kids[at], ctx);
          at++;
        }
        if (at >= kids.length) return optional;
        return foldBinaryFrom(optional, kids.slice(at), ctx);
      }
    }
    let optional = projectExpression(kids.slice(0, ncoIndex), ctx);
    // **一元前缀的操作数在后**（第 178 轮）：`delete a?.b` 的产物是
    // `[UnaryOperator(delete a), NullConditionalOperator(b)]`——`delete` 只是前缀，
    // `?.b` 属于**它的操作数**。直接把 NCO 接到那个一元节点上会得到 `(delete a)?.b`
    // （实测 `expr-optional-delete.ts`：漂移 1 + 多出 2，`DeleteExpression` 的区间只到 `a`）。
    //
    // **操作数那一格有两个名字**（第 740 轮，**实测踩过一次**）：`typeof` / `void` / `delete`
    // 是 `TypeOfExpression` 那一族（字段叫 **`expression`**），而 `!` / `~` / `+` / `-` /
    // `++` / `--` 是 **`PrefixUnaryExpression`**（字段叫 **`operand`**）——
    // 这一支原来只认 `expression`，于是 `!o?.p` / `-o?.p` **够不着它**、掉到下面那条通用路：
    // `?.p` 被接到**那个一元节点的结果**上（`(!o)?.p`）⇒ 本仓给 `undefined`、Node 给 `false`
    //（`-o?.p` 本仓给 `undefined`、Node 给 `-1`，**静默错值**）。
    // 这与第 711 / 739 两轮在链那一支踩到的是**同一格**（同一个形状两处各写一遍就会漂）。
    // **这一支写成 `if` / `else if` 而不是嵌套三元**（第 740 轮实测）：`cases:tsast` 的语料
    // **包含产物自己**，而嵌套条件表达式那一格这一版还认不全（缺 `ConditionalExpression` +
    // `ColonToken`，实测 13 缺 1 漂 2 多）——写成一条条的 `if` 就没有这一格。
    let operandField = "";
    if (optional !== undefined && UNARY_KINDS.has(optional.kind)) {
      if (optional.expression !== undefined) {
        operandField = "expression";
      } else if (optional.operand !== undefined) {
        operandField = "operand";
      }
    }
    if (optional !== undefined && operandField !== "") {
      let inner:any = operandField === "expression" ? optional.expression : optional.operand;
      let unaryAt = ncoIndex;
      while (unaryAt < kids.length && kids[unaryAt].IsNullConditionalOperator) {
        inner = chainWithOptional(inner, kids[unaryAt], ctx);
        unaryAt++;
      }
      const rebuilt:any = {
        ...optional,
        end: inner === undefined ? optional.end : inner.end,
      };
      rebuilt[operandField] = inner;
      if (unaryAt >= kids.length) return rebuilt;
      return foldBinaryFrom(rebuilt, kids.slice(unaryAt), ctx);
    }
    let at = ncoIndex;
    while (at < kids.length && kids[at].IsNullConditionalOperator) {
      optional = chainWithOptional(optional, kids[at], ctx);
      at++;
    }
    if (at >= kids.length) return optional;
    // **NCO 后面那一串不一定是运算符**（第 967 轮）：`a?.b!.c.d` 的产物是
    // `[Identifier(a), NCO(NotNull(PropertyAccess([b, ., c]))), ., Identifier(d)]`——
    // NCO 那一趟折完（`chainWithOptional` 的子链分支把 `!.c` 接上了），**下一格是点号**：
    // 那不是运算符、而是**链的续格**。这一段原来无条件交给 `foldBinaryFrom`，
    // 而它找不到运算符时**原样返回左操作数** ⇒ `.d` 整段丢
    //（实测 `gap-r964-opt-assert-member-member`：`PropertyAccessExpression` 与
    //  `Identifier` 各漂，`a?.b!.c.d` 被投成 `a?.b!.c`）。
    // 判据与链那一支同款：**下一格是点号 / 下标 / 以调用开头** ⇒ 交给 `chainOnto`
    //（它与「点号后面那一格」那几支是同一份实现），其余原样走二元那一支。
    if (kids[at].IsDotSymbol || kids[at].IsIndexBracket || kids[at]?.IsCallFirstUnit) {
      return chainOnto(optional, kids.slice(at), ctx);
    }
    return foldBinaryFrom(optional, kids.slice(at), ctx);
  }
  // **链的续格长在二元单元里面**（第 743 轮）：`o["f"]().v + 1` 的产物是
  //
  //     [PropertyAccess(o, [f]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 1 )]
  //
  // ——`o["f"]().v` 那一截（**调用括号 + 后缀**，见 `IsCallFirstUnit`）是那个二元单元的
  // **第一个孩子**，而链的头一格是它的**前一个兄弟**。
  // **判据只认「第一格以一次调用开头」**（与 `IsCallFirstUnit` 同一句）：点号开头的
  // 那一份不在这里——`o.f().v + 1` 的 token 层把整条链折成了一个 `Method` 单元，
  // 本来就走得通（实测），放开 `.` 那一档会换掉既有形状。
  //
  // **要递归**（第 743 轮同一批量的）：`o[k]().v * 2 + 1` 是**两层**二元单元套着
  //（外层的第一个孩子是内层那个 `*`）——只看一层的话这一条整支不进，
  // 而它的症状与不修时一字不差（交出那个函数自己）。
  //
  // **它排在 0a2 前面**（第 863 轮，只是把定义往上搬）：0a2 那一支也要问同一个问题——
  // 「这一格的第一格以一次调用开头吗」，而它比下面那条链支**先跑**。
  const chainTailInOperator = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    if (unit.IsBinaryOperatorNode !== true) return false;
    const inner = unit.ProjectableKids;
    if (inner.length < 2) return false;
    if (inner[0]?.IsCallFirstUnit) return true;
    return chainTailInOperator(inner[0]);
  };
  // **把那个二元单元摊到「续格 + 运算符」一层**（第 863 轮）：0a2 那一支要的是这个分法
  // ——尾巴里那个单元拆成「续格那一格（**整格**留着自己去投）+ 它自己的运算符与右操作数」。
  // **与 `flattenChainTailInOperator` 只差一处**：那一支要**裸的续格几格**
  //（链支的入口判据不认「外面包着 `()` 的那种单元」），这一支要**续格那一格自己**
  //（0a2 把尾巴交给 `foldBinaryFrom`，它的右操作数再递回链支——那一支认的是没摊开的形状）。
  // **递归那一档**：`o[k]().v * 2 + 1` 是**两层**二元单元套着，一路走到最里面那一层
  //（第一格以一次调用开头）才停，再把沿途每一层的运算符与右操作数按**从里到外**接上。
  const unwindChainTailInOperator = (unit: any, out: Array<any>) => {
    const inner = unit.ProjectableKids;
    if (inner.length >= 2 && inner[0]?.IsCallFirstUnit) {
      out.push(inner[0]);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].IsBinaryOperatorNode) &&
      chainTailInOperator(inner[0])
    ) {
      unwindChainTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // ---- 0a2. `?.` 那一串被包进了**二元的操作数位**（第 124 轮）----
  //
  // **二元单元排在列表最前面、右操作数延续到它外面的兄弟**（第 145 轮）：
  //
  //     x.Start === y.Start?.Document
  //     ⇒ [BinaryOperator(===)( PropertyAccess(x.Start), «===», y ), ., Start, NCO(Document)]
  //
  // ——左操作数与运算符都在那个单元里，**右操作数却是「它最后一个孩子 + 后面那些兄弟」**
  // （末尾那个 `?.Document` 让链收不进单元）。照通用支投的话这个二元单元会被当成一个整操作数，
  // 后面那截链再单独成节点（实测 `cy.ts` 的 a3：漂移 1 + 多出 2）。
  //
  // **必须排在上面那一支（`?.` 接在链后面）之前**：不排的话末尾那个 NCO 会先把整个前缀
  // （含这个二元单元）投成一条链、再往上套属性访问，右操作数就永远接不上。
  //
  // **判据只看「尾巴是不是一条链的续接」**（`.` 或 `?.`）：`a += b -= c` 那种链式赋值
  // 也是同样的「二元单元在头」形状，但它没有尾巴链、必须交回通用支（实测
  // `ex-chained-assign.ts` / `expr-chained-assign.ts`：多出 6 + 缺 2）。
  //
  // **「以一次调用开头」也算续接**（第 743 轮）：`1 + o["f"]().v` 的产物是
  //
  //     [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ), PropertyAccess(Bracket(()), ., v)]
  //
  // ——**下标调用那一截在单元里、它的调用括号与后缀掉在外面**（与 `o["f"]().v + 1`
  // 正好左右相反，两者由同一轮的两支各管一边）。少了这一档，右操作数只到 `o["f"]` 为止：
  // 实测多出一个盖住整段的 `PropertyAccessExpression` / `CallExpression`，
  // 而真正的 `o["f"]().v` 整片缺失（判据 `exec/round711/p711b-b02`）。
  const tailIsChain = kids
    .slice(1)
    .some((k) => k.IsNullConditionalOperator || k.IsDotSymbol || k?.IsCallFirstUnit);
  // **续格与更松的运算符一起装在下一个二元单元里**（第 863 轮）：`1 + o["f"]().v + 2` 的产物是
  //
  //     [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ),
  //      BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 2 )]
  //
  // ——链头 `o["f"]` 是**第一个单元的最后一个孩子**，续格 `().v` 是**第二个单元的第一个孩子**，
  // 两个 `+` 之间还隔着这一层：TS 是 `(1 + o["f"]().v) + 2`。
  // 少了这一档，下面那条链支会拿**整个第一个单元**当链头（`1 + o["f"]`）：
  // 投出 `PropertyAccess( CallExpression( BinaryExpression(1 + o["f"]), [] ) )`——
  // 缺 `PropertyAccessExpression` / `CallExpression` 各一格、漂一个 `BinaryExpression`，
  // 又多出三个盖住前缀的节点（实测缺口 `gap-round744-chain-in-binary-three-operands`）。
  // **与 `tailIsChain` 是同一件事的两种排版**：`1 + o["f"]().v` 里续格是**外面的兄弟**（走上面），
  // 再往后接一个运算符时它就**搬进了下一个单元**（走这里）。
  const tailInOperator = kids
    .slice(1)
    .some(
      (k) =>
        (k.IsBinaryOperatorNode) &&
        chainTailInOperator(k),
    );
  if (
    (tailIsChain || tailInOperator) &&
    kids.length >= 2 &&
    kids[0].IsBinaryOperatorUnit
  ) {
    const headInner = kids[0].ProjectableKids;
    if (headInner.length >= 2) {
      const operatorUnit = headInner[headInner.length - 2];
      const base = projectExpression(headInner.slice(0, headInner.length - 2), ctx);
      if (base !== undefined && operatorUnit.IsOperatorUnit) {
        // **尾巴里那个二元单元要摊开**（第 863 轮）：摊法是 `unwindChainTailInOperator`
        //（续格那一格**整格**留下——链支认的是没摊开的形状，第 744 轮踩过一次），
        //它自己的运算符与右操作数原样跟在后面、由 `foldBinaryFrom` 折。
        const tail: Array<any> = [];
        for (const one of kids.slice(1)) {
          // **第 1088 轮**：这一问改读 `one.IsBinaryOperatorNode`（原来是两连比类名），
          // 局部变量 `oneKind` 只是 `one.Tag` 的转手，一并收掉。
          if (
            one.IsBinaryOperatorNode &&
            chainTailInOperator(one)
          ) {
            unwindChainTailInOperator(one, tail);
            continue;
          }
          tail.push(one);
        }
        return foldBinaryFrom(
          base,
          [operatorUnit, ...headInner.slice(headInner.length - 1), ...tail],
          ctx,
        );
      }
    }
  }
  //
  //   [Identifier(t), BinaryOperator(??)( NullConditionalOperator(Method(get)), «??», String )]
  //
  // ——`?.` 之前的**基名 `t` 是那个 `BinaryOperator` 单元的前一个兄弟**，运算符与右操作数
  // 都在它里面。照二元那一支走，左操作数落到 `t` 上、`BinaryOperator` 内部那个 NCO 另算，
  // 于是 TS 的 `BinaryExpression` / `CallExpression` / `PropertyAccessExpression` /
  // `QuestionDotToken` **整片丢**（实测 `dist/ts/typescript/ts-ast.ts` 与 `undici-types`
  // 各成片：`table?.get(key) ?? key` 这种写法在产物里遍地都是）。
  //
  // 修法：先把这个 NCO 接到基名上（`chainWithOptional`），再把那个单元**内部**剩下的
  // `[运算符, 右操作数, …]` 与本层后面还跟着的兄弟一起折成二元。
  // 产物里那些运算符单元带着自己的区间，`foldBinaryFrom` 用 `textOfNode` 取文本，照收。
  if (kids.length >= 2) {
    for (let at = 1; at < kids.length; at++) {
      const unit = kids[at];
      if (unit.IsBinaryOperatorNode !== true) {
        continue;
      }
      const inner = unit.ProjectableKids;
      if (inner.length < 2 || inner[0].IsNullConditionalOperator === false) {
        continue;
      }
      const base = projectExpression(kids.slice(0, at), ctx);
      if (base === undefined) {
        continue;
      }
      const extended = chainWithOptional(base, inner[0], ctx);
      return foldBinaryFrom(extended, [...inner.slice(1), ...kids.slice(at + 1)], ctx);
    }
  }
  // ---- 0b. 标签模板 `tag`…``（第 137 轮；第 946 轮（二）从「恰好两个单元」放宽到「末尾那一格是模板」）----
  //
  // 产物是 `[<标签单元>, String]` **两格平级**（`tag`a${b}c`` 的标签与模板各一格），
  // 而 TS 那边是 `TaggedTemplateExpression{ tag, template }`。照通用支投会把它当成
  // 两个平级节点（模板表达式整个丢掉，实测 `ex-tagged-template` 缺 10）。
  // 判据落在**原文的引号**上：那个 `String` 的起点字符是反引号（普通字符串是 `"` / `'`，
  // 产物里两者的属性一模一样，分不出来）。
  //
  // **标签本身可能是一整段链**（第 946 轮（二）实测）：`new ns[a]`` ` `` 的产物是
  // `[Identifier(ns), Bracket([a]), String]` **三格**（`New` 那一趟把下标与模板一起收进了
  // 被构造者那一段），原来的 `kids.length === 2` 在这一档上判否 ⇒ 模板整格丢、
  // 投出来的 `NewExpression` 只剩 `expression`。
  //
  // **放宽成「末尾那一格是反引号 `String`」还差一条守卫**（同轮实测撞到的回归）：
  // `tag`a${x}b` === tag`a${x}b`` 的产物是 `[Identifier(tag), BinaryOperator(String, ===, tag), String]`
  // ——末尾那格也是模板，可**标签不是前面全部**（TS 是 `tag`a${x}b`` 与 `tag`a${x}b`` 两个标签模板
  // 做 `===`），照放宽后的那一支投会把整条比较式收成一个标签模板（0d 那段本来管的就是这一族）。
  // 所以再加一问：**模板前面那一串必须是一条「后缀链」**——`Identifier` / `PropertyAccess` /
  // `Method` / `Bracket` / `String` 这些「能接在操作数后面」的单元，
  // 出现运算符（`BinaryOperator` / `LogicalOperator` …）就不成立。这一问与 0c / 0d 是同一句话，
  // 只是那两段各自判自己的形状。
  // **点号也是后缀链的一格**（第 947 轮（二））：`o.tag`t`` / `new A.B`t`` 的标签是**平铺的一条链**
  // （`[Identifier(o), ., Identifier(tag)]`）——不给点号，这一族的标签就整条判否
  // （实测 `tmp/r947/gate-sweep2.mjs`：`new A.B` 换行 `` `t` `` `.c` 那一族 27 条对不上）。
  // 这一问要挡的是**运算符**（下面那句里点名的 `BinaryOperator` / `LogicalOperator`），
  // 点号与名字不在其中。
  // **`GenericType` / `ExpressionWithTypeArguments` 也是链的一格**（第 977 轮普查量到的）：
  // `f<T>`t`` 的标签是**一格**实例化表达式，而它**看起来像**运算符那一段——
  // 不给它这一档，`const a = f<T>`t`;` 这**一条**就整族让开：实测 39 条片段
  // （`inst-tagged` 那一个底样的每个位置 × 三种 trivia）全部对不上，症状是 `f<T>` 被折成
  // `BinaryExpression(LessThan, T, GreaterThan)` 而模板独立成格。
  // **两种节点名都要认**：token 层的 `GenericType` 在**表达式位**投出来的是
  // `ExpressionWithTypeArguments`（TS 4.7 的 instantiation expression），在**类型位**才是
  // `TypeReference`——而这里拿到的是**已经投好**的节点（第 977 轮第一次只加了 `GenericType`，
  // 量下来那 39 条一条没动，正是这个缘故）。
  // **第 1116 轮起这一串名字全是属性读**（原来是 `const kind = one.Tag;` 再比类名）：
  // 「这一格算不算链的一格」的每一半都在**被问的那一页**身上（那个名字就是它的类名），
  // 所以七格各由自己那一页显式声明（`IsExpressionWithTypeArguments` 是这一轮新立的）。
  // **拿真 TS 复量过那一格**（`tmp/r977-ts.mjs`）：`f < T > `t`` 与 `f<T>`t``、
  // `f < T > (1)` —— 三种排版 TS 都读成**一条** `TaggedTemplateExpression` / `CallExpression`
  // 带 `TypeReference`（而 `x < y > z` 才是二元），所以这一档不是放宽、是**同一句判据少了一格**。
  const tagIsPostfixChain = (units: Array<any>): bool => {
    for (const one of units) {
      if (
        one.IsIdentifierUnit ||
        one.IsPropertyAccess ||
        one.IsMethodNode ||
        one.IsBracketUnit ||
        one.IsStringUnit ||
        one.IsGenericType ||
        one.IsExpressionWithTypeArguments ||
        one.IsDotSymbol
      ) {
        continue;
      }
      return false;
    }
    return units.length > 0;
  };
  // **模板后面那一串也要是链的续格**（第 947 轮）：判据从「**末尾**那一格是模板」
  // 放宽成「**链里有一格是模板**」，模板后面那一串交给 `chainOnto`（与 0c 同一段代码）。
  //
  // **为什么末尾那一格不一定是模板**：`new A` 换行 `` `t` `` `.b` 的产物是
  // `[Identifier(A), String(反引号), ., Identifier(b)]` **四格平铺**——`New` 那一趟把整段
  // 收进了被构造者，而 `New` 排在链规则**前面**，所以链还没折；0c 要的正是「模板与后缀
  // **已经折成**一个 `PropertyAccess`」，在这里不成立 ⇒ 剩下的 `[., b]` 被当成二元运算符的
  // 尾巴折成 `BinaryExpression`（实测 `new A` 换行 `` `t` `` `.b` 缺 1 多 2、
  // `new A[0]` 换行 `` `t${x}` `` `.b` 缺 8）。
  //
  // **尾巴必须整段都是链的续格**：混着运算符（`BinaryOperator` / `LogicalOperator` …）就整个让开，
  // 交回下面通用那一支——宁可维持原来的错，也不把「模板不在这一格的末尾」当成标签模板。
  const IsChainTail = (units: Array<any>): bool => {
    for (const one of units) {
      if (
        one.IsIdentifierUnit ||
        one.IsPropertyAccess ||
        one.IsMethodNode ||
        one.IsBracketUnit ||
        one.IsArrayLiteralUnit ||
        one.IsNullConditionalOperator ||
        one.IsNotNull
      ) {
        continue;
      }
      if (one.IsDotSymbol) {
        continue;
      }
      return false;
    }
    return true;
  };
  // 从右往左找那一格模板：**最后**一格能当标签模板起点的就是它。
  // `at` 从 1 起（模板前面至少要有一格标签），标签与尾巴两问都过才认。
  let templateAt = -1;
  for (let at = kids.length - 1; at >= 1; at--) {
    const one = kids[at];
    if (!one.IsTemplateString) {
      continue;
    }
    if (tagIsPostfixChain(kids.slice(0, at)) && IsChainTail(kids.slice(at + 1))) {
      templateAt = at;
      break;
    }
  }
  if (templateAt !== -1) {
    const tag = projectExpression(kids.slice(0, templateAt), ctx);
    const template = projectNode(kids[templateAt], ctx);
    if (tag !== undefined && template !== undefined) {
      const head = { kind: "TaggedTemplateExpression", tag, template, pos: tag.pos, end: template.end };
      const tail = kids.slice(templateAt + 1);
      return tail.length === 0 ? head : chainOnto(head, tail, ctx);
    }
  }
  // ---- 0c. 标签模板**后面还跟着后缀**（第 176 轮）----
  //
  // `` tag`abc`.length `` 的产物是
  // `[Identifier(tag), PropertyAccess(String(反引号), ., length)]`——
  // **标签留在外面，模板串与后缀在同一个 `PropertyAccess` 单元里**（XML 实测）。
  // 所以上面那条 0b 判据（`kids[1]` **就是**那个 `String`）看不到它，
  // 通用支只投第一格，于是**标签模板与后缀整片丢**：
  // `` const r = tag`abc`.length `` 投出来是 `VariableDeclaration{ Identifier r, Identifier tag }`，
  // 降级层拿到一个光秃秃的 `tag`，于是运行时给的是**函数本身**
  //（Node 给 `3`、本仓给 `[Function (anonymous)]`——`runtime:cli` 第 53 份语料是绿的，
  // 因为它只钉了不带后缀的 `` tag`abc` ``）。
  //
  // 判据与 0b 同源，只是往里走一层：第二格是 `PropertyAccess`、它**第一个**可投影子单元
  // 是**反引号开头**的 `String`（普通字符串是 `"` / `'`，`String.PrintAst` 靠这个分岔；
  // 第 1073 轮之前那一格叫 `projectString`）。
  // 标签那一侧走 `projectExpression(kids.slice(0, 1))`：`obj.tag` / `f()` / `(…)`
  // 这些接收者本来就是**一个单元**，`projectExpression` 自己会投对
  //（`(cond)` 那一格落在 `ctx.ParenthesizedOf` 这条出口就地写的那一份算式上——
  // 那一格私有声明第 1112 轮已并进它的调用点）。
  //
  // 后缀那两个方向**照抄已经有的那份**（`chainOnto`）：下标 `[…]`、点号成员、
  // 点号后面跟 `Method`（调用）、成员格里又是一条链——与「二元右操作数后面那串续格」
  // 走的是同一段代码，不另写一遍。本层后面还跟着兄弟（`` tag`abc`.length + 1 ``）时
  // 再交回二元那一支。
  // **标签那一格必须是「一个已经完整的表达式」**（读的是 `tagUnit.IsChainBaseNode`，第 1075 轮，
  // 外加值位括号）：`1 + t`abc`` 的产物也是 `[BinaryOperator(1, +, t), PropertyAccess(…)]`
  // 这种「模板单元在第二格」的形状，但那里的标签是**那个二元单元的最后一个操作数**
  //（`t`），不是整个 `1 + t`——认错的话 `1 + t`abc`` 会变成 `(1 + t)`abc``，
  // 静默算成另一个值。那一族（模板单元**跟在运算符单元后面**）记在台账里，本轮不做。
  const tagUnit = kids[0];
  const tagIsComplete =
    tagUnit.IsChainBaseNode ||
    (tagUnit.IsParenBracket);
  // **标签本身可能是一整段平铺的链**（第 947 轮（二））：`o/*c*/.tag`t`.b` 的产物是
  // `[Identifier(o), ., Identifier(tag), PropertyAccess(String, ., b)]`——那条注释把
  // `o.tag` 那一段**拆平了**（链规则没把它们折成一格），于是 `kids[1]` 是**点号**、
  // 不是那个 `PropertyAccess`，判据卡在 `kids[1]` 上 ⇒ 模板与后缀整片丢（实测缺 3 漂 1）。
  // 所以先**找出那一格装着模板的 `PropertyAccess`**（在它前面那一串仍是后缀链时），
  // 标签取它**前面全部**——上面那条 `kids.length === 2` 的口径在这里自然被覆盖。
  let templateChainAt = -1;
  for (let at = 1; at < kids.length; at++) {
    if (kids[at].IsPropertyAccess === false) {
      continue;
    }
    if (tagIsPostfixChain(kids.slice(0, at)) === false) {
      continue;
    }
    const probe = kids[at].ProjectableKids;
    if (probe.length >= 2 && probe[0].IsTemplateString) {
      templateChainAt = at;
      break;
    }
  }
  if (tagIsComplete && templateChainAt !== -1) {
    const inner = kids[templateChainAt].ProjectableKids;
    const tag = projectExpression(kids.slice(0, templateChainAt), ctx);
    const template = projectNode(inner[0], ctx);
    if (tag !== undefined && template !== undefined) {
      const head = {
        kind: "TaggedTemplateExpression",
        tag,
        template,
        pos: tag.pos,
        end: template.end,
      };
      const chained = chainOnto(head, inner.slice(1), ctx);
      const tail = kids.slice(templateChainAt + 1);
      return tail.length === 0 ? chained : foldBinaryFrom(chained, tail, ctx);
    }
  }
  // ---- 0d. 标签模板处在**运算符的左脊柱**上（第 176 轮）----
  //
  // `` tag`abc` + 1 `` 的产物是 `[Identifier(tag), BinaryOperator(String(反引号), +, 1)]`，
  // `` tag`abc`.length + 1 + 2 `` 是
  // `[Identifier(tag), BinaryOperator(BinaryOperator(PropertyAccess(String, ., length), +, 1), +, 2)]`
  // ——**标签还在外面，模板串在被运算符单元吃掉的那一格的最左边**。
  // 与 0c 是同一件事（模板串被留成了兄弟单元的成员），只是中间多套了几层运算符。
  //
  // 判据沿**左脊柱**往下走：每一层都要求「这一格的第一个子单元是模板串（或者
  // 第一个子单元是 `PropertyAccess`、它的第一个子单元是模板串）」，沿途把每个运算符单元的
  // `(运算符, 右操作数)` 从**里往外**收起来；收到模板串那一层为止，再把它们**从里往外**
  // 交给 `foldBinaryFrom`——左结合链本身怎么折，与通用那一支是同一段代码。
  //
  // 脊柱上任何一层不满足就整个让开（交回下面的通用支）：宁可维持原来的错，
  // 也不能把「模板串其实不在这一格」的形状认成标签模板。
  if (
    tagIsComplete &&
    kids.length >= 2 &&
    (kids[1].IsBinaryOperatorNode)
  ) {
    let spine = kids[1];
    let templateUnit: any = undefined;
    let members: Array<any> = [];
    const layers: Array<Array<any>> = [];
    while (spine !== undefined) {
      const inner = spine.ProjectableKids;
      if (inner.length < 3) break;
      const head = inner[0];
      const headKids = head.IsPropertyAccess ? head.ProjectableKids : [head];
      if (headKids[0]?.IsTemplateString) {
        templateUnit = headKids[0];
        members = headKids.slice(1);
        layers.push([inner[inner.length - 2], inner[inner.length - 1]]);
        break;
      }
      if (head.IsBinaryOperatorNode !== true) break;
      layers.push([inner[inner.length - 2], inner[inner.length - 1]]);
      spine = head;
    }
    if (templateUnit !== undefined) {
      const tag = projectExpression(kids.slice(0, 1), ctx);
      const template = projectNode(templateUnit, ctx);
      if (tag !== undefined && template !== undefined) {
        let left: any = {
          kind: "TaggedTemplateExpression",
          tag,
          template,
          pos: tag.pos,
          end: template.end,
        };
        if (members.length > 0) left = chainOnto(left, members, ctx);
        const rest: Array<any> = [];
        for (let q = layers.length - 1; q >= 0; q--) {
          rest.push(layers[q][0], layers[q][1]);
        }
        for (const k of kids.slice(2)) rest.push(k);
        return foldBinaryFrom(left, rest, ctx);
      }
    }
  }
  // ---- 0e. 零实参的调用括号被卷进了运算符单元（第 179 轮）----
  //
  // `xs[0]() + 1` 的产物是
  // `[PropertyAccess(xs, [0]), BinaryOperator(Bracket(空), +, 1)]`——
  // **被调方在外面，它那一对空括号却在二元单元的最左边**。
  // 投影的二元那一支会把这个 `()` 当成左操作数（`ParenthesizedExpression(空)`），
  // 被调方那一段于是只剩 `xs[0]`——`console.log(xs[0]() + 1)` 打出来的是**函数本身**
  //（Node 给 `2`，**静默错值**）。
  //
  // 判据：沿**二元单元的左脊柱**往下走，找到「第一个子单元是**空的 `(` 括号**」那一层
  // ——那个括号是**前一个兄弟（被调方）的实参表**。先把前一个兄弟投出来、
  // 套一层零实参的 `CallExpression`，再把沿途每一层的 `(运算符, 右操作数)`
  // **从里往外**交给 `foldBinaryFrom`（与 0d 那一支同一个折法）。
  //
  // 脊柱上任何一层不满足就整个让开——宁可维持原来的错，也不能把别的形状认成调用。
  if (
    kids.length >= 2 &&
    (kids[1].IsBinaryOperatorNode)
  ) {
    let emptyCallSpine = kids[1];
    let emptyCallBracket: any = undefined;
    const emptyCallLayers: Array<Array<any>> = [];
    while (emptyCallSpine !== undefined) {
      const inner = emptyCallSpine.ProjectableKids;
      if (inner.length < 3) break;
      const head = inner[0];
      if (
        head.IsParenBracket &&
        head.ProjectableKids.length === 0
      ) {
        emptyCallBracket = head;
        emptyCallLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
        break;
      }
      if (head.IsBinaryOperatorNode !== true) break;
      emptyCallLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
      emptyCallSpine = head;
    }
    if (emptyCallBracket !== undefined) {
      const callee = projectExpression(kids.slice(0, 1), ctx);
      if (callee !== undefined) {
        let called: any = {
          kind: "CallExpression",
          expression: callee,
          arguments: [],
          pos: callee.pos,
          end: endOf(emptyCallBracket),
        };
        const rest: Array<any> = [];
        for (let q = emptyCallLayers.length - 1; q >= 0; q--) {
          rest.push(emptyCallLayers[q][0], emptyCallLayers[q][1]);
        }
        for (const k of kids.slice(2)) rest.push(k);
        return foldBinaryFrom(called, rest, ctx);
      }
    }
  }
  // ---- 0f. 赋值后面跟着逗号（第 180 轮）----
  //
  // `a = 1, 5` 的产物是 `[Identifier(a), SymbolToken(=), BinaryOperator(1, «,», 5)]`——
  // **逗号单元最左边那一格 `1` 其实是赋值号的右操作数**，而 `a` `=` 还在外面。
  // TS 那边是 `BinaryExpression( BinaryExpression(a = 1), «,», 5 )`。
  // 照通用支走会拼成 `a = (1, 5)`——实测 `const c = (a = 1, 5)` 里那个 `a` 变成 **5**
  //（Node 给 **1**，**静默错值**）；`(a = 1, a = 2)` 则干脆报
  // `unimplemented: assignment to a non-identifier`（形状这一层就错了）。
  //
  // **判据两头都要**：
  //   · 前面那一格是**赋值号**（`=` / `+=` / …）——`a = b + 1` 的产物也是
  //     `[a, =, BinaryOperator(b, +, 1)]`，但那里的单元**不是逗号**，
  //     照这条认会把 `a = b + 1` 拆成 `(a = b) + 1`；
  //   · 这个单元的运算符是 **`,`**（只有逗号比赋值更松，也才会这样分家）。
  //
  // **逗号是左结合的，所以最左边那一格可能要往下走几层**：
  // `a = 1, b, c` 的产物是 `[a, =, BIN(BIN(1, «,», b), «,», c)]`——
  // 沿**左脊柱**一路走到「第一个子单元**不是**逗号单元」那一层，
  // 那一格才是赋值号的右操作数。然后把沿途每一层的 `(运算符, 右操作数)`
  // **从里往外**交给 `foldBinaryFrom`（与 0d / 0e 同一个折法）。
  if (kids.length >= 2) {
    for (let at = 1; at < kids.length; at++) {
      const unit = kids[at];
      if (unit.IsBinaryOperatorNode !== true) continue;
      // **赋值号不一定紧贴着这个单元**（第 863 轮）：`x = 1 + o["f"]().v, y` 的产物是
      //
      //     [x, «=», BinaryOperator( 1, «+», PropertyAccess(o, [f]) ),
      //      BinaryOperator(,)( PropertyAccess(Bracket(()), ., v), «,», y )]
      //
      // ——RHS 里那条调用链把**逗号单元推到了隔着一个兄弟**的位置（链的续格与逗号折进了
      // 同一个单元），于是「前一个兄弟是赋值号」那一问在这里**为假**、整支不进 ⇒
      // 逗号被当成 RHS 的一部分：TS 是 `(x = 1 + o["f"]().v), y`，产物给 `x = (…, y)`
      //（实测 `tmp/r863/ctl-4` / `ctl-5`）。
      // **判据改成「本层左边有没有一个赋值号」**，取**最左边**那一个——逗号比任何赋值都松，
      // 切点就该落在最外面那一层赋值上（`x = y = 1, z` 切在第一个 `=`，折出来是 `(x = y = 1), z`）。
      // `a = b + 1` 那一档照旧由下面「这个单元里是逗号吗」挡住，不受影响。
      // **第 1125 轮**：那个「是不是赋值号」的算式整段收进被问的那一页
      // （`SymbolToken.IsAssignmentSymbol`，读时现算、读它自己的正文）——原来是本页现场拼的
      // `text === "=" || (text.length > 1 && text.endsWith("=") && !["==", …].includes(text))`，
      // 而「我这一格的正文是不是一个赋值（而不是那六个比较运算符）」只有那一页知道。
      let assignAt = -1;
      for (let j = 1; j < at; j++) {
        const one = kids[j];
        if (one.IsAssignmentSymbol === true) {
          assignAt = j;
          break;
        }
      }
      if (assignAt < 0) continue;
      const unitInner = unit.ProjectableKids;
      if (unitInner.length < 3) continue;
      // **逗号那一格自己答**（第 1074 轮立、第 1120 轮收到这里）：`IsCommaSymbol` 住的
      // 是符号那一页，而这一格读到的是**二元运算符单元**的正文——它把运算符放在
      // `Data` 的倒数第二格上（`a, b` 折成 `BinaryOperator(a , b)`），正文由基类那一格
      // `TextValue` 给，所以这一处与 `head.IsCommaSymbol` 逐格同答（第 1120 轮第二趟
      // 把它从 `TextValue === ","` 换过来）。
      if (unitInner[unitInner.length - 2].IsCommaSymbol !== true) continue;
      let level = unit;
      let leftmost: any = undefined;
      const levels: Array<Array<any>> = [];
      while (level !== undefined) {
        const inner = level.ProjectableKids;
        if (inner.length < 3) break;
        levels.push([inner[inner.length - 2], inner[inner.length - 1]]);
        const head = inner[0];
        const headIsComma =
          (head.IsBinaryOperatorNode) &&
          head.IsCommaSymbol === true;
        if (headIsComma) {
          level = head;
          continue;
        }
        leftmost = head;
        break;
      }
      if (leftmost === undefined) continue;
      const assigned = projectExpression([...kids.slice(0, at), leftmost], ctx);
      if (assigned === undefined) continue;
      const rest: Array<any> = [];
      for (let q = levels.length - 1; q >= 0; q--) {
        rest.push(levels[q][0], levels[q][1]);
      }
      for (const k of kids.slice(at + 1)) rest.push(k);
      return foldBinaryFrom(assigned, rest, ctx);
    }
  }
  // ---- 0b2. 标签模板**后面还跟着后缀**：第 173 轮在这里加过一条判据——**退回来了** ----
  //
  // 判据写的是「第二格是 `PropertyAccess` 且它第一个子单元是反引号 String」，
  // 拼法是把标签模板拼好后按 `dottedExpression` 那条形状挂成员（第 1105 轮起经 `kindOf` 给 kind）。
  // **实测它一次都没生效**：`cases:tsast` 照样 1434/1434、
  // `` tag`abc`.length `` 照样给 `[Function (anonymous)]`、
  // AST 照样是 `VariableDeclaration{ Identifier r, Identifier tag }`
  //（标签模板与 `.length` 全丢）。**没被验证过的改动不留** → 撤回。
  //
  // **这一轮我重犯了第 168 轮那个错**：没插桩就加分支（「先插桩、再下结论」）。
  // **下一轮的入口**：给 `projectExpression` 插一行探针，把
  // `[Identifier tag, PropertyAccess{…}]` 这种 kids **到底落在哪一支**打出来——
  // 现在已知的是：**这一支不是它**（那一段入口更早）。
  // 另外这一轮**证实了一件事**：第 172 轮那次「结果挪一格」的试验是在
  // **AST 还错着**的时候做的，所以它当时**什么也证明不了**——
  // 等 AST 修对之后，那个槽位假设**要重新量一遍**（不能拿它当已否证的结论）。
  // ---- 0b1. 标签模板**后面还跟着后缀**：第 173 / 174 轮各试过一次——**都退回来了** ----
  //
  // **判据是对的、取子单元的办法也找到了**（第 174 轮探针）：
  // 这个形状确实是 `projectLetFrom → projectExpression`，kids 正是
  // `Identifier,PropertyAccess`；而取子单元要用 **`projectableKids`**
  //（第 173 轮用 `(...)` → 分支**静默不成立**，所以那次「没生效」）。
  //
  // **换成 `projectableKids` 之后分支生效了**（AST 立刻变对：标签模板与 `.length` 都在），
  // **但降级层当场报新错**：`v.segments is not iterable`——
  // 说明这一支里对那个 `String` 单元调 `projectNode(…)` **拿到的不是投影期待的那种节点**
  //（`v.segments` 是投影内部 `String` 视图上的字段，见本文件 4527 / 5380 那两处）。
  // **没被验证过的改动不留** → 第二次也撤回。
  //
  // **下一轮的第一件事**：把**已经在用的**那条 0b 判据（`` tag`abc` `` 整句那条，
  // 第 137 轮）里 `projectNode(kids[1], ctx)` 的 **`kids[1]` 到底是什么形状**打出来
  //（`allKids` / `view` / `kidsOf(…, "children")` 各给什么），
  // 再拿同一个形状去投属性访问里的那个 `String`——**照抄那条已经跑通的路**，
  // 不再自己另找一条。
  // ---- 0b. 展开实参（第 114 轮）----
  //
  // `f(...xs)` 的产物把 `...` 与目标分成**两格**，而 `...` 是 `SymbolToken`
  // （`IsOperatorUnit` 对任何符号都为真），照二元那一支会把它投成一个孤立的
  // `DotDotDotToken`（实测多出 66，样本全是 `...(newValues)` / `...(items)` 这种调用实参）。
  if (kids.length >= 2 && kids[0].IsDotDotDotSymbol) {
    const spread = projectExpression(kids.slice(1), ctx);
    if (spread !== undefined) {
      return {
        kind: "SpreadElement",
        expression: spread,
        pos: startOf(kids[0]),
        end: endOf(kids[kids.length - 1]),
      };
    }
  }
  // ---- 1. 链（成员访问与下标访问混排，**从左边开始折**） ----
  //
  // 产物那边链是一个 `PropertyAccess` 单元，子单元**按原文顺序**排：
  //
  //   `a.b.c`      → [a, ., b, ., c]
  //   `a.b(1).c`   → [a, ., Method(b(1)), ., c]
  //   `a[i]`       → [a, Bracket[i]]            （第 80 轮：下标进链）
  //   `a[i].b`     → [a, Bracket[i], ., b]
  //
  // TS 那边是**左结合的嵌套**，所以这里顺着走、折一层套一层。
  // **第 70 轮**：token 层新增了 `PropertyAccess`（成员访问链在 token 层就折成一个单元），
  // 所以这里的两条输入路径都要认——`PropertyAccess` 单元走同一个递归（见 `projectNode`），
  // 而**值位里散着的平铺链**（类型位、`?.` 让路之后的残留）仍走这一支。
  // **`!` 后面那个下标被收成了「数组字面量」兄弟**（第 303 轮）：
  // `o.b![1]` 的产物是 `<NotNull(PropertyAccess(o.b), !)>` 与 `<ArrayLiteral(1)>`
  // **两个平级单元**——`!` 那一格只把**左边**包起来，后面那个 `[` 谁也不认它
  // （它不是下标位、也不是数组字面量位，于是**按数组字面量成形**）。
  // 于是原来的链分支进不来（它要求 `kids[1]` 是 `.` 或**真下标**），
  // `NotNull` 单独投影 ⇒ **`[1]` 整个丢掉**：
  // `o.b![1]` 在 Node 里是 `2`，本仓给的是**那个数组本身**——**静默错值**
  // （判据 `ex-nonnull-chain-index` / `ex-nonnull-and-as-chain`）。
  // **一元前缀的操作数掉在单元外面**（第 739 轮）时也要进这一支：
  // `typeof await p` 的产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`——
  // 第二格是一条**成员访问链**（头一格是 `Identifier`，不是调用括号），
  // 所以上面那些入口条件（`.` / 下标 / 以调用开头）一个都不成立，
  // 这个一元单元会被单独投出去（`expression` 缺一格）⇒ 降级期报
  // `unimplemented: expression AwaitKeyword`。判据与下面那一支共用同一个 `chainTail`。
  const chainTail = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    if (unit.IsBracketUnit || unit.IsPropertyAccess || unit.IsMethodNode) return true;
    if (unit.IsNotNull) return true;
    return unit.IsDotSymbol;
  };
  // **把那个二元单元摊进 `ck`**（判据与理由见上面 `chainTailInOperator`）：
  // 续格那一截按原样摊成平级（与 `IsCallFirstUnit` 那一支同一个手法），
  // 运算符与右操作数**原样留在后面**（尾巴那一支就是按「以运算符开头的一串」折的）。
  // **递归那一档**：第一格还是二元单元时先把它摊开，再把自己的运算符与右操作数接上
  //（`o[k]().v * 2 + 1` ⇒ `[o[k], (, ., v, «*», 2, «+», 1]`）。
  const flattenChainTailInOperator = (unit: any, out: Array<any>) => {
    const inner = unit.ProjectableKids;
    if (inner.length >= 2 && inner[0]?.IsCallFirstUnit) {
      // **整格 `Method` 不摊开**（第 975 轮）：`a!()()() + 1` 的那个二元单元里，
      // 第一格是 `Method(name=""[Method(name=""[Bracket])])`——它自己说的是**三次调用**
      // （第 966 轮那句话：一格可以盖着好几层），摊成它的**孩子**就少了一层，
      // 实测最外面那格 `CallExpression` 的区间只到 `[0,6)`（TS 是 `[0,8)`）。
      // 整格留给链循环：那里的 `Method` 分支正是按「最里面那一格」折的
      //（`innermostCallee` + `graftCallee`）。
      // **`PropertyAccess` 那一档照旧摊开**：`o["f"]().v` 那一格才是「调用 + 后缀」
      // 两件事装在一个外壳里，摊平之后循环里那两支各办一件。
      if (inner[0].IsPropertyAccess) {
        for (const one of inner[0].ProjectableKids) out.push(one);
      } else {
        out.push(inner[0]);
      }
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].IsBinaryOperatorNode) &&
      chainTailInOperator(inner[0])
    ) {
      flattenChainTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // **链头是函数 / 类时，续格（下标）可能与运算符一起装在二元单元里**（第 775 轮）：
  // `() => class { static s = 1; }["s"] * 16` 在箭头体里的产物是
  // `[Class, Statement(BinaryOperator(ArrayLiteral(s), «*», 16))]`——那个 `["s"]` 先按
  // **数组字面量**成形（与链入口那条新判据同一处境：前面那一格 token 层认不出是值），
  // 再与后面的运算符折进同一个单元（与第 743 轮 `o["f"]().v + 1` 是同一副面孔，
  // 只是续格是**下标**、不是调用）。
  // **只有「链头只可能做值」的那两格才算数**：别的链头（标识符 / 已折好的链）本来就由
  // token 层认成下标，轮不到这一支——放开会换掉既有形状（实测 `o["i"] * 2` 一直是对的）。
  const indexTailInOperator = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    if (unit.IsBinaryOperatorNode !== true) return false;
    const inner = unit.ProjectableKids;
    if (inner.length < 2) return false;
    if (inner[0]?.IsIndexFirstUnit) return true;
    return indexTailInOperator(inner[0]);
  };
  // 摊法与 `flattenChainTailInOperator` 一字不差（递归那一档同一理由）：
  // 续格那一格（下标）摊成平级，运算符与右操作数**原样留在后面**，由尾巴那一支折二元。
  const flattenIndexTailInOperator = (unit: any, out: Array<any>) => {
    const inner = unit.ProjectableKids;
    if (inner.length >= 2 && inner[0]?.IsIndexFirstUnit) {
      out.push(inner[0]);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].IsBinaryOperatorNode) &&
      indexTailInOperator(inner[0])
    ) {
      flattenIndexTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // **把那个二元单元拆成两段**（第 744 轮）：续格那一格（归**操作数**）与
  // 「运算符 + 右操作数」（归**外层折二元**）。`typeof o["f"]().v + ""` 要的就是这个分法——
  // 一元比二元**紧**，`+ ""` 不在一元的操作数里。
  // **续格给的是那一格单元本身、不是摊平的几格**：它要递回 `projectExpression` 的链那一支，
  // 而那一支认的是**没摊开**的形状（与上面那一支注释里写的是同一条理由——
  // 裸的 `(` 兄弟不在链那一支的入口判据里）。
  const splitChainTailInOperator = (unit: any) => {
    const rest: Array<any> = [];
    let tail: any = undefined;
    const walk = (one: any) => {
      const inner = one.ProjectableKids;
      if (inner.length >= 2 && inner[0]?.IsCallFirstUnit) {
        tail = inner[0];
        for (let j = 1; j < inner.length; j++) rest.push(inner[j]);
        return;
      }
      if (inner.length >= 2 && chainTailInOperator(inner[0])) {
        walk(inner[0]);
        for (let j = 1; j < inner.length; j++) rest.push(inner[j]);
        return;
      }
      rest.push(one);
    };
    walk(unit);
    return { tail: tail, rest: rest };
  };
  if (
    kids.length >= 2 &&
    (kids[1].IsDotSymbol || kids[1].IsIndexBracket ||
      (kids[0].IsNotNull && kids[1].IsArrayLiteralUnit) ||
      // **`!` 后面那一格以一次下标开头**（第 333 轮）：`[1]!` 与 `[0].id`
      // 两种外壳（`NotNull` / `PropertyAccess`）都要认——判据与理由见
      // `IsIndexFirstUnit` 那一段。少了它，`o.b![1]![0]` 与 `data.list![0].id`
      // **整条链都进不来**（后两个方括号连着丢）。
      (kids[0].IsNotNull && kids[1]?.IsIndexFirstUnit) ||
      // **函数 / 类表达式后面紧跟的方括号是下标**（第 775 轮）：`function () { }["length"]` /
      // `class { }["name"]` 里那个方括号与前一条（`o.b![1]`）**是同一处境**——
      // 前面那一格不是「标识符 / 已折好的链」，于是它按**数组字面量**成形；
      // 而链的头一格是**只可能做值**的函数 / 类单元 ⇒ 那个方括号只能是下标。
      // 少了这一条，链那一支整个进不来：`kids[0]` 单独投出去（`FunctionDeclaration`）、
      // 方括号整段丢（降级期报 `unimplemented: expression FunctionDeclaration`）。
      // **续格后面还跟着运算符时**形状又换一格（`["s"] * 16` 折进了同一个二元单元）——
      // 那一档由 `indexTailInOperator` 认（判据见上面那一段）。
      (kids[0].IsValueOnlyUnit &&
        (kids[1]?.IsIndexFirstUnit || indexTailInOperator(kids[1]))) ||
      // **第二格以一次调用开头**（第 692 轮）：`o["f"]().v` 的产物是
      // `[PropertyAccess(o, [f]), PropertyAccess(Bracket(()), ., v)]`——
      // 调用那一对括号**与它后面的 `.v` 一起**折进了第二个 `PropertyAccess`
      //（`o["f"]()` 单独出现时是三格平级 `[o, Bracket([f]), Bracket(())]`，
      //  多了后缀之后 token 层给出的形状**就换了一个**）。
      // 判据与理由见 `IsCallFirstUnit` 那一段。
      kids[1]?.IsCallFirstUnit ||
      // **第二格是二元单元、续格在它里面**（第 743 轮，判据见上面 `chainTailInOperator`）。
      chainTailInOperator(kids[1]) ||
      // **一元前缀 + 操作数在外的链**（第 739 轮，判据见上面 `chainTail` 那一段）。
      (kids[0].IsUnaryOperator && chainTail(kids[1])))
  ) {
    // **嵌套的链要摊平**（第 86 轮）：产物偶尔把**一整条链**塞进另一条链的成员位——
    // `this.Parent!.Data.splice(1, 2)` 实测是
    // `[NotNull(this.Parent), ., PropertyAccess([Data, ., Method(splice)])]`，
    // 而 TS 那边是**左结合**的 `((this.Parent!).Data).splice(1, 2)`。
    // 不摊平的话那一格会走「成员名」那一支、投成一个盖住整段的 `Identifier`
    // （实测 `Data.splice(1, 2)` 成了名字，`splice` 那次调用也丢了）。
    const ck = [];
    for (let at = 0; at < kids.length; at++) {
      const k = kids[at];
      // **第二格那份「调用括号 + 后缀」要摊开**（第 692 轮）：
      // `o["f"]().v` 的第二格是 `PropertyAccess(Bracket(()), ., v)`——
      // 它外壳是属性访问，里层却是**两件事**：先对前面那次下标的结果**调一次**，
      // 再把 `.v` 接上去。**不摊开的话**：循环看到的是一个 `PropertyAccess`
      // ⇒ 既不是下标、也不是点号 ⇒ `break` ⇒ `left` 停在 `ElementAccessExpression`，
      // 后面整段丢（`console.log(o["f"]().v)` 于是打印**那个函数自己**，
      // Node 打印 `1`——**静默错值**；`typeof o["f"]()` 那一条既有判据钉的
      // 是**没有后缀**的形状，所以一直没露）。
      // **摊开之后与 `o["f"]()` 那条既有路一字不差**：`(` 那一格走循环里
      // 「调用括号也是链上的一格」那一支，`.v` 走点号那一支。
      // **摊开之前先问一句「这一格的区间是不是盖着两层调用」**（第 966 轮）：
      // `a!()().c` 的第二格是 `PropertyAccess(Method(name=""[Bracket(())]), ., c)`——
      // 那个 `Method` 里**只有一对括号**，可它的区间一直盖到第二个 `)`：
      // 里层（`a!()`）那次调用与外层那对括号**共用同一格 `Method`**。
      // 摊开成 `[Method, ., c]` 之后，`Method` 原本那个「外面还有一层」的信息就**丢了**
      //（`projectNode(Method)` 只投得出内层那一次调用）⇒ 外层的调用、`.c` 一起消失
      //（实测 `gap-r964-nonnull-call-twice-member`：缺 4 格）。
      // **做法**：摊开这件事交给 `chainOnto` 的 Method 分支——它按**区间**判「外面还有一层」，
      // 正是这一档需要的（那一支第 966 轮补齐了）。
      if (k.IsPropertyAccess && at > 0 && k.IsIndexFirstUnit) {
        const bareKids = k.ProjectableKids;
        const bareHead = bareKids.length > 0 ? bareKids[0] : undefined;
        if (bareHead !== undefined && bareHead.IsMethodNode
          && String(bareHead.DeclaredName) === ""
          && endOf(bareHead) < endOf(k)) {
          ck.push(k);
          continue;
        }
      }
      if (k.IsPropertyAccess && at > 0 && k.IsCallFirstUnit) {
        for (const inner of k.ProjectableKids) ck.push(inner);
        continue;
      }
      if (k.IsPropertyAccess && at > 0 && kids[at - 1].IsDotSymbol) {
        for (const inner of k.ProjectableKids) ck.push(inner);
        continue;
      }
      // **二元单元的第一个孩子是链的续格**（第 743 轮，判据见上面 `chainTailInOperator`）：
      // `o["f"]().v + 1` 的第二格那个二元单元里装的是**链的下一截**（调用括号 + 后缀）。
      // **不摊开的话**：循环在那一格上停住（它既不是下标、也不是点号），
      // 尾巴那一支又把整个二元单元当成「以运算符开头的一串」递给 `foldBinaryFrom`——
      // 可它是一格**单元**、不是运算符 ⇒ `rest.length < 2` 那一条直接返回 `left`
      // ⇒ `o["f"]().v + 1` 交出**那个函数自己**（Node 给 2，**静默错值**；
      //  `o[k]().v + ""` 同一条路，实测 Node `1` 对产物 `[Function: f]`）。
      // **摊开之后与 `o["f"]().v` 那条既有路一字不差**：续格交给循环里那几支，
      // 运算符与右操作数原样留在后面，由尾巴那一支折成二元。
      if (
        at > 0 &&
        (k.IsBinaryOperatorNode) &&
        chainTailInOperator(k)
      ) {
        flattenChainTailInOperator(k, ck);
        continue;
      }
      // **续格（下标）与运算符一起装在二元单元里**（第 775 轮，判据见上面
      // `indexTailInOperator`）：与上一条同款——续格摊成平级，运算符与右操作数留在后面。
      // **只在链头是函数 / 类时走**：那一档才有「方括号被收成数组字面量」这件事。
      if (
        at > 0 &&
        (k.IsBinaryOperatorNode) &&
        (kids[0].IsValueOnlyUnit) &&
        indexTailInOperator(k)
      ) {
        flattenIndexTailInOperator(k, ck);
        continue;
      }
      // **点号后面那一格是一个二元单元**（第 125 轮）：`(a.pos ?? 0)` 的产物把
      // `a.pos ?? 0` 平铺成 `[a, ., BinaryOperator(pos, ??, 0)]`——那个 `BinaryOperator`
      // 的**第一个孩子才是成员名**，其余才是运算符与右操作数。不摊开的话下面
      // `next.NameNode` 会把整段 `pos ?? 0` 当成名字（投出一个盖住整段的 `Identifier`），
      // `PropertyAccessExpression` / `QuestionQuestionToken` / `NumericLiteral` 全丢
      // （实测 `dist/ts/typescript/ts-ast.ts` 与 `lib.es5.d.ts` 成片）。
      if (
        (k.IsBinaryOperatorNode) &&
        at > 0 &&
        kids[at - 1].IsDotSymbol
      ) {
        const inner = k.ProjectableKids;
        if (inner.length >= 2) {
          for (const one of inner) ck.push(one);
          continue;
        }
      }
      ck.push(k);
    }
    // **`!` 后面那一格「以一次下标开头」的单元要摊开**（第 333 轮）：
    // `data.list![0].id` 的 token 形状是 `[NotNull(data.list), PropertyAccess(ArrayLiteral(0), ., id)]`
    // ——第二格的外壳是**属性访问**，而它要落的其实是**两件事**：
    // 先按那个方括号下标、再把 `.id` 接上去。
    // **不摊开的话**：循环看到的是一个 `PropertyAccess` ⇒ 既不是下标、也不是点号
    // ⇒ `break` ⇒ 后面整段丢（`data.list![0].id` 于是给**整个数组**，
    // 而 Node 给 `1`——**静默错值**，判据 `c331-ex-nonnull-and-optional-mix`）。
    // **`NotNull` 那一档不在这里摊**：它自带「断言」那一半，
    // 摊成两格反而会把那个 `!` 丢成一枚裸符号——它由循环里那一支一起办（见下面）。
    const headAssert = kids.length > 0 && kids[0].IsNotNull;
    if (headAssert && ck.length > 0) {
      const flattened: Array<any> = [];
      for (let at = 0; at < ck.length; at++) {
        const one = ck[at];
        // **外壳是属性访问、头一格是「断言盖着一次调用」时也要摊开**（第 975 轮）：
        // `a!()![0]` 的第二格是 `PropertyAccess([NotNull(Bracket(()), !), Bracket([0])])`——
        // 里层是两件事（先按括号调一次、再取下标），摊开之后循环里那两支各办一件；
        // 不摊开的话它在循环里既不是下标、也不是点号 ⇒ `break`（实测
        // `gap-r975-nonnull-call-assert-index` / `gap-r975-nonnull-call-thrice-assert-member`）。
        // **与上面那条 `IsIndexFirstUnit` 的分工**：那一支管「先下标、再断言」，
        // 这一支管「先调用、再断言」（判据就是 `IsCallFirstUnit`）。
        const oneHead = one.IsPropertyAccess
          ? one.ProjectableKids[0]
          : undefined;
        const assertCallCell = oneHead !== undefined && oneHead.IsNotNull
          && oneHead?.IsCallFirstUnit;
        if (
          at > 0 &&
          one.IsPropertyAccess &&
          (one.IsIndexFirstUnit || assertCallCell)
        ) {
          for (const inner of one.ProjectableKids) flattened.push(inner);
          continue;
        }
        flattened.push(one);
      }
      ck.length = 0;
      for (const one of flattened) ck.push(one);
    }
    // **一元前缀的操作数在后**（第 711 轮，**普查当场红的**）：`typeof o[k]().v` 的产物是
    // `[UnaryOperator(typeof o[k]), Bracket(()), ., v]`——那个一元单元把 `typeof`
    // 与**它的操作数**装在同一格里，而链上后面那些格接的是**操作数**
    //（JS 里 `typeof` 管的是整条链 `o[k]().v`，不是 `o[k]` 那一段）。
    //
    // **照原样折会静默错值**：后面那些格被套在 `typeof` 的**结果**上——
    // `typeof o[k]` 是一个字符串，再对它调一次 ⇒ 报
    // `cannot call a non-closure value`（`typeof o[k]().v`）；
    // 而少了调用那一格时（`o[k]().v + ""`）拿到的是**那个函数自己**。
    // **`typeof (…)` 是同一个形状的第三个出口**：`typeof o[k]()` 早就有判据钉着
    // （`c307-rt-typeof-element-call-in-args`），它走的是**平级三格**那一条路；
    // 一旦后面再接一个后缀，token 层的形状就换成了「一元单元 + 链上其余格」。
    //
    // **做法与第 178 轮 `?.` 那一处一字不差**（那里也是「一元前缀 + 操作数在后」）：
    // 把操作数那一格接上链上其余格、**当场递归折完**，再套回那个一元节点——
    // 下面那个循环因此不再进（整条链在这里已经折完）。
    // **只在后面真是链上的一格时才走这一支**（`.` / 下标 / 调用 / 成员 / 断言）：
    // `?.` 与二元那一族由下面那两条尾支管，抢过来会换掉既有形状。
    // （`chainTail` 那份判据提到上面那个入口条件那儿去了——两处必须是同一句。）
    if (ck.length > 1 && ck[0].IsUnaryOperator && chainTail(ck[1])) {
      const unaryKids = ck[0].ProjectableKids;
      let operandAt = 0;
      while (
        operandAt < unaryKids.length &&
        (unaryKids[operandAt].IsSymbolToken || unaryKids[operandAt].IsKeywordUnit)
      ) {
        operandAt += 1;
      }
      // **两层前缀叠在同一个一元单元里、操作数却掉在外面**（第 739 轮）：
      // `typeof await p` 的产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`——
      // 上面那个循环把 `typeof` **与 `await`** 都当成「词」跳过去了，`operandAt` 顶到末尾
      // ⇒ 这一支整条不进 ⇒ 那个一元单元照原样投出一个 `AwaitKeyword`
      //（降级期报 `unimplemented: expression AwaitKeyword`，离现场很远）。
      // **往回退一格**：最后那个词自己也是要吃操作数的，把它与后面的兄弟接起来递归折完
      //（折出来的是 `typeof (await p)`，与 Node 的语义一致）。
      //
      // **第 1126 轮**：那一串 11 个字面量的判定收进被问的那两页——其中十个本来就是
      // `IsPrefixOperatorUnit`（`SymbolToken` 在 `Close()` 认六个符号、`Keyword` 在
      // `SetValue` 认 `typeof` / `void` / `delete` / `await`），只剩 `yield` 不在那一格里，
      // 于是它由 `Keyword` 那一页另立一格 `IsYieldKeyword`（同一趟赋好）。
      // 上面那个循环已经保证这一格是符号或关键字，所以两格属性读与原来那张表逐格同答。
      if (operandAt === unaryKids.length && operandAt > 1) {
        const lastUnit = unaryKids[operandAt - 1];
        if (lastUnit.IsPrefixOperatorUnit === true || lastUnit.IsYieldKeyword === true) {
          operandAt -= 1;
        }
      }
      // **操作数那一格有两个名字**（实测踩过一次）：`typeof` / `void` / `delete` / `await`
      // 是 `TypeOfExpression` 那一族（字段叫 **`expression`**），而 `!` / `~` / `+` / `-` /
      // `++` / `--` 是 **`PrefixUnaryExpression`**（字段叫 **`operand`**）——
      // 只认 `expression` 的话 `!o[k]().v` 会**退回**旧路（投成 `(!o[k])().v`，
      // 运行期报 `cannot call a non-closure value`），而 `typeof o[k]().v` 是好的
      // ——**同一个形状两种结局**，最费时间的那一种。
      // **两个名字都认不出来时按 `op` 定**（第 739 轮）：`typeof await p` 里那个一元
      // 单元的**操作数本来就缺**（它掉在单元外面）⇒ `TypeOfExpression` 投出来的是
      // `expression: undefined` ⇒ 上面那两句「字段在不在」都不成立、整条支路白走
      //（症状是 `typeof await p` 报 `unimplemented: expression AwaitKeyword`）。
      // 判据用**运算符自己的文本**（`typeof` / `void` / `delete` 是**词**，三格独立 kind、
      // 字段叫 `expression`；其余是符号，`PrefixUnaryExpression` 那一族的字段叫 `operand`）。
      // **两处调用点共用它**（第 744 轮抽出来）：下面那一支与「续格在二元单元里」那一支
      // 都要把操作数挂回同一个一元节点上——各写一遍就是两处会漂。
      const attachToUnary = (operand: any) => {
        const unaryHead = projectNode(ck[0], ctx);
        if (operand === undefined || unaryHead === undefined) return undefined;
        const outerWord = ck[0].op;
        const wordKinds = ["typeof", "void", "delete"];
        const preferExpression =
          (typeof outerWord === "string" && wordKinds.includes(outerWord)) ||
          unaryHead.expression !== undefined;
        if (preferExpression) {
          return { ...unaryHead, expression: operand, end: operand.end };
        }
        if (unaryHead.operand !== undefined) {
          return { ...unaryHead, operand: operand, end: operand.end };
        }
        return { ...unaryHead, expression: operand, end: operand.end };
      };
      // **续格与更松的运算符在同一个单元里**（第 744 轮）：`typeof o["f"]().v + ""` 的产物是
      //
      //     [UnaryOperator(typeof o["f"]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», "" )]
      //
      // ——一元单元里装的是**操作数的头**，续格与运算符一起在**下一个单元**里。
      // **照下面那一支走会错**：它把 `kids.slice(1)` 整段（含运算符）都递进去递归，
      // 而链那一支现在会把 `+ ""` 一起折进操作数 ⇒ 那个一元单元盖住整段
      //（TS 只盖 `o["f"]().v`：缺 1 漂 1 多 2）。
      // **一元比二元紧**，所以这里把那个单元拆开：续格归操作数、运算符与右操作数
      // 交给 `foldBinaryFrom` 在外层折（`!o["f"]().v + ""` 同理）。
      if (kids.length >= 2 && chainTailInOperator(kids[1])) {
        const split = splitChainTailInOperator(kids[1]);
        const operand = projectExpression([...unaryKids.slice(operandAt), split.tail], ctx);
        const attached = attachToUnary(operand);
        if (attached !== undefined) {
          return foldBinaryFrom(attached, [...split.rest, ...kids.slice(2)], ctx);
        }
      }
      if (operandAt < unaryKids.length) {
        // **链上其余格用「摊开之前」的那一份**（`kids`，不是 `ck`）：`ck` 里第二格
        // （`PropertyAccess(Bracket(()), ., v)`）已经被摊成三格平级
        //（`(` / `.` / `v`）——而 `projectExpression` 的链那一支认的是**没摊开**的形状
        //（见上面 `IsCallFirstUnit` 那一段）。递摊开那一份会让它落进二元那一支：
        // 折出一个**操作符是 `DotToken` 的 `BinaryExpression`**，
        // 降级期报 `name is not a local or a capture: v`（实测踩过一次）。
        const operand = projectExpression([...unaryKids.slice(operandAt), ...kids.slice(1)], ctx);
        const attached = attachToUnary(operand);
        if (attached !== undefined) return attached;
      }
    }
    // **链的头一格是函数 / 类时，它就是表达式位的**（第 775 轮）：`function () { }.bind(o)` /
    // `class { }.prototype` 里那一格是**链的头**，而这一支原来直接
    // `projectNode(ck[0], ctx)`——`ctx.expressionPosition` 没人置，于是投出
    // `FunctionDeclaration` / `ClassDeclaration`，降级期报
    // `unimplemented: expression FunctionDeclaration`（听起来像「函数表达式没实现」，
    // 而 `(function () { })()` 那一半一直是好的——分界正是「体后面跟的是 `(` 还是 `.`」：
    // 末尾那对实参括号走 3b 那一支、**递回 `projectExpression`**，于是标记照常置上）。
    // **判据只看这一格自己**：标记置宽了（留给整棵子树）会让体里的声明也被当成表达式
    //（第 134 轮那条注释记的就是这个坑），所以只对「只可能做值」的那几页置位
    //（`unit.IsValueOnlyUnit`——`Function` / `Class` / `Lamda` 三页构造时答 `true`，
    // 第 1097 轮起不再在这里比类名）。
    const projectChainHead = (unit: any): any => {
      if (!unit.IsValueOnlyUnit) {
        return projectNode(unit, ctx);
      }
      const savedExpression = ctx.expressionPosition;
      ctx.expressionPosition = true;
      try {
        return projectNode(unit, ctx);
      } finally {
        ctx.expressionPosition = savedExpression;
      }
    };
    let left =
      ck[0].IsParenBracket
        // **这一格第 1112 轮并进这个调用点**（与上面那一处同一条尺子、逐字相同的展开）：
        // 链的头一格是值位括号时出 `ParenthesizedExpression`，算式原来住在 `parenthesizedOf`。
        ? (() => {
          const shape = ck[0];
          const inner = shape.ProjectableKids;
          return {
            kind: "ParenthesizedExpression",
            expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
            pos: startOf(shape),
            end: endOf(shape),
          };
        })()
        : projectChainHead(ck[0]);
    // **这一条链上出现过非空断言**（第 303 轮）：出现过之后，
    // 后面那些「按数组字面量成形的方括号」**每一格都是下标**——
    // `o.b![1]![0]` 里**两个** `[` 都是这种形状（第二个的前一格是**已经折好的**
    // `ElementAccessExpression`，不再挨着那个 `NotNull`）。
    // 只看「前一格是不是 `NotNull`」的话，第二个下标会**整段丢掉**
    //（判据 `c303-nonnull-then-index` 第二版量的就是它）。
    // **链的头一格是「只可能做值」的单元**（第 775 轮扩了这一格）：`NotNull` 是第 303 轮
    // 那一档（`o.b![1]`），**函数 / 类**是第 775 轮新加的一档（`function () { }["length"]`）——
    // 两者处境一字不差：token 层认不出「前面那一格是个值」，于是那个方括号按数组字面量成形。
    let sawNullAssert =
      ck[0].IsNotNull ||
      ck[0].IsValueOnlyUnit;
    let i = 1;
    while (i < ck.length) {
      // **下标链接**：`a[i]` → `ElementAccessExpression`（第 80 轮）。
      //
      // **紧跟在一个「非空断言」后面的 `ArrayLiteral` 也是下标**（第 303 轮，理由见上面
      // 那一段）：`o.b![1]` 里那个 `[1]` 是按**数组字面量**成形的，
      // 而它在**链上**（前一格是 `NotNull`）就只能是下标——
      // 数组字面量不会紧跟在表达式后面出现（`o.b [1]` 在 JS 里就是 `o.b[1]`）。
      const indexLike = ck[i].IsIndexBracket ||
        (ck[i].IsArrayLiteralUnit && sawNullAssert);
      if (indexLike) {
        const argument = projectExpression(ck[i].ProjectableKids, ctx);
        left = {
          kind: "ElementAccessExpression",
          expression: left,
          argumentExpression: argument,
          pos: left.pos,
          end: endOf(ck[i]),
        };
        i += 1;
        continue;
      }
      // **调用括号也是链上的一格**（第 309 轮）——`o["m"]()` 的产物是
      // `[Identifier(o), Bracket([m]), Bracket(())]`（**下标那一格是平级的**，
      // 与 `o.m()` 不同：那个形状里 `(` 会被折进 `Method`）。
      // 上面那一支替 `[m]` 建出 `ElementAccessExpression` 之后，紧跟的 `()` 是
      // **对它的调用**——少了这一格，循环在这里 `break` ⇒ 只剩 `ElementAccessExpression`
      // ⇒ **那次调用整格消失**（`typeof (o["m"]())` 于是算的是**方法本身**、
      // 给 `"function"`，Node 给 `"object"`——**静默错值**；
      // 判据 `c307-rt-typeof-element-call-in-args`）。
      // **做法与上面下标那一支同款**（先把左边折好，再套一层），
      // 与 `projectExpression` 里那条「末尾是 `(` 括号」的规则（3b）**是同一件事**
      // ——区别只是这里在处理**一条已经开始的链**。
      // **它必须排在下标那一支之后**：`a[i]` 与 `a(i)` 长得像，
      // 而那个 `[` / `(` 的分别正是 `startBracket` 那一格。
      if (ck[i].IsParenBracket) {
        left = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(ck[i].ProjectableKids, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a) => a !== undefined),
          pos: left.pos,
          end: endOf(ck[i]),
        };
        i += 1;
        continue;
      }
      if (!ck[i].IsDotSymbol || i + 1 >= ck.length) {
        // **`!` 非空断言接在链中间**（第 143 轮）：`source.Pre()!.Pre()` 的产物是
        // `[…, Method(Pre), NotNull, ., Method(Pre)]`——`!` 是**一个单元**，它把左边整段
        // 包成 `NonNullExpression`，链再照常往下接。不认它的话循环在这里 break，
        // 后面那整段链会掉成平级节点（实测 `string/string-guide.ts`：漂移 6 + 多出 4）。
        if (ck[i].IsNotNull) {
          // **`[1]!` 这种「先下标、再断言」的一格**（第 333 轮）：见 `IsIndexFirstUnit`
          // 那一段的表——中间那一格的外壳是 `NotNull`，里层却是一个方括号。
          // **次序是语义**：TS 是 `((o.b!)[1])!`——先下标、再把 `!` 套在那个结果上。
          // 原来无条件写成「把 `left` 整个包进 `NonNullExpression`」 ⇒ 断言套在了**下标之前**
          // ⇒ 值一样（断言不改值）可**区间与层数都对不上**，
          // 而后面那个 `[0]` 又因为 `sawNullAssert` 已经置真而接上——
          // 表面上跑得通，`cases:tsast` 一比就漂（实测 `arr![0]![0]`：缺两个
          // `ElementAccessExpression` + 两个 `NumericLiteral`、`NonNullExpression` 漂 4）。
          const bangKids = ck[i].ProjectableKids;
          const bangHead = bangKids.length >= 1 ? bangKids[0] : undefined;
          // **`f()!` 这种「先调用、再断言」的一格**（第 975 轮）：`a!()!()!()` 的第二格是
          // `NotNull([Bracket(()) , !])`——那个括号是**一次调用**（对 `left` 的），`!` 套在
          // **调用结果**上（TS：`NonNull(CallExpression(a!))`）。下面那条只认
          // `IsIndexFirstUnit`（下标那一档），于是这一格直接把 `left` 包进 `NonNullExpression`
          // ⇒ **那次调用的节点整格丢**（实测 `gap-r973-nonnull-call-assert-call-assert`：
          // 最里面那个 `CallExpression` 缺、`NonNullExpression` 漂 1）。
          // 判据与下标那一支**一字不差**（`endOf(括号) < endOf(这一格)`）：先建调用、再套断言。
          if (bangHead !== undefined && bangHead.IsParenBracket && endOf(bangHead) < endOf(ck[i])) {
            left = {
              kind: "CallExpression",
              expression: left,
              arguments: callArgumentsOf(bangHead, ctx),
              pos: left.pos,
              end: endOf(bangHead),
            };
          } else if (bangHead !== undefined && bangHead.IsMethodNode) {
            // **断言的核是一格调用单元**（第 975 轮）：`a!()()!()` 的第二格是
            // `NotNull([Method(name=""[Bracket(())]) , !])`——那一格自己盖着**两层**调用
            // （第 966 轮那句话：一格说两次调用），而上面那两支只认「核是实参括号」
            //（第 975 轮补的「先调用、再断言」）与「核是下标」⇒ 这一格整格丢。
            // 折法与 `chainOnto` 的 NotNull 单元那一支、以及 `assertedMember` 的
            // Method 那一档**共用同一对**：`innermostCallee` 接出最里面那一格、
            // `graftCallee` 把整串壳套上去，`!` 最后套在整条链外面。
            left = graftCallee(
              projectNode(bangHead, ctx),
              innermostCallee(left, innermostMethod(bangHead), ctx),
              undefined,
            );
          } else if (bangHead !== undefined && bangHead.IsIndexFirstUnit) {
            const bracket = bangHead;
            const argument = projectExpression(bracket.ProjectableKids, ctx);
            left = {
              kind: "ElementAccessExpression",
              expression: left,
              argumentExpression: argument,
              pos: left.pos,
              end: endOf(bracket),
            };
          }
          left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(ck[i]) };
          sawNullAssert = true;
          i += 1;
          continue;
        }
        // **这一格自己就是一个调用单元**（第 962 轮）：`o!()()` 的产物是
        // `[NotNull(o!), Method name=""[Bracket( () )]]`——那一次调用**不是**跟着点号来的，
        // 于是它在上面那条 `IsDotSymbol` 的门槛前就掉出去了（`break` ⇒ 整格消失，
        // 实测只剩一个 `NonNullExpression`，两个 `CallExpression` 都不成形）。
        // 折法与下面「点号后面那一格是 `Method`」那一段是**同一件事**
        //（第 366 轮的两步走 + 第 962 轮那两格），区别只是**点号没有出现**——
        // 所以这里只补「点号不来」这一档：被调用者是 `left`、而这一格盖着两层调用
        //（判据就是**区间**：`Method` 比它那个实参括号更靠右，与另外三处一字不差）。
        if (ck[i].IsMethodNode) {
          const callKids = ck[i].ProjectableKids.filter((k: any) => k.IsGenericType === false);
          const callHead = callKids.length > 0 ? callKids[0] : undefined;
          const bareName = String(ck[i].DeclaredName);
          // **这一格盖着两层调用、而内层那一格的名字也是空的**（第 966 轮）：
          // `a!()()` 的产物是 `[NotNull(a), Method(name=""[Method(name="")[Bracket(()), !], Bracket(())])]`
          // ——内层那格 `Method(name="")` 本身就是**第一次调用**，外层这一格是**第二次**。
          // 原来这一档只认「第一格是实参括号」，于是内层那次调用**整格丢**、
          // 外层也只被投成一次调用（实测 `gap-r964-nonnull-call-twice-member`：缺 4 格）。
          // 折法就是「各投各的」：内层 `projectNode(callHead)` 给出的**已经是**对 `left` 的
          // 一次调用，只需把受体换成 `left`（它那一格本来没人填），位置取 `left.pos`；
          // 外层再用 `projectNode(ck[i])` 套一层。
          if (bareName === "" && callHead !== undefined && callHead.IsMethodNode
            && String(callHead.DeclaredName) === "") {
            // **「最里面那一格」要一路问到底**（第 975 轮，**普查当场红的**）：
            // `a!()()()()`（四次调用）的 `callHead` 是
            // `Method(name=""[Method(name=""[Bracket(())])])`——里面**还套着一格**，
            // 而这里原来只对「头一格是实参括号」那一档补一层
            // （`deepHead.Tag === "Bracket"`）⇒ 四层调用只折出两层
            //（实测 `gap-r973-nonnull-call-quad`：两个 `CallExpression` 的区间一路漂到
            //  `[0,10)`；三层那一档 `a!()()()` 也是同一句话少问一层）。
            // **折法与 `chainWithOptional` / `chainOnto` 的 Method 分支共用同一对**
            //（第 971 轮立的 `innermostMethod` + `graftCallee`；「最里面那一格的被调用者
            //  怎么建」第 975 轮收进 `innermostCallee`）：先走到**最里面**那一格
            // `Method`，再让 `projectNode(callHead)` 那一串壳**整体**套上去——
            // `graftCallee` 一路下到最里面那一层调用，不会像原来那样把中间几层丢掉。
            const innerCall = graftCallee(
              projectNode(callHead, ctx),
              innermostCallee(left, innermostMethod(callHead), ctx),
              undefined,
            );
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
          // **这一格盖着两层调用、而里层那一次只留下一个实参括号**（第 966 轮）：
          // `a!()()` 的产物是 `[NotNull(a, !), Method(name=""[Bracket(())])]`——**一个
          // `Method` 单元里只有一对括号**，可它说的是**两次调用**：前一次是「调用 `left`」、
          // 后一次才是这一格自己那次（两次调用共用一格 `Method` 的区间）。
          // **判据是区间**（与另外三处一字不差）：`Method` 比它那个实参括号更靠右 ⇒
          // 里面还裹着一层。少了这一档就只投出**一次**调用（实测
          // `gap-r964-nonnull-call-twice-member`：`CallExpression` 与
          // `PropertyAccessExpression` 整片缺、`.c` 也跟着丢）。
          // 折法与上面那支同款：先建里层那次调用（受体是 `left`、区间到括号为止），
          // 再把这一格自己那次套在外面。
          if (bareName === "" && callHead !== undefined && callHead.IsParenBracket && endOf(callHead) < endOf(ck[i])) {
            const innerCall: any = {
              kind: "CallExpression",
              expression: left,
              arguments: callArgumentsOf(callHead, ctx),
              pos: left.pos,
              end: endOf(callHead),
            };
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
          // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a!()!()` 的产物是
          // `[NotNull(a, !), Method(name=""[NotNull(Bracket(()), !), Bracket(())])]`——
          // 那个 `NotNull` 的核是**实参括号**（不是名字），所以这里要自己把内层那次调用
          // 建出来（`assertedMember` 只认名字）。**判据与另外几处一字不差**：
          // `Method` 比它那个实参括号更靠右 ⇒ 外面还有一层。
          if (bareName === "" && callHead !== undefined && callHead.IsNotNull) {
            const assertKids = callHead.ProjectableKids.filter(
              (k: any) => !k.IsNotNullSymbol,
            );
            const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
            // **断言里的核是一格 `Method`**（第 975 轮）：`a!()()!()` 的这一格是
            // `Method(name=""[NotNull(Method(name=""[Bracket(())]), !), Bracket(())])`——
            // 断言盖的**不是一对括号**、而是**一格调用单元**（那一格自己还盖着两层调用，
            // 第 966 轮那句话）。原来这里只认「核是实参括号」⇒ 这一支整条不进、
            // 链在下面 `break` ⇒ 三格 `CallExpression` 与那个 `NonNullExpression` 一起丢
            //（实测 `gap-r973-nonnull-call-twice-assert`：缺 3 漂 1）。
            // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**：
            // 走到最里面那一格（`innermostMethod`）、被调用者交给 `innermostCallee`、
            // 换法交给 `graftCallee`——再把 `!` 套在整条调用链外面。
            if (assertHead !== undefined && assertHead.IsMethodNode) {
              const innerCall = graftCallee(
                projectNode(assertHead, ctx),
                innermostCallee(left, innermostMethod(assertHead), ctx),
                undefined,
              );
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: innerCall,
                pos: innerCall.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            if (assertHead !== undefined && assertHead.IsParenBracket) {
              const innerCall: any = {
                kind: "CallExpression",
                expression: left,
                arguments: callArgumentsOf(assertHead, ctx),
                pos: left.pos,
                end: endOf(assertHead),
              };
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: innerCall,
                pos: innerCall.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            // **断言里的核是一对下标括号**（第 975 轮）：`a!()[0]!()` 的第二格是
            // `Method(name=""[NotNull([Bracket([0]), !]), Bracket(())])`——**被调用者是
            // 「断言盖着一次下标」**（`(a!()[0])!`），而这一格自己那次调用的实参表是
            // 后面那一对平级的括号。上面那两支只认「核是调用」⇒ 整格丢
            //（实测 `gap-r975-nonnull-index-assert-call`：缺 2 漂 2）。
            // 次序与下标那一支一字不差：先接受体、再把 `!` 套在外面；这一格自己那次调用
            // 由 `projectNode(ck[i])` 那个壳给出（它的被调用者位置正好填这一格）。
            if (assertHead !== undefined && assertHead.IsIndexBracket) {
              const element: any = {
                kind: "ElementAccessExpression",
                expression: left,
                argumentExpression: projectExpression(assertHead.ProjectableKids, ctx),
                pos: left.pos,
                end: endOf(assertHead),
              };
              const assertedInner: any = {
                kind: "NonNullExpression",
                expression: element,
                pos: element.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedInner,
                pos: assertedInner.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            // **核既不是调用、也不是下标 ⇒ 这个 `NotNull` 是**被调用者**（第 975 轮）：
            // `a!()[0]!()` 的第一格是 `Method(name=""[NotNull(a), Bracket(())])`——
            // `!` 挂在**被调用者**身上，实参括号是**平级的兄弟**。这一档照 `projectNode(这一格)`
            // 投出来就是对的（`Method` 自己的 `anonymousCallee` 那一支早就会把
            // 「有 `!` 的被调用者 + 实参表」办成 `CallExpression > NonNullExpression`），
            // 原来这里没有兜底 ⇒ 循环 `break`、`CallExpression[0,4)` 与后面整段一起丢。
            left = projectNode(ck[i], ctx);
            i += 1;
            continue;
          }
          if (bareName === "" && callHead !== undefined
            && callHead.IsParenBracket
            && endOf(callHead) < endOf(ck[i])) {
            const innerCall = {
              kind: "CallExpression",
              expression: left,
              arguments: callArgumentsOf(callHead, ctx),
              pos: left.pos,
              end: endOf(callHead),
            };
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
        }
        break;
      }
      const next = ck[i + 1];
      // **私有成员名 `#x`**（第 131 轮）：产物把 `this.#x` 拆成 `[this, ., #, x]` 两格，
      // 而 TS 那边 `name` 是**一个** `PrivateIdentifier`（区间含那个 `#`，`#` 是它的一部分）。
      // 不合并的话点号后面只剩一个 `#`（投成一个 `Identifier("#")`、区间短一格），
      // 后面那个名字还掉成平级节点（实测 `cls-hash-in-operator.ts` / `cls-private-fields.ts`）。
      if (next.IsHashSymbol && i + 2 < ck.length) {
        const after = ck[i + 2];
        const at = startOf(next);
        // **私有方法调用 `this.#m()`**（第 138 轮）：点号后面是 `[SymbolToken(#), Method(name="m")]`——
        // `Method` 自己盖住的是 `m()`，名字只占开头那几个字符。照「名字 + 调用」两件事办：
        // `name` 是一个含 `#` 的 `PrivateIdentifier`（区间到名字末尾），外面再套一层 `CallExpression`。
        if (after.IsMethodNode) {
          const raw = String(after.DeclaredName);
          const nameEnd = startOf(after) + raw.length;
          const member = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: { kind: "PrivateIdentifier", text: "#" + raw, pos: at, end: nameEnd },
            pos: left.pos,
            end: nameEnd,
          };
          const call = projectNode(after, ctx);
          left = Object.assign({}, call, { expression: member, pos: member.pos, end: endOf(after) });
          i += 3;
          continue;
        }
        left = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: {
            kind: "PrivateIdentifier",
            text: "#" + after.TextValue,
            pos: at,
            end: endOf(after),
          },
          pos: left.pos,
          end: endOf(after),
        };
        i += 3;
        continue;
      }
      // **点号后面那一格是 `!` 包着的方法调用 / 成员**（第 147 轮）：
      // `source.Pre()!.Pre()!` 里 `.Pre()!` 在产物里是**一个** `NotNull(Method(Pre), !)`
      // 单元——名字只占 `Method` 开头的几个字符，`!` 是调用**之后**的断言。
      // 照名字那一支投会得到一个盖住整段 `Pre()` 的 `Identifier`
      // （实测 `string/string-guide.ts`：漂移 6 + 多出 4）。
      if (next.IsNotNull) {
        const asserted = next.ProjectableKids.filter(
          (k) => !k.IsNotNullSymbol,
        );
        const head = asserted[0];
        if (head !== undefined && head.IsMethodNode) {
          const raw = String(head.DeclaredName);
          const nameEnd = startOf(head) + raw.length;
          const member = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: { kind: "Identifier", text: raw, pos: startOf(head), end: nameEnd },
            pos: left.pos,
            end: nameEnd,
          };
          const call = Object.assign({}, projectNode(head, ctx), {
            expression: member,
            pos: member.pos,
            end: endOf(head),
          });
          left = { kind: "NonNullExpression", expression: call, pos: call.pos, end: endOf(next) };
          i += 2;
          continue;
        }
        if (head !== undefined) {
          // 断言里可能是一条**链**而不是一个名字：`Get(units, index)!.SourceRange.Start!` 的
          // `NotNull` 里装着 `PropertyAccess(SourceRange . Start)`。照名字投会得到一个
          // 文本是整条链的 `Identifier`（实测 `dist/ts/typescript/tokens/if/if-set.ts` 一族：
          // 漂移 14 + 缺 7 + 多出 7）。逐格接上去，最后再套 `NonNullExpression`。
          const chain = head.IsPropertyAccess ? head.ProjectableKids : [head];
          for (const piece of chain) {
            if (piece.IsSymbolToken) {
              continue;
            }
            left = {
              kind: "PropertyAccessExpression",
              expression: left,
              name: piece.NameNode,
              pos: left.pos,
              end: endOf(piece),
            };
          }
          left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(next) };
          i += 2;
          continue;
        }
      }
      if (next.IsMethodNode) {
        // `console.log(1)` 的产物是 `[console, ., Method(name="log")]`——
        // 那个 `Method` 盖住的是 `log(1)`，而**名字**只占开头的几个字符，
        // 所以这里按名字宽度切一段 `Identifier` 出来（TS 的 `Identifier(log)` 正是这一段）。
        const name = String(next.DeclaredName);
        // **空名字的 `Method` = 「把左边那个值再调一次」**（第 366 轮，**实测撞到的**）：
        // `x.get()()` 的产物是
        // `PropertyAccess{ Identifier(x), ., Method(name="", child=Method(name="get")) }`
        // （实测 `cjcli` 打出来的单元树）——**外层那个 `Method` 的名字是空的**，
        // 而这条链支（`projectExpression` 里按 `projectableKids` 直接走的那一条）
        // **正是它走的路**（在 `projectNode` 入口按形状拦的探针**没响**——
        // 所以第 348 / 362 两轮一直在**旁边那份副本**上找）。
        // 照下面那条走会造出一个 `Identifier("")` 的成员 ⇒ 语义变成「取一个空名字的属性」
        // ⇒ 降级层报 `cannot call a non-closure value`（**一句话里没有一个字提到空名字**）。
        // 正确的形状是 `CallExpression{ expression: <左边那一段>, arguments: […] }`。
        if (name === "") {
          // **两步**（第 366 轮，**实测撞到的**）：外层那个 `Method` 的**名字是空的**，
          // 而它的第一个子单元就是**内层那一格**（`Method(name="get")`）——
          // 直接 `projectNode(外层)` 得到的是**被调者为空**的调用（那一格要靠下面这段填），
          // 所以先把**内层**当成普通的成员调用折一遍、再把「调用这个结果」套上去。
          const innerKids = next.ProjectableKids;
          const innerMethod = innerKids.length > 0 && innerKids[0].IsMethodNode ? innerKids[0] : undefined;
          if (innerMethod !== undefined) {
            // **最里面那一格要一路问到底**（第 975 轮）：`a.b()()().c` 的外层空名字 `Method`
            // 里**套着两格**（`Method("")[Method("")[Method("b")]]`）——原来只问**第一格**
            // 的名字（答空串）⇒ 投出一格名字为空的属性访问，而**最里面那次调用**（`b()`）
            // 连同它上面那一层一起丢（实测 `gap-r973-member-call-thrice-member`：
            // 漂 3 多 2，多出来的正是那格空名字的属性访问）。
            // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**
            //（`innermostMethod` + `innermostCallee` + `graftCallee`）：整串壳照
            // `projectNode(next)` 给出的层数接上，只把**最里面那一格**的被调用者换掉。
            left = graftCallee(
              projectNode(next, ctx),
              innermostCallee(left, innermostMethod(next), ctx),
              undefined,
            );
            i += 2;
            continue;
          }
          // **第一个子单元是「名字 + `!`」**（第 962 轮）：`o!.m!()` 的产物是
          // `PropertyAccess([NotNull(o!), ., Method name=""[NotNull(m!), Bracket]])`——
          // 与 `chainWithOptional`（第 166 轮）/ `chainOnto`（第 852 轮）那两处**同形**，
          // 那一份判据立了 `assertedMember`，**这一份副本漏了**。
          // 少了它，下面那句 `expression: left` 会把**被调用者当成 `left`**，
          // 于是成员名 `m` 与它那个 `!` **整段丢**（实测：缺 `PropertyAccessExpression`
          // 与 `Identifier` 各一、`NonNullExpression` 的区间只到 `o!` 那两格）。
          if (innerKids.length > 0 && innerKids[0].IsNotNull) {
            const asserted = assertedMember(left, innerKids[0], ctx, undefined);
            if (asserted !== undefined) {
              const outerCall = projectNode(next, ctx);
              left = Object.assign({}, outerCall, { expression: asserted, pos: asserted.pos });
              i += 2;
              continue;
            }
          }
          // **第一个子单元是实参括号，而这一格盖着两层调用**（第 962 轮）：`o!()()` 的产物是
          // `[NotNull(o!), Method name=""[Bracket( () )]]`——那一格 Bracket 是**内层**那次
          // 调用的实参表，外层那次调用只体现在 `Method` 自己的区间上（`[2,6)` 盖住 `()()`）。
          // 只折一层会**丢掉内层那一次调用**（实测 `o!()()`：两个 `CallExpression` 都不成形）。
          // 「外面还有没有一层」这一问就是**区间**——是**问得出来**的，所以不必靠形状猜：
          // `(f)()`（`[Bracket]` 就是被调用者、只有一层）那一档的 `Method` 与它的 Bracket **同尾**，
          // 这里因此不会误收（`(f)()` / `q = (f)()` / `return (a)(b)` 三档都在门里钉着）。
          if (innerKids.length > 0 && innerKids[0].IsParenBracket && endOf(innerKids[0]) < endOf(next)) {
            const innerArgs = {
              kind: "CallExpression",
              expression: left,
              arguments: splitTopLevel(innerKids[0].ProjectableKids, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a: any) => a !== undefined),
              pos: left.pos,
              end: endOf(innerKids[0]),
            };
            const outerCall = projectNode(next, ctx);
            left = Object.assign({}, outerCall, { expression: innerArgs, pos: innerArgs.pos, end: endOf(next) });
            i += 2;
            continue;
          }
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: left, pos: left.pos });
          i += 2;
          continue;
        }
        const at = startOf(next);
        const member = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
          pos: left.pos,
          end: at + name.length,
        };
        // 链尾是一次调用：把 `CallExpression` 的被调用者换成折好的点号链
        // （TS 的 `console.log(1)` 是 `CallExpression > PropertyAccessExpression > …`）。
        //
        // **折完继续走**（第 70 轮修）：`CjcliHost.Fs().readFileSync(p)` 的中间那次调用
        // 之后再取成员仍属同一条链——原来这里 `break`，于是链被截成两段、
        // 外层那次调用整个丢掉（实测 `CallExpression` 缺 1263 里的最大一块）。
        const call = projectNode(next, ctx);
        left = Object.assign({}, call, { expression: member, pos: member.pos });
        i += 2;
        continue;
      }
      // **点号后面那一段是一个 `NotNull`**（第 105 轮）：`Get(…)!.SourceRange.Start!` 的产物是
      // `[…, NotNull(Get…!), ., NotNull(PropertyAccess(SourceRange.Start))]`——第二个 `!`
      // 的单元里**装着一段点号链**，而那个 `!` 在 TS 那边套住的是**整条链**
      // （`NonNullExpression > PropertyAccessExpression > PropertyAccessExpression > …`）。
      // 照下面那一支会把它当成一个成员名（读 `NameNode` 会取到整段原文），于是
      // `Identifier` / `PropertyAccessExpression` / `NonNullExpression` 三处同时错位
      // （实测漂移 76 + 30 + 33、多出 71 + 75）。
      if (next.IsNotNull) {
        const inner = next.ProjectableKids.filter(
          (k) => !k.IsNotNullSymbol,
        );
        const target = inner.length > 0 ? inner[0] : undefined;
        if (target !== undefined && target.IsPropertyAccess) {
          const members = target.ProjectableKids;
          if (members.length > 0) {
            left = {
              kind: "PropertyAccessExpression",
              expression: left,
              name: members[0].NameNode,
              pos: left.pos,
              end: endOf(members[0]),
            };
            for (let j = 1; j + 1 < members.length; j += 2) {
              if (!members[j].IsDotSymbol) break;
              left = {
                kind: "PropertyAccessExpression",
                expression: left,
                name: members[j + 1].NameNode,
                pos: left.pos,
                end: endOf(members[j + 1]),
              };
            }
          }
        } else if (target !== undefined) {
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: target.NameNode,
            pos: left.pos,
            end: endOf(target),
          };
        }
        left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(next) };
        i += 2;
        continue;
      }
      // 成员名**永远是 `Identifier`**（TS 那边 `a.import` 的 `name` 就是一个文本为那个词的
      // `Identifier`，不是 `ImportKeyword`）：产物那边它可能已经被 `KeywordCloseRule`
      // 升级成 `<Keyword>`，所以这里按**名字宽度**切一段，而不是把那个词按词法身份投出来。
      left = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: next.NameNode,
        pos: left.pos,
        end: endOf(next),
      };
      i += 2;
    }
    if (i >= ck.length) return left;
    // **链尾紧跟着可选链的续接**（第 101 轮）：`this.Variables.get(key)?.Value ?? null` 的产物是
    // `[…链…, BinaryOperator(??)( NullConditionalOperator(Value), ??, null )]`——
    // `?.` 之后的成员被收成一个 `NullConditionalOperator` 单元。TS 那边它是**在链上加一格**
    // （`PropertyAccessExpression` + `questionDotToken`），所以这里要先把它接到 `left` 上，
    // 再拿剩下的运算符折二元。
    const tail0 = ck[i];
    const spliceOptional = (unit) => {
      const inner = unit.ProjectableKids;
      if (inner.length === 0 || inner[0].IsNullConditionalOperator === false) return null;
      const extended = chainWithOptional(left, inner[0], ctx);
      return { extended, rest: inner.slice(1) };
    };
    if (tail0.IsNullConditionalOperator) {
      const extended = chainWithOptional(left, tail0, ctx);
      if (i + 1 >= ck.length) return extended;
      return foldBinaryFrom(extended, ck.slice(i + 1), ctx);
    }
    if (tail0.IsBinaryOperatorNode) {
      const spliced = spliceOptional(tail0);
      if (spliced !== null) {
        const folded = foldBinaryFrom(spliced.extended, spliced.rest, ctx);
        // **右操作数后面还跟着链的续格**（第 115 轮）：`this.Start?.Document === other.Start?.Document`
        // 的产物把「右操作数的 `.Start` 与 `?.Document`」平铺在 `BinaryOperator` **外面**
        //（左操作数的 `?.Document` 却在里面）。不接的话右边只到 `other` 为止：
        // 漂移 + `PropertyAccessExpression` / `Identifier` 各缺一片，还多出一个短区间节点。
        if (folded !== undefined && folded.right !== undefined && i + 1 < ck.length) {
          const right = chainOnto(folded.right, ck.slice(i + 1), ctx);
          if (right !== undefined) {
            folded.right = right;
            folded.end = right.end;
          }
        }
        return folded;
      }
    }
    return foldBinaryFrom(left, ck.slice(i), ctx);
  }
  // ---- 2. `as` / `satisfies`（第 96 轮）----
  //
  // 产物把 `expr as T` 记成**两个平级单元**：`Identifier(error)` 与 `As(类型)`——
  // 运算符词右边的类型装在 `As` 里，**左边的操作数是它的前一个兄弟**。
  // 原来这里既不认 `As` 也不认 `satisfies`，于是整段只剩第一个操作数
  // （实测缺 `AsExpression` + 缺 `AnyKeyword` + 多出一个只盖住 `as any` 的节点）。
  const asIndex = kids.findIndex((k) => k.IsAsUnit || k.IsSatisfiesUnit);
  if (asIndex > 0) {
    // **`as` / `satisfies` 是关系级运算符**（`OperatorRank` 给 7，与 `<` / `in` / `instanceof` 同档）。
    // 所以它左边如果坐着**更松**的运算符（`,` = -1、赋值 = 0、`||` / `??` = 1、`&&` = 2、
    // `|` = 3、`^` = 4、`&` = 5、相等 = 6），**外层节点是那个运算符**，`as` 只绑到它右边那一小段。
    // 少了这一条，`c = a as number` 会把整条赋值当成 `as` 的左操作数：
    // 实测产物是 `AsExpression[c = a as number]`（少 12 个字符）外加一个盖住 `c = a` 的
    // `BinaryExpression`，而 TS 是 `BinaryExpression(c, =, AsExpression(a, number))`。
    // 切完交给 `foldBinaryFrom` 递归——那一支自己会把 `as` 折在正确的层级上。
    let cutIndex = -1;
    let cutRank = 999;
    for (let i = 1; i < asIndex; i++) {
      if (!kids[i].IsOperatorUnit) continue;
      const rank = kids[i].OperatorRank;
      if (rank < cutRank) {
        cutRank = rank;
        cutIndex = i;
      }
    }
    if (cutIndex > 0 && cutRank < 7) {
      return foldBinaryFrom(projectExpression(kids.slice(0, cutIndex), ctx), kids.slice(cutIndex), ctx);
    }
    // **串起来的 `as` / `satisfies` 要一路折到底**（第 154 轮）：`a as const satisfies B`
    // 的产物是 `[a, As(const), Satisfies(B)]` 三格——只取第一个就把后面那个整个丢了
    // （实测 `stmt-adversarial-shapes.ts`：缺 `SatisfiesExpression` / `TypeReference` / `Identifier`）。
    // 折法与 TS 一致：外层 `SatisfiesExpression`、里面套 `AsExpression`。
    // **展开位上的 `as` / `satisfies`**（第 724 轮）：`f(...xs as T)` 的产物是两个
    // **平级**单元 `[Spread(…xs), As(T)]`，而 TS 那边 `as` 是**更松**的那一层——
    // `...(xs as T)` ⇒ `SpreadElement{ expression: AsExpression }`。
    // 照平级折就成了 `AsExpression{ expression: SpreadElement }`：**两层套反了**。
    //
    // 症状不是「形状漂了」而是**静默错值**：降级层看 `arguments` 里那一格是
    // `AsExpression`（不是 `SpreadElement`）⇒ 那条实参**不展开**、整个数组被原样
    // 当成**一个**实参递进去（`rest(...[1, 2, 3] as any)` 的 `a.length` 给 **1**、
    // `Math.max(...[1, 5, 3] as any)` 给 **NaN**、`mixed(...xs as any)` 的 `a` 是那个数组）。
    //
    // 修法：左边那一格是 `Spread` 时，先把它照常投影（`[Spread]` 给的就是
    // `SpreadElement{ expression }`），**把里面那个操作数取出来**当 `as` 的左操作数，
    // 再把整条 `as` / `satisfies` 链**套回 `SpreadElement` 里面**——
    // 括号化那一档（`...([1, 2, 3] as any)`）产物本来就把它装在同一格，所以一直是对的，
    // 这一句只是把**同一件事的另一种排版**折成同一个形状。
    const spreadFirst = asIndex === 1 && kids[0].IsSpreadUnit;
    let node = projectExpression(kids.slice(0, asIndex), ctx);
    if (spreadFirst && node !== undefined && node.kind === "SpreadElement") {
      node = node.expression;
    }
    let at = asIndex;
    while (at < kids.length) {
      const unit = kids[at];
      if (!unit.IsAsUnit && !unit.IsSatisfiesUnit) {
        break;
      }
      const typeKids = unit.ProjectableKids;
      const type = typeKids.length > 0 ? projectTypeExpression(typeKids, ctx) : undefined;
      node = {
        kind: unit.IsSatisfiesUnit ? "SatisfiesExpression" : "AsExpression",
        expression: node,
        type,
        pos: node === undefined ? startOf(unit) : node.pos,
        end: endOf(unit),
      };
      at += 1;
    }
    // **套回 `SpreadElement` 里**（`end` 跟着里面那个节点走，`pos` 从 `...` 起算）。
    const wrapSpread = (result:any) => spreadFirst && result !== undefined
      ? { kind: "SpreadElement", expression: result, pos: startOf(kids[0]), end: result.end }
      : result;
    if (at >= kids.length) return wrapSpread(node);
    return wrapSpread(foldBinaryFrom(node, kids.slice(at), ctx));
  }
  // ---- 3. 二元 / 赋值 ----
  //
  // **切在优先级最低的那个运算符上**（第 88 轮）：`x && y || z` 的 TS 是 `(x && y) || z`，
  // 按**第一个**运算符切会得到 `x && (y || z)`（优先级反了）。同级取**最左**（左结合）。
  // 实测这一族是「多出来」与「漂移」两榜的最大来源（`BinaryExpression` 654 / 657）。
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length - 1; i++) {
    if (!kids[i].IsOperatorUnit) continue;
    const rank = kids[i].OperatorRank;
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  if (opIndex > 0) {
    return foldBinaryFrom(projectExpression(kids.slice(0, opIndex), ctx), kids.slice(opIndex), ctx);
  }
  // ---- 3. 下标访问 `a[i]`（第 79 轮）----
  //
  // **必须排在二元切分之后**（踩过）：`a = b[i]` 里 `[]` 绑得比 `=` 紧，先折会把整条赋值
  // 当成下标表达式（`ElementAccessExpression.expression` 成了 `BinaryExpression`）。
  // 二元切分先走，递归到 `[b, [i]]` 这一段时再折，优先级才对。
  //
  // 产物那边下标访问是**平级的两格**（`Identifier(b)` + `[` 括号），TS 那边是
  // `ElementAccessExpression > [expression, argumentExpression]`。缺这一支的后果：
  // `ElementAccessExpression` 整类缺 300 处，而且**右操作数会在括号处截断**
  // （`options.Output = args[index + 1]` 的区间止于 `args`）。
  //
  // 判据是**末尾那一格是 `[` 括号**：值位里前面有操作数的 `[` 就是下标
  // （没有操作数的由 `json/array-literal.xl.md` 收成 `ArrayLiteral`，到不了这里；
  // 类型位的 `T[K]` 是 `IndexedAccessType` 单元，也到不了这里）。
  // 递归写法顺带覆盖 `a[i][j]` 与 `f(a)[0]`：先折前面那段，再套一层。
  if (kids.length >= 2 && kids[kids.length - 1].IsIndexBracket) {
    const bracket = kids[kids.length - 1];
    const base = projectExpression(kids.slice(0, kids.length - 1), ctx);
    const argument = projectExpression(bracket.ProjectableKids, ctx);
    return {
      kind: "ElementAccessExpression",
      expression: base,
      argumentExpression: argument,
      pos: base.pos,
      end: endOf(bracket),
    };
  }
  // ---- 3b. 调用链的末尾那一格是 `(` 括号（第 168 轮）----
  //
  // `y(function () { … })()` 的产物是 `[Method(name="y"), Bracket( () )]`——末尾那对括号是
  // **对调用结果再调一次**的实参表，而它不在 `Method` 里（`Method` 的区间只到函数体那个 `}`）。
  // TS 那边是外面再套一层 `CallExpression`，区间一直到那个 `)`。
  // 不接的话外层调用整个没有、内层终点也短两格（实测 `stmt-asi-paren-call.ts`：
  // `BinaryExpression` 与 `CallExpression` 各漂 2 + 多出一个短区间节点）。
  // 与上面下标那一支同款：先折前面那段，再套一层。
  // **「末尾那一格是不是圆括号」由那一格自己答**（第 1137 轮）：这两句原来读的是
  // `kids[kids.length - 1].IsBracketUnit && kids[kids.length - 1].startBracket === "("`
  // ——`IsBracketUnit` 加**原始字段** `startBracket`，正是「这一格是哪一态括号」那一问的
  // **第二种写法**：第 1089 / 1095 / 1109 轮把本页 27 处 `X.Tag === "Bracket" &&
  // X.startBracket === "("` 收成了 `X.IsParenBracket`，**唯独这一处没有 `Tag` 那一半守卫、
  // 于是从那一门的正则里漏了过去**（第 1115 轮收 `IsCommentUnit` 那一处同款漏网）。
  // `Bracket` 那一页在 `Use` 里写着 `this.IsParenBracket = this.startBracket === "("`、
  // `Clone` 抄同一格，基类答 `false`——所以这一格**与原来那两句逐字同答**，
  // 连「是不是括号」那一半也一并蕴含（`IsParenBracket` 只在 `Bracket` 那一页答 `true`）。
  // 同一轮 `direct:lint` 的 `BRACKET_STATE_CLASSIFY` 补了第三条：本页代码块里
  // `.startBracket === "…"` 这种**裸字段读**从此是 0 处（写回来这一门当场红）。
  if (
    kids.length >= 2 &&
    kids[kids.length - 1].IsParenBracket
  ) {
    const bracket = kids[kids.length - 1];
    const base = projectExpression(kids.slice(0, kids.length - 1), ctx);
    return {
      kind: "CallExpression",
      expression: base,
      arguments: callArgumentsOf(bracket, ctx),
      pos: base.pos,
      end: endOf(bracket),
    };
  }
  return projectNode(kids[0], ctx);
```

# private method assertedMember:(left:any, unit:any, ctx:any, questionDot:any)=>any

把一格**「成员名 + `!`」**（`NotNull`）折成 TS 的 `NonNullExpression`（第 852 轮立）。
返回**已经套好断言的那条链**，`left` 是它的受体；折不出来（没有 `!`、没有名字）给 `undefined`。

为什么单独立一格：同一形状**在两条路上各出现一次**，而两条路原来各折各的——

- `NullConditionalOperator` 的**第一格**就是 `NotNull`（`a?.b!`：产物
  `[Identifier(a), NCO(NotNull([Identifier(b), !]))]`，第 166 轮）；
- `?.` 之后的**续格**是「名字为空、被调用者带 `!`」的 `Method`
  （`a?.b!()`：产物 `NCO[Method name=""[NotNull(b, !), Bracket]]`；
  `a?.b!.c!()`：`NCO[NotNull(b, !), ., Method name=""[NotNull(c, !), Bracket]]`）。

前者走了「先按名字折一格、再把 `!` 套上去」（第 166 轮），后者**两处调用点都没走**
（`chainWithOptional` 与 `chainOnto` 都无条件按 `name` 折一格属性访问）⇒
`name` 是空串时投出一个**名字为空**的 `PropertyAccessExpression`：实测
`a?.b!()` 缺 `NonNullExpression`（`gap-c-optchain-nonnull-01`）、
`a?.b!.c!()` 里 `NonNullExpression` / `PropertyAccessExpression` / `Identifier` 三处漂
（`gap-c-optchain-nonnull-02`）。

**次序是语义**：先把**成员**接到 `left` 上，再把 `!` 套在**整条链**上
（TS 是 `NonNull(PropertyAccess(…, b))`，不是「名字叫 `b!`」）；
`?.` 那一格（`questionDot`）挂**内层**那个属性访问（TS 就是这么放的），
所以调用方传的是**那一格 `?.` 自己**的位置（第一格那一路传 NCO 的起点）。

```ts
  const inner = unit.ProjectableKids;
  const bang = inner.find((k: any) => k.IsNotNullSymbol);
  const nameUnit = inner.find((k: any) => k !== bang);
  if (nameUnit === undefined || bang === undefined) return undefined;
  let node: any;
  // **断言里那一格是一个下标括号**（第 966 轮）：`a?.['b']!` 的 NCO 内容是
  // `NotNull([Bracket(['b']), !])`——名称位拿到的是**一对方括号**，而不是一个名字。
  // 照下面那条通用支走会拿那对括号去读 `NameNode` ⇒ 投出一个文本是 `['b']` 的 `Identifier`
  //（实测 `gap-r964-opt-index-assert-member`：缺 `ElementAccessExpression` / `StringLiteral`、
  //  多一格名叫 `['b']` 的属性访问）。**那一格是下标**：与 `chainOnto` 里
  // `Bracket(startBracket="[")` 那一支**是同一件事**——先建 `ElementAccessExpression`，
  // 再把 `!` 套在它外面（次序与 TS 一致：`NonNull(ElementAccess(a, 'b'))`）。
  if (nameUnit.IsIndexBracket) {
    node = {
      kind: "ElementAccessExpression",
      expression: left,
      argumentExpression: projectExpression(nameUnit.ProjectableKids, ctx),
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  } else if (nameUnit.IsParenBracket) {
    // **断言里的核是一对实参括号**（第 975 轮）：`a?.()!()` 的 NCO 内容是
    // `NotNull([Bracket(()), !])`——那个括号是**一次调用**（`a?.()`），`!` 套在它的结果上
    //（TS：`NonNull(CallExpression(a with ?.) )`，`?.` 挂在那次调用上）。
    // 上面那条只认**下标**括号，于是这一格落到下面那条通用支 ⇒ 投出一格名字叫 `()` 的
    // 属性访问（实测 `gap-r975-opt-call-assert-call-twice`：漂 1 多 2）。
    // 折法与上面那条下标支**一字不差**（先建那一格、再把 `!` 套在外面）。
    node = {
      kind: "CallExpression",
      expression: left,
      arguments: callArgumentsOf(nameUnit, ctx),
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  } else if (nameUnit.IsPropertyAccess) {
    // **里面那条链也要逐格接**（第 166 轮）：`a?.b.c!` 的 NCO 内容是
    // `NotNull(PropertyAccess([b, ., c]))`，TS 那边是两层
    // `PropertyAccessExpression`（第一格带 `?.`）外面套 `NonNullExpression`——
    // 只按名字投一格会把 `b.c` 当成一个名字（实测区间 75→81、两个 `Identifier` 都漂）。
    const members = nameUnit.ProjectableKids;
    let cur = left;
    let pending: any = questionDot;
    for (const member of members) {
      if (member.IsNullConditionalOperator) {
        cur = chainWithOptional(cur, member, ctx);
        pending = undefined;
        continue;
      }
      if (member.IsDotSymbol || !member.IsNameNode) {
        continue;
      }
      const one: any = {
        kind: "PropertyAccessExpression",
        expression: cur,
        name: member.NameNode,
        pos: cur.pos,
        end: endOf(member),
      };
      if (pending !== undefined) {
        one.questionDotToken = pending;
        pending = undefined;
      }
      cur = one;
    }
    node = cur;
  } else if (nameUnit.IsMethodNode) {
    // **断言里的核是一格调用单元**（第 975 轮）：`a?.b()!` 的 NCO 内容是
    // `NotNull([Method(name="b"), !])`——`!` 盖在**那次调用**的结果上
    //（TS：`NonNull(CallExpression(PropertyAccess(a?.b)))`）。照下面那条通用支走会把
    // `b()` 整段当成一个名字（实测 `gap-r973-opt-call-assert-index`：多一格名字叫
    // `b()` 的属性访问、缺那一格 `CallExpression`，两个方向一起响）。
    // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**
    //（`innermostMethod` + `innermostCallee` + `graftCallee`）：先走到最里面那一格、
    // 把她当被调用者接上，`?.` 挂在**新接出来那一格**上（TS 的放法），
    // 没那么一格时交给 `graftCallee` 挂到最里面那次调用上。
    const callee = innermostCallee(left, innermostMethod(nameUnit), ctx);
    const built = callee !== left;
    if (built && questionDot !== undefined) callee.questionDotToken = questionDot;
    node = graftCallee(projectNode(nameUnit, ctx), callee, built ? undefined : questionDot);
  } else {
    node = {
      kind: "PropertyAccessExpression",
      expression: left,
      name: nameUnit.NameNode,
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  }
  return {
    kind: "NonNullExpression",
    expression: node,
    pos: left.pos,
    end: endOf(bang),
  };
```

# private method innermostMethod:(unit:any)=>any

**一路走到「里面没有 `Method` 了」那一格**（第 971 轮）：`unit` 本身算第一格。

一个 `Method` 单元里可以盖着**好几层调用**——`a?.b()()()` 的 NCO 里是
`Method(name="")[Method(name="")[Method(name="b")]]`：名字为空的每一格都是「对结果再调一次」，
而**真正带成员名的是最里面那一格**。所以问成员名、问区间都要先走到最里面那一格——
只问第一格的名字会把它读成空名字（第 966 轮那一版就是这么走的，见
`gap-r964-opt-call-triple`：三层只折出两层）。两处调用点（`chainWithOptional` 的
「被调用者是 `Method`」那一支、`chainOnto` 的 Method 分支）**共用这一份**。

```ts
  let deepest = unit;
  let depth = 0;
  while (depth < 32) {
    const down = deepest.ProjectableKids.filter((k: any) => k.IsGenericType === false);
    const next = down.length > 0 ? down[0] : undefined;
    if (next === undefined || next.IsMethodNode === false) break;
    deepest = next;
    depth = depth + 1;
  }
  return deepest;
```

# private method graftCallee:(call:any, callee:any, questionDot:any)=>any

**把一条调用链最里面那一格的被调用者换成 `callee`**（第 971 轮）。

`projectNode(那一格 Method)` 投出来的是**这一格里所有的调用层**（`CallExpression` 套
`CallExpression`），而 `?.` 与成员名属于**最里面**那一层（TS 的放法：`a?.b()()()` 里 `?.`
挂在 `a?.b` 那个属性访问上）。所以换的时候要**下到最里面那一格调用**再换——只换最外层那份
`expression` 会把中间几层的被调用者一起丢掉（实测 `gap-r964-opt-call-triple`：产物是
`CallExpression[0,10) > CallExpression[0,8) > Identifier(a)`，`.b` 与最里面那次调用都不见了）。

`questionDot` 非空时挂在**最里面那一格调用**上（`a?.()()` 那一族：`?.` 挂在 `a?.()` 那次调用
上、不是外层那次）；`callee` 自己带着 `?.`（`a?.b()()()` 那一族）时调用方传 `undefined`。
每一层的 `pos` 都取 `callee.pos`——一条调用链的每一层都从链的起点起算。

```ts
  const graft = (call: any): any => {
    if (call === undefined || call === null || typeof call !== "object") return callee;
    const inner = call.expression;
    const deeper = inner !== undefined && inner !== null && inner.kind === "CallExpression";
    const node: any = Object.assign({}, call, {
      expression: deeper ? graft(inner) : callee,
      pos: callee.pos,
    });
    if (deeper === false && questionDot !== undefined) node.questionDotToken = questionDot;
    return node;
  };
  return graft(call);
```

# private method innermostCallee:(left:any, deepest:any, ctx:any)=>any

**把「最里面那一格 `Method`」的被调用者建出来**（第 975 轮）——`innermostMethod` 的搭档，
`graftCallee` 的输入。

一个空名字的 `Method` 单元里可以套着好几层调用（见 `innermostMethod`），而**最里面那一格**
说的正是「对 `left` 的那一次调用」。它的核有三种，折法各不相同：

| 核 | 写法 | 要建的那一格 |
| --- | --- | --- |
| **一个名字** | `Method("")[Method("b")]` | 先接一格 `PropertyAccessExpression` |
| **一对实参括号** | `Method("")[Bracket(…)]` | 「括号那一次」要**单独**建成一格 `CallExpression` |
| 都不是 | `Method("")` | 就是 `left` 自己（原样返回） |

**第二档为什么必须单独建**：这一格的区间**比它的实参括号更靠右**（第 966 轮那句话：
一格说两次调用）——`projectNode(那一格 Method)` 只投得出**外面**那次调用，
里面那次（括号那一次）没有节点。判据与另外五处**一字不差**：
`endOf(括号) < endOf(这一格)`。

**这一份原来是五处各写一遍**（第 975 轮收拢）：`projectExpression` 的链循环、
`chainWithOptional` 的「第一格是 `Method`」与子链成员循环、`chainOnto` 的 Method 分支
与子链成员循环——**前两处只认名字那一档**，于是「括号 + 再调」那一路一到三层就少一层
（实测 `gap-r973-opt-assert-call-thrice` / `gap-r973-opt-index-call-thrice` 一族：
`a?.b!()()()` 缺 3、`a?.[b]()()()` 漂 1）。

`?.` **不在这里挂**：四种调用点各有各的放法（`chainWithOptional` 挂在**新接出来那一格**上，
`chainOnto` 那一支没有 `?.`）——调用方自己决定。

```ts
  const name = String(deepest.DeclaredName);
  if (name !== "") {
    const at = startOf(deepest);
    return {
      kind: "PropertyAccessExpression",
      expression: left,
      name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
      pos: left.pos,
      end: at + name.length,
    };
  }
  const kids = deepest.ProjectableKids.filter((k: any) => k.IsGenericType === false);
  const head = kids.length > 0 ? kids[0] : undefined;
  if (head !== undefined && head.IsParenBracket
    && endOf(head) < endOf(deepest)) {
    return {
      kind: "CallExpression",
      expression: left,
      arguments: callArgumentsOf(head, ctx),
      pos: left.pos,
      end: endOf(head),
    };
  }
  return left;
```

# private method chainWithOptional:(left:any, unit:any, ctx:any)=>any

`a.b?.c` / `a?.[i]` → 在链上再加一格（带 `questionDotToken`）。

产物把 `?.` 之后的成员收成一个 `NullConditionalOperator` 单元（里面只有成员名 / 下标括号），
而 TS 那边它是**前一个表达式链上的一格**：`PropertyAccessExpression` / `ElementAccessExpression`
各带一个 `questionDotToken`（那个 `?.` 记号是子节点）。

`?.` 的坐标**由那一格 `NullConditionalOperator` 自己给**（第 615 轮）：它的 `Process`
签入用的正是那个 `?.` `SymbolToken`（`SignInToken(current)`），所以 `startOf(unit)`
直接就是那个 `?`。**从前是回原文量的**（成员名的起点往前 `lastIndexOf("?")`），
那是第二份近似：还要自己挡住「抓到更早的那个 `?`」（上一条三元、上一个可选链，第 124 轮踩过）。

```ts
  const kids = unit.ProjectableKids;
  const first = kids.length > 0 ? kids[0] : undefined;
  // **`?.` 就在这一格的起点上**：调用方递进来的 `unit` **一定是** `NullConditionalOperator`
  //（`Process` 里 `SignInToken(那个 ?. 符号)`），所以不用回原文找。
  const dot = startOf(unit);
  const questionDot =
    typeof dot === "number" && dot >= 0
      ? { kind: "QuestionDotToken", text: "?.", pos: dot, end: dot + 2 }
      : undefined;
  // **`?.name(args)`**（第 107 轮）：那一格是一个 `Method`（调用）——先折出带 `?.` 的
  // 属性访问，再把调用套上去（TS：`CallExpression > PropertyAccessExpression(?.)`）。
  if (first !== undefined && first.IsMethodNode) {
    const nameText = String(first.DeclaredName);
    // **被调用者自己带 `!`**（第 852 轮）：`a?.b!()` 里那一格是
    // `Method(name="")[NotNull(b, !), Bracket]`——`?.` 属于 `NotNull` 里面那条链、
    // 断言套在链上、调用在最外面（TS：`CallExpression > NonNull > PropertyAccess(?.)`）。
    // 按下面的「名字 + 调用」折会投出一个**名字为空**的 `PropertyAccessExpression`
    //（实测缺 `NonNullExpression`、多一格空名属性访问），所以这一档交给 `assertedMember`。
    if (nameText === "") {
      const calleeKid = first.ProjectableKids.filter(
        (k: any) => k.IsGenericType === false,
      )[0];
      if (calleeKid !== undefined && calleeKid.IsNotNull) {
        const asserted = assertedMember(left, calleeKid, ctx, questionDot);
        if (asserted !== undefined) {
          const call = projectNode(first, ctx);
          return Object.assign({}, call, {
            expression: asserted,
            pos: asserted.pos,
            end: endOf(unit),
          });
        }
      }
      // **被调用者是内层那一格 `Method`**（第 962 轮）：`o?.m()()` 的产物是
      // `NCO[Method(name="")[Method(name="m")]]`——与普通链那条路（第 366 轮）**同形同修**：
      // 先把**内层**按成员调用折一遍，再把「调用这个结果」套上去。
      // 少了这一支，那一格会落到下面「按成员名折」⇒ 投出一个**名字为空**的属性访问
      //（实测 `o?.m()()`：`CallExpression` / `PropertyAccessExpression` / `Identifier` 三处漂）。
      //
      // **名字要一路往下找到最里面那一格**（第 971 轮）：`a?.b()()()` 的 NCO 里是
      // `Method(name="")[Method(name="")[Method(name="b")]]`——名字为空的每一格都是
      // 「对结果再调一次」，而 `?.` 与成员名属于**最里面**那一层。第 966 轮那一版只问
      // **第一格**的名字（答空串）⇒ 走的是下面「名字为空」那一支、把中间几层与 `.b` 一起丢了
      //（实测 `gap-r964-opt-call-triple`：`CallExpression[0,10) > CallExpression[0,8) >
      // Identifier(a)`）。两件事各收在各处：走到最里面那一格是 `innermostMethod`，
      // 「换被调用者要下到最里面那一格调用」是 `graftCallee`——`chainOnto` 的 Method 分支
      // 用的是同一对。
      if (calleeKid !== undefined && calleeKid.IsMethodNode) {
        // **最里面那一格的被调用者怎么建，收在 `innermostCallee` 里**（第 975 轮）：
        // 它按核分三档（名字 / 实参括号 / `left` 自己），其中「括号那一次」要单独建成一格——
        // 少了那一档，`a?.b()()()` 一族**每一次都少一层**
        //（实测 `gap-r973-opt-assert-call-thrice`：`CallExpression` 各漂 / 缺）。
        const callee = innermostCallee(left, innermostMethod(calleeKid), ctx);
        // **`?.` 挂在这一格新接出来的那一层上**（TS 的放法）：接了名字 / 建了「括号那一次」
        // 就挂在那上面（`a?.b!()` 那一族断言已经把它挂进 `assertedMember` 里了）；
        // 什么都没接（被调用者就是 `left`）时交给 `graftCallee` 挂到最里面那次调用上
        //（`a?.()()` 那一档：`?.` 属于 `a?.()` 那一次，不是外面那次）。
        const built = callee !== left;
        if (built && questionDot !== undefined) callee.questionDotToken = questionDot;
        const innerCall = graftCallee(
          projectNode(calleeKid, ctx),
          callee,
          built ? undefined : questionDot,
        );
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
      }
      // **被调用者是 `left`、而这一格盖着两层调用**（第 962 轮）：`o?.m?.()(1)` 的 `NCO` 里是
      // `Method(name="")[Bracket, 1]`——那个 Bracket 是**内层**那次调用（`?.()`）的实参表，
      // 外层那次调用的实参是它后面的兄弟（`1`），而外层调用只体现在 `Method` 自己的区间上。
      // 只折一层会**丢掉内层那一次调用**。「外面还有没有一层」这一问就是**区间**
      //（与普通链那条路的同一句判据：`Method` 比它那个 Bracket 更靠右）。
      if (calleeKid !== undefined && calleeKid.IsParenBracket && endOf(calleeKid) < endOf(first)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: callArgumentsOf(calleeKid, ctx),
          pos: left.pos,
          end: endOf(calleeKid),
        };
        if (questionDot !== undefined) innerCall.questionDotToken = questionDot;
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos, end: endOf(unit) });
      }
      // **这一格盖着两层调用、而里层那一次只留下一个实参括号**（第 966 轮）：
      // `a!()()` 的 NCO 里那一格是 `Method(name=""[Bracket(())])`——**一格 `Method` 里只有
      // 一对括号**，可它说的是两次调用（两次共用这一格的区间）。判据与上面那一支一字不差：
      // `Method` 比它那个括号更靠右 ⇒ 里面还裹着一层。少了它只投出一次调用
      //（实测 `gap-r964-nonnull-call-twice-member` 的 NCO 那一半：缺 4 格）。
      if (calleeKid !== undefined && calleeKid.IsParenBracket && endOf(calleeKid) < endOf(first)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: callArgumentsOf(calleeKid, ctx),
          pos: left.pos,
          end: endOf(calleeKid),
        };
        if (questionDot !== undefined) innerCall.questionDotToken = questionDot;
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos, end: endOf(unit) });
      }
    }
    const nameAt = startOf(first);
    const member = {
      kind: "PropertyAccessExpression",
      expression: left,
      name: { kind: "Identifier", text: nameText, pos: nameAt, end: nameAt + nameText.length },
      pos: left.pos,
      end: nameAt + nameText.length,
    };
    if (questionDot !== undefined) member.questionDotToken = questionDot;
    const call = projectNode(first, ctx);
    return Object.assign({}, call, { expression: member, pos: member.pos, end: endOf(unit) });
  }
  // **`o.m?.().k`**（第 154 轮）：NCO 里的第一格是**属性访问**，而它的第一格是实参括号——
  // 那是 token 层的属性访问重组把 `( ) . k` 折成了一个 `PropertyAccess`
  //（XML 实测：`<NCO><PropertyAccess><Bracket/><.><k/></PropertyAccess></NCO>`；
  //  插桩也确认了：`chainWithOptional` 收到的 `first` 是 `PropertyAccess` 而不是 `Bracket`）。
  //
  // **语义上是先调用、再取属性**：`o.m?.()` 是调用，`.k` 挂在它的**结果**上。
  // 所以这里自己把那一格拆开：拿**头一个**实参括号建 `CallExpression`，
  // 再把括号**之后**的成员逐个接上去——
  // 不拆的话它会落到下面「按成员名折属性访问」那一支，
  // 把括号当成名字，投出一个名叫 `()` 的属性访问（实测就是这个形状），
  // 运行期于是**静默**给 `undefined`（JS 给 `3`）。
  if (first !== undefined && first.IsPropertyAccess) {
    const inner = first.ProjectableKids;
    const head = inner.length > 0 ? inner[0] : undefined;
    if (head !== undefined && head.IsParenBracket) {
      const call: any = {
        kind: "CallExpression",
        expression: left,
        arguments: callArgumentsOf(head, ctx),
        pos: left.pos,
        end: endOf(head),
      };
      if (questionDot !== undefined) call.questionDotToken = questionDot;
      // **括号之后剩下的成员**（`.k` / `[i]` / `.k` 连着的几格）：逐个往链上挂。
      // 名字取那一格的 `Identifier`（token 层已经把成员名收成一个单元）；
      // 下标那一格是 `[` 括号——两种都按下面「按成员名折」那一段的同一口径写。
      let node: any = call;
      for (let i = 1; i < inner.length; i++) {
        const member = inner[i];
        const memberAt = startOf(member);
        if (member.IsIndexBracket) {
          const element: any = {
            kind: "ElementAccessExpression",
            expression: node,
            argumentExpression: projectExpression(member.ProjectableKids, ctx),
            pos: node.pos,
            end: endOf(member),
          };
          node = element;
          continue;
        }
        if (member.IsSymbolToken) continue;
        const nameText = member.TextValue;
        if (nameText === "") continue;
        node = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: { kind: "Identifier", text: nameText, pos: memberAt, end: memberAt + nameText.length },
          pos: node.pos,
          end: memberAt + nameText.length,
        };
      }
      return node;
    }
  }
  // **`?.(args)`**（第 107 轮）：那一格是实参括号，TS 是带 `questionDotToken` 的 `CallExpression`。
  if (first !== undefined && first.IsParenBracket) {
    const call = {
      kind: "CallExpression",
      expression: left,
      // **实参按顶层逗号切段、每段走 `projectExpression`**（第 143 轮）：不能走 `projectEach`——
      // 那个助手是**逐格**投的，而实参位正是「基名与 `?.` 平级」的形状（`h?.(o?.a)` 的括号里是
      // `[Identifier(o), NCO(a)]` 两格），逐格投会让 `?.a` 落成一个**未映射的
      // `NullConditionalOperator`**、基名与它各占一个实参（实测：缺 `PropertyAccessExpression`
      // 与 `QuestionDotToken` 各一 + 多出一个 `NullConditionalOperator`）。
      // 与 `chainOnto` 里「紧跟一对圆括号 ⇒ 再调一次」那一支是同一个写法。
      arguments: callArgumentsOf(first, ctx),
      pos: left.pos,
      end: endOf(unit),
    };
    if (questionDot !== undefined) call.questionDotToken = questionDot;
    return call;
  }
  // **`?.[i]`**（第 124 轮）：实参是括号**里面**那一段——早先这里直接 `projectNode(first)`，
  // 把整个 `[…]` 括号投成一个节点（未映射的 `<Bracket>`），于是 TS 那边
  // `ElementAccessExpression` 有了、却凭空多出一个 `Bracket`。
  if (first !== undefined && first.IsIndexBracket) {
    // **这一格后面还跟着兄弟时，下标只是链上的一格**（第 962 轮）：`o?.['m']()` 的 NCO 里
    // **两个括号装在同一格**（`NCO[Bracket([), Bracket(())]`）——原来这里无条件把整格 NCO
    // 当成一个下标（`end: endOf(unit)` 一路盖到 `()` 后面）就返回，
    // 于是那次调用整格丢掉、`ElementAccessExpression` 的区间也漂（实测缺一个
    // `CallExpression`、`ElementAccessExpression` 漂 2）。
    // 修法与 `chainOnto` 的续格循环同款：**把剩下的兄弟交给它**——那里面
    // 「紧跟一对圆括号 ⇒ 对左边那个结果再调用一次」正是这一档要的。
    const more = kids.length > 1;
    const element = {
      kind: "ElementAccessExpression",
      expression: left,
      argumentExpression: projectExpression(first.ProjectableKids, ctx),
      pos: left.pos,
      end: more ? endOf(first) : endOf(unit),
    };
    if (questionDot !== undefined) element.questionDotToken = questionDot;
    if (more) {
      // **剩下的兄弟里那些「以一次调用开头」的单元要先摊开**（第 962 轮）：
      // `o?.['m']().v` 的第二格是 `PropertyAccess([Bracket(()), ., v])`——
      // 调用与它后面的后缀一起装在一个外壳里（第 692 轮那条口径）。
      // 不摊开的话 `chainOnto` 的循环在它上面既不是点号也不是括号 ⇒ `break` ⇒ **整段丢**
      //（实测缺 `CallExpression` / `PropertyAccessExpression` / `Identifier` 三个）。
      // 摊开之后与 `projectExpression` 链那一支里那一份**是同一件事**。
      const rest: Array<any> = [];
      for (const unit of kids.slice(1)) {
        // **裸的一次调用不要摊开**（第 965 轮）：`a?.[b]()()` 的第二格是
        // `Method(name="")[Bracket(())]`——它是**一次调用**、而外面那次调用只体现在
        // 这个 `Method` 自己的区间上（与第 962 轮那条「外面还有没有一层」同源）。
        // 摊开成裸括号之后 `chainOnto` 见到的只是内层那对实参括号 ⇒ 外层那次调用
        // **没有节点**、区间也短一格（实测 `gap-r964-opt-index-call-twice`：外层漂 2）。
        // 整格交给 `chainOnto`（它认了这一档）。
        // **第 1077 轮起读的是那一格自己的属性**（`Method.IsBareCall`，与 `Token.IsCommaSymbol`
        // 同一形态：基类默认 `false`、`Method` 那一页现算）——「我是不是 `Method`」那一问
        // 随之消失，投影不再替那一页记一遍。
        if (unit.IsBareCall) {
          rest.push(unit);
          continue;
        }
        if (unit.IsCallFirstUnit) {
          for (const inner of unit.ProjectableKids) rest.push(inner);
          continue;
        }
        rest.push(unit);
      }
      return chainOnto(element, rest, ctx);
    }
    return element;
  }
  // **`a?.b!`：`!` 落在 NCO **里面**、语义上却套在整条链**外面**（第 166 轮）：
  // 产物是 `[Identifier(a), NullConditionalOperator(NotNull([Identifier(b), !]))]`——
  // `!` 先被 `NotNull` 规则折进了 NCO 的内容里，而 TS 是
  // `NonNullExpression > PropertyAccessExpression(a?.b)`。先按 NCO 里那个**名字**折出带 `?.`
  // 的属性访问，再把 `!` 套到整条链上；不这么收的话 `!` 会留在成员名上，
  // `PropertyAccessExpression` 的区间多一格、`NonNullExpression` 少一层
  // （实测 `expr-nonnull-optional.ts` 与 `expr-optional-call-nodes.ts`）。
  if (first !== undefined && first.IsNotNull) {
    // 折法收在 `assertedMember` 里（第 852 轮）：`a?.b!` 与 `a?.b!()` / `a?.b!.c!()`
    // 是同一格，`!` 都套在**整条链**上，差的是它后面还接不接东西。
    const asserted = assertedMember(left, first, ctx, questionDot);
    if (asserted !== undefined) return chainOnto(asserted, kids.slice(1), ctx);
  }
  // **`a?.b` 加模板串 ⇒ `TaggedTemplateExpression`**（第 175 轮）：`` a?.b`t` `` 的产物是
  // `[Identifier(a), NullConditionalOperator([Identifier(b), String])]`——成员名与那个模板串
  // 都在 NCO 里。TS 那边是 `TaggedTemplateExpression > [PropertyAccessExpression(a?.b),
  // NoSubstitutionTemplateLiteral]`（实测 `ex-optional-call-new.ts`：缺
  // `TaggedTemplateExpression` + `NoSubstitutionTemplateLiteral`，`PropertyAccessExpression`
  // 的区间一路撑到模板串末尾）。
  const stringUnit = kids.find((k) => k.IsStringLiteralUnit);
  if (stringUnit !== undefined && kids.length >= 2) {
    const tagName = kids.find((k) => k !== stringUnit && k.IsNameNode);
    if (tagName !== undefined) {
      const member: any = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: tagName.NameNode,
        pos: left.pos,
        end: endOf(tagName),
      };
      if (questionDot !== undefined) member.questionDotToken = questionDot;
      // **模板串后面还跟着兄弟时，链要接着往下接**（第 965 轮）：`` a?.b`t`() `` 的产物是
      // `[Identifier(a), NCO(Identifier(b), String)]`，而那次调用是 **NCO 的下一个兄弟**
      // （与上面 `a?.[b][c]()` 那一档同形：链的最后一格在 NCO 里、续格在 NCO 外面）。
      // 原来这里直接交出一个 `TaggedTemplateExpression` 就完了 ⇒ 那次调用**整格丢**
      //（实测 `gap-r964-opt-member-tagged-call`：缺一个 `CallExpression`）。
      // 剩下的兄弟交给 `chainOnto`——「紧跟一对圆括号 ⇒ 再调一次」那一支正是这一档要的。
      const tagged: any = {
        kind: "TaggedTemplateExpression",
        tag: member,
        template: projectNode(stringUnit, ctx),
        pos: left.pos,
        end: endOf(stringUnit),
      };
      const afterString = kids.indexOf(stringUnit) + 1;
      if (afterString < kids.length) return chainOnto(tagged, kids.slice(afterString), ctx);
      return tagged;
    }
  }
  // **这一格自己又是一条链**（第 124 轮）：`a?.b.c` 的产物是
  // `[Identifier(a), NullConditionalOperator(PropertyAccess([b, ., c]))]`——
  // 整个 `b.c` 是 NCO 里的**一个** `PropertyAccess` 单元。走下面那条通用支的话，
  // 那个单元会被投成**一个** `Identifier`（名字取到整段 `b.c`），于是
  // `PropertyAccessExpression` 少一层、`Identifier` 多一个、区间也跟着漂
  // （实测 `a?.b.c` / `x?.Parent.Parent` 这一族）。逐格接上去，
  // `questionDotToken` 挂在**第一格**上（TS 就是这么放的：`a?.b.c` 的 `?.` 属于内层那个节点）。
  if (first !== undefined && first.IsPropertyAccess) {
    const members = first.ProjectableKids;
    let node = left;
    // **`?.` 挂在链的下一格上**（TS 的放法）：`a?.b.c` 里它是**内层**那个
    // `a?.b` 的 `questionDotToken`，不是外层 `…​.c` 的。所以先存着，接第一格时用掉。
    let pending: any = questionDot;
    let j = 0;
    while (j < members.length) {
      const member = members[j];
      if (member.IsNullConditionalOperator) {
        node = chainWithOptional(node, member, ctx);
        pending = undefined;
        j += 1;
        continue;
      }
      if (member.IsDotSymbol) {
        j += 1;
        continue;
      }
      // **子链里夹着一格「名字 + `!`」**（第 966 轮）：`a?.b!.c` 的 NCO 内容是
      // `[NotNull(b), ., PropertyAccess([c])]`——`!` 与 `b` 在**同一格**里，而它要盖的是
      // **接上 `b` 之后**那一条链（TS：`PropertyAccess(NonNull(PropertyAccess(a?.b)), c)`）。
      // 不走这一支的话，下面三条都不认 `NotNull` ⇒ 落到通用支 ⇒ 读 `NameNode` 会把「名字 + `!`」
      // 当成一个名字（`Identifier` 的值成了 `"b!"`）⇒ 缺 `NonNullExpression`、
      // 多一格属性访问（实测 `gap-r964-opt-assert-member-member` 的漂移正是它）。
      // 折法与 `chainOnto` 的子链分支**一字不差**：先接成员（`?.` 挂在**内层**那一格），
      // 再把 `!` 套在**整条链**上、位置取那一格自己的末端。
      if (member.IsNotNull) {
        const bangKids = member.ProjectableKids.filter(
          (k: any) => !k.IsNotNullSymbol,
        );
        const innerName = bangKids.length > 0 ? bangKids[0] : undefined;
        if (innerName !== undefined) {
          const holder: any = {
            kind: "PropertyAccessExpression",
            expression: node,
            name: innerName.NameNode,
            pos: node.pos,
            end: endOf(innerName),
          };
          if (pending !== undefined) {
            holder.questionDotToken = pending;
            pending = undefined;
          }
          node = {
            kind: "NonNullExpression",
            expression: holder,
            pos: holder.pos,
            end: endOf(member),
          };
        }
        j += 1;
        continue;
      }
      if (member.IsMethodNode) {
        const nameText = String(member.DeclaredName);
        const nameAt = startOf(member);
        // **这一格是「名字为空」的调用单元**（第 964 轮补上这份副本）：
        // `o?.m()().v` 的 NCO 里那一格是
        // `PropertyAccess([Method name=""[Method name="m"]], ., v)`——**空名字 `Method` 的第一格
        // 是内层那次调用**。折法与 `chainWithOptional` 的空名字那一支**是同一件事**
        //（第 366 轮的两步走 + 第 962 轮那三支），少了它这一格会投出一个**名字为空**的属性访问
        //（实测 `o?.m()().v`：`CallExpression` / `PropertyAccessExpression` / `Identifier` 三处漂）。
        // **这一份是那条判据的第五处副本**：另外四处已由第 962 / 963 轮补齐，
        // 补上这一处之后五处同形；「五处收成一份实现」登记为下一步（见 README 第 964 轮那一节）。
        if (nameText === "") {
          const callKids = member.ProjectableKids.filter((k: any) => k.IsGenericType === false);
          const callHead = callKids.length > 0 ? callKids[0] : undefined;
          if (callHead !== undefined && callHead.IsNotNull) {
            const asserted = assertedMember(node, callHead, ctx, pending);
            if (asserted !== undefined) {
              node = Object.assign({}, projectNode(member, ctx), {
                expression: asserted,
                pos: asserted.pos,
              });
              pending = undefined;
              j += 1;
              continue;
            }
            // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a?.['b']!()` 的 NCO 里
            // 那一格是 `Method(name=""[NotNull(Bracket(['b']), !), Bracket(())])`——
            // 断言里的核是**下标括号**（不是名字），`assertedMember` 只认名字 ⇒ 给 `undefined`。
            // 折不出来的话整格落到 `break`（实测 `gap-r964-opt-index-assert-call`：
            // 缺两个 `CallExpression`、`ElementAccessExpression` 的区间只到 `]`）。
            // **做法与 `chainOnto` 那一处一字不差**：先把「下标 + `!`」折成 `NonNull`，
            // 再把外面那次调用套上去（`?.` 挂在里面那次下标上——TS 就是这么放的）。
            const assertKids = callHead.ProjectableKids.filter(
              (k: any) => !k.IsNotNullSymbol,
            );
            const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
            if (assertHead !== undefined && assertHead.IsIndexBracket) {
              const element: any = {
                kind: "ElementAccessExpression",
                expression: node,
                argumentExpression: projectExpression(assertHead.ProjectableKids, ctx),
                pos: node.pos,
                end: endOf(assertHead),
              };
              if (pending !== undefined) element.questionDotToken = pending;
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: element,
                pos: element.pos,
                end: endOf(callHead),
              };
              node = Object.assign({}, projectNode(member, ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
              });
              pending = undefined;
              j += 1;
              continue;
            }
          }
          if (callHead !== undefined && callHead.IsMethodNode) {
            // **这一格盖着一层或好几层调用**（第 966 轮立、第 971 轮按「最里面那一格」补齐）：
            // `a?.b()()` / `a?.b()()()` / `a?.b()()().c` 的 NCO 里那一格都是
            // `Method(name="")[Method(name="")[…]]`——名字为空的每一格都是「对结果再调一次」，
            // **真正带成员名的是最里面那一格**；外层再用 `projectNode(member)` 套一层。
            // 只读 `callHead` **第一格**的名字（第 966 轮那一版）会把三层当成两层：
            // 实测 `a?.b()()().c` 漂 2、字段 1、`Identifier(b)` 整格丢。
            // 折法与 `chainWithOptional` 的「被调用者是 `Method`」那一支**一字不差**：
            // 走到最里面那一格用 `innermostMethod`，**被调用者怎么建**用 `innermostCallee`
            //（第 975 轮收拢：名字 / 实参括号 / `left` 三档一处一份），
            // 换法用 `graftCallee`（它一路下到最里面那一层调用，不会把中间几层丢掉）。
            const callee = innermostCallee(node, innermostMethod(callHead), ctx);
            const built = callee !== node;
            if (built && pending !== undefined) callee.questionDotToken = pending;
            const innerCall = graftCallee(projectNode(callHead, ctx), callee, built ? undefined : pending);
            node = Object.assign({}, projectNode(member, ctx), {
              expression: innerCall,
              pos: innerCall.pos,
            });
            pending = undefined;
            j += 1;
            continue;
          }
          if (callHead !== undefined && callHead.IsParenBracket && endOf(callHead) < endOf(member)) {
            const innerCall: any = {
              kind: "CallExpression",
              expression: node,
              arguments: callArgumentsOf(callHead, ctx),
              pos: node.pos,
              end: endOf(callHead),
            };
            if (pending !== undefined) innerCall.questionDotToken = pending;
            node = Object.assign({}, projectNode(member, ctx), {
              expression: innerCall,
              pos: innerCall.pos,
            });
            pending = undefined;
            j += 1;
            continue;
          }
        }
        const holder = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: { kind: "Identifier", text: nameText, pos: nameAt, end: nameAt + nameText.length },
          pos: node.pos,
          end: nameAt + nameText.length,
        };
        if (pending !== undefined) holder.questionDotToken = pending;
        const call = projectNode(member, ctx);
        node = Object.assign({}, call, { expression: holder, pos: holder.pos });
      } else if (member.IsIndexBracket) {
        // **下标括号也是链上的一格**（第 962 轮）：`o?.m()[0]` 的 NCO 里那一格是
        // `PropertyAccess([Method(m), Bracket([0])])`——`[0]` 与成员名**平级**。
        // 落到下面那条通用支会把那一格当成**一个名字**（实测投出名叫 `"[0]"` 的
        // `Identifier` ⇒ 缺 `ElementAccessExpression` 与 `NumericLiteral`、多一格属性访问）。
        // 收法与 `chainOnto` 里那一支**一字不差**：同一形状、同一个判据，不写第二份。
        const element: any = {
          kind: "ElementAccessExpression",
          expression: node,
          argumentExpression: projectExpression(member.ProjectableKids, ctx),
          pos: node.pos,
          end: endOf(member),
        };
        if (pending !== undefined) element.questionDotToken = pending;
        node = element;
      } else {
        const step = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: member.NameNode,
          pos: node.pos,
          end: endOf(member),
        };
        if (pending !== undefined) step.questionDotToken = pending;
        node = step;
      }
      pending = undefined;
      j += 1;
    }
    // **这一格后面还跟着兄弟时，链要接着往下接**（第 965 轮）：`a?.[b][c]()` 的产物是
    // `[Identifier(a), NCO(PropertyAccess([Bracket([b]), Bracket([c])]), Bracket(()))]`——
    // **两个下标装在 NCO 里的那一格 `PropertyAccess` 里**，而那次调用是 NCO 的**下一个兄弟**。
    // 原来这里直接 `return node`（下标接完就交差）⇒ 那次调用**整格丢**，
    // `ElementAccessExpression` 的区间也只到 `[c]` 为止（实测
    // `gap-r964-opt-index-index-call`：缺一个 `CallExpression`）。
    // 剩下的兄弟交给 `chainOnto`——「紧跟一对圆括号 ⇒ 再调一次」那一支正是这一档要的，
    // 与上面 `?.[i]` 那一支里同一个写法（第 962 轮立），不写第二份。
    return kids.length > 1 ? chainOnto(node, kids.slice(1), ctx) : node;
  }
  // **成员名一律是 `Identifier`**（第 175 轮）：`a?.import` 里那个 `import` 在产物中是
  // `Keyword`，照通用支投会得到 `ImportKeyword`，而 TS 那边点号后面一律是**属性名**
  // （实测 `expr-member-named-import-optional.ts`：缺 `Identifier` + 多出 `ImportKeyword`）。
  // 与第 125 轮「成员名不期待操作数」同源，读 `NameNode` 本来就是这条口径。
  const name =
    first === undefined
      ? undefined
      : first.IsNameNode
        ? first.NameNode
        : projectNode(first, ctx);
  const access = {
    kind: "PropertyAccessExpression",
    expression: left,
    name,
    pos: left.pos,
    end: endOf(unit),
  };
  if (questionDot !== undefined) access.questionDotToken = questionDot;
  return access;
```

# private method chainOnto:(node:any, units:Array<any>, ctx:any)=>any

把一串「链的续格」（`.` + 名字 / 下标括号 / 可选链单元）**接在一个已有节点上**。

用在「产物把右操作数的链平铺在运算符外面」那一支（见 `projectExpression` 的说明）：
折出二元之后，右边的续格还要顺着接上去，否则那一段整片丢。

```ts
  let left = node;
  let i = 0;
  while (i < units.length && left !== undefined) {
    const unit = units[i];
    // **紧跟一格反引号模板 ⇒ 又是一条标签模板**（第 979 轮）：`` tag`a``b` `` 与
    // `` f<T>`t``u` `` 在 TS 那边是**嵌套的两条** `TaggedTemplateExpression`（里外各带自己的
    // `template`）——左边那一条当外层的 `tag`。原来这一格没有分支，落到循环末尾被跳过 ⇒
    // **外面那一层整格丢**（实测 `` f<T>`t``u` ``：外层的 `TaggedTemplateExpression` 区间
    // 只到第一个模板、第二格模板不见）。判据与 0b 同源：**只有反引号才算模板**
    //（普通字符串与模板在产物里的属性一模一样，靠**那一格自己记着的引号**分：
    // `String.stringChar`——第 1049 轮起不再回原文读第一个字符）。
    if (unit.IsTemplateString) {
      const template = projectNode(unit, ctx);
      if (template === undefined) break;
      left = { kind: "TaggedTemplateExpression", tag: left, template, pos: left.pos, end: endOf(unit) };
      i += 1;
      continue;
    }
    if (unit.IsNullConditionalOperator) {
      left = chainWithOptional(left, unit, ctx);
      i += 1;
      continue;
    }
    if (unit.IsIndexBracket) {
      const argument = projectExpression(unit.ProjectableKids, ctx);
      left = {
        kind: "ElementAccessExpression",
        expression: left,
        argumentExpression: argument,
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **紧跟一个「按数组字面量成形的方括号」⇒ 那就是一次下标**（第 333 轮）。
    //
    // **为什么它一定不是数组字面量**：这一条路只在**链的续格**上走——
    // 一个值后面紧跟着 `[` 在 JS 里就是下标（`a [1]` 与 `a[1]` 是一回事）。
    // 而 token 层在**非空断言后面那一格**正好会给这个形状：
    // `o?.a.b![0]` 的 NCO 里是 `[NotNull(PropertyAccess(a.b)), ArrayLiteral(0)]`——
    // `[0]` 谁也不认它 ⇒ 按数组字面量成形、与前面那一格**平级**。
    // 不认它的话这个下标**整段丢掉**：Node 给 `7`、本仓给 `[7]`——**静默错值**
    //（判据 `c323-ex-nonnull-in-chains` 现场量的就是它）。
    // **做法与上面那一支一字不差**（只有「从哪个形状取实参」不同）。
    if (unit.IsArrayLiteralUnit) {
      const argument = projectExpression(unit.ProjectableKids, ctx);
      left = {
        kind: "ElementAccessExpression",
        expression: left,
        argumentExpression: argument,
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **紧跟一对圆括号 ⇒ 对左边那个结果再调用一次**（第 168 轮）：`y(function(){})()`
    // 的产物是 `[…, Method(name="y"), Bracket( () )]`——末尾那对括号是**平级的兄弟**
    // （不在 `Method` 里），TS 那边是外面再套一层 `CallExpression`（区间到那个 `)`）。
    // 普通的调用早被收成 `Method` 单元了，所以这里见到的圆括号只会是这一形状
    // （实测 `stmt-asi-paren-call.ts`：`BinaryExpression` 与 `CallExpression` 各漂 2）。
    if (unit.IsParenBracket) {
      left = {
        kind: "CallExpression",
        expression: left,
        arguments: callArgumentsOf(unit, ctx),
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **这一格自己是一个非空断言**（第 975 轮）：`a?.b![0]![1].c` 的 NCO 里第二格是
    // `NotNull([Bracket([0]), !])`——「**先下标、再断言**」的一格（与链循环里
    // `IsIndexFirstUnit` 那一支、以及第 975 轮补的「先调用、再断言」同形）。
    // 这一支原来根本没有 ⇒ 它既不是点号、也不是下标 / 圆括号 / `Method`，
    // 循环在它前面就 `break` ⇒ **断言与那个下标一起丢**（实测
    // `gap-r973-opt-assert-index-index-member`：缺 5 漂 2）。
    // **次序是语义**：TS 是 `((a?.b![0])![1])`——先把下标接上、再把 `!` 套在那个结果上。
    if (unit.IsNotNull) {
      const bangKids = unit.ProjectableKids.filter(
        (k: any) => !k.IsNotNullSymbol,
      );
      const bangHead = bangKids.length > 0 ? bangKids[0] : undefined;
      let asserted: any = left;
      if (bangHead !== undefined && bangHead.IsIndexBracket) {
        asserted = {
          kind: "ElementAccessExpression",
          expression: left,
          argumentExpression: projectExpression(bangHead.ProjectableKids, ctx),
          pos: left.pos,
          end: endOf(bangHead),
        };
      } else if (bangHead !== undefined && bangHead.IsParenBracket && endOf(bangHead) < endOf(unit)) {
        asserted = {
          kind: "CallExpression",
          expression: left,
          arguments: callArgumentsOf(bangHead, ctx),
          pos: left.pos,
          end: endOf(bangHead),
        };
      } else if (bangHead !== undefined && bangHead.IsMethodNode) {
        asserted = graftCallee(
          projectNode(bangHead, ctx),
          innermostCallee(left, innermostMethod(bangHead), ctx),
          undefined,
        );
      }
      left = { kind: "NonNullExpression", expression: asserted, pos: left.pos, end: endOf(unit) };
      i += 1;
      continue;
    }
    // **这一格自己就是一次调用**（第 965 轮）：`a?.[b]()()` 的 NCO 里是
    // `[Bracket([b]), Method(name="")[Bracket(())]]`——那一格 `Method` 前面**没有点号**
    // （它要说的正是「对左边那个结果再调一次」），所以它在下面 `IsDotSymbol` 那道门槛前
    // 就 `break` 了 ⇒ **那次调用整格丢**（实测 `gap-r964-opt-index-call-twice`：
    // 外层 `CallExpression` 的区间只到第一个 `)`）。
    // 判据与 `chainWithOptional` 的「内层是 `Method`」那一支**同源**（第 962 轮立的两步走
    // 加区间判据），区别只是**点号没有出现**；空名字那一档也走同一条路
    //（`Method(name="")[Bracket(...)]` 的投影本身就是「被调用者是 `left` 的一次调用」）。
    if (unit.IsMethodNode) {
      const callKids = unit.ProjectableKids.filter((k: any) => k.IsGenericType === false);
      const callHead = callKids.length > 0 ? callKids[0] : undefined;
      const bareName = String(unit.DeclaredName);
      // **这一格盖着两层（或更多层）调用**（第 966 轮立、第 971 轮按「最里面那一格」补齐）：
      // `a?.b()()()` 的 NCO 里最外面那一格是
      // `Method(name="")[Method(name="")[Method(name="b")]]`——`projectNode(unit)` 对
      // **名字为空**的 `Method` 投出来的是一次 `CallExpression`，而它里面那层是**第二格**
      // （`Method(name="")[Method(name="b")]`，同样是空的）。所以直接把这一格整个投出来
      // 交给 `left` 是不够的：那样**外面那一次调用没有节点**（实测
      // `gap-r964-opt-call-triple`：`CallExpression` / `PropertyAccessExpression` /
      // `Identifier` 三处漂、另多一格名字为空的属性访问）。
      // **做法**：被调用者接在**最里面**那一格调用上——走进最里面那一格用 `innermostMethod`、
      // **被调用者怎么建**用 `innermostCallee`（第 975 轮收拢：名字 / 实参括号 / `left`
      // 三档各一处一份），换法交给 `graftCallee`
      //（它一路下到最里面那一层，不会把中间几层丢掉）。与 `chainWithOptional` 的
      // 「被调用者是 `Method`」那一支**共用同一对**。
      if (bareName === "" && callHead !== undefined && callHead.IsMethodNode) {
        const innerCall = graftCallee(
          projectNode(callHead, ctx),
          innermostCallee(left, innermostMethod(callHead), ctx),
          undefined,
        );
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.IsNotNull) {
        const asserted = assertedMember(left, callHead, ctx, undefined);
        if (asserted !== undefined) {
          const call = projectNode(unit, ctx);
          left = Object.assign({}, call, { expression: asserted, pos: asserted.pos });
          i += 1;
          continue;
        }
        // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a!()!()` 的产物是
        // `[NotNull(a, !), Method(name=""[NotNull(Bracket(()), !), Bracket(())])]`——
        // 那个 `NotNull` 的核是**实参括号**（不是名字），`assertedMember` 只认名字 ⇒ 给
        // `undefined`；照下面那条「被调用者就是 `left`」的路折又只折出一层
        //（实测 `gap-r964-nonnull-call-assert-call`：缺两个 `CallExpression`、
        //  `NonNullExpression` 的区间只到 `a!`）。
        // **判据与别的几处一字不差**：`Method` 比它那个实参括号更靠右 ⇒ 外面还有一层。
        const assertKids = callHead.ProjectableKids.filter(
          (k: any) => !k.IsNotNullSymbol,
        );
        const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
        if (assertHead !== undefined && assertHead.IsParenBracket) {
          const innerCall: any = {
            kind: "CallExpression",
            expression: left,
            arguments: callArgumentsOf(assertHead, ctx),
            pos: left.pos,
            end: endOf(assertHead),
          };
          const assertedCall: any = {
            kind: "NonNullExpression",
            expression: innerCall,
            pos: innerCall.pos,
            end: endOf(callHead),
          };
          const outerCall = projectNode(unit, ctx);
          left = Object.assign({}, outerCall, { expression: assertedCall, pos: assertedCall.pos });
          i += 1;
          continue;
        }
      }
      if (bareName === "" && callHead !== undefined && callHead.IsMethodNode
        && String(callHead.DeclaredName) === "") {
        // **这一格盖着两层调用、而内层那一格的名字也是空的**（第 966 轮）：`a!()()` 的产物是
        // `[NotNull(a, !), Method(name=""[Method(name=""[Bracket(()), !]), Bracket(())])]`——
        // 内层 `Method(name="")` 本身就是**第一次调用**（它的核是那对实参括号），
        // 外层那一格是**第二次调用**。取名字那一支在这里会把 `""` 当成成员名 ⇒ 投出一格
        // 名字为空的属性访问（实测 `gap-r964-nonnull-call-twice-member`：整条链丢 4 格）。
        // 折法就是「各投各的」：内层 `projectNode(callHead)` 给出的**已经是**对 `left` 的
        // 一次调用，只需要把它的受体换成 `left`（它自己那格是空的、没人填），
        // 位置取 `left.pos`；外层再用 `projectNode(unit)` 套一层。
        const innerCall = Object.assign({}, projectNode(callHead, ctx), {
          expression: left,
          pos: left.pos,
        });
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.IsMethodNode
        && String(callHead.DeclaredName) !== "") {
        const innerName = String(callHead.DeclaredName);
        const innerAt = startOf(callHead);
        const innerMember: any = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: innerName, pos: innerAt, end: innerAt + innerName.length },
          pos: left.pos,
          end: innerAt + innerName.length,
        };
        const innerCall = Object.assign({}, projectNode(callHead, ctx), {
          expression: innerMember,
          pos: innerMember.pos,
        });
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.IsParenBracket && endOf(callHead) < endOf(unit)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: callArgumentsOf(callHead, ctx),
          pos: left.pos,
          end: endOf(callHead),
        };
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName !== "") {
        const at = startOf(unit);
        const member: any = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: bareName, pos: at, end: at + bareName.length },
          pos: left.pos,
          end: at + bareName.length,
        };
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: member,
          pos: member.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
    }
    // **这一格自己就是一条子链、而前面没有点号**（第 973 轮，**普查当场红的**）：
    // `a?.b![0].c` 的 NCO 里第二格是 `PropertyAccess([Bracket([0]), Identifier(c)])`——
    // `chainWithOptional` 的 `NotNull` 那一支折出断言之后，把剩下的 `[那一格]` 交给这里；
    // 可子链那一支原来住在下面 `IsDotSymbol` 那一段**里面** ⇒ 这一格既不是点号、也不是下标括号 /
    // 圆括号 / `Method`，循环在它前面就 `break` ⇒ **整格丢**（实测
    // `gap-r971-opt-assert-index-member`：缺 3 漂 1）。抬出来之后这一格照子链折，
    // 跨过的格子数是 **1**（没有点号要跨），`pendingBang` 那两格照旧。
    const dotStep = unit.IsDotSymbol && i + 1 < units.length;
    const loneSubChain = dotStep === false && unit.IsPropertyAccess;
    if (dotStep === false && loneSubChain === false) break;
    // **点号后面那一格可能自带一个 `!`**（第 333 轮）：`o?.a!.b!` 的 NCO 里是
    // `[NotNull(a), ., NotNull(b)]`——那个 `!` 与成员名**在同一格里**
    //（token 层把「名字 + 非空断言」折成了一个 `NotNull`）。
    // **不拆开的话**：下面那三支都不认 `NotNull` ⇒ 落到最后那个 `else` ⇒
    // 读 `NotNull.NameNode` 会把整段「名字 + `!`」当成**一个名字**
    //（实测：多出一个 `Identifier` 值叫 `"b!"`、`NonNullExpression` 与
    // `PropertyAccessExpression` 各漂 2），运行期于是给 `undefined`
    //（`+ 1` 变成 `NaN`——**静默错值**，判据 `c305-ex-optional-chain-nonnull-mix`）。
    //
    // **次序是语义**：先把**成员**接上，再把 `!` 套在**整条链**上
    //（TS 是 `NonNull(PropertyAccess(…, b))`，不是「名字叫 `b!`」）。
    let bangUnit: any = undefined;
    let next = dotStep ? units[i + 1] : unit;
    // **断言该盖到哪一格**（第 966 轮）：`a?.b!.c.d` 里那条子链（`PropertyAccess([c, ., d])`）
    // 接的是**断言之后**那一条链，而「把 `!` 套上去」这件事发生在**子链分支内部**——
    // 那里需要知道终点在哪，`bangEnd` 就是那一格 `NotNull` 自己的末端。
    let bangEnd: number | undefined = undefined;
    if (next.IsNotNull) {
      bangUnit = next;
      bangEnd = endOf(bangUnit);
      const inner = next.ProjectableKids.filter(
        (k: any) => !k.IsNotNullSymbol,
      );
      if (inner.length === 0) break;
      next = inner[0];
    }
    if (next.IsMethodNode) {
      const name = String(next.DeclaredName);
      // **被调用者自己带 `!`**（第 852 轮）：`a?.b!.c!()` 里 `.c!()` 那一格是
      // `Method(name="")[NotNull(c, !), Bracket]`——断言套在**接上 `c` 之后**的那条链上，
      // 调用在最外面。按名字折会投出名字为空的属性访问（实测三处漂），
      // 所以这一档交给 `assertedMember`。与上面 `chainWithOptional` 那一处同形同修。
      if (name === "") {
        const calleeKid = next.ProjectableKids.filter(
          (k: any) => k.IsGenericType === false,
        )[0];
        if (calleeKid !== undefined && calleeKid.IsNotNull) {
          const asserted = assertedMember(left, calleeKid, ctx, undefined);
          if (asserted !== undefined) {
            const call = projectNode(next, ctx);
            left = Object.assign({}, call, { expression: asserted, pos: asserted.pos });
            i += 2;
            continue;
          }
        }
        // **被调用者是内层那一格 `Method`**（第 962 轮）：与上面 `chainWithOptional`
        // 那一处**同形同修**（第 366 轮立的两步走）——`a?.b.c()()` 里 `.c()()` 那一格是
        // `Method(name="")[Method(name="c")]`，先把内层折成成员调用、再把外层那次调用套上去；
        // 少了它，那一格会落到下面「按成员名折」⇒ 投出一个**名字为空**的属性访问。
        if (calleeKid !== undefined && calleeKid.IsMethodNode) {
          // **折法与 `chainWithOptional` 那一处、以及本函数 Method 分支一字不差**
          //（第 975 轮收拢）：最里面那一格用 `innermostMethod`、被调用者用
          // `innermostCallee`、换法用 `graftCallee`。
          const innerCall = graftCallee(
            projectNode(calleeKid, ctx),
            innermostCallee(left, innermostMethod(calleeKid), ctx),
            undefined,
          );
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos });
          i += 2;
          continue;
        }
        // **被调用者是 `left`、而这一格盖着两层调用**（第 962 轮）：判据与另外两处
        // 一字不差——`Method` 比它那个实参括号**更靠右**，说明外面还有一层调用。
        if (calleeKid !== undefined && calleeKid.IsParenBracket && endOf(calleeKid) < endOf(next)) {
          const innerCall: any = {
            kind: "CallExpression",
            expression: left,
            arguments: callArgumentsOf(calleeKid, ctx),
            pos: left.pos,
            end: endOf(calleeKid),
          };
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos });
          i += 2;
          continue;
        }
      }
      const at = startOf(next);
      const member = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
        pos: left.pos,
        end: at + name.length,
      };
      const call = projectNode(next, ctx);
      left = Object.assign({}, call, { expression: member, pos: member.pos });
    } else if (next.IsPropertyAccess) {
      // 成员格自己又是一条链单元（`[Start, NCO(Document)]`）：逐格接上去。
      const members = next.ProjectableKids;
      // **断言还没套上去的话，它盖到哪一格由 `bangEnd` 给**（第 966 轮）：
      // `a?.b!.c.d` 里 `!.` 之后那条子链接的是断言之后那一条链（TS：`((a?.b)!).c.d`），
      // 所以「先把 `!` 套成 `NonNullExpression`、再接子链的第一格」——套上去的位置就是
      // 那一格 `NotNull` 的末端。`a?.b!.c` 那条子链只有一格名字时由循环末尾那句补上。
      let pendingBang: number | undefined = bangUnit !== undefined ? bangEnd : undefined;
      let j = 0;
      while (j < members.length) {
        const member = members[j];
        if (member.IsNullConditionalOperator) {
          left = chainWithOptional(left, member, ctx);
          j += 1;
          continue;
        }
        if (member.IsDotSymbol && j + 1 < members.length) {
          // **上一次断言还没套上去就先套**（第 966 轮）：`a?.b!.c.d` 的 NCO 是
          // `[NotNull(b), ., PropertyAccess([c, ., d])]`——第二格那条子链**自己从 `c` 开头**，
          // 而它整个要接的受体是**断言之后**那一条链。
          // 原来那句同名赋值从来没写 ⇒ 断言压在手上、直接拿 `c` 去接 ⇒ 投出来的是
          // `a?.b!.d`（`.c` 整段丢，实测 `gap-r964-opt-assert-member-member`：
          // `PropertyAccessExpression` 与 `Identifier` 各漂）。折法与
          // `chainWithOptional` 的成员循环**一字不差**：接第一格之前先把 `!` 套成
          // `NonNullExpression`，`?.` 仍然挂在**内层**那一格上。
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
          }
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: members[j + 1].NameNode,
            pos: left.pos,
            end: endOf(members[j + 1]),
          };
          j += 2;
          continue;
        }
        // **子链自己从一个名字开头**（第 971 轮，**普查当场红的**）：`a?.b!.c.d` 的 NCO
        // 第二格是 `PropertyAccess([c, ., d])`——**第一格就是成员名 `c`**，这条子链不是
        // 从点号开头的。上面那一支只认「点号 + 名字」那种成对形状，落单的第一格走到循环
        // 末尾那句空转的 `j += 1` ⇒ **`c` 整格丢、`.d` 直接接在断言后面**：投出来的是
        // `a?.b!.d`（实测 `gap-r964-opt-assert-member-member`：`PropertyAccessExpression`
        // 与 `Identifier` 各漂 2，`Identifier` 是那个 `d` 顶着 `c` 的位置）。
        // 折法与 `chainWithOptional` 子链分支末尾那句**一字不差**（名字接一格），
        // 顺序也一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.IsNameNode) {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: member.NameNode,
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        // **这一格自己是一次（或好几层）调用**（第 975 轮）：`a?.b!()()().c` 那条子链的
        // 第一格是 `Method(name=""[Method(name=""[Bracket(())])])`——子链循环里原来只有
        // 「名字」「下标」两支，`Method` 落到循环末尾那句空转的 `j += 1` ⇒ **三层调用整段丢**
        //（实测 `gap-r973-opt-assert-call-thrice-member`：缺 3）。
        // 折法与 `chainWithOptional` 子链分支那一支**同源**（第 975 轮收拢成同一对：
        // `innermostMethod` + `innermostCallee` + `graftCallee`）。
        // **核是 `NotNull` 的那一档让开**：它要按断言折（把 `!` 套在调用结果上），
        // 由 `chainWithOptional` / 本函数别处那几支管——这里只认「纯调用」那三种壳。
        const memberIsCall = (unit: any): bool => {
          const name = String(unit.DeclaredName);
          if (name !== "") return true;
          const inner = unit.ProjectableKids.filter((k: any) => k.IsGenericType === false);
          const head = inner.length > 0 ? inner[0] : undefined;
          if (head === undefined) return false;
          return head.IsMethodNode
            || (head.IsParenBracket);
        };
        if (member.IsMethodNode && memberIsCall(member)) {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = graftCallee(
            projectNode(member, ctx),
            innermostCallee(left, innermostMethod(member), ctx),
            undefined,
          );
          j += 1;
          continue;
        }
        // **一对平级的圆括号也是链上的一格**（第 975 轮）：`a?.b![0]().c` 那条子链的
        // 第一格是 `Bracket(())`——它是**对左边那个结果再调一次**（与 `chainOnto` 顶端
        // 「紧跟一对圆括号 ⇒ 再调一次」那一支同一件事）。子链循环里原来只有「下标」那一支
        // ⇒ 圆括号落到循环末尾那句空转的 `j += 1` ⇒ **那次调用整格丢**
        //（实测 `gap-r973-opt-assert-index-call-member`：缺 1）。
        // 顺序与上面两支一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.IsParenBracket) {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "CallExpression",
            expression: left,
            arguments: callArgumentsOf(member, ctx),
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        // **下标括号也是链上的一格**（第 973 轮）：`a?.b![0].c` 那条子链的第一格是
        // `Bracket([0])`——`chainWithOptional` 的子链分支里早就有这一支，而这里没有：
        // 它落到循环末尾那句空转的 `j += 1` ⇒ **下标整格丢**（实测
        // `gap-r971-opt-assert-index-member`：缺 `ElementAccessExpression` / `NumericLiteral`）。
        // 折法与 `chainWithOptional` 子链分支里那一支**一字不差**（同一形状、同一个判据），
        // 顺序也一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.IsIndexBracket) {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "ElementAccessExpression",
            expression: left,
            argumentExpression: projectExpression(member.ProjectableKids, ctx),
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        j += 1;
      }
      // **子链吃完还没用掉的那个断言，仍然要套在整条链上**（第 966 轮）：
      // `a?.b!.c` 那条子链只有一格名字（不是 `c.d`）时，`IsDotSymbol` 那一支不会响，
      // 断言就留在这里——不补这一句它整格丢。
      if (pendingBang !== undefined) {
        left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: pendingBang };
      }
    } else {
      left = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: next.NameNode,
        pos: left.pos,
        end: endOf(next),
      };
    }
    // **那一格自带 `!` 的话，断言套在整条链上**（见上面那一段）。
    if (bangUnit !== undefined) {
      left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(bangUnit) };
    }
    // **跨过几格**：点号那一档是「点号 + 成员」两格；抬出来的那一档（`unit` 自己是子链）
    // 只有 **1** 格（第 973 轮）。
    i += dotStep ? 2 : 1;
  }
  return left;
```

# private method foldBinaryFrom:(left:any, rest:Array<any>, ctx:any)=>any

从 `left` 起、把 `rest`（以运算符开头、`[op, 操作数, op, 操作数, …]`）折成 `BinaryExpression`。

**结合性按 TS**（第 88 轮）：**赋值是右结合**（`a = b = c` ⇒ `a = (b = c)`），
**其余二元运算符是左结合**（`a && b && c` ⇒ `(a && b) && c`）。原来一律右结合，
于是整条链的区间一路撑到最后一个操作数——实测 `DRIFT: BinaryExpression` 657 与
「多出来」654 全是这一族（`error !== null && error !== undefined && …` 那种四段逻辑链，
产物的四个节点起点是四个操作数，而 TS 的四个节点**都从第一个操作数起**、终点逐个增长）。

左结合那一支折的时候，每一段的右操作数**取到下一个同级（或更低优先级）运算符为止**——
更高优先级的那些（`a || b && c` 里的 `&&`）留给 `projectExpression` 自己切。

```ts
  // **运算符不一定是 `SymbolToken`**（第 131 轮）：`in` / `instanceof` 是 `Keyword`
  // （`#x in o` 的 `in` 就是），与 `projectExpression` 里那条 `IsOperatorUnit` 同一口径。
  if (rest.length < 2 || !rest[0].IsOperatorUnit) return left;
  const firstRank = rest[0].OperatorRank;
  if (firstRank === 0) {
    // 赋值：右结合，交给递归。
    //
    // **但逗号比赋值更松**（第 180 轮）：`a = 1, a = 2` 的 TS 形状是
    // `BinaryExpression( BinaryExpression(a = 1), «,», BinaryExpression(a = 2) )`——
    // 赋值的**右操作数只到下一个顶层逗号为止**。
    // 少了这一格，右操作数会把逗号一起吃掉：实测 `(a = 1, a = 2)` 投成
    // `a = (1, a) = 2`（降级层于是报 `assignment to a non-identifier`，
    // 而**形状这一层**错得更早——`cases:tsast` 一量就红）。
    let commaAt = rest.length;
    for (let k = 1; k < rest.length; k++) {
      // **逗号那一格自己答**（第 1074 轮）：见 `SymbolToken.IsCommaSymbol`。
      if (rest[k].IsOperatorUnit && rest[k].IsCommaSymbol === true) {
        commaAt = k;
        break;
      }
    }
    let right = projectExpression(rest.slice(1, commaAt), ctx);
    // **复合赋值**（第 96 轮）：token 层把 `a += 2` 展开成 `a = a + 2` 那一串（为执行层留一份
    // 可单独取出的运算符），所以这里看到的是「`=` + 一个 `BinaryOperator`」。TS 那边是**一个**
    // `BinaryExpression`、运算符是 `PlusEqualsToken`、右操作数是 `2`（不是 `a + 2`）。
    // 判据落在**原文**上：那个 `=` 单元的区间盖住的是 `+=` 这种两三个字符。
    // 照原样投会多出 `EqualsToken` + `PlusToken`、又缺那个复合 kind（实测 134 + 94）。
    // **原文读这一格自己的 `Text`**（第 1053 轮）：`ctx.source.slice(startOf(x), endOf(x))`
    // 与 `x.Text` 是同一段（它走自己 `SourceRange` 两头带着的那份 `Document`），
    // 而后者不必把投影手上那个字符串再切一遍——「这一格的正文由这一格自己答」（第 1048 轮）。
    const opText = rest[0].Text;
    const operatorToken =
      opText === rest[0].TextValue
        ? projectNode(rest[0], ctx)
        : { kind: SymbolToken.KindOfText(opText), text: opText, pos: startOf(rest[0]), end: endOf(rest[0]) };
    // **递归剥掉最左边那个 `left`**（第 168 轮）：展开式的左操作数**不只是那个左值**——
    // `a += b + c` 的产物是 `a = (a + b) + c`（token 层展开时把 `a` 埋进了内层），
    // 而 TS 要的是 `a += (b + c)`。原来只认「`right.left` 与 `left` 完全同区间」，
    // 这一族于是根本没被拆开（实测 `ex-chained-assign.ts` / `expr-assign-chained-compound.ts`：
    // 多出 `BinaryExpression` + `PlusToken`，缺真正的右操作数）。
    const stripSelf = (node) => {
      if (node === undefined || node.kind !== "BinaryExpression" || node.left === undefined) {
        return undefined;
      }
      if (node.left.pos === left.pos && node.left.end === left.end) {
        return node.right;
      }
      const stripped = stripSelf(node.left);
      if (stripped === undefined) {
        return undefined;
      }
      return { ...node, left: stripped, pos: stripped.pos, end: node.end };
    };
    // **后缀壳要能穿透**（第 290 轮）：`u += 2 as number` 的展开式是
    // `u = (u + 2) as number`（`As` 是**语句级**最后一个单元），
    // 而 TypeScript 要的是 `u += (2 as number)`——`as` 贴的是**复合赋值右操作数**那一段
    //（实测 `ts.createSourceFile`：`BinaryExpression(u, «+=», AsExpression(2))`）。
    // 原来的剥自己那一格只认**最外层就是 `BinaryExpression`**
    // ⇒ 包着壳时一格都没剥 ⇒ 下游拿到 `u += (u + 2)` ⇒ **静默错值**
    //（`total += xs.shift() as number` 实测从 499500 变成 `1.07e+301`）。
    // 判据：壳（`As` / `Satisfies` / `!`）里那一格剥完，壳**照原样罩回去**；
    // 壳里剥不动就整个不动（`u += (2 as number)` 那一格本来就没问题）。
    const stripSelfThrough = (node) => {
      if (node === undefined) return undefined;
      if (node.kind === "AsExpression" || node.kind === "SatisfiesExpression" || node.kind === "NonNullExpression") {
        const inner = stripSelfThrough(node.expression);
        if (inner === undefined) return undefined;
        return { ...node, expression: inner, pos: inner.pos };
      }
      return stripSelf(node);
    };
    // 壳里那一格是什么（只看形状，不动它）——用来核对「是不是同一个复合运算符」。
    const coreOf = (node) => {
      if (node === undefined) return undefined;
      if (node.kind === "AsExpression" || node.kind === "SatisfiesExpression" || node.kind === "NonNullExpression") {
        return coreOf(node.expression);
      }
      return node;
    };
    // **左嵌套的复合赋值展开**（第 168 轮）：`a += b -= c` 的产物是
    // `[a, «+=», HEAD(二元: a ⊕ b), «-=», TAIL(二元: (a ⊕ b) ⊖ c)]`——token 层把 `a`
    // 埋进了最左边那一格，于是通用递归拿到的左操作数是 `a ⊕ b` 而不是 `b`
    // （实测 `ex-chained-assign.ts` / `expr-assign-chained-compound.ts`：
    // 多出一个 `BinaryExpression(a += b)` + `PlusToken`，缺 `b -= c`）。
    // TS 那边是 `a += (b -= c)`。形状很窄（正好五格、两个二元单元、两个 `=` 单元），
    // 就在这里显式重建：把 TAIL 里最左边那个左值剥掉，内层用第二个 `=` 上的复合运算符。
    if (
      opText.length > 1 &&
      rest.length === 4 &&
      (rest[1].IsBinaryOperatorNode) &&
      (rest[3].IsBinaryOperatorNode) &&
      rest[2].IsEqualsSymbol &&
      rest[2].Text.length > 1
    ) {
      const tailNode = projectNode(rest[3], ctx);
      const strippedTail = tailNode === undefined ? undefined : stripSelf(tailNode);
      if (
        strippedTail !== undefined &&
        strippedTail.kind === "BinaryExpression" &&
        strippedTail.left !== undefined
      ) {
        const innerText = rest[2].Text;
        const inner = {
          ...strippedTail,
          operatorToken: {
            kind: SymbolToken.KindOfText(innerText),
            text: innerText,
            pos: startOf(rest[2]),
            end: endOf(rest[2]),
          },
          pos: strippedTail.left.pos,
        };
        return {
          kind: "BinaryExpression",
          left,
          operatorToken,
          right: inner,
          pos: left.pos,
          end: inner.end,
        };
      }
    }
    if (
      opText.length > 1 &&
      right !== undefined &&
      coreOf(right) !== undefined &&
      coreOf(right).kind === "BinaryExpression" &&
      coreOf(right).left !== undefined &&
      // 展开出来的那个运算符单元**沿用同一个区间**（`+=` 的 [2,4)），所以判据看 kind、不看区间。
      coreOf(right).operatorToken !== undefined &&
      coreOf(right).operatorToken.kind === SymbolToken.KindOfText(opText.slice(0, -1))
    ) {
      const stripped = stripSelfThrough(right);
      if (stripped !== undefined) {
        right = stripped;
      }
    }
    const assigned = {
      kind: "BinaryExpression",
      left,
      operatorToken,
      right,
      pos: left.pos,
      end: right ? right.end : endOf(rest[0]),
    };
    // **剩下的那一串逗号接着折**（左结合，`a = 1, b = 2, c = 3` 折成三层）。
    if (commaAt < rest.length) return foldBinaryFrom(assigned, rest.slice(commaAt), ctx);
    return assigned;
  }
  // **从 `at` 起是不是一个「平的尖括号断言」**（`<T>操作数`）：是的话返回它有多长，
  // 不是就返回 `0`（第 379 轮；第 1104 轮从本页那一格 helper 就地搬进这里——
  // 全仓只有下面那一处真实调用点，而且是**两次问同一格**）。
  //
  // `x < <number>y` 里的第二个 `<` 在产物里是**平的符号**（它不在表达式的最开头，
  // 所以 token 层没把它收成 `GenericType`——第 379 轮把「运算符之后」那一档也放行了，
  // 于是现在多半已经收起来了，可**收不起来的那些**（后继闸没过）仍然会走到这里）。
  // 把它当成比较运算符就会切出空的右操作数 ⇒ 折出一个没有 `right` 的节点。
  //
  // **判据只看形状**：`<`、配对到 `>`、`>` 后面**还有一格操作数**（前缀运算符可以连着几格）。
  // **「这个 `<` 前面有没有左操作数」由调用方判**（那一格信息只有它手上有）。
  const angleAssertionLength = (kids: Array<any>, at: int): int => {
    if (at >= kids.length) {
      return 0;
    }
    const opener = kids[at];
    // **两半都收成这一格**（第 1120 轮）：原来写的是 `opener.IsSymbolToken === false ||
    // opener.TextValue !== "<"`——前半句给非符号用的，可 `IsLessThanSymbol` 在那几页
    // 本来就答 `false`（基类默认档），所以只读这一格逐格等价。
    if (opener.IsLessThanSymbol !== true) {
      return 0;
    }
    let depth = 0;
    let close = -1;
    for (let i = at; i < kids.length; i++) {
      // **同一把尺子的第二处**（第 1139 轮）：这一趟的现场写法与 `projectExpression`
      // 尖括号断言那一趟逐字相同，两头同样收成属性读（见那一处的说明）。
      const one = kids[i];
      if (one.IsLessThanSymbol) {
        depth += 1;
      } else if (one.IsGreaterThanSymbol) {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    // **`<T>` 里至少要有一样东西，后面至少要跟着一格操作数**（`< > x` 那种空段不算）。
    if (close <= at + 1 || close + 1 >= kids.length) {
      return 0;
    }
    let operandEnd = close + 1;
    while (operandEnd < kids.length && kids[operandEnd].IsPrefixOperatorUnit) {
      operandEnd += 1;
    }
    if (operandEnd >= kids.length) {
      return 0;
    }
    return operandEnd + 1 - at;
  };
  let node = left;
  let i = 0;
  while (i + 1 < rest.length) {
    const op = rest[i];
    // **运算符也可能是 `Keyword`**（第 131 轮）：`in` / `instanceof` 都是
    // （`#x in o` 的 `in`），只认 `SymbolToken` 会当场 `break`，运算符与右操作数一起丢。
    if (!op.IsOperatorUnit) break;
    const rank = op.OperatorRank;
    // 下一个「同级或更低优先级」的运算符就是这一段的终点。
    let stop = rest.length;
    for (let k = i + 1; k < rest.length; k++) {
      // **尖括号断言那一组不是运算符**（第 379 轮）。
      //
      // `x < <number>y` 与 `<number>a < <number>a` 里都有「一个 `<` 起的是**断言**」——
      // 把它当成比较运算符就会在这一格切段 ⇒ 右操作数是**空的**
      // ⇒ 折出一个**没有 `right` 的 `BinaryExpression`**，降级层报
      // `ast node BinaryExpression has no child right`（**形状层的内部错误**，
      // 比「读错了值」更难查）。
      //
      // **只在操作数位置上认**：`k` 前面那一格是运算符（或它就是这一段的第一格）
      // ⇒ 这个 `<` 前面**没有左操作数** ⇒ 只可能是断言。
      // 比较式 `a < b < c` 的第二个 `<` 前面是 `b`（一个名字）⇒ 这里不跳，照旧切段。
      // **这一格只问一次**（第 1104 轮）：原来连着问两遍同一格（判据 + 跳长），
      // 现在是搬进来的那份实现在这里读一次。
      const assertion = angleAssertionLength(rest, k);
      if ((k === 0 || rest[k - 1].IsOperatorUnit) && assertion > 0) {
        k += assertion - 1;
        continue;
      }
      if (rest[k].IsOperatorUnit && rest[k].OperatorRank <= rank) {
        stop = k;
        break;
      }
    }
    const right = projectExpression(rest.slice(i + 1, stop), ctx);
    node = {
      kind: "BinaryExpression",
      left: node,
      // **运算符那一格的 kind 由那一格自己答**（第 550 轮起、第 1106 轮收成属性读）：
      // `in` / `instanceof` 在深度界那一层还是 `Identifier`，它答的
      // `OperatorWordKind` 与 `Keyword` 那一态答的是同一个名字。
      operatorToken: ctx.OperatorNode(op),
      right,
      pos: node.pos,
      end: right ? right.end : endOf(op),
    };
    i = stop;
  }
  return node;
```

# private method projectLetFrom:(kids:Array<any>, ctx:any, container:any)=>Array<any>

`let` 声明的**单元列表版**：列表本身才是主角，`Statement` 那层壳由调用方决定。

这样拆是因为 `for (let i = 0; …)` 的头部**没有** `Statement` 壳：
产物那边 `For.initial` 是一段单元 `[Let, SymbolToken(=), 初始化式]`，
而 TS 那边 `ForStatement.initializer` **直接就是 `VariableDeclarationList`**（不套 `VariableStatement`）。
早先按单个 `Let` 投，看不到初值——`List` / `Declaration` 各短 4 个字符（实测 Δ-4）。

```ts
  // **就地取**（第 1109 轮）：它原来是本页一格 `bindingSpan(from, limit, ctx)`（读者只有
  // 本函数里那两处解构分支），按第 1103 / 1104 轮那把尺子整段搬进这个调用点，
  // 本页少一格声明。取不到时给一个零宽占位（宁可窄，不要凭空盖住整条声明）。
  const bindingSpanOf = (from: int, limit: int, ctx: any): any => {
    const source = ctx.source;
    for (let i = from; i < limit; i++) {
      const ch = source[i];
      if (ch !== "[" && ch !== "{") continue;
      const close = ch === "[" ? "]" : "}";
      let depth = 0;
      for (let j = i; j < limit; j++) {
        if (source[j] === ch) depth++;
        else if (source[j] === close) {
          depth--;
          if (depth === 0) {
            return { kind: ch === "[" ? "ArrayBindingPattern" : "ObjectBindingPattern", pos: i, end: j + 1 };
          }
        }
      }
      break;
    }
    return { kind: "ArrayBindingPattern", pos: from, end: from };
  };
  // 外层容器只用来取「语句整体」的区间（`Statement` 含分号、`For` 的段不含）。
  const stmtWhole = stmtEndOf(container, ctx);
  const stmtEnd = ctx.source[stmtWhole - 1] === ";" ? stmtWhole - 1 : stmtWhole;
  const letNode = kids.find((k) => k.IsLetUnit) ?? null;
  // **多声明符**（第 93 轮）：`let a = 1, b = 2` 在 TS 里是**两个 `VariableDeclaration`**
  // （同一个 `VariableDeclarationList.declarations` 的两格），而产物只有一段平铺单元。
  // 顶层逗号就是那个分隔符——`f(x, y)` / `[a, b]` / `{ a: 1 }` / `T<A, B>` 里的逗号都在
  // 各自的单元**里面**，不会出现在这一层。
  const groups = [];
  let group = [];
  for (const k of kids) {
    // **逗号那一格自己答**（第 1074 轮）：见 `SymbolToken.IsCommaSymbol`。
    if (group.length > 0 && k.IsCommaSymbol === true) {
      groups.push(group);
      group = [];
      continue;
    }
    group.push(k);
  }
  if (group.length > 0) groups.push(group);
  // **尾部 trivia 要剪掉**（第 853 轮）：TS 的节点终点**从不含 trivia**，而产物常把尾随注释
  // 收进**最后一个单元里面**——`const f = (a, b) => a/*c*/;` 那条注释落在
  // `LamdaBody > Statement` 里，`Lamda` 自己的区间就盖到了注释末尾（实测 `[10,26)`，
  // 而 TS 的 `ArrowFunction` 是 `[10,21)`）⇒ 声明列表与声明各长出一截
  // （`gap-sweep-comment-arrow-01`：漂 2 多 2）。判据走 `stmtEndOf`——它就是投影层
  // 「节点终点不含尾部 trivia」的那一份实现（第 132 轮，投影出的每个节点都走它），
  // 这里不另写一份「往回吃注释」的循环。**收的就是这一格的 token 本身**。
  const listEnd =
    kids.length > 0 ? Math.min(stmtEnd, stmtEndOf(kids[kids.length - 1], ctx)) : stmtEnd;
  // **容器就是调用方手上那一格 token**（第 1018 轮）：`projectLet`（语句位）递的是那条语句的
  // 单元，`structuralProps`（`for (let i = 0; …)` 的头部）递的是那一段里的容器单元——
  // 两种调用点递进来的都是**同一个东西**（一个 token），所以这里不再分接收者。
  const containerView = container;
  const letView = letNode === null ? containerView : (letNode);
  // **列表起点直读 `letView.ListStart`**（第 1078 轮）：那一格是 `Let` 在**构造那一刻**
  // 按自己的 `modifiers` / `ModifierSpans` 算好并显式声明的字段（见 `tokens/let.xl.md`），
  // 所以投影这一侧只剩一次属性读。本页那一格 `modifierStart` 连同它唯一的那处调用一起删掉。
  const listStart = letView.ListStart;
  // **声明名那一格直读 `letView.DeclaredName`**（第 1068 轮）：`fieldName` 是 `Let` 自己
  // `NameField` 回答的那一格事实，而「名字在哪、问不到看哪」两跳都收进了 token 那一页
  // （`core/syntax/token.xl.md` 的 `DeclaredName`）——投影这一侧只读一个字符串属性。
  const declared = String(letView.DeclaredName);
  // **解构声明的名字用产物自己的那个 `ArrayLiteral` / `ObjectLiteral`**（踩过）：
  // 它们就是绑定模式（`ArrayLiteral[6,21]` 与 TS 的 `ArrayBindingPattern[6,22)` 逐格一致），
  // 里面还带着结构化的 `BindingElement`。早先我从源码括号里**另造了一个空壳**，
  // 于是 `elements` 空着、里面的 `BindingElement` 与名字全丢——`ObjectBindingPattern` /
  // `ArrayBindingPattern` 的字段名差异、以及 `BindingElement` 那一族的 `Identifier` 缺口都是它。
  // **绑定模式是 `Let` 的平级兄弟**（第 135 轮）：`const [[a, b], [, c = 0]] = …` 的产物是
  //
  //     Statement > [ Let(arrayPattern="a,b,c,0"), ArrayLiteral(带 BindingElement 的模式), =, ArrayLiteral(RHS) ]
  //
  // ——那个**结构化的** `ArrayLiteral` / `ObjectLiteral` 在 `Let` **外面**（`=` 的左边），
  // 而 `Let` 自己只记了一个扁平的 `arrayPattern="a,b,c,0"` 属性（嵌套与洞全丢）。
  // 早先只在 `Let` 的子单元里找，于是永远找不到、退回 `bindingSpan` 造一个空壳：
  // `elements` 空着、里面的 `BindingElement` 与名字整片丢
  // （实测 `decl-arr-destructure-nested` / `vars-destructure-nested` /
  // `decl-destructure-nested-names` 三族共 27 处）。所以先在**整段列表里 `=` 左边**找。
  const eqAt = kids.findIndex((k) => k.IsEqualsSymbol);
  const headKids = eqAt >= 0 ? kids.slice(0, eqAt) : kids;
  const isPatternUnit = (k: any) =>
    k.IsArrayLiteralUnit ||
    k.IsObjectLiteralUnit ||
    ((k.IsIndexBracket || k.IsBraceBracket));
  const patternUnit =
    headKids.find(isPatternUnit) ?? letView.ProjectableKids.find(isPatternUnit) ?? null;
  const name =
    patternUnit !== null
      ? projectBindingPattern(patternUnit, ctx)
      : declared === ""
        ? bindingSpanOf(listStart, listEnd, ctx)
        : synthName(declared, letView);
  // **每个声明符一个 `VariableDeclaration`**：第一组用 `Let` 自己的 `fieldName`（名字在那上面），
  // 后面的组名字就是组里第一格（`j = 1` 的 `j`）；类型标注取**本组**的 `TypeDefine`。
  const declarations = groups.map((one, index) => {
    const eq = one.findIndex((k) => k.IsEqualsSymbol);
    // **初始化式是 `=` 右边**整段**，不是一格**（第 101 轮）：`const a = this.Parent!.Data.indexOf(this)`
    // 的右边在产物里是**四个平级单元**（`NotNull` / `.` / `PropertyAccess` / …），
    // 原来只取第一格——于是整条链只剩最前面那个 `NotNull`，链尾全丢
    // （实测 `NonNullExpression` 多出 71 + 漂移 76、`DotToken` 多出 75、`PropertyAccessExpression`
    // 漂移 24 都是它）。
    const initKids = eq >= 0 ? one.slice(eq + 1) : [];
    const initializer = initKids.length === 0 ? undefined : projectExpression(initKids, ctx);
    const head = one[0];
    const oneName =
      index === 0
        ? name
        : head === undefined || (!head.IsNameNode)
          ? bindingSpanOf(head === undefined ? listStart : startOf(head), listEnd, ctx)
          : projectNode(head, ctx);
    const declaration = {
      kind: "VariableDeclaration",
      name: oneName,
      initializer,
      pos: oneName.pos,
      // **同一个口径**（第 853 轮）：声明自己的终点是「这个声明符**最后一个单元**的终点」，
      // 而那一格里面可能含着尾随注释——剪法与上面 `listEnd` 一字不差（`stmtEndOf`）。
      end: one.length > 0 ? Math.min(stmtEnd, stmtEndOf((one[one.length - 1]), ctx)) : listEnd,
    };
    // **类型标注是声明的一部分，但它在 `Statement` 那一层**：`let a: string;` 的产物是
    // `Statement > [Let(``let a``), TypeDefine(``: string``)]`——`TypeDefine` 是 `Let` 的**兄弟**，
    // 不在 `Let` 里面（`Field` 那种才在自身里面）。TS 那边 `VariableDeclaration[4,13)` = `a: string`。
    const typeNode = one.find((k) => k.IsTypeUnit);
    if (typeNode !== undefined) declaration.type = ctx.Project(typeNode);
    // **明确赋值断言 `let a!: number`**（第 156 轮）：TS 那边是
    // `VariableDeclaration.exclamationToken`（`!` 是一个子节点），产物把它记成一个平级的
    // `SymbolToken("!")`。不收的话缺 `ExclamationToken` + 字段名差一格
    // （实测 `vars-definite.ts`：`VariableDeclaration` 与 `PropertyDeclaration` 各一处）。
    const bang = one.find((k) => k.IsNotNullSymbol);
    if (bang !== undefined) declaration.exclamationToken = projectNode(bang, ctx);
    return declaration;
  });
  const list = {
    kind: "VariableDeclarationList",
    declarations,
    flags: letView.DeclarationListFlags,
    pos: listStart,
    end: listEnd,
  };
  // **起点跳过前导 trivia**（第 161 轮）：`/* a */ const x = 1;` 里那个 `Statement` 从注释起，
  // 而 TS 的 `VariableStatement.getStart()` 会跳过它（实测 `lex-comment-two-on-one-line.ts`：
  // 产物 106 vs TS 114）。
  const firstReal = kids.find((k) => k instanceof Token && !k.IsInvisible);
  const statementStart = firstReal === undefined ? container.start : startOf(firstReal);
  const statement = { kind: "VariableStatement", declarationList: list, pos: statementStart, end: stmtWhole };
  // **`VariableStatement` 的修饰词只有语句级那几个**：`export const q = 1` 的 TS 是
  // `VariableStatement(modifiers=[ExportKeyword])` + `List(flags=Const)`——
  // `const` / `let` / `var` 是**列表的 flags**，不是语句的修饰词（混进去会多出一个 `ConstKeyword`）。
  const holder = {};
  addModifiers(letView, holder);
  const statementModifiers = holder.modifiers ?? [];
  // **`await` / `using` 也不是语句修饰词**（第 151 轮）：它们是**列表的 flags**
  // （`VariableDeclarationList.flags = AwaitUsing`），挂到语句上会多出两个节点。
  const onlyStatementLevel = statementModifiers.filter(
    (m) => !["const", "let", "var", "await", "using"].includes(m.text),
  );
  if (onlyStatementLevel.length > 0) statement.modifiers = onlyStatementLevel;
  return { list, statement };
```

# private method projectBindingPattern:(unit:any, ctx:any)=>any

绑定模式：产物那边解构声明的括号段是 `ArrayLiteral` / `ObjectLiteral`，
而 TS 在**绑定位**叫 `ArrayBindingPattern` / `ObjectBindingPattern`（字段 `elements`）。

同一个产物标签在**值位**是 `ArrayLiteralExpression`（`[1, 2]`）、在**绑定位**是
`ArrayBindingPattern`（`const [a, b] = …`）——所以这里按上下文显式换 kind，
不走 `AstKind()`（那一格是值位的）。

```ts
  const v = unit;
  // **`projectBindingElement` 这一格第 1114 轮整格并进这一页**——第 1100 轮那一节自己写下的
  // 「下一轮按同一把尺子（一格声明、一个调用点且只是转手）再决定是否并进那一处」就是这一轮。
  // 判据与第 1103 / 1104 / 1109 / 1110 / 1111 / 1112 / 1113 轮同一把尺子：本页代码块里只有
  // **一个调用点**（下面元素循环里那一处），而且拿到的就是这一格返回的东西——**它不是死代码**
  //（第 1100 轮量过：`ctx.BindingPattern` 是**模式**那一格、由本函数答），只是多一层间接。
  // 算式一字不动，只把形参 `unit` 换成这一格的 `kid`。
  // 三种形态（都在产物里，逐个按标点切）：
  // | 源码 | TS 的子节点 |
  // | --- | --- |
  // | `a`（简写） | `name` |
  // | `p: q` | `propertyName`(`p`) + `name`(`q`) |
  // | `a = 1` | `name`(`a`) + `initializer`(`1`) |
  // | `...rest` | `dotDotDotToken`(`...`) + `name`(`rest`)——**两点号是子节点**（`forEachChild` 会访问它，
  // 第 93 轮修：早先按「属性」处理，实测 `BindingElement` 字段名差 8 处） |
  // **绑定元素 → `BindingElement`**（第 1114 轮并进来的那一格）……
  const projectBindingElementOf = (kid) => {
    const v = kid;
    const kids = v.ProjectableKids;
    const colonIndex = kids.findIndex((k) => k.IsColonSymbol);
    const eqIndex = kids.findIndex((k) => k.IsEqualsSymbol);
    const dots = kids.find((k) => k.IsDotDotDotSymbol);
    const names = kids.filter((k) => k.IsNameNode && !k.IsTypeSeparator);
    // **绑定位里还能再嵌一层模式**（第 135 轮）：`[[a, b], …]` 的元素是**另一个**
    // `ArrayLiteral` / `ObjectLiteral`（`{ b: [c, d = 2] }` 里 `:` 右边也是）。
    // 原来只找名字，`names` 为空时那个 `BindingElement` 连 `name` 都没有——
    // 嵌套的 `ArrayBindingPattern` / `ObjectBindingPattern` 与它们里面的名字整片丢
    // （实测三族嵌套解构用例共 27 处）。
    const isPatternLike = (k: any) =>
      k.IsArrayLiteralUnit ||
      k.IsObjectLiteralUnit ||
      ((k.IsIndexBracket || k.IsBraceBracket));
    // **默认值那一侧的括号不算绑定名**（第 355 轮，**实测撞到的**）：
    // `{ tags = [] as string[] }` 里 `=` **右边**那个 `[]` 是**默认值**（值位），
    // 而照「第一个像模式的单元」找会把它当成**绑定名** ⇒ 投出一个**没有 text** 的
    // `ArrayBindingPattern` ⇒ 降级期报 `ast node ArrayBindingPattern has no text`
    //（**那条消息原来不带区间**，第 355 轮才补上——补上之后一眼看出是哪个 `[]`
    // （`at 46..48`），**这一步省掉了一整轮插桩**）。
    // 判据与上面 `colonIndex` 那一支同一条纪律：**切分点左边才是名字**。
    const beforeEq = eqIndex >= 0 ? kids.slice(0, eqIndex) : kids;
    const patternKid = beforeEq.find(isPatternLike);
    const props = {};
    if (dots !== undefined) {
      props.dotDotDotToken = { kind: "DotDotDotToken", text: "...", pos: startOf(dots), end: startOf(dots) + 3 };
    }
    if (colonIndex >= 0) {
      // `p: q` / `p: [a, b]`：冒号左边是属性名、右边是绑定名（或一层模式）。
      // **左边也可能是一个计算名 `[k]: v`**（第 137 轮）：产物里它是 `ArrayLiteral` / `[` 括号，
      // TS 那边是 `ComputedPropertyName`（实测 `decl-binding-computed-key.ts` 缺
      // `ComputedPropertyName` 2 + `Identifier` 2 + 字段名 2）。
      const computedUnit = kids.find(
        (k) =>
          (k.IsIndexBracket || k.IsArrayLiteralUnit) && startOf(k) < startOf(kids[colonIndex]),
      );
      if (computedUnit !== undefined) {
        props.propertyName = {
          kind: "ComputedPropertyName",
          expression: computedNameExpression(computedUnit, ctx),
          pos: startOf(computedUnit),
          end: endOf(computedUnit),
        };
      } else {
        const before = names.find((k) => endOf(k) <= startOf(kids[colonIndex]));
        // **键是一个引号名**（第 693 轮，**实测撞到的**）：`const { "x": a } = o` 的键那一格
        // 是 `<String><ConstString>x</ConstString></String>`，而 `IsNameNode` 只认
        // `Identifier` / `Keyword` ⇒ 这一格**找不到键** ⇒ `propertyName` 整个丢掉，
        // 降级层随后把**绑定的名字**当成键（`{ "x": a }` 读成了 `{ a }`）
        // ⇒ `const { "x": a } = { x: 9 }` **静默给 `undefined`**（JS 给 `9`）。
        // 取法与 `specifierNameOf` 那条**一字不差**：引号名给 `StringLiteral`
        //（`text` 是引号里那段），其余读 `NameNode`——键的取法本来就只有这一种。
        // 位置与文本都直接问这一格单元自己（`startOf` / `endOf` / `StringText` 收的就是 token）。
        const quotedBefore = kids.find(
          (k) =>
            (k.IsStringLiteralUnit) &&
            endOf(k) <= startOf(kids[colonIndex]),
        );
        if (quotedBefore !== undefined) {
          props.propertyName = astNode(
            "StringLiteral",
            { text: quotedBefore.StringText },
            (quotedBefore),
            ctx,
          );
        } else if (before !== undefined) {
          props.propertyName = before.NameNode;
        }
      }
      // **冒号右边那一格**才是绑定名 / 嵌套模式；`[k2]: { a }` 里冒号**左边**那个
      // `ArrayLiteral` 是计算名（第 137 轮）——`patternKid` 取的是「第一个模式单元」，
      // 在这里会取错，所以要按**位置**重新找一次。
      const afterColon = kids.find(
        (k) => isPatternLike(k) && startOf(k) > startOf(kids[colonIndex]),
      );
      const afterPattern = afterColon;
      if (afterPattern !== undefined) {
        props.name = projectBindingPattern(afterPattern, ctx);
      } else {
        const after = names.find((k) => startOf(k) > startOf(kids[colonIndex]));
        if (after !== undefined) props.name = after.NameNode;
      }
    } else if (patternKid !== undefined) {
      props.name = projectBindingPattern(patternKid, ctx);
    } else if (names.length > 0) {
      props.name = names[0].NameNode;
    }
    if (eqIndex >= 0 && eqIndex + 1 < kids.length) {
      // **默认值不只是一格**（第 135 轮）：`[c, d = 2] = []` 里那个默认值是**一对括号**
      // （`ArrayLiteral`），照「取一格当叶子」投会把它当成 `Identifier("")`。
      const rest = kids.slice(eqIndex + 1);
      const only = rest.length === 1 ? rest[0] : undefined;
      props.initializer =
        only !== undefined && only.IsNameNode
          ? {
              // **kind 由这一格自己答**（第 1127 轮）：过去这里把这一格的正文拿去问
              // `Identifier.LeafKindOfText` 那张按文本查的表；能当一个名字的只有 `Identifier` 与
              // `Keyword` 两页（`IsNameNode`，第 1057 轮），两页各自显式声明了同一格 `LeafKind`、
              // 读自己的 `TextValue` 问同一份词汇表 ⇒ 与原来那一次静态调用逐字符同答。
              kind: only.LeafKind,
              text: only.TextValue,
              pos: startOf(only),
              end: endOf(only),
            }
          : projectExpression(rest, ctx);
    }
    return { kind: "BindingElement", pos: v.start, end: stmtEndOf(v, ctx), ...props };
  };
  // **括号形态也要认**（第 137 轮）：绑定位里 `{ a }` / `[a]` 有时还没被
  // `JsonObjectCloseRule` / `JsonArrayCloseRule` 收成 `ObjectLiteral` /
  // `ArrayLiteral`（`[k2]: { a }` 里右边那一格就是一对裸花括号）——只认那两种标签时
  // 整层 `ObjectBindingPattern` 连里面的 `BindingElement` 一起丢。
  const braceKind =
    v.IsArrayLiteralUnit || (v.IsIndexBracket)
      ? "ArrayBindingPattern"
      : "ObjectBindingPattern";
  const kind = braceKind;
  const elements = [];
  const kids = v.ProjectableKids;
  // **洞 `[, c]` 是一个零宽的 `OmittedExpression`**（第 135 轮）：TS 在元素表里留一格
  // 零宽节点（`ArrayBindingPattern.elements = [OmittedExpression, BindingElement]`），
  // 而产物那边只有一个逗号、什么都没有。**尾随逗号不算洞**（`[a, b,]` 只有两个元素）。
  const groups = [];
  const commaAts = [];
  let group = [];
  for (const kid of kids) {
    // **逗号那一格自己答**（第 1074 轮）：见 `SymbolToken.IsCommaSymbol`。
    if (kid.IsCommaSymbol === true) {
      groups.push(group);
      commaAts.push(startOf(kid));
      group = [];
      continue;
    }
    group.push(kid);
  }
  groups.push(group);
  let cursor = v.start + 1;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length === 0) {
      if (i === groups.length - 1) break;
      elements.push({ kind: "OmittedExpression", pos: cursor, end: cursor });
    } else {
      for (const kid of groups[i]) {
        if (kid.IsBindingElement) elements.push(projectBindingElementOf(kid));
      }
    }
    if (i < commaAts.length) cursor = commaAts[i] + 1;
  }
  return { kind, elements, pos: v.start, end: stmtEndOf(v, ctx) };
```

# private method functionTypeProps:(kids:Array<any>, ctx:any)=>any

**函数类型 / 构造类型那一格的 `{ kind, props }`**——`FunctionType.PrintAst`（`function-type.xl.md`）
与 `projectTypeExpression`（下面那一格的「平铺 `( … ) => T` 段」）**共用同一份**。

**为什么要把这一格搬到这里**（第 927 轮（三））：柯里化的函数类型在 token 层被整段收进
**同一个** `FunctionType` 节点（`function-type.xl.md` 的收集循环「`=>` 只在左边是形参表时继续」），
于是**返回类型**那一格交回类型投影时是**平铺**的 `Bracket` / `SymbolToken(=>)` / 类型 三格——
它得再投出**里层那个 `FunctionType`**。两处要的是同一件事，所以只留一份实现：
`PrintAst` 拿 `{ kind, props }` 去配 `NodeHead`（坐标来自它自己那个单元视图），
`projectTypeExpression` 拿同一份去配**这一段的起止**（第一格的起点到最后一格的终点）。

**返回的是 `{ kind, props }` 而不是节点**：坐标由调用方给（两边的坐标来源不同——
一个是视图、一个是平铺单元的起止），而 `kind` 与 `props` 逐字相同。

```ts
  const arrowIndex = kids.findIndex(
    (k: any) => k.IsArrowSymbol,
  );
  const before = arrowIndex < 0 ? kids : kids.slice(0, arrowIndex);
  const generic = before.find((k: any) => k.IsGenericType);
  const newUnit = before.find((k: any) => k.IsKeywordUnit && k.IsNewKeyword === true);
  const props: any = {};
  const params = [];
  for (const k of before) {
    if (k === generic || k === newUnit) continue;
    if (k.IsKeywordUnit && k.IsAbstractKeyword === true) {
      props.modifiers = [...(props.modifiers ?? []), projectNode(k, ctx)];
      continue;
    }
    if (k.IsBracketUnit) {
      for (const part of splitTopLevel(k.ProjectableKids, ",")) {
        for (const inner of part) params.push(inner);
      }
      continue;
    }
    params.push(k);
  }
  if (generic !== undefined) {
    const typeParams = generic.ProjectableKids.filter((k: any) => k.IsTypeParameterUnit);
    if (typeParams.length > 0) props.typeParameters = projectEach(typeParams, ctx);
  }
  props.parameters = projectEach(params, ctx);
  if (arrowIndex >= 0 && arrowIndex + 1 < kids.length) {
    props.type = typeOf(kids.slice(arrowIndex + 1), ctx);
  }
  return { kind: newUnit === undefined ? "FunctionType" : "ConstructorType", props };
```

# private method projectTypeExpression:(nodes:Array<any>, ctx:any)=>any

**类型表达式**：一段单元 → 一个类型节点。类型是可以嵌套的，所以这里必须递归。

实测 TS 的形状（`let a: Map<string, number>`）：

~~~
TypeReference[7,25)            ← `Map<string, number>`（**整个**）
  Identifier[7,10)             ← `Map`（**同一区间的第二层**）
  typeArguments: StringKeyword[11,16) NumberKeyword[19,24)
~~~

而产物那边是 `TypeDefine > [Identifier(Map), GenericType(<string, number>)]`——
`GenericType` 在那里的身份是**实参表**、不是节点。所以：

- 头是 `Identifier` / `Keyword`，后面跟一个 `GenericType` ⇒ `TypeReference` + `typeArguments`；
- 头是原始类型名 ⇒ **直接是关键字节点**（不套 `TypeReference`，见 `Identifier.PrimitiveTypeKindOf`，
  第 1032 轮起那份词汇住在叶子那一页）；
- 后面还跟一个 `ArrayType` ⇒ 再套一层 `ArrayType`（TS 的 `ArrayType` **从基名起**，
  而产物的 `ArrayType` 只盖住后缀那一段——所以要把它折上去）。

```ts
  // **就地取**（第 1111 轮）：它原来是本页一格 `absorbIntoTypeQuery(node, query, name)`
  // （读者**全在本函数里**，含它自己递归走链的那几处），做的事是「把一条类型链上的名字
  // 吸收进 `TypeQuery`」——按第 1103 / 1104 轮那把尺子整段搬进这个调用点，本页少一格声明。
  const absorbIntoTypeQueryOf = (node: any, query: any, name: any): any => {
    if (node === undefined || node === null) return undefined;
    // **最左边那一格名字**：接上 `name`（左边已经收好的限定名）折成 `QualifiedName`。
    if (node.kind === "Identifier") {
      query.exprName =
        name === undefined
          ? node
          : { kind: "QualifiedName", left: name, right: node, pos: name.pos, end: node.end };
      query.end = node.end;
      return query;
    }
    // **实参那一档**：`b<X>` 在产物里是一个 `TypeReference`（名字 + 实参段），
    // 实参属于 `TypeQuery`（与第 113 轮那条「点号名 + 类型实参」同一口径）。
    // **递归只管往左走到名字那一格**（它已经把 `query.exprName` 写好了），所以这里
    // **不能**把它的返回值再赋给 `exprName`——那个返回值就是 `query` 自己，
    // 赋值会当场造出一个自环（实测 `collectKinds` 报 `Maximum call stack size exceeded`）。
    if (node.kind === "TypeReference") {
      const absorbed = absorbIntoTypeQueryOf(node.typeName, query, name);
      if (absorbed === undefined) return undefined;
      if (node.typeArguments !== undefined) query.typeArguments = node.typeArguments;
      query.end = node.end;
      return query;
    }
    if (node.kind === "QualifiedName") {
      const left = absorbIntoTypeQueryOf(node.left, query, name);
      if (left === undefined) return undefined;
      node.left = left;
      node.pos = left.pos;
      return node;
    }
    if (node.kind === "IndexedAccessType") {
      const objectType = absorbIntoTypeQueryOf(node.objectType, query, name);
      if (objectType === undefined) return undefined;
      node.objectType = objectType;
      node.pos = objectType.pos;
      return node;
    }
    if (node.kind === "ArrayType") {
      // **`elementType` 在这一层是「一格数组」**（`ArrayType` 的 `PrintAst` 走 `ctx.Each`，
      // 实测 `type A = X[]` 的产物 JSON 是 `elementType:[{…}]`）——与上面 `TypeReference` /
      // `QualifiedName` 那几条「单个节点」不同，照单节点收会落到最后那句 `return undefined`
      //（`typeof a.b[K][]` 就是它：尾段是 `ArrayType(IndexedAccessType(b, K))`）。
      if (Array.isArray(node.elementType)) {
        const first = node.elementType[0];
        const absorbedElement = absorbIntoTypeQueryOf(first, query, name);
        if (absorbedElement === undefined) return undefined;
        node.elementType = [absorbedElement];
        node.pos = absorbedElement.pos;
        return node;
      }
      const elementType = absorbIntoTypeQueryOf(node.elementType, query, name);
      if (elementType === undefined) return undefined;
      node.elementType = elementType;
      node.pos = elementType.pos;
      return node;
    }
    return undefined;
  };
  // **只滤掉 `,`，`|` / `&` 留着**（第 133 轮）：逗号是类型实参表的分隔符（不是类型的
  // 一部分），而 `|` / `&` 是**类型运算符**——调用方直接递一列平铺单元时
  // （`projectTypeParameter` 把包住约束的 `UnionType` 摊开再拼回来就是这种），
  // 把 `|` 一并滤掉会让整条联合被当成「名字 + 实参」投成一个 `TypeReference`
  // （实测 `undici-types/header.d.ts` 的 `{ [K in HeaderNames | Lowercase<HeaderNames>]?: … }`）。
  const list = nodes.filter(
    (k) => k instanceof Token && !k.IsInvisible && !k.IsCommaSymbol,
  );
  if (list.length === 0) return undefined;
  // **平铺的 `( … ) => T` 段**（第 927 轮（三））：这一段是**里层的函数类型**——
  // 柯里化（`() => () => void`）与「返回类型自己是一段函数类型」的形状在 token 层被整段收进
  // **同一个** `FunctionType` 节点（见 `function-type.xl.md` 的收集循环），于是交到这里的
  // 是平铺的 `Bracket` / `SymbolToken(=>)` / 类型 三格。少了这一支，那个 `(` 会当成裸 `Bracket`
  // 投出去、`void` 整格不见（实测：缺里层 `FunctionType` + `VoidKeyword`、多一个 `Bracket`）。
  //
  // **必须排在联合 / 交叉那一支**前面**：`() => A | B` 在 TS 那边是
  // `FunctionType(type = UnionType[A, B])`（`=>` 比 `|` 松），先按 `|` 切就会拆成
  // `UnionType[FunctionType(() => A), B]`——两层的方向反了。
  const flatArrowAt = list.findIndex(
    (k, i) => i > 0 && k.IsArrowSymbol,
  );
  if (flatArrowAt > 0 && list[0].IsBracketUnit) {
    const built = functionTypeProps(list, ctx);
    return {
      kind: built.kind,
      pos: startOf(list[0]),
      end: endOf(list[list.length - 1]),
      ...built.props,
    };
  }
  // **平铺的联合 / 交叉**（第 133 轮）：见上。按**最外层**的分隔符切段、每段自己递归。
  //
  // **局部转手 `isTypeOp` 第 1120 轮删掉**：它问的是「这一格是不是那个 `|` / 那个 `&`」，
  // 两处调用点给的实参逐处量过只有这两个符号——于是两半各立一格（`SymbolToken` 那一页
  // 第 1120 轮显式声明 `IsPipeSymbol` / `IsAmpersandSymbol`，读时现算、读 `TextValue`），
  // 这一格连同它那半句 `IsSymbolToken` 一起收掉（`pipe` 那一格就是这一趟的谓词）。
  //
  // **为什么谓词由 `pipe` 那一格现拼、而不是把两个箭头函数摆进那张表**（第 1120 轮**实测**）：
  // 「`[(k: any) => k.IsPipeSymbol, "UnionType"], …] as Array<[(k: any) => bool, string]>`
  // 这一写法本身合法（`tsc` 干净、`node` 也跑得对），可**本仓的解析器在类型位读不了它**：
  // `as` 后面的类型实参里那个 `(k: any) => bool` 被投成 `ArrowFunction` + `EqualsGreaterThanToken`，
  // 而 TS 那边是 `FunctionType` + `TypeReference(bool)`——`cases:tsast` 当场两条缺、两条多
  // （语料里有本页自己的 dist 产物，所以这一页怎么写自己就是被测对象）。换成「表里放事实、
  // 谓词在循环里现拼」之后逐项回到 0/0。
  for (const [pipe, kind] of [
    [true, "UnionType"],
    [false, "IntersectionType"],
  ] as Array<[bool, string]>) {
    // `&` 比 `|` 紧：收 `|` 时可以穿过 `&`（`A | B & C` 是 `A | (B & C)`），反过来不行。
    const isThisOp = (k: any) => (pipe ? k.IsPipeSymbol : k.IsAmpersandSymbol) === true;
    const at = list.findIndex((k, i) => i > 0 && i + 1 < list.length && isThisOp(k));
    if (at <= 0) continue;
    const types = [];
    let start = 0;
    for (let i = 1; i < list.length; i++) {
      if (!isThisOp(list[i]) || i + 1 >= list.length) continue;
      const one = projectTypeExpression(list.slice(start, i), ctx);
      if (one !== undefined) types.push(one);
      start = i + 1;
    }
    const tail = projectTypeExpression(list.slice(start), ctx);
    if (tail !== undefined) types.push(tail);
    if (types.length > 1) {
      return { kind, types, pos: startOf(list[0]), end: endOf(list[list.length - 1]) };
    }
  }
  // **带符号的数字字面量类型**（第 124 轮）：`type X = -1 | 0 | 1` 的产物是
  // `LiteralType > [SymbolToken(-), Identifier(1)]`，而 TS 那边那个 `literal` 是
  // **一个** `PrefixUnaryExpression`（`operator` 是 `MinusToken`、`operand` 是数字）。
  // 不折这一层的话 `-` 会投成一个孤立的 `MinusToken`、`PrefixUnaryExpression` 整类缺
  // （实测 `typescript.d.ts` 的 `pos: -1;` / `end: -1;`）。
  //
  // **这一格第 1087 轮就地展开**（原来是本页那一格 `projectSignedLiteralType`，全仓只有这一个
  // 读者；判据与第 1043 / 1044 / 1070 / 1080 轮并掉那些「一格声明、一个调用点」的转发同一把尺子）：
  // 不是这个形状就不动（原来给 `undefined`、调用方照下面那条路走 ⇒ 现在直接什么都不做）。
  if (list.length === 1 && list[0].IsTypeUnit) {
    const signedKids = list[0].ProjectableKids;
    const signedHead = signedKids[0];
    if (signedKids.length === 2 && signedHead !== undefined && signedHead.IsSymbolToken) {
      const signedOp = signedHead.TextValue;
      if (signedOp === "-" || signedOp === "+") {
        const operand = projectNode(signedKids[1], ctx);
        if (operand !== undefined) {
          return {
            kind: "LiteralType",
            literal: {
              kind: "PrefixUnaryExpression",
              // **`operator` 放运算符文本**（不是 `tokenKind(op)` 那种名字）：**类型位与值位共用
              // 这一处**（`type X = -1` 与 `let y = -1` 的产物同形），而降级层要按文本分派。
              // 对拍尺子只比**字段名**、不比值，所以两种写法尺子都认——文本更有用。
              // （原处第 66 轮那个「临时标记」注释随 `projectSignedLiteralType` 整格删除
              // ——它当时是用来证明「值位那个节点到底是不是这里造的」的一次性探针说明。）
              operator: signedOp,
              operand,
              pos: startOf(signedHead),
              end: operand.end,
            },
            pos: list[0].start,
            end: stmtEndOf(list[0], ctx),
          };
        }
      }
    }
  }
  // **点号名已经折成一个 `PropertyAccess` 单元**（第 128 轮）：类型位的限定名
  // （`NodeJS.ArrayBufferView`）本该是 `TypeReference > QualifiedName`，可链一旦在
  // token 层折成单元，下面那个「逐格套 `QualifiedName`」的循环就再也进不去
  // （它只看**平级**的点号）——于是落到最后那句「投第一个单元」，
  // `projectNode(PropertyAccess)` 走值位那条路投出一个 `PropertyAccessExpression`
  // （实测 `@types/node/util.d.ts` 的 `object is NodeJS.ArrayBufferView` 一族 46 处）。
  // 只认「全是名字与点号」的形状：带调用的链（`f(x).y`）不是类型。
  // **平的 `<...>` 类型实参段**（第 171 轮）：有些位置 token 层没把实参收成 `GenericType`
  // ——`A[Lowercase<K>]` 里那个 `<` 落在 `IsTypePosition` 的白名单之外，产物是
  // `[名字, SymbolToken(<), 实参…, SymbolToken(>)]` **平铺**五格。TS 那边照样是带
  // `typeArguments` 的 `TypeReference`（实测 `undici-types/header.d.ts` 的
  // `KnownHeaderValues[Lowercase<K>]`：缺 `TypeReference` + `Identifier`，名字那格的区间也短）。
  const openAt = list.findIndex(
    (k, i) => i > 0 && k.IsLessThanSymbol,
  );
  if (openAt > 0) {
    let depth = 0;
    let closeAt = -1;
    for (let i = openAt; i < list.length; i++) {
      // **同一把尺子的第三处**（第 1139 轮）：原来先问一句 `IsSymbolToken === false` 跳过
      // 非符号、再把 `TextValue` 拿去和 `"<"` / `">"` 比；两头收成属性读之后**那一句跳过
      // 自己就没了**——非符号那几页两面都答 `false`（基类默认档），不跳与跳逐格同答。
      const one = list[i];
      if (one.IsLessThanSymbol) {
        depth++;
      } else if (one.IsGreaterThanSymbol) {
        depth--;
        if (depth === 0) {
          closeAt = i;
          break;
        }
      }
    }
    if (closeAt > openAt) {
      const base = projectTypeExpression(list.slice(0, openAt), ctx);
      const args = [];
      for (const group of splitTopLevel(list.slice(openAt + 1, closeAt), ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) args.push(one);
      }
      if (base !== undefined && args.length > 0) {
        return { ...base, typeArguments: args, end: endOf(list[closeAt]) };
      }
    }
  }
  const paUnit = list.find((k) => k.IsPropertyAccess);
  // **后面还可能跟着类型实参段**（第 161 轮）：`x is A.B<C>` 的产物是
  // `[PropertyAccess(A.B), GenericType(<C>)]` **两格**——只认「整段就一格」时实参整个丢
  // （实测 `type-new-nodes-adversarial.ts` 的 `x is A.B<C>`：缺 `TypeReference` + `Identifier`）。
  if (
    paUnit !== undefined &&
    (list.length === 1 || (list.length === 2 && list[1].IsGenericType))
  ) {
    const members = paUnit.ProjectableKids;
    const pureName = members.every((k) => k.IsNameNode || k.IsDotSymbol);
    const names = members.filter((k) => k.IsNameNode);
    if (pureName && names.length > 1) {
      const generic = list.length === 2 ? list[1] : undefined;
      const props: any = { typeName: dottedExpression(names, "QualifiedName") };
      if (generic !== undefined) {
        const args = projectTypeArguments(generic, ctx);
        if (args !== undefined) {
          props.typeArguments = args;
        }
      }
      return {
        kind: "TypeReference",
        ...props,
        pos: startOf(list[0]),
        end: endOf(list[list.length - 1]),
      };
    }
  }
  // **`TypeDefine` 先摊平**：有些上下文里整个类型位就是**一个** `TypeDefine` 子单元
  // （参数标注 / 字段标注那一族），而它的内容才是「基名 + 实参 + 数组后缀」那一串。
  // 不摊平的话 `list[0]` 是 `TypeDefine`，会直接掉到最后那句「只投第一个」——
  // 于是 `Array<unknown> | X` 这种成员只出基名（实测这版把漂移从 1759 提到 2263）。
  // **`typeof A.B`**（第 83 轮）：产物那个 `TypeQuery` **只收 `typeof A`**，
  // 点号与后面的名字是它**外面**的平级单元（`declare var atob: typeof globalThis.atob`）。
  // TS 那边 `exprName` 是 `QualifiedName`、区间覆盖整段（也**没有** `typeof` 子节点）。
  // 不接的话后面那串名字整个丢掉——`Identifier` 缺 1581 里的另一簇就是它
  // （`buffer.d.ts` 的 `globalThis.atob` / `globalThis.btoa`）。
  if (list.length >= 3 && list[0].IsTypeQuery && list[1].IsDotSymbol) {
    const query = projectNode(list[0], ctx);
    const tail = list.filter((k, i) => i >= 2 && k.IsNameNode);
    // **`head` 已经是投好的节点**（`query.exprName`），而 `dottedExpression(…, "QualifiedName")`
    // 吃的是**单元**（它自己答 `NameNode`）——所以这里手工往右套（踩过一次：把投好的节点喂给
    // 那一格会 `node.get is not a function`）。
    // `query.exprName` 已经是**投好的节点**（不是单元）——判它看 `kind`，
    // 不能拿 `IsNameNode` 去问（那个判据吃的是别的接收者；踩过一次：会 `node.get is not a function`）。
    const head = query.exprName;
    let name =
      head !== undefined && (head.kind === "Identifier" || head.kind === "QualifiedName")
        ? head
        : undefined;
    for (const k of tail) {
      const right = k.NameNode;
      name =
        name === undefined
          ? right
          : { kind: "QualifiedName", left: name, right, pos: name.pos, end: right.end };
    }
    // **点号名后面再跟「下标访问 / 数组后缀」**（第 854 轮）：`type A = typeof a.b[K]` 的产物是
    // `[TypeQuery(typeof a), ., IndexedAccessType(b, K)]`——那个 `IndexedAccessType` 的
    // **左半边**（`b`）才是限定名的右半、`K` 是下标；`typeof a.b[K][]` 那一格外还套着
    // `ArrayType(IndexedAccessType(b, K))`。TS 那边的形状是
    // `IndexedAccessType{ objectType: TypeQuery(exprName: QualifiedName(a, b)), indexType: K }`。
    // 照下面那条路收会把 `b` 当成**一个成员名**、`TypeQuery` 的区间一路撑到 `]`
    //（实测缺 `IndexedAccessType` / `QualifiedName` / `TypeReference` 各一格，
    //  `TypeQuery` 与 `Identifier` 两处漂）。做法：尾段先按它自己的规矩投出来
    //（下标 / 数组的壳与 `<X>` 实参都在里面），再把**链上最左边那一格名字**换成整条
    // `TypeQuery`（`absorbIntoTypeQuery`），外层各壳的起点跟着挪到 `typeof`。
    const suffixUnit = list
      .slice(2)
      .find((k) => k.IsTypeSuffixUnit);
    if (suffixUnit !== undefined && name !== undefined) {
      const absorbed = absorbIntoTypeQueryOf(projectNode(suffixUnit, ctx), query, name);
      if (absorbed !== undefined) return absorbed;
    }
    if (name !== undefined) {
      query.exprName = name;
      query.end = endOf(list[list.length - 1]);
    }
    // **点号名 + 类型实参**（第 113 轮）：`typeof http.ServerResponse<InstanceType<Request>>`
    // 的产物是 `[TypeQuery(typeof http), ., ServerResponse, GenericType(…)]`——
    // 上面那一支只管点号名，实参段还是平级兄弟。TS 那边 `TypeQuery.typeArguments` 要照收，
    // 否则实参里那串名字整片丢（实测缺 `Identifier` 394 / `TypeReference` 140 的样本
    // 全是 `https.d.ts` 的这一族）。
    const queryGeneric = list.find((k) => k.IsGenericType);
    if (queryGeneric !== undefined) {
      const typeArguments = [];
      for (const group of splitTopLevel(queryGeneric.ProjectableKids, ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) typeArguments.push(one);
      }
      if (typeArguments.length > 0) {
        query.typeArguments = typeArguments;
        query.end = endOf(queryGeneric);
      }
    }
    return query;
  }
  // **`typeof X<Y>` / `import("m").X<Y>`**（第 109 / 114 轮）：TS 的 `TypeQuery` 与
  // `ImportType` 都可以带**类型实参**（`typeArguments`），而实参段在产物里是它们的
  // **平级兄弟**。不收的话：少 `typeArguments`、区间短一截（漂移），实参里那串名字整片丢。
  if (list[0].IsTypeWithTypeArguments) {    const query = projectNode(list[0], ctx);
    const generic = list.find((k) => k.IsGenericType);
    if (generic !== undefined && query !== undefined) {
      const typeArguments = [];
      for (const group of splitTopLevel(generic.ProjectableKids, ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) typeArguments.push(one);
      }
      if (typeArguments.length > 0) {
        query.typeArguments = typeArguments;
        query.end = endOf(generic);
        return query;
      }
    }
  }
  if (list.length === 1 && list[0].IsTypeDefine) {
    return projectTypeExpression(list[0].ProjectableKids, ctx);
  }
  // **类型参数段 + 函数类型**（第 82 轮）：产物把 `<R, TArgs extends any[]>` 放在 `FunctionType`
  // **外面**——`TypeDefine` 里是两个平级单元 `[GenericType(类型参数), FunctionType(…)]`，
  // 而 TS 那边它是 **`FunctionType.typeParameters`**（区间也从类型参数段起：
  // `<R>(a: A) => B` 整段都是 `FunctionType`）。
  //
  // 早先这里按「头是 `GenericType`」走到通用支，只投出那个 `GenericType`
  // （`AstKind()` 给它的是 `TypeReference`）——类型参数成了它的孩子、**整个函数类型被丢掉**：
  // 真实语料 `Identifier` 缺 1616 里的一大片、`TypeReference` 缺 417，
  // 全是 `@types/node/async_hooks.d.ts` 那种「泛型函数类型」（`snapshot(): <R, TArgs…>(…) => R`）。
  if (list.length === 2 && list[0].IsGenericType && list[1].IsFunctionType) {
    const typeParams = list[0].ProjectableKids.filter((k) => k.IsTypeParameterUnit);
    // **走通用分派而不是直调那个函数**（第 188 轮）：`FunctionType` 的投影已经搬进
    // `tokens/function-type.xl.md` 的 `PrintAst`，而 `projectNode` 会先问它——
    // 输入与原来那次直调完全相同，产出的节点逐字节一样。
    const fn = projectNode(list[1], ctx);
    if (typeParams.length > 0) {
      fn.typeParameters = projectEach(typeParams, ctx);
    }
    fn.pos = startOf(list[0]);
    return fn;
  }
  const head = list[0];
  let generic = list.find((k) => k.IsGenericType);
  const arraySuffix = list.find((k) => k.IsArrayType);
  // **`A<T>[]` 的产物把实参段装进了 `ArrayType` 里面**（第 104 轮）：
  // `[Identifier(Dirent), ArrayType(GenericType(NonSharedBuffer))]`——那个 `GenericType`
  // 是**基名的实参表**，不是元素类型。照原样投会得到「`TypeReference` 只盖住 `Dirent`」
  // + 数组里多出一个 `TypeReference`，实参那一格的 `Identifier` 也丢
  //（实测 `TypeReference` 缺 220 / 漂移 50、`Identifier` 缺 553 里成片就是这个形状，
  // `@types/node/fs.d.ts` 的 `Dirent<NonSharedBuffer>[]` 一眼可见）。
  if (generic === undefined && arraySuffix !== undefined) {
    const inside = arraySuffix.ProjectableKids.find((k) => k.IsGenericType);
    if (inside !== undefined) generic = inside;
  }

  // **`.` 后面是一个 `IndexedAccessType`**（第 110 轮）：`NodeJS.Module["exports"]` 的产物是
  // `[Identifier(NodeJS), ., IndexedAccessType(Identifier(Module), LiteralType("exports"))]`——
  // 限定名的右半在 `IndexedAccessType` **里面**，而 TS 那边 `IndexedAccessType.objectType`
  // 是整条 `NodeJS.Module`（`TypeReference > QualifiedName`）。
  // 不收的话 `IndexedAccessType` / `QualifiedName` / `Identifier(Module)` / `LiteralType` /
  // `StringLiteral` **五个节点一起丢**，`TypeReference` 的区间也短一截
  //（实测 `StringLiteral` 缺 71 + `LiteralType` 缺 37 的样本全长得这个样子）。
  if (
    head.IsNameNode &&
    list.length >= 3 &&
    list[1].IsDotSymbol &&
    list[2].IsIndexedAccessType
  ) {
    const iat = list[2];
    const inner = iat.ProjectableKids;
    const rightUnit = inner.find((k) => k.IsNameNode);
    if (rightUnit !== undefined) {
      const text = head.TextValue;
      const leftName = { kind: "Identifier", text, pos: startOf(head), end: endOf(head) };
      const right = rightUnit.NameNode;
      const typeName = { kind: "QualifiedName", left: leftName, right, pos: leftName.pos, end: right.end };
      const node = {
        kind: "IndexedAccessType",
        objectType: { kind: "TypeReference", typeName, text, pos: typeName.pos, end: typeName.end },
        pos: startOf(head),
        end: endOf(iat),
      };
      const indexUnit = inner.find((k) => k !== rightUnit);
      const indexType = indexUnit === undefined ? undefined : projectTypeExpression([indexUnit], ctx);
      if (indexType !== undefined) node.indexType = indexType;
      return node;
    }
  }
  // **平铺的构造类型**（第 111 轮）：`type C = new <T>(x: T) => T` 的产物把 `new` / `<T>` /
  // 形参括号 / `=>` / 返回类型**平铺**在类型别名里（**没有** `FunctionType` 单元——
  // 带 `new` 的那个形状 `FunctionTypeCloseRule` 认不出来），而 TS 是 `ConstructorType`。
  // 照通用支会投出一个盖住 `new <T>` 的 `TypeReference` + 一个 `Identifier(new)`
  //（实测多出 `NewKeyword` / `TypeReference` / `Identifier`，同时缺整个 `ConstructorType`
  // 与它的形参、返回类型）。
  if (head.IsKeywordUnit && head.IsNewKeyword === true) {
    const arrow = list.findIndex((k) => k.IsArrowSymbol);
    if (arrow > 0) {
      const ctorProps = {};
      const ctorGeneric = list.find((k) => k.IsGenericType);
      if (ctorGeneric !== undefined) {
        const typeParams = ctorGeneric.ProjectableKids.filter((k) => k.IsTypeParameterUnit);
        if (typeParams.length > 0) ctorProps.typeParameters = projectEach(typeParams, ctx);
      }
      const bracket = list.find((k) => k.IsBracketUnit);
      if (bracket !== undefined) {
        const inner = bracket.ProjectableKids;
        const paramUnits = inner.filter((k) => k.IsParameterUnit);
        if (paramUnits.length > 0) {
          ctorProps.parameters = projectEach(paramUnits, ctx);
        } else {
          // **平铺的形参**：这一支里括号的内容是 `[Identifier(x), TypeDefine(: T)]`，
          // 没有 `Parameter` 单元，所以按顶层逗号切组、每组自己造一个（实测漏了它
          // `Parameter` 缺 1）。
          const params = [];
          for (const part of splitTopLevel(inner, ",")) {
            if (part.length === 0) continue;
            const nameUnit = part.find((k) => k.IsNameNode);
            const typeUnit = part.find((k) => k.IsTypeDefine);
            const param = {
              kind: "Parameter",
              pos: startOf(part[0]),
              end: endOf(part[part.length - 1]),
            };
            if (nameUnit !== undefined) param.name = projectNode(nameUnit, ctx);
            if (typeUnit !== undefined) param.type = ctx.Project(typeUnit);
            params.push(param);
          }
          ctorProps.parameters = params;
        }
      }
      const ctorType = typeOf(list.slice(arrow + 1), ctx);
      if (ctorType !== undefined) ctorProps.type = ctorType;
      return {
        kind: "ConstructorType",
        pos: startOf(head),
        end: endOf(list[list.length - 1]),
        ...ctorProps,
      };
    }
  }
  if (head.IsNameNode) {
    const text = head.TextValue;
    const span = { pos: startOf(head), end: endOf(head) };
    const nameNode = { kind: "Identifier", text, pos: span.pos, end: span.end };
    if (generic === undefined) {
      // **`null` / `true` / `false` 在类型位要套一层 `LiteralType`**（第 76 轮）：
      // TS 那边 `null | Writable` 的第一个成员是 `LiteralType > NullKeyword`，
      // 而产物只在**一部分**上下文里造了这一层（`literal-type.xl.md` 覆盖的是它认得的那些位置），
      // 类型参数约束、类型实参段这些地方的 `null` 还是裸的 `Identifier`
      // （实测缺 `LiteralType` 214 处，样本几乎全是 `X extends null | Y`）。
      // **判据与词汇都问那一页自己**（第 1032 轮）：`Identifier.IsLiteralTypeWord(text)` 与
      // `Identifier.PrimitiveTypeKindOf(text)`——「哪三个词要套 `LiteralType`」与
      // 「哪个词在类型位叫哪个 kind」都是**叶子自己正文**那一格的事实，
      // 搬过来之后 `LiteralTypeCloseRule.IsLiteralUnit` 与这里问的是**同一格**
      // （原来那两处各写了一份三词名单）。
      // **第 1128 轮起这两问也由手上这一格自己答**（`head.IsLiteralTypeWord` /
      // `head.PrimitiveTypeKind`：`Identifier` 与 `Keyword` 两页各自显式声明同一格，
      // 读自己的 `TextValue` 问同一份词汇表）——与第 1127 轮绑定位那一处同一条口径：
      // 手上有单元，就不按文本问那一页。
      // `undefined` **不套**（TS 那边就是裸的 `UndefinedKeyword`）——这是这一条唯一的例外。
      if (head.IsLiteralTypeWord) {
        const literal = { kind: head.PrimitiveTypeKind, text, pos: span.pos, end: span.end };
        return { kind: "LiteralType", literal, pos: span.pos, end: span.end };
      }
      const primitive = head.PrimitiveTypeKind;
      if (primitive !== undefined) {
        return arraySuffix === undefined
          ? { kind: primitive, text, pos: span.pos, end: span.end }
          : { kind: "ArrayType", elementType: { kind: primitive, text, pos: span.pos, end: span.end }, pos: span.pos, end: endOf(arraySuffix) };
      }
    }
    // **点号类型名**（`A.B.C` / `N.M<T>`）：TS 在**类型位**用的是 `QualifiedName`（`left`/`right`）、
    // **不是** `PropertyAccessExpression`——两者形状很像，但值位与类型位各归各的。
    // 早先这里只取第一个 `Identifier`，后面的 `B`、`C` **整个丢掉**（缺口表里
    // `Identifier` 与 `TypeReference` 各占一大块，就是这个原因）。
    let typeName = nameNode;
    let end = typeName.end;
    let i = 1;
    while (i + 1 < list.length && list[i].IsDotSymbol) {
      // **`.` 后面可能是一个 `ArrayType`**（第 103 轮）：`A.B[]` 的产物是
      // `[Identifier(A), ., ArrayType(Identifier(B))]`——那个 `ArrayType` 里**只有名字**，
      // 它是限定名的右半，外层那个 `[]` 才是数组后缀。只认 `IsNameNode(list[i+1])` 时
      // 链在这里断掉：`TypeReference` 只盖住 `A`、`QualifiedName` 与 `Identifier(B)` 全丢，
      // 而外层的 `ArrayType` 又套错了位置（实测 `Identifier` 缺 1050 里成片、
      // `TypeReference` / `ArrayType` 各一片）。
      const next = list[i + 1];
      // **「只有名字的那种 `ArrayType`」第 1133 轮收进被问的那一格**（用户口径 1.1 ~ 1.4）：
      // 这一句原来是现场拼出来的
      // `next.ProjectableKids.filter((k) => k.IsNameNode)` + `length === 1 ? [0] : next`，
      // 而「我下面是不是恰好只有一个名字子单元」**就是 `next` 自己那一格上的一件事**
      // （两半都在它身上：子单元表是它的 `ProjectableKids`、名字那一格由它自己的 `IsNameNode` 认）。
      // 今天只读一格：`next.SoleNameUnit`（`core/syntax/token.xl.md` 的基类那一格，
      // `## property` + `### get`，「恰好一格才给、否则 `undefined`」逐字相同）。
      // 它**不是 `NameUnit`**：那一格答「我声明的那个名字住在哪一格子单元上」（读 `DeclaredName`），
      // 这一格根本不看名字、只数名字子单元的个数——两问的收件人不同，所以各立一格。
      const soleName = next.IsArrayType ? next.SoleNameUnit : undefined;
      const nameUnit = soleName !== undefined ? soleName : next;
      if (!nameUnit.IsNameNode) break;
      const right = nameUnit.NameNode;
      typeName = { kind: "QualifiedName", left: typeName, right, pos: typeName.pos, end: right.end };
      end = right.end;
      i += 2;
    }
    const base =
      generic === undefined
        ? { kind: "TypeReference", typeName, text, pos: span.pos, end }
        : {
            kind: "TypeReference",
            typeName,
            typeArguments: projectTypeArguments(generic, ctx),
            text,
            pos: span.pos,
            end: endOf(generic),
          };
    // 数组后缀：`Foo<Bar>[]` 的 TS 是 `ArrayType(Foo<Bar>[]) > TypeReference(Foo<Bar>)`。
    if (arraySuffix !== undefined) {
      return { kind: "ArrayType", elementType: base, pos: base.pos, end: endOf(arraySuffix) };
    }
    return base;
  }
  // **运算符的操作数可能被拆到外面**（第 103 轮）：`readonly webcrypto.KeyUsage[]` 的产物是
  // `[TypeOperator(readonly, webcrypto), ., ArrayType(KeyUsage)]`——点号名与数组后缀都在
  // 运算符单元**外面**。TS 那边 `TypeOperator.type` 是整段 `webcrypto.KeyUsage[]`
  // （`QualifiedName` 与 `ArrayType` 都在它里面）。收回来之后 `TypeOperator` 的区间也才对得上。
  if (head.IsTypeOperator && list.length > 1) {
    const inner = head.ProjectableKids;
    const operandHead = inner.length > 0 ? inner[inner.length - 1] : undefined;
    if (operandHead !== undefined && operandHead.IsNameNode) {
      const operand = projectTypeExpression([operandHead, ...list.slice(1)], ctx);
      const node = operand === undefined ? undefined : projectNode(head, ctx);
      if (node !== undefined) {
        node.type = operand;
        node.end = operand.end;
        return node;
      }
    }
  }
  // **类型谓词被包在联合里**（第 119 轮）：`asserts x is null | undefined` 的产物是
  // `UnionType > [TypePredicate([asserts, x, is, null, |, undefined])]`——谓词在里面、
  // 联合在外面；而 TS 正好**相反**（谓词在外、`TypePredicate.type` 才是那个 `UnionType`）。
  // 不翻过来的话那个 `UnionType` 的区间多一截（产物 [24,53) vs TS [37,53)），
  // 于是同时记「缺 `UnionType`」+「多出 `UnionType`」+ 缺 `UndefinedKeyword`（实测 35 处）。
  if (
    list.length === 1 &&
    (list[0].IsUnionType || list[0].IsIntersectionType)
  ) {
    const unionUnit = list[0];
    const inner = unionUnit.ProjectableKids;
    const predicate = inner.find((k) => k.IsTypePredicate);
    if (predicate !== undefined && inner.length === 1) {
      const parts = predicate.ProjectableKids;
      const isIndex = parts.findIndex((k) => k.IsIsKeyword === true);
      const typeKids = isIndex >= 0 ? parts.slice(isIndex + 1) : [];
      const separator = unionUnit.IsUnionType ? "|" : "&";
      const types = [];
      for (const group of splitTopLevel(typeKids, separator)) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) types.push(one);
      }
      const node = projectNode(predicate, ctx);
      if (node !== undefined && types.length > 0) {
        node.type = {
          kind: unionUnit.Tag,
          types,
          pos: types[0].pos,
          end: types[types.length - 1].end,
        };
        node.end = types[types.length - 1].end;
        return node;
      }
    }
  }
  // 其余形状（`UnionType` / `IntersectionType` / `FunctionType` / `TypeLiteral` / `TupleType`…）
  // 交回通用投影，它们各自的子单元会再走一遍 `projectTypeExpression`。
  if (list.length === 1) {
    // **类型位的标记**（第 99 轮）：模板字面量在值位是 `TemplateExpression`、在类型位是
    // `TemplateLiteralType`（span 里装的是类型而不是表达式），而两者的**产物同形**——
    // 唯一可靠的区分是「谁在投它」：走 `projectTypeExpression` 的就是类型位。
    const saved = ctx.typePosition;
    ctx.typePosition = true;
    try {
      return projectNode(list[0], ctx);
    } finally {
      ctx.typePosition = saved;
    }
  }
  return projectTypeExpression([head], ctx);
```

# private method projectTypeArguments:(generic:any, ctx:any)=>Array<any>

**一格泛型括号段 → 若干个类型实参**（`Map<string, number>` 那个 `<…>` 里切成两格）。

**切法第 1122 轮改成复用 `splitTopLevel`**：这一格原来自己写了一遍「按逗号攒组、
分隔符不进任何一组、末尾补一组」的循环，而那正是本页 `splitTopLevel` 那一份算式
（它同时服务值位那几处：对象成员、数组元素、类型容器的成员）——两份逐格同答
（`separator` 给 `","` 时，判据都是「正文等于分隔符」加上「逗号那一态读它自己的属性」，
`splitTopLevel` 末尾那个 `filter` 与这里的 `parts` 逐组对应）。所以这一格今天只剩
「**把切好的每一组交给类型投影**」这一步，本页少一份会漂的第二处切法。

**第 1132 轮起出口没了、这一格留着**：`ctx.TypeArguments` 那一格**全仓只有
`heritage-clause.xl.md` 一个读者**，算式就地展开在那一页（切法交给 `ctx.Split`、
每一组交给 `ctx.TypeExpression`，与本页同一份实现）；而本页自己还有四处直接调它
（3720 / 3895 / 8741 / 9025 那一族，模块内调用、不经出口），所以这一格一个字没动。

```ts
  const out = [];
  for (const part of splitTopLevel(generic.ProjectableKids, ",")) {
    const projected = projectTypeExpression(part, ctx);
    if (projected !== undefined) out.push(projected);
  }
  return out;
```

# private method memberNameOf:(v:any, ctx:any)=>any

**成员的名字节点**（`Field` / 方法声明 / 方法签名 / 命名空间…都要问它）。

TS 那边成员名有四种形态，判据在这里**收口**——`projectField` 与 `structuralProps` 共用一份。
原来 `projectField` 自己 `synthName` 合一个 `Identifier`，于是**接口 / 类型字面量里的成员**
（那一支正是 `projectField`）的引号名、数字名、计算名**全都长成 `Identifier`**。实测缺口：
`StringLiteral` 1083、`NumericLiteral` 216、`ComputedPropertyName` 231，以及计算名里面的
`PropertyAccessExpression` 593（全是 `[Symbol.toStringTag]: string` 那一种）。

| 源码 | 名字节点 |
| --- | --- |
| `a` | `Identifier`（树里有那个子单元就用它，没有才 `synthName` 合成） |
| `"a-b"` / `'a-b'` | `StringLiteral`，**区间含那对引号** |
| `0` / `1.5` | `NumericLiteral` |
| `[Symbol.toStringTag]` / `[kOptions]` | `ComputedPropertyName`，区间**含那对方括号**，里面照值位投 |

返回 `{ name, computed, unit }`：`computed` 是那个计算名单元、`unit` 是名字那个**子单元**
（两者调用方都要从段循环里**排掉**，否则它会以 `ArrayLiteral` / `Identifier` 的身份在成员里
再出现一次——`unit` 是实测补的：接口名那个 `Identifier` 没被排掉时会顶着
`heritageClauses` 出去，实测 2640 处字段名不符）。

两处判据是实测逼出来的：

- **计算名先问**，而且**不看 `name` 属性空不空**：`[Symbol.toStringTag]` 的名字属性是**空串**
  （`name=""`），原来那个 `name !== ""` 的闸门直接把它挡在外面，整个名字节点都没有；
- **引号判据是「名字起点前面那一格就是引号」**，不是「窗口里找得到 `"name"`」：成员的类型里
  可能正好有同名字符串（`x: "x"`），按窗口找会把类型当成名字。`synthName` 已经把名字的位置
  算好了（推过修饰词、优先用 `NameSpan`），**但名字那一格不是每个单元都记着**
  （`MethodDeclaration` 的字符串名就没有 `NameSpan`），所以这一处读的是投影出来那一格的
  两头（`at.pos` / `at.end`）——第 1109 轮试过改读 `NameTextSpan`，那一族当场红，如实保留。

```ts
  // **名字那一格直读 `v.DeclaredName`**（第 1068 轮）：`NameField`（名字住在哪一页的哪个字段上）
  // 与「问不到才看的 `name` 段」两跳都收进了 token 那一页，
  // 投影这一侧只读一个字符串属性。
  // 从前这里是一张三词名单（`tokenNameOf(v) ?? …("fieldName") ?? …("namespace")`）——
  // 那是**把同一格事实抄成三处**（两处会漂）。
  const rawName = v.DeclaredName;
  // **属性里那个名字也要解转义**（第 381 轮）：`const \u0061bc = 1` 的名字住在
  // `Let.fieldName` 这个**属性**上（不是子单元），`x.\u0061` 的键同理。
  // **与 `Identifier.PrintAst` 共用一份解码**（`text-common-util.xl.md` 的
  // `DecodeIdentifierEscapes`）——两处各写一份就是两处会漂的答案（这一轮第一版
  // 只改了标识符那一格，于是 `function f\u0066()` 绿了、`const \u0061bc` 还是红的）。
  const name = typeof rawName === "string" ? rawName : "";
  // **计算属性名那个单元**（第 1070 轮就地写在读者这里）：`[Symbol.toPrimitive]` 在产物里
  // 是 `ArrayLiteral`、**含方括号**；只认「**第一个**子单元，而且原文那个位置就是 `[`」
  // 的那种——类字段的初始化式（`x = [1, 2]`）也是 `ArrayLiteral`，但它前面还有 `=`。
  // （它原是一格 `computedNameUnit`：全仓一个调用点、就是这里，拆成一格只是多一跳。）
  const nameKids = v.ProjectableKids;
  const nameFirst = nameKids.length > 0 ? nameKids[0] : undefined;
  const computed =
    nameFirst !== undefined && nameFirst.IsArrayLiteralUnit && nameFirst.Text.startsWith("[")
      ? nameFirst
      : null;
  if (computed !== null) {
    return {
      name: {
        kind: "ComputedPropertyName",
        expression: computedNameExpression(computed, ctx),
        pos: startOf(computed),
        end: endOf(computed),
      },
      computed,
      unit: null,
    };
  }
  if (name === "") {
    return { name: undefined, computed: null, unit: null };
  }
  // **点号模块名只取第一段**（`namespace A.B.C` 外层的名字是 `A`——TS 那边是
  // `ModuleDeclaration(A) > ModuleDeclaration(B) > …`）：那一段的区间由 `Namespace`
  // 重组时记进 `NameAt` / `NameEnd`（第 1081 轮起投影读的就是它的那一格 `NameSpan`），这里直读。
  // 只有 `namespace` 这一个属性会带点号
  // （引号名 `"a.b"` 走的是别的属性），所以按它分流不会误伤。
  // **这一点名字也只读那一格**（第 1068 轮）：`namespace` 是 `Namespace` / `Import` / `Export`
  // 三页 `NameField` 回答的那一格事实，而 `DeclaredName` 已经把它与上面那个 `rawName`
  // 收成**同一个入口**（两处会漂——`name` 与 `namespace` 一度就是两个入口）。
  const rawNamespace = v.DeclaredName;
  const dotAt = typeof rawNamespace === "string" ? rawNamespace.indexOf(".") : -1;
  const lookup = dotAt > 0 ? rawNamespace.substring(0, dotAt) : name;
  // **「名字住在哪一格子单元上」第 1133 轮收进被问的那一格**（用户口径 1.1 ~ 1.4）：
  // 这一句原来是现场拼出来的 `v.ProjectableKids.find((k) => k.IsIdentifierUnit &&
  // k.TextValue === lookup)`，而**两半事实都在 `v` 自己身上**——要找哪个名字读 `v.DeclaredName`
  // （上面那一句 `lookup` 就是它取了第一段），名字那一格自己的正文由它自己的 `TextValue` 答。
  // 今天只读一格：`v.NameUnit`（`core/syntax/token.xl.md` 的基类那一格，`## property` + `### get`，
  // 点号取第一段的算式与这里原来那一句逐字相同）。`lookup` 仍留着——它是 `synthName` 的实参
  // （名字不住在子单元上时**合成**一个 `Identifier`），与「哪一格带我的名字」不是同一问。
  const direct = v.NameUnit;
  const at = direct === undefined ? synthName(lookup, v) : projectNode(direct, ctx);
  if (at === undefined) {
    return { name: undefined, computed: null, unit: direct === undefined ? null : direct };
  }
  // **「我声明的这个名字是不是引号名」由那一格自己答**（第 1138 轮，用户口径 1.1 ~ 1.4）。
  // 这一处原来是**回原文**看名字两头那两个字符（`ctx.source[at.pos - 1]` 与
  // `ctx.source[at.end]` 是不是同一个引号），第 1109 轮**如实保留**过它，理由写的是
  // 「名字那一格不是每个单元都记着 NameSpan（`MethodDeclaration` / 方法签名的字符串名没有
  // 那一格，实测那一版 `decl-string-name-member` 一族 5 条当场缺 1 多 1），那时只有原文答得出来」。
  // **第 1138 轮把那个前提消掉了**：`MethodDeclaration` 补上 `## field NameAt` 与
  // `## property NameSpan`（与 `Field` 同名同形同条件，认下名字那一趟赋好、`Clone` 抄一格），
  // 于是「引号名」这一问**每一页都答得出来**——收成基类那一格 `Token.IsQuotedName`
  // （`## property` + `### get`，与 `NameTextSpan` 里那个 `quoted` 同一份算术）。
  // 这一处只读属性；本页代码块里「按某一格自己的坐标去读 `ctx.source`」**因此一处不剩**
  // （第 1049 / 1109 轮那条判据的最后一只漏网）。
  // **等价怎么证的**：`NameSpan` 就是名字那一格自己的整段区间（字符串名含那对引号），
  // 而这一处原来比的那两个字符正是那一段的两头——`at.pos - 1` 是那一段的开头、
  // `at.end` 是那一段的末尾（`synthName` 两条路给出的对数逐字相同）。
  if (v.IsQuotedName === true) {
    // **`text` 是引号里的那段，不含引号**（第 183 轮修）：TS 那边字符串字面量名字的
    // `text` 是**解码后的值**（`{ "x-y"() {} }` 的名字文本就是 `x-y`），
    // 而这里原来切的是 `[pos-1, end+1)`——**把两个引号也带上了**。
    // 后果不在解析侧（尺子只比 kind / 区间 / 字段名，不比字段**值**），
    // 而在**降级层**：`{ "x-y"() {} }` 于是存在**键 `"x-y"`（带引号）**上，
    // 按 `o["x-y"]` 永远取不到（实测：`Object.keys` 印出来是 `"x-y"`）。
    // **转义还没解**（`{ "a\nb"() {} }` 的文本是 `a\nb` 四个字符，TS 给一个真换行）——
    // 属性名里罕见，记在台账里。
    return {
      name: {
        kind: "StringLiteral",
        // **正文用已经投影出来那一格自己的 `text`**（第 1109 轮）：它就是名字文本
        // （`ctx.source.slice(at.pos, at.end)` 的逐字符同答）——这一页于是不再回原文切一次。
        text: at.text,
        pos: at.pos - 1,
        end: at.end + 1,
      },
      computed: null,
      unit: direct === undefined ? null : direct,
    };
  }
  // **「我声明的这个名字是不是数字字面量」第 1135 轮量过没敢收、第 1136 轮按量到的名单收进来了**
  // （用户口径 1.1 ~ 1.4）。这一句原来是 `direct === undefined && Identifier.IsNumericLiteral(name)`——
  // 看着像是「把这一页自己的名字文本递给另一页的静态入口去判」，所以第 1135 轮试过一版
  // **基类一格**属性读（`Identifier` / `Keyword` 两页覆写 `IsNumericLiteralName`）。
  // **当场被 `coverage` 抓住、如实还原**：`cls-string-method-names` /
  // `decl-class-numeric-method-name` / `lex-member-number-name` / `type-member-names` 四条一起
  // 从 pass 变 blocked（读数 4260 → 4256 / 4422、`blocked` 28 → 32），
  // 逐节点 diff 是 `MISS NumericLiteral [96,97) "1"` + `EXTRA Identifier [96,97) "1"` 那一对。
  // **第 1135 轮量错在哪**：这一格上的 `v` **不是**名字单元自己，而是**声明了这一格名字的
  // 那一格**（`MethodDeclaration` / `Field`）——它的 `IsNumericLiteralName` 拿到的是基类默认档
  // `false`，因为会答 `true` 的那两页是 `Identifier` / `Keyword`（`IsNameNode`，第 1057 轮），
  // 而名字在产物里是**这一格的字段**（`fieldName` / `name`）、不是一格名字单元。
  // **第 1136 轮先量名单、再按名单立格**（`tmp/r1136`：在 `build/` 那一句上挂一个探针、
  // 跑 `node tests/parse/direct-ast.mjs --all`，记下 `v.constructor.name`）——
  // 实测落进这一档的**只有两个类**：`["Field","MethodDeclaration"]`。
  // 于是那两页**各自显式声明** `## field IsNumericLiteralName:bool = false`、
  // 并在**认下名字的那一趟**（`FieldCloseRule.Process` / `MethodDeclarationCloseRule.Process`）
  // 用同一份判据赋好（`Identifier.IsNumericLiteral(fieldName)` / `(name)`，与原来那个实参
  // `name = v.DeclaredName` 逐字符同一份文本），`Clone` 各抄一格。
  // 投影这一侧于是**一个类名都不认、一段文本都不问**：只读被问那一格自己的属性。
  // 顺带：本页对 `Identifier` 的**最后一个**代码读者就是这一句（全仓实测 `Identifier.` 的
  // 活代码只此一处），所以那一行 `import` 同一轮删掉——本页不再 import 那一页。
  if (direct === undefined && v.IsNumericLiteralName === true) {
    return { name: { kind: "NumericLiteral", text: name, pos: at.pos, end: at.end }, computed: null, unit: null };
  }
  return { name: at, computed: null, unit: direct === undefined ? null : direct };
```

**`modifierSpansOf` 那一格第 1079 轮删掉了**（它原来就挂在这里，占第 8277~8299 行）：它把各页
自己声明的 `modifierSpans` 字段（`"起:止"` 用 `,` 连接）拆成一串 `{ pos, end }`。
**要拆的那个字符串就是被问的那一格自己的字段**，所以按这一族一贯的口径
（第 1041 / 1042 / 1057 / 1068 / 1069 / 1078 那几条）它搬回了 `core/syntax/token.xl.md`：
基类新增 `## property ModifierSpanList:Array<any>`（`## property` + `### get`；没有这一格的页面
答空数组，解析不出来也答空数组——与原来的实现逐字相同），
本页唯一的那处调用（`addModifiers` 里取 `spans`）改成属性读。
**那一格的输入第 1082 轮收进了基类**：`## field ModifierSpans:string = ""` 由基类声明
（各页本来就各自显式声明同一格、并在认下声明那一刻赋好），那一格读的就是它——
从前读的是各页那个**小写**的 `modifierSpans`（一个没在基类里声明的名字，要经 `(this as any)`），
**那 10 处小写属性第 1082 轮整格删掉**（`let` / `field` / `type-assign` / `class` / `enum` /
`function` / `method-declaration` / `interface` / `lamda` / `namespace`），
**同一份事实因此只有一个入口、一处声明**（第 1078 轮收掉的是它的兄弟 `modifierStart`）。

# private method addDecorators:(v:any, props:any, ctx:any)=>void

**装饰器并进 `modifiers`**：TS 那边装饰器与关键字修饰词**同住 `modifiers` 一列**，按源码位置先后排
（`@dec export class C {}` 的 `modifiers` 是 `[Decorator, ExportKeyword]`）。

与 `addModifiers` 的分工：那一支管**能被字段完整表达的**关键字词（`export` / `declare` / `readonly`…，
产物那边是一串文本），这一支管**带子树的** `Decorator` 节点（产物那边是一个子单元）。
两处都走这一份实现：通用支（`structuralProps`）与各 token 自己的 `PrintAst`（`Class` 走前者，
`TypeAssign` / `Interface` / `Namespace` 走后者）——各写一份就会在「谁先谁后」上漂。

判据只看子单元里有没有 `Decorator`：没有就一个字段都不动（连 `modifiers` 都不建）。

**第 1086 轮把这里读的那一格收成 `ProjectableKids`**（第 1067 轮那一批漏下的一处）：
`Decorator` **不是** trivia（它进投影、不答 `IsInvisible`），所以「含 trivia 的完整子单元表」
与「进投影的子单元表」在这里**逐处同答**——量法见下面那一节（全语料 2051 份、
本函数被调 **42158 次**，两条路的 `start:end:Tag` 序列 **DIFF 0**）。
`allKids` 的读者因此只剩**「要找 trivia」**的那三处（`stmtEndOf` 里那段收尾 trivia，
**第 1117 轮起就地展开**、原来是单独一格 `trailingTriviaStart`、
`trailingSemicolonOf` 1 处、`astNode` 开头跳前导注释 1 处），与它自己那一节的说明一致。

```ts
  const projected = v.ProjectableKids
    .filter((k) => k.IsDecoratorUnit)
    .map((k) => projectNode(k, ctx))
    .filter((node) => node !== undefined);
  if (projected.length === 0) return;
  const merged = [...projected, ...(Array.isArray(props.modifiers) ? props.modifiers : [])];
  merged.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  props.modifiers = merged;
```

# private method addModifiers:(v:any, props:any)=>void

修饰词：产物那边是 `modifiers="export,const"` 这样的**字符串**，
而 TS 那边 `modifiers` 是一串**节点**（`ExportKeyword` / `ConstKeyword`…）。

**每个修饰词的区间由 token 自己记的那一格给**（各 token 的 `ModifierSpans`）：修饰词在源码里
各自占哪一格，认下声明那一刻就在手上，所以这一格**不做任何猜测**。

**第 1052 轮把「回原文量」那条退路与它的 `baseStart` 形参一起删掉了**：
早先没有字段时是从 `v.start` 起按顺序 `indexOf(词)` 量——那条近似会被**前面装饰器里的同名文本**
骗到（`@exported export class C {}` 里量出来的是 `exported` 里那一段，实测缺 `ExportKeyword` 1 + 多出 1）。
它与 `modifierSpans` 是**同一趟记下的两格**（`declaration-common.xl.md` 的 `DeclarationModifiers`
与 `DeclarationModifierSpans` 同判据、同顺序），所以「有词没位置」不是一种状态；
全语料里那条退路一次都没走（见 `modifierSpansOf` 那一节与第 1078 轮搬走的 `ListStart`）。
留一个零宽区间的兜底比留一条猜法更糟：它是**静默错值**（实测 `declare` 是 `TS[26,33)` 而零宽给 `[26,26)`，
一份语料里几百处），而不是当场说不出来。

```ts
  let words = [];
  // **「文本那一档」的分支条件还是看那一格事实在不在**（第 1083 轮）：`modifiers` 是基类声明、
  // 各页构造时赋好的那一格；**拆词的算式住在基类那一格** `ModifierTextWords` 里
  // （第 1083 轮立起来，见 `core/syntax/token.xl.md`），投影只读属性名。
  const modifiers = v.modifiers;
  if (typeof modifiers === "string" && modifiers !== "") {
    words = v.ModifierTextWords;
  } else {
    // **有的单元把修饰词记成布尔属性、名字就是那个词**：`Lamda` 的 `async`
    // （TS 那边 `async x => x` 的 `ArrowFunction.modifiers` 就是 `[AsyncKeyword]`）。
    // 这一支不是给声明层留的兜底——声明层（`Class` / `Interface` / `Namespace` / `TypeAssign` …）
    // 一律有 `modifiers` 文本走上面那一条。
    //
    // **哪几个词是这一档，由那一页自己声明**（第 1065 轮）：这一支过去走
    // `declaredKeysOf(v)`——把**所有**小写开头、值为 `true` / `"true"` 的属性都当修饰词收。
    // 那是一份没人声明的名单：本页新加一个布尔属性就会**凭空多出一个修饰词节点**。
    // 今天读的是那一页显式声明并赋好的 `ModifierWords`（口径见
    // `core/syntax/token.xl.md` 的 `ModifierWords`）：`Lamda` 给 `["async"]`、
    // 其余页面基类默认空数组 ⇒ 这一支对它们一个字都不收。
    const declared = v.ModifierWords;
    if (Array.isArray(declared)) {
      for (const key of declared) {
        const value = v[key];
        if (value === true || value === "true") words.push(key);
      }
    }
  }
  if (words.length === 0) return;
  // **位置只有一个来源**：`ModifierSpans` 与 `modifiers` **同序同长**（同一趟记下的两格），
  // 所以第 i 个词的位置就是第 i 格——这里不再有「个数对不上就换一条猜法」这一支。
  // **拆那一串的地方就是基类那一格**（第 1079 轮）：`spans` 读的是 `Token.ModifierSpanList`
  // （见 `core/syntax/token.xl.md`），它读的输入是**基类声明的 `ModifierSpans`**
  // （第 1082 轮；各页构造时赋好，那 10 处小写的 `modifierSpans` 属性已整格删掉）。
  const spans = v.ModifierSpanList;
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const at = i < spans.length ? spans[i] : { pos: v.start, end: v.start };
    out.push({ kind: `${word.charAt(0).toUpperCase()}${word.slice(1)}Keyword`, text: word, pos: at.pos, end: at.end });
  }
  props.modifiers = out;
```

# private method namedSpecifiersOf:(brace:any, kind:string, ctx:any)=>Array<any>

具名导入 / 导出的每一项 → `ImportSpecifier` / `ExportSpecifier`（两种语句只有 `kind` 不同，所以共一份实现）。

产物把 `{ a as b, c, type D }` 摊成 `Bracket > [Identifier(a), Identifier(as), Identifier(b), SymbolToken(,), …]`，
而 TS 那边是 `NamedImports` / `NamedExports > ImportSpecifier / ExportSpecifier{ propertyName?, name }`。

**读的是 token 子单元，不是原文**：每一项的起止、`as` 的两侧、段首的 `type`、字符串名，
在树上本来就是**带区间的单元**——直读即可。**这一格是本文件最后一处回原文重新做词法的地方**，
照原文扫的写法要用正则猜 `as` 的两侧，两处实测错法：
`import { a /* c */ as b }` 把注释算进 `propertyName`（漂移 1 + 多出 1）、
`import { "a-b" as c }` 把字符串名投成 `Identifier`（缺 `StringLiteral` 1 + 多出 1）。

```ts
  const out = [];
  let segment = [];
  // **`As` 那一格的替身标记**（第 829 轮）：折拢形态里 `as` 不再是一个平铺的
  // `Identifier`，所以分段时用它占「`as` 那一格」的位置（见 `walkSpecifierUnit`）。
  const AS_SEPARATOR: Map<string, any> = new Map([["type", "AsSeparator"]]);
  const flush = () => {
    if (segment.length === 0) return;
    const units = segment;
    segment = [];
    // 位置只从**带区间的实义单元**上取（标记本身没有 `range`）：
    // `startOf` / `endOf` 对没有 `range` 的 Map 一律给 0，落在段首 / 段尾就是一处假区间。
    const ranged = units.filter((k) => k !== AS_SEPARATOR);
    const pos = startOf(ranged.length > 0 ? ranged[0] : units[0]);
    const end = endOf(ranged.length > 0 ? ranged[ranged.length - 1] : units[units.length - 1]);
    // **段首的 `type` 是标志**：`import { type B }` / `export { type D }` 的 specifier 区间含 `type`，
    // 但 `name` 只是后面那个名字。只剩一个单元的 `{ type }` 不跳（那个 `type` 就是名字）。
    const head = (k) => k.IsNameNode && k.IsTypeKeyword === true;
    const body = units.length > 1 && head(units[0]) ? units.slice(1) : units;
    if (body.length === 0) return;
    const asAt = body.findIndex(
      (k) =>
        k === AS_SEPARATOR ||
        (k.IsIdentifierUnit && k.IsAsKeyword === true),
    );
    // **段尾那一格的名字节点**（第 1080 轮就地展开，原 `specifierNameOf`，它只有这两个调用点）：
    // 引号名（`import { "a-b" as c }`）给 `StringLiteral`（`text` 是引号里那段，位置含引号），
    // 其余读 `NameNode`（`Identifier`）。**这一格的正文由它自己答**（第 1061 轮）：
    // `unit.StringText` 是那一页自己的属性。
    const lastName = body[body.length - 1];
    const name =
      lastName.IsStringLiteralUnit
        ? astNode("StringLiteral", { text: lastName.StringText }, lastName, ctx)
        : lastName.NameNode;
    if (asAt > 0) {
      const firstName = body[asAt - 1];
      out.push({
        kind,
        propertyName:
          firstName.IsStringLiteralUnit
            ? astNode("StringLiteral", { text: firstName.StringText }, firstName, ctx)
            : firstName.NameNode,
        name,
        pos,
        end,
      });
      return;
    }
    out.push({ kind, name, pos, end });
  };
  // **每一项怎么找**：括号里的内容有两种形态——同一行写完的是**平铺**的一串单元
  // （`{ A as B, C }`），而**跨行**的会被逗号运算符折成一棵树
  // （`{ ⏎ A, ⏎ B ⏎ }` ⇒ `Statement > BinaryOperator(op=",") > …`）。
  // 所以按文档顺序递归展开 `Statement` / `BinaryOperator`，把 `,` 当分段边界：
  // 两种形态于是走同一条路——这正是从前那段回原文切分替我们兜住的东西。
  const walkSpecifierUnit = (unit:any) => {
    if (unit.IsStatementShell || unit.IsBinaryOperatorUnit) {
      for (const child of unit.ProjectableKids) walkSpecifierUnit(child);
      return;
    }
    // **`As` 是「`as` + 别名」的折拢形态**（第 829 轮）：`import { a, b as c ⏎ } from "m"`
    // （带注释时同样）里 `as` 不再是平铺的 `Identifier` —— 逗号运算符把前面那段折成
    // `BinaryOperator(a, `,`, b)`，`as c` 这一段折成一个 `As` 单元（它的区间**从 `as` 起**，
    // 子单元只有那个别名）。原来把 `As` 当普通单元压进段里 ⇒ 整段只有一个单元 ⇒
    // `asAt` 找不到 ⇒ specifier 少了 `propertyName`、`name` 变成整个 `As` 单元的投影
    //（实测 `b as c` 的 `Identifier` 区间成了 `as c` / `as c //c`，缺 1 漂移 2）。
    // 这里把它摊成「一个分隔标记 + 它的子单元」，与平铺形态走同一条判据。
    if (unit.IsAsUnit) {
      segment.push(AS_SEPARATOR);
      for (const child of unit.ProjectableKids) walkSpecifierUnit(child);
      return;
    }
    if (unit.IsSymbolToken && unit.IsCommaSymbol === true) {
      flush();
      return;
    }
    segment.push(unit);
  };
  for (const child of brace.ProjectableKids) walkSpecifierUnit(child);
  flush();
  return out;
```

**`specifierNameOf` 那一格第 1080 轮就地展开了**（它原来占上面到下面两个标题之间的那一段）：
它把「一个名字单元 → 节点」这件事包了一层，而**两个调用点都在同一格函数里**（`namedSpecifiersOf`
的 `flush`），所以按第 1043 / 1044 / 1056 / 1070 轮那把尺子（「只有一个调用点、只是把参数转手」）
就地展开——引号名给 `StringLiteral`、其余走 `nameOf`，两处逐字照抄原来那一格的判据。
`ctx.SpecifierNameOf` 那个出口本来就是零真实读者（第 1070 轮已记），本轮连同导出一起删掉，
名字补进 `direct:lint` 的 `CTX_BANNED`。
# private method dottedExpression:(names:Array<any>, kindOf?:string)=>any

一串名字 → **左结合的点号链**（第 1105 轮起这一格按 `kind` 出两种节点，原来那两格
`dottedExpression` / `qualifiedNameFrom` 是同一份实现抄了两遍；第 1105 轮把后者并进前者，
按 `kindOf` 分派出 `PropertyAccessExpression` / `QualifiedName` 两种节点）。

**为什么要合**：两格的算式逐行相同（`let node = names[0].NameNode` + 一个从 `i = 1` 起的循环 +
`pos: node.pos` / `end: right.end`），差别只有 `kind` 与两个字段名——
而它们**本来就是一问的两面**：「这一串名字该折成哪一种点号链」。所以留一格、按 `kind` 分派。

| `kindOf` | 用在哪 | 两个字段名 |
| --- | --- | --- |
| `PropertyAccessExpression`（默认） | 值位：`ExpressionWithTypeArguments` 里的 `extends globalThis.Iterator`（TS 是 `PropertyAccessExpression`） | `expression` / `name` |
| `QualifiedName` | 类型位：类型引用的名字、导入类型的限定名（见 `projectTypeExpression`） | `left` / `right` |

**两者别混**：`ExpressionWithTypeArguments` 里用的是 `PropertyAccessExpression`，
`QualifiedName` 是**类型引用**那一支的写法——所以 `kindOf` 由调用方给，这一格不猜。

```ts
  const kind = kindOf ?? "PropertyAccessExpression";
  let node = names[0].NameNode;
  for (let i = 1; i < names.length; i++) {
    const right = names[i].NameNode;
    node = kind === "QualifiedName"
      ? { kind, left: node, right, pos: node.pos, end: right.end }
      : { kind, expression: node, name: right, pos: node.pos, end: right.end };
  }
  return node;
```

# private method projectExport:(v:any, ctx:any, following:Array<any>, stmtEnd:int)=>any

`export = X` / `export default X` → `ExportAssignment`（`expression`）。

产物那边这两种在 `Export` 单元**外面**：`Statement > [Export(含 export/=), 表达式]`
（`export = strict`）或 `Statement > [Export(含 export/default), 表达式]`——
于是通用投影把 `Export` 投成 `ExportDeclaration`、真正的表达式留成一个平级的
`ExpressionStatement`（真实语料 `ExportAssignment` 849 处里，`expression` 整个丢掉的
与 `Identifier` 缺 1149 处同源）。

判据：那个 `Export` 单元后面还有子单元（`export { a }` / `import` 那一族没有）——
有就跟上来的整段收成 `expression`，区间从 `export` 到表达式末尾。

`stmtEnd` 是**外头那一格 `Statement` 的终点**（`projectStatement` 递进来的）：
具名导出的尾分号算在 `ExportDeclaration` 里，可它**不在 `Export` 单元的区间里** ——
解析期 `Export.Process` 一遇到 `;` 就停，把那一个字符留给了语句（见 `tokens/export.xl.md`）。

```ts
  const kids = v.ProjectableKids;
  // **`export default interface I {}` / `export class C {}` 是声明自己带修饰词**
  // （第 153 轮）：TS 那边是 `InterfaceDeclaration.modifiers = [ExportKeyword, DefaultKeyword]`，
  // 而产物是 `[Export([Keyword(export), Keyword(default)]), Interface(…)]` 两格平级。
  // 照「`default` 后面跟表达式」那一支投会得到一个 `ExportAssignment` 包着整条接口声明
  // （实测 `decl-interface-export-default.ts`：缺 `InterfaceDeclaration` / `ExportKeyword` /
  // `DefaultKeyword`，多出 `ExportAssignment`）。
  const declared = (following ?? []).find(
    (k) => k instanceof Token && k.IsDeclarationUnit,
  );
  if (declared !== undefined) {
    const node = projectNode(declared, ctx);
    if (node !== undefined) {
      const words = v.ProjectableKids.filter(
        (k) =>
          k.IsNameNode &&
          (k.IsExportKeyword === true || k.IsDefaultKeyword === true),
      );
      const mods = words.map((word) => ({
        kind: word.IsExportKeyword === true ? "ExportKeyword" : "DefaultKeyword",
        text: word.TextValue,
        pos: startOf(word),
        end: endOf(word),
      }));
      if (mods.length > 0) {
        node.modifiers = [...mods, ...(node.modifiers ?? [])];
        // **区间从 `export` 那个词起**：TS 的 `Node.getStart()` 跳过前导 trivia，
        // 于是带修饰词的声明就是从 `export` 起（实测漂移：产物 96 vs TS 81）。
        node.pos = Math.min(node.pos ?? mods[0].pos, mods[0].pos);
      }
      return node;
    }
  }
  const rest = kids.filter((k) => k.IsExportKeyword !== true);
  // **`export = X` / `export default X` 的 `Export` 单元自己就是一格**（第 534 轮实测）：
  // 关掉 reorg 之后这一支走的是「解析期只把**前缀两个词**收进 `Export`」那条路
  //（`export.xl.md` 的构造函数那一段写着这条路），所以 `rest` 里那一格的文本是
  // **`"export default"` / `"export ="`**，而不是两格 `Keyword` ——
  // 原来那句「`rest` 里有 `Keyword(default)`」于是永远为假 ⇒ 整条落到最后的
  // `ExportDeclaration`（实测 `am-declare-module-css.ts`：缺 `ExportAssignment` +
  // 缺它的 `Identifier(c)`、多出 `ExportDeclaration`）。
  // **判据改成「那一格的文本里有没有 `default` / `=` 这个尾词」**：
  // 两种形状（`Export` 一格 / 两格 `Keyword`）都认，判的仍是「这是不是赋值式导出」。
  const wordTail = (k: any) => {
    const parts = k.TextValue.trim().split(/\s+/);
    return parts[parts.length - 1];
  };
  const isWord = (k: any, text: string) =>
    (k.IsNameNode || k.IsExportUnit) &&
    (k.TextValue === text || wordTail(k) === text);
  const isAssignment =
    rest.some((k) => k.IsEqualsSymbol) ||
    rest.some((k) => isWord(k, "default") || wordTail(k) === "=");
  // 等号 / `default` 之后的表达式：`Export` 单元里剩下的 + 语句里跟在它后面的兄弟。
  const inUnit = rest.filter(
    (k) =>
      !k.IsEqualsSymbol &&
      !isWord(k, "default") &&
      wordTail(k) !== "=",
  );
  const expr = [...inUnit, ...(following ?? [])].filter(
    (k) => k instanceof Token && k.IsSemicolonSymbol !== true,
  );
  if (isAssignment && expr.length > 0) {
    const value = projectExpression(expr, ctx);
    if (value !== undefined) {
      // **尾分号算在 `ExportAssignment` 里**（`export = strict;` 的 TS 是 `[23,39)`，含 `;`）
      //——与第 33 轮记的「没有函数体的可调用签名要带尾分号」同一条口径。
      //
      // **尾分号那一格要跨过 trivia 才看得见**（第 909 轮片段普查量出的
      // `gap-r907-export-default-assignment-trailing-comment`）：`export default 1/*c*/;` 里
      // `end` 落在 `1` 之后，紧挨着的那个字符是**注释的开头** ⇒ 原来那句
      // `ctx.source[end] === ";"` 给否 ⇒ 区间停在 `1` 之后（实测产物 `[0,16)`、TS 是 `[0,22)`）。
      // 所以先把空白与注释跳过去再问一次「是不是 `;`」——注释是 trivia，
      // 与第 817 轮那条线一致（`export default 1/*c*/ ;` 的 TS 也是 `[0,23)`，含那个 `;`）。
      // **换行也一起跳**：`export default 1` 换行 `;` 在 TS 那边同样是 `[0,18)`（含 `;`）。
      const end = endOf(expr[expr.length - 1]);
      let semiAt = end;
      while (semiAt < ctx.source.length) {
        const one = ctx.source[semiAt];
        if (one === " " || one === "\t" || one === "\r" || one === "\n") {
          semiAt = semiAt + 1;
          continue;
        }
        if (one === "/" && ctx.source[semiAt + 1] === "*") {
          const close = ctx.source.indexOf("*/", semiAt + 2);
          if (close < 0) {
            break;
          }
          semiAt = close + 2;
          continue;
        }
        if (one === "/" && ctx.source[semiAt + 1] === "/") {
          const line = ctx.source.indexOf("\n", semiAt + 2);
          if (line < 0) {
            break;
          }
          semiAt = line;
          continue;
        }
        break;
      }
      return {
        kind: "ExportAssignment",
        expression: value,
        pos: v.start,
        end: ctx.source[semiAt] === ";" ? semiAt + 1 : end,
      };
    }
  }
  // 具名导出（`export { a as b, c, type D }`）与模块名走 `namedExportClause`（第 87 轮）：
  // 尾分号算在 `ExportDeclaration` 里（TS 的 `export { a };` 是 [0,14)，含 `;`）。
  //
  // **终点取的是语句那一格**（第 548 轮）：那个 `;` 不在 `Export` 单元自己的区间里
  // （`Export.Process` 遇到 `;` 就停，字符留给语句）——照抄单元自己的终点会**差一格**。
  // 少了这一条实测怎样：`export { a };` 一族 **九份**文件各得一处**漂移** + 一处**多出来**
  //（`mod-export-named-list.ts` / `mod-export-star.ts` / `mod-export-named-alias.ts` …，
  // 全是同一个形状：产物 `[71,83)` 对 TS `[71,84)`）。
  return {
    kind: "ExportDeclaration",
    pos: v.start,
    // **区间从这一格 token 自己身上取**（第 93 轮修）：`stmtEndOf` 读的是 `v.start` / `v.end`，
    // 起点与终点都落在这一格上。少了这一条实测怎样：终点变成 `undefined`、投影出来的
    // `ExportDeclaration` 成了零宽区间：实测 108 处漂移 + 108 处「多出来」
    //（同一个节点两边各记一次）。而 `stmtEnd` 是外头那一格 `Statement` 已经算好的整数。
    end: stmtEnd,
    ...namedExportClause(v, ctx),
  };
```

# private method namedExportClause:(v:any, ctx:any)=>any

**具名导出**（第 87 轮）：`export { a as b, c, type D }` 的产物是
`[Keyword(export), Bracket{ a as b, c, type D }]`，而 TS 那边是

    ExportDeclaration[0,29)  exportClause:NamedExports[7,28)
                             └ elements: ExportSpecifier[9,15)  propertyName:a  name:b
                                         ExportSpecifier[17,18) name:c
                                         ExportSpecifier[20,26) name:D

照通用投影会把括号里每个单元（**包括 `as` 与 `type` 两个词**）投成平级子节点——
实测「多出来」里 `Identifier` 234 个就是那个 `as`，而 `ExportSpecifier` 缺 134 个。
所以这里自己造 `NamedExports`（区间含那对花括号）与 `ExportSpecifier`
（`as` 不出现、`type` 也不出现：TS 那边它是标志、连区间都算在 specifier 里）。

```ts
  const kids = v.ProjectableKids;
  const props = {};
  // **导出属性 `with { … }` / `assert { … }`**（第 666 轮）：与导入那一侧同一条口径
  // （第 136 轮，写在 `import.xl.md` 的 `PrintAst` 里）。产物把
  // `[Keyword(with), Bracket({…})]` 平铺在模块说明符之后，而 TS 那边是
  // `ExportDeclaration.assertClause`；不摘出来的话它会被下面那一句当成具名导出的括号
  //（`export * from "m" with { … }` 里唯一的 `{` 就是它）。
  const assertUnits: Array<any> = [];
  const braces: Array<any> = [];
  for (let i = 0; i < kids.length; i++) {
    const one = kids[i];
    if (one.IsBraceBracket) {
      braces.push(one);
      const word = i > 0 ? kids[i - 1] : undefined;
      const wordText = word === undefined ? "" : word.TextValue;
      if (wordText !== "with" && wordText !== "assert") continue;
      const elements: Array<any> = [];
      for (const part of splitTopLevel(one.ProjectableKids, ",")) {
        const colonAt = part.findIndex(
          (k: any) => k.IsColonSymbol,
        );
        if (colonAt < 0) continue;
        const nameUnit = part.slice(0, colonAt).find((k: any) => k.IsNameNode);
        if (nameUnit === undefined) continue;
        const valueUnit = part
          .slice(colonAt + 1)
          .find((k: any) => k.IsStringLiteralUnit);
        elements.push({
          kind: "AssertEntry",
          name: nameUnit.NameNode,
          value: valueUnit === undefined ? undefined : projectNode(valueUnit, ctx),
          pos: startOf(nameUnit),
          end: valueUnit === undefined ? endOf(nameUnit) : endOf(valueUnit),
        });
      }
      props.assertClause = {
        kind: "AssertClause",
        elements,
        pos: startOf(word),
        end: endOf(one),
      };
      assertUnits.push(word, one);
    }
  }
  const brace = braces.find((k) => assertUnits.includes(k) === false);
  if (brace !== undefined) {
    const open = startOf(brace);
    const close = endOf(brace);
    props.exportClause = {
      kind: "NamedExports",
      elements: namedSpecifiersOf(brace, "ExportSpecifier", ctx),
      pos: open,
      end: close,
    };
  }
  // **`export * as ns from "m"`**（第 165 轮）：TS 那边 `exportClause` 是一个
  // `NamespaceExport`（区间从 `*` 到那个名字的末尾，`Identifier` 是它的子节点）。
  // 产物那一段是 `[*, Keyword(as), Identifier(ns)]` 平级三格——不收的话
  // `ExportDeclaration` 少一整个 `exportClause` 字段、缺 `NamespaceExport` + `Identifier`
  // （实测 `ex-reexport.ts` / `mod-export-star-as-namespace.ts` / `mod-adversarial-shapes.ts`）。
  const star = kids.find((k) => k.IsAsteriskSymbol);
  if (brace === undefined && star !== undefined) {
    const asIndex = kids.findIndex((k) => k.IsAsKeyword === true);
    const nameNode = asIndex < 0 ? undefined : kids[asIndex + 1];
    if (nameNode !== undefined) {
      props.exportClause = {
        kind: "NamespaceExport",
        name: projectNode(nameNode, ctx),
        pos: startOf(star),
        end: endOf(nameNode),
      };
    }
  }
  // `export { a } from "m"` 的模块名（TS：`moduleSpecifier`，与 `exportClause` 并列）。
  // **括号那一档**（第 877 轮）：`from("m")` 的字符串在 `Method(name="from")` **里面**
  // ⇒ 那个 `Method` 就是 TS 的 `ParenthesizedExpression`（`moduleSpecifier` 仍是括号**里**那个
  // `StringLiteral`，与 TS 一致：语义报错是「模块名不是字符串字面量」，语法树里那对括号还在）。
  // 少了这一句实测缺 `ParenthesizedExpression` 一格。
  //
  // **第 1087 轮把 `moduleSpecifierIn` / `moduleHolderOf` 两格并进了这里**（判据与第 1043 /
  // 1044 / 1070 / 1080 轮并掉那些「一格声明、一个调用点」的转发同一把尺子）：两格全仓只有
  // 这一个读者，所以连同它们那两节一起并进这个唯一的调用点，本页少两格声明。
  // **两次扫描的先后口径是整个照抄的**（不能合成一句 `find`）：**先**在 `kids` 这一层找
  // `String`，**找不到才**往 `Method` 里面看一层——`export { a } ⏎ from("m")` 里那个
  // `from` 被 `MethodCloseRule` 收成了 `Method(name="from")`、字符串在它里面，
  // 而这条语句的 `kids` 里**同时**还有别的 `String` 子单元（具名子句里的字符串名）。
  // **只往 `Method` 里面看**、**不能一律递归**：`export { "a-b" as c }` 的字符串名在具名
  // 子句的**花括号里**，那是 `ExportSpecifier` 的名字、不是模块路径
  //（实测 `mod-export-string-name` 当场红：字段名差 1）；而 `inner === module_` 那一比较
  // 保证收的仍然是**同一个**字符串（第 1087 轮第一版把它写成一句 `find`，先后口径一颠倒，
  // `gap-r68-9-exp-named-nlw-in-then-from-like` 当场从 `moduleSpecifier` 漂成 `moduleSpecifiers`）。
  let module_: any = undefined;
  for (const kid of kids) {
    if (!(kid instanceof Token)) continue;
    if (kid.IsStringUnit) {
      module_ = kid;
      break;
    }
  }
  if (module_ === undefined) {
    for (const kid of kids) {
      if (!(kid instanceof Token) || kid.IsMethodNode === false) continue;
      const one = kid;
      // **第 1073 轮量过等价、改成读属性**：这里原来读 `allKids(one)`（含 trivia 的完整子单元表），
      // 而 `Method` 那一页**没有声明 `Segments`**，所以基类那句 `ProjectableKids` 在它身上
      // 是不是同一个集合第 1067 / 1072 轮一直没量过（台账里如实留着）。第 1073 轮用一把一次性
      // 探针量了：在构建产物上把那两处 `allKids(one)` 换成 `one.ProjectableKids`，跑 `cases:tsast`
      // （16 片全绿、3 条已知缺口不变）、`samples`（逐字节一致）、`cases:direct`（1640 份 0 抛异常）
      // ——**读数一处没动**，所以两个集合在这一格上同答（`Method` 的子单元里没有 `IsInvisible` 的）。
      // 探针用完即还原，源码照改。
      for (const inner of one.ProjectableKids) {
        if (inner instanceof Token && inner.IsStringUnit) {
          module_ = inner;
          break;
        }
      }
      if (module_ !== undefined) break;
    }
  }
  if (module_ !== undefined) {
    const projected = projectNode(module_, ctx);
    // `moduleHolderOf`：那个字符串**装在谁里面**（它自己就在 `kids` 这一层时给 `undefined`）。
    let moduleHolder: any = undefined;
    for (const kid of kids) {
      if (!(kid instanceof Token) || kid.IsMethodNode === false) continue;
      const one = kid;
      for (const inner of one.ProjectableKids) {
        if (inner === module_) moduleHolder = kid;
      }
    }
    if (moduleHolder === undefined) {
      props.moduleSpecifier = projected;
    } else {
      // **括号那一档**（第 877 轮）：`from("m")` 里那个字符串装在
      // `Method(name="from")` 里面（`Method` 自己把实参表**摊平**进 `children`，
      // 所以 `moduleHolder` 就是那个 `Method`）——TS 那边这条语句仍是一条 `ExportDeclaration`，
      // 而那一格是 `ParenthesizedExpression`（`moduleSpecifier` 是括号**里**那个
      // `StringLiteral`：语义上会报「模块名不是字符串字面量」，语法树上那对括号还在）。
      // 少了它实测缺 `ParenthesizedExpression` 一格。
      //
      // **区间两头都从那个字符串推**：TS 给的是 `[17,22)`，而字符串自己的区间是 `[19,22)`
      // ⇒ 起点是字符串起点**减一**（那个 `(` —— `from` 那两个字符不算），终点是字符串终点**加一**
      //（`endOf` 在这一层给的是**闭**右端，见 `ctx.ParenthesizedOf` 那条出口里就地写的那一份
      // 算式——那一格私有声明第 1112 轮已并进它的调用点；
      // 而 TS 的 `ParenthesizedExpression` **不含**那个右括号）。照 `Method` 自己的两端给会多出
      // 一格 `[13,22)`（把 `from` 也圈进去，实测「缺一格 + 多一格」两边各差一格）。
      props.moduleSpecifier = {
        kind: "ParenthesizedExpression",
        expression: projected,
        pos: Math.max(0, startOf(module_) - 1),
        end: endOf(module_) + 1,
      };
    }
  }
  return props;
```

（**`braceSpanOf` 这一格第 1087 轮删掉了**：它全仓只有 `bodyBlockOf` / `blockOfBody` 两个读者，
而函数体就是「这一格记了没有 + 两头取出来」四句，所以连同这一节一起并进那两处调用点——
按第 1043 / 1044 / 1070 / 1080 轮那把尺子：**一个声明只有一两个转手读者，就是多一层间接**。
它原来收的仍然是各页自己显式声明、**挂体那一刻**就赋好的那一格 `BodyBrace`
（`## field BodyBrace:TokenField<number>`：`While` / `For` / `Foreach` / `DoWhile` / `IfSegment` /
`Lamda` 六页同一条口径、同一个类型），**同一格事实只有一处来源**这一点没变；
变的只是「拆两头」这三句从本页的一格声明挪到了那两个读者里（用户口径 1.1~1.4 的另一半：
投影要的东西由 token 在构造时备齐，投影这一侧就不该再留一层只为读它而存在的壳）。

它原来把 token 记下的**整对花括号**读成 `[起, 止]`（闭区间）、没记过给 `null`；
**第 1081 轮起收的就已经是各页自己显式声明的那一格 `BodyBrace`**（`TokenField<number>`，
**挂体那一刻**就赋好）。更早收的是一个 `"起,止"` 字符串（六页各自那一格 `bodyBraceRange`），
而那个字符串**是产品格式**（XML 直接拿 `BodyBrace.Range` 印它，页内也自己从同一格拼出来），
投影拿它再拆一遍就是**同一格事实的第二处答案**——所以那六格 `bodyBraceRange` 整格删掉，
投影直读构造时赋好的那一格（用户口径 1.1~1.4：token 子类构造完，信息就齐）。

**为什么读这一格**（用户口径：token 出字段、投影直读）：**挂体那一刻那个 `Bracket` 就在手上**
⇒ 两端都是**事实**。投影原来只能回原文找 `{` 再 `MatchingBrace` 扫一遍，那一趟会被块里的
字符串或注释里的假括号骗到（`if (a) { s = "{" }` 就是它）。

# private method splitTopLevel:(kids:Array<any>, separator:string)=>Array<Array<any>>

把一串单元按**顶层分隔符**切成若干组（分隔符自己不进任何一组）。

对象字面量的成员（`,`）、数组字面量的元素（`,`）、类型容器的成员（`|` / `&` / `,`）
都是这一种切法——`typeMemberGroups` 是它在类型位的那一份（分隔符问容器自己那一格
`Token.TypeMemberPlan`，第 1035 轮），这里这份给**值位**用。

```ts
  const groups = [];
  let current = [];
  for (const kid of kids) {
    // **逗号那一格自己答**（第 1074 轮）：`separator` 在这里不只逗号
    // （`projectTypeExpression` 的联合 / 交叉给的是 `|` / `&`），所以判据是
    // 「正文等于 separator」**加上**「逗号那一态读它自己的属性」——
    // 与改写前的 `Tag === "SymbolToken" && TextValue === separator` 逐格等价。
    //
    // **为什么逗号那半句不能收掉**（第 1142 轮量过、如实留着）：`separator` 到这一格时
    // 是一个**运行期字符串**（`","` / `"|"` / `"&"` 都从这里过），所以「正文等于它」
    // 只能读 `TextValue` 比一次；而逗号与 `|` / `&` 分处**两页**
    // （`,` 是 `SymbolToken`、`|` / `&` 是 `BinaryOperator`，见第 1107 轮那一条），
    // 逗号那一页另答一格自己的属性。这一句因此是**两页各答自己那一问**的合取，
    // 不是同一格事实抄两遍——收掉它会让逗号按「正文相等」单独成立，
    // 与第 1074 轮立那一格的理由（逗号要自己认）反着走。
    if (kid.TextValue === separator && (separator !== "," || kid.IsCommaSymbol)) {
      groups.push(current);
      current = [];
      continue;
    }
    current.push(kid);
  }
  groups.push(current);
  return groups.filter((group) => group.length > 0);
```

# private method typeOf:(nodes:Array<any>, ctx:any)=>any

右值那一段单元 → 一个类型节点（`TypeDefine` 摊平；空段给 `undefined`）。

**走的是类型位的投影**（`projectTypeExpression`），不是逐个单元的通用投影：
类型别名 / 约束 / 联合成员这些位置上，`A<any>` 是**一个** `TypeReference`（同一区间两层节点），
早期那版按「第一个单元」投，于是实参整片丢掉（真实语料 `TypeReference` 缺 2087、
`AnyKeyword` 缺 1408 里的一大块都是这一条：`Array<any>` / `T extends any[]` 的实参没成形）。

```ts
  const list = nodes.filter((k) => k instanceof Token && !k.IsInvisible);
  if (list.length === 0) return undefined;
  return projectTypeExpression(list, ctx);
```

# private method computedNameExpression:(unit:any, ctx:any)=>any

```ts
  const kids = unit.ProjectableKids;
  const names = kids.filter((k) => k.IsNameNode);
  const dots = kids.filter((k) => k.IsDotSymbol).length;
  if (dots > 0 && names.length === dots + 1) return dottedExpression(names);
  // **单个子单元也走 `projectExpression`**（第 954 轮）：原来这里是「一格直接 `projectNode`」，
  // 于是 `{ [(x in y)]: 1 }` 那一格——计算名里**套一层圆括号**——投出一格裸 `Bracket`
  //（未映射），而 TS 那边是 `ComputedPropertyName > ParenthesizedExpression > BinaryExpression`
  //（实测缺 `ParenthesizedExpression` 1、多未映射 `Bracket` 1，与 `in` 无关：
  // `{ [(a + b)]: 1 }` / `{ [(f(x))]: 1 }` 同形）。**判据一条没新写**：值位括号 →
  // `ParenthesizedExpression` 那一条长在 `projectExpression` 里（见那里 0a 之前那一支），
  // 这里只是把单格也交给它问一次；单个非括号单元仍落到它的末尾那一句
  //（`return projectNode(kids[0], ctx)`）——与原来逐格同一结果。
  return projectExpression(kids, ctx);
```

# private method structuralProps:(v:any, kind:string, ctx:any)=>any

结构类节点的字段（按 kind 给 TS 的字段名）。

**包装节点要提上去**（见 `Token.WrapperField`）：`ClassBody` 的内容成为 `ClassDeclaration.members`、
`ReturnType` 的内容成为 `FunctionDeclaration.type`、`Bracket` 的内容并进 `children`——
**提哪一层、叫什么，由那个子单元自己答**（`wrapperTarget` 只是转问它）。

```ts
  // **段名那一格就地取**（第 1109 轮）：它原来是本页一格 `fieldNameFor(kind, key, node)`
  // （唯一读者就是这一格函数里的两处），而它问的正是「这一段是哪个 token 切的、那一格答什么」
  // ——按第 1103 / 1104 轮那把尺子（一格声明、只有本函数两处读者、函数体就是一次读表），
  // 整段搬进这一格函数，本页少一格声明。
  //
  // **第 1145 轮：双探收成一次 `get`**（用户口径 1.6「投影成本趋于 0」）。
  // 原样是 `for (const name of kind === undefined ? [tag] : [kind, tag])` ——每个段都要
  // 造一个数组、读一次 `node.Tag`、做一到两次 `Map` 探查。**实测**（打桩在 `dist` 上跑
  // `cases:direct` 的全语料 1640 份、531 次命中）：第二把键 `tag` **一次都没命中过**
  // （`tagHitAfterKindMiss: 0`），而 `kind === undefined` 那一支**一次都没走到**
  // （`kindUndefined: 0`）；531 次里还有 **212 次**两把键是**同一个串**——同一个键问了两遍。
  // 根因是各页 `SegmentNames` 的外层键**实测全是目标 kind 名**
  // （`ClassBody` 那一页写的是 `ClassDeclaration`，`ForBody` 写的是 `Block`…），
  // 而 `kind` 这一格拿到的**就是**那个目标 kind ⇒ 一把键就够。
  // `table.size === 0` 那一句也一并去掉：空表上 `get` 本来就给 `undefined`，
  // 落进下面那句 `instanceof Map` 判否、答案与原来相同。
  const fieldOf = (kind: string, key: string, node: any): string => {
    if (node === undefined) return key;
    const table = node.SegmentNames;
    if (!(table instanceof Map)) return key;
    const inner = table.get(kind);
    if (!(inner instanceof Map)) return key;
    const field = inner.get(key);
    return typeof field === "string" ? field : key;
  };
  const props = {};
  const used = new Set();
  // **装饰器要收成修饰词**（第 95 轮）：TS 把 `@Component({…})` 放在被装饰声明的
  // `modifiers` 里（第一格），而产物把它平铺在声明下面——不收出来有两个后果：
  // `Decorator` 整类缺（实测 12 处），以及 `ClassDeclaration.children` 被当成继承段
  // （`heritageClauses` 字段凭空多出，因为那张表把 `children` 映射成了 `heritageClauses`）。
  const decorators = [];
  // **`name` 按这一格自己的那一格事实给**（第 1008 轮；第 1068 轮起直读 `DeclaredName`），
  // 不维护 kind 白名单——白名单漏一个 kind，
  // 「字段名对拍」就多一处看不出根因的假差异；也不把同一格事实抄成几处。
  // 命名空间那个例外也随之消失：`namespace` 是各页 `NameField` 自己答的那一格之一。
  const rawName = v.DeclaredName;
  // **属性里那个名字也要解转义**（第 381 轮）：`const \u0061bc = 1` 的名字住在
  // `Let.fieldName` 这个**属性**上（不是子单元），`x.\u0061` 的键同理。
  // **与 `Identifier.PrintAst` 共用一份解码**（`text-common-util.xl.md` 的
  // `DecodeIdentifierEscapes`）——两处各写一份就是两处会漂的答案（这一轮第一版
  // 只改了标识符那一格，于是 `function f\u0066()` 绿了、`const \u0061bc` 还是红的）。
  const name = typeof rawName === "string" ? rawName : "";
  let nameNode = null;
  // 计算属性名的那个单元（`[Symbol.toPrimitive]`）；它在下面的段循环里要**跳过**。
  let computedUnit = null;
  // **`Constructor` 没有 `name` 字段**（TS 的类构造就是一个匿名的函数式声明）：
  // 产物那边它带着 `name="constructor"`，照抄会多出一个 TS 不认的 `Identifier`
  // 挂在构造下（那一格一直对不上）。
  if (name !== "" && kind === "Constructor") {
    used.add("name");
  } else {
    // **名字走共用判据**（见 `memberNameOf`）：`Identifier` / `StringLiteral`（引号名）/
    // `NumericLiteral`（数字名）/ `ComputedPropertyName`（计算名）四态在这里分派，
    // `projectField` 用的是同一份。
    const named = memberNameOf(v, ctx);
    computedUnit = named.computed;
    nameNode = named.unit;
    if (named.name !== undefined) {
      props.name = named.name;
    }
    if (named.name !== undefined || named.computed !== null) {
      used.add("name");
      used.add("fieldName");
      used.add("namespace");
    }
  }
  for (const key of v.Segments) {
    const raw = v[key];
    if (used.has(key) || !Array.isArray(raw)) continue;
    // **只收节点数组**：`modifiers` / `imports` / `decorators` 是**属性**（字符串数组），
    // 混进来会凭空多出一个字段，把「字段名对拍」搅成假差异。
    if (!raw.some((x) => x instanceof Token)) continue;
    const kept = [];
    const promoted = new Map();
    for (const x of raw) {
      if (!(x instanceof Token) || x.IsInvisible) continue;
      // 名字那个单元已经进 `props.name` 了，不要再当成子节点收一遍。
      if (x === nameNode || x === computedUnit) continue;
      // **私有名的组成单元也要跳过**（第 138 轮）：`#m` 在产物里是
      // `[SymbolToken(#), Identifier(m)]` **两格**，而 `props.name` 是从 `name` 属性合成的
      // **一个** `PrivateIdentifier`（`nameNode` 因此是 `null`）——两格都会漏进
      // `parameters`，多出一个 `#` 与一个 `Identifier(m)`
      // （实测 `decl-class-private-method` / `lex-private-method`：多出 6 + 字段名 3）。
      // 只对 `PrivateIdentifier` 生效：`namespace A.B.C` 那种合成名**确实**跨着里面的几格，
      // 按区间一刀切会把它们全丢掉。
      //
      // **两端都是「开区间终点」**（`endOf` = `range[1] + 1`），所以里面那几格的判据是
      // `endOf(x) <= name.end`——写成 `<` 时最后那一格（`m`）会漏掉，只剩 `#` 被吃掉。
      if (
        nameNode === null &&
        props.name !== undefined &&
        props.name.kind === "PrivateIdentifier" &&
        startOf(x) >= props.name.pos &&
        endOf(x) <= props.name.end
      ) {
        continue;
      }
      // **可选方法 / 方法签名的 `?` 是字段、不是子节点**（第 93 轮修）：TS 的
      // `MethodSignature > [name, questionToken, type]`，而产物把它平铺在 `children` 里
      // （`MethodDeclaration > [?, Bracket(形参), ReturnType]`）——不收出来它会跟着
      // 形参表落进 `parameters`（实测字段名差 149 处）。
      if (
        (kind === "MethodSignature" || kind === "MethodDeclaration") &&
        x.IsQuestionSymbol === true
      ) {
        const questionAt = startOf(x);
        props.questionToken = { kind: "QuestionToken", text: "?", pos: questionAt, end: questionAt + 1 };
        continue;
      }
      // **装饰器是修饰词、不是子节点**（见上面 `decorators`）。
      if (x.IsDecoratorUnit) {
        decorators.push(x);
        continue;
      }
      // **体节点**：改字段名，但自己仍是一个节点（见 `Token.BodyField`）。
      // **读那个子单元自己那一格**：「我是体、我在父节点上叫哪个字段」是它的事实——
      // 第 1045 轮起它是**构造时（或那一趟记下这个事实时）赋好的属性**，
      // 所以投影只读属性名（`x.BodyField`），没有参数、也没有「有没有这一格」这一问。
      // `Namespace` 那唯一一处带上下文的（点号命名空间的内层）由它自己那一页在
      // **造出内层的那一刻**赋好，父 kind 不再往里递。
      const body = x.BodyField;
      if (body !== undefined) {
        props[body] = projectNode(x, ctx);
        continue;
      }
      // **包装提层**（见 `Token.WrapperField`）：三种答案——字段名（提到那一格）、
      // `null`（并进父节点的 `children`）、`undefined`（不是包装）。后两者**必须分开**：
      // 合成一个值会让分组括号变成节点，或者让块被摊平（后者是静默错值——块里的语句会被
      // 并到父节点语句表末尾，顺序与源码相反）。
      // **第 1045 轮起它是属性**：`GenericType` 在造出 `TypeParameter` 的那一趟把自己赋成
      // `"typeParameters"`、`Bracket` 在 `Use` 记下 `startBracket` 的那一趟赋值（见各自那一页），
      // 所以投影只读属性名，不再调一个现场判据。
      const target = x.WrapperField;
      if (target === undefined) {
        kept.push(x);
        continue;
      }
      const bucketKey = target ?? "children";
      const bucket = promoted.get(bucketKey) ?? [];
      for (const inner of x.ProjectableKids) bucket.push(inner);
      promoted.set(bucketKey, bucket);
    }
    if (kept.length > 0) {
      // **段名先问这一格的主人**（第 988 轮）：`kept[0]` 只是这一段的第一个单元，
      // 而段是 `v` 这一格切出来的——所以问 `v`，字段名归它。
      const field = fieldOf(kind, key, v);
      // 同一字段**只写一次**（后写的会覆盖前写的）：一个 kind 的同一字段可能来自两处
      // （例如 `Bracket` 摊平出来的形参与自己的 `children`），合并而不是覆盖。
      const already = props[field];
      // **以 `Let` 开头的段**（`for (let i = 0; …)` 的头部）：TS 那边这个字段**直接就是
      // `VariableDeclarationList`**（不套 `VariableStatement`），而初值是这个段里的平级兄弟——
      // 所以整段交给列表版去投，不能逐个单元投。
      const projected =
        kept[0].IsLetUnit
          ? [projectLetFrom(kept, ctx, (kept[kept.length - 1])).list]
          : projectEachIn(kept, ctx, v);
      props[field] = Array.isArray(already) ? already.concat(projected) : projected;
    }
    for (const [target, nodes] of promoted) {
      if (nodes.length === 0) continue;
      // **段名先问这一格的主人**（第 988 轮）：`target` 已经是投影的字段名
      // （`WrapperTarget` 给的：`ClassBody` → `members`、`GenericType` → `typeParameters`…），
      // 所以这里问的是「**同一张表**里另写的那些叫法」——问的是 `v`（这一格自己、也就是
      // 切出这个段的那张 token），**不是**包装单元或它的内容：
      // 段是这一格切出来的，字段名归它。
      //
      // **这里踩过一次**（第 988 轮，`samples` 当场抓出）：「问内容」在 `GenericType`
      // 这种**每个 token 都可能有**的包装上会落空——`Class` 的 `children` 里第一格是
      // `GenericType`，它的 `SegmentNames` 里没有 `ClassDeclaration` 这一档
      // ⇒ 查不到 ⇒ `ClassDeclaration.heritageClauses` 整格变成 `types`，而
      // `cases:tsast` 只看 kind / 区间 / 字段名**集合**，这一格恰好两边都在（只是名字换了）
      // 所以它是绿的。`samples` 是逐字节比，它当场报出来。
      const field = target === "children" ? fieldOf(kind, key, v) : fieldOf(kind, target, v);
      const already = props[field];
      // **包装体的成员拿到的是「外层声明」那一格 `v`**：`ClassBody` 的成员属于
      // `ClassDeclaration`（类里的 `constructor` 要按这个上下文投成 `Constructor`），
      // 而**那一格事实现在由 `v` 自己答**（`IsClassBody` / `IsSignatureList`，第 1054 / 1055 轮）
      // ——第 1056 轮把在这里算出来的那个 kind 名（`membersParent`）删掉了，不必再转手一次。
      const projected = projectEachIn(nodes, ctx, v);
      props[field] = Array.isArray(already) ? already.concat(projected) : projected;
    }
  }
  // 修饰词：产物那边是字符串，TS 那边是一串节点（见 `addModifiers` 的说明）。
  addModifiers(v, props, ctx);
  // **装饰器并进 `modifiers` 并按源码位置排序**（见 `addDecorators`）：TS 的 `modifiers` 是源码顺序
  // （`@dec export class` 也好、`export class` 也好，谁在前谁先）。
  addDecorators(v, props, ctx);
  return props;
```

# private method statementOfList:(list:Array<any>, ctx:any)=>any

把一串**平铺的单元**当成**一条语句**投：造一个同区间的合成语句视图，交回 `projectStatement`。

**两个调用方问的是同一句**：`projectStatement` 的标签那一支（老形状下「标签右边剩下的那一串」）
与 `Label.PrintAst`（包好的标签里那一段）。`projectStatement` 那儿已经有「语句壳 / 表达式壳 /
`;` 归属」的全套口径，另写一份就是第二处会漂的答案。

```ts
  if (list.length === 0) {
    return undefined;
  }
  const rest: any = {
    Tag: () => "Statement",
    start: startOf(list[0]),
    end: endOf(list[list.length - 1]),
    value: undefined,
    children: list,
    // **这一格也要给出段名表与「进投影的子单元」**（第 1065 / 1066 轮）：它**不是** token
    // （`allKids` 与 `Token.ProjectableKids` 都只认这一格自己声明的东西，不再反射、也不再兜底），
    // 而这个合成本来就只有 `children` 一段、且 `list` 里一个不可见的都没有——所以照基类那两句
    // 给同一格（`Segments: ["children"]` 与 `ProjectableKids: list`）。
    Segments: ["children"],
    ProjectableKids: list,
  };
  return projectStatement(rest, ctx);
```

# method projectRoot:(exported:Array<any>, source:string)=>any

投影整棵树 → `ts.createSourceFile` 同形的单根节点。

三处**文件边界**的口径（实测出来的，两处都反直觉）：

- `SourceFile` 的 `getStart()` **不是 0**，而是**第一个 token 的位置**——
  前置注释与空行都算前导 trivia。本工程的区间本来就不含前导 trivia，
  所以根的起点就取第一个语句的起点（没有语句时退回 0）；
- `SourceFile.end` 是**文件长度**（含尾部的换行）；
- `EndOfFileToken` 是**文件末尾的零宽节点**：`pos === end === 文件长度`，
  而且它在 `ts.forEachChild` 那一层**是可见的**（`forEachChild` 对 `SourceFile`
  先访问 `statements` 再访问 `endOfFileToken`）。整个语料每份文件各一个，**不改它就一直缺**。

返回 `{ ast, unmapped, count }`：`unmapped` 是这次没覆盖到、**并且真的原样透传进了产物**的
产物标签；`count` 是投影出的节点数。

**还返回 `direct`**（第 992 轮）：这一趟**由 token 自己的 `PrintAst` 出的节点数**。
它**不进任何退出码**——它是「这一格自己出不出」的读数（`cases:direct` 印 `direct / count`），
不是缺陷。

**第 1013 轮删掉了第三个参数 `useDirect`**：它原来是「要不要优先问 `PrintAst`」的开关，
而 `PrintAst` 那条老路与它的派发分支已经整条删除——这一趟只有一条路，开关没有第二种取值。

**为什么末尾要拿那把对账的尺子（`collectKinds`；第 1104 轮前是本页的 `kindsInAst`）对一次账**（第 199 轮）：`ctx.unmapped.add(v.type)` 记在
`projectNode` 的通用支里，而**有些调用点只是「问一下」这个子单元能投出什么**——
结果被调用方丢掉、根本不落进 AST（实测全语料 9137 处这样的访问，散布在 48 个文件里；
最典型的是各种参数括号 `(a, b)`：投影总是先问一遍再自己摊平）。
只按 `add` 记账，这一栏就是**噪声**：它数的是「投影路过谁」，不是「谁透传进了产物」。
透传节点的 `kind` 就是标签名本身（`mk(v.type, …)`），所以「这个标签名在产物里当过 kind」
正好等值于「它透传进了产物」——滤掉问路的那批之后这一栏才有判据的价值
（`cases:tsast` 的退出码已经把它算进去了）。

```ts
  const ctx = {
    source,
    unmapped: new Set(),
    count: 0,
    // **这一趟由 token 自己出的节点数**（第 992 轮；第 1013 轮起这一问是唯一的一条路）：
    // 它是「这一格自己出不出」的那把尺子（`cases:direct` 印它；`count` 是问到的次数，
    // 两者之比就是自己出的比例）。
    direct: 0,
    // **声明族直出版的「回落」那一格**（第 1002 轮）：`undefined` = 当前没有回落。
    // 它是**一个只认自己那一格的闭包**（见 `projectNode` 里那一支）：直出版把
    // 「造这一格形状」的事交回来时，`projectNode` 拿它造完就**不再问一次直出版**——
    // 于是「自己问自己」不会无限递归，而子节点照常各自被问。
    awaitingDeclaration: undefined,
    // **类型位标记**（第 99 轮）：`projectTypeExpression` 在投「只有一个单元」的类型时置上它，
    // 让**字符串那一页**知道该出 `TemplateLiteralType` 还是 `TemplateExpression`
    // （两者产物同形，只有这一点上下文能区分）。第 1073 轮起读它的那一页是
    // `String.PrintAst`（原来读它的是本页的 `projectString`）。
    typePosition: false,
    // **被上一条语句吃掉的 `;`**（第 141 轮）：TS 的 `parseExpressionStatement` 收尾会把
    // 紧跟的那个 `;` 算成自己的终结符（`tryParseSemicolon` 不看换行），所以那种 `;`
    // **不再**是一条 `EmptyStatement`。语句是按顺序投的，所以先吃后判、用这个集合对账。
    consumedSemicolons: new Set(),
    // **给 token 的 `PrintAst(ctx, v)` 用的出口助手**（见 `core/syntax/token.xl.md` 的 `PrintAst`）：
    // 覆写里不必 import 任何东西——造节点、投一批子单元、按成员切、取文本、分叶子名，
    // 全在这一组里。它们**逐个转调**上面那些共享实现，所以两条路的产物逐字节相同。
    Node: (kind, props, view) => astNode(kind, props, view, ctx),
    // **「就这一格的造节点闭包」**（第 1002 轮）：`ctx.Node` 是三参的（自己造一个**指定坐标**的
    // 节点，`view` 由调用方给），而声明族的直出版要的是**「这一格」**那一份——
    // 所以这里按同一份实现（`astNode`）把它闭好再递过去。
    // **为什么不让直出版直接传 `ctx.Node`**：那样第三个参数是 `undefined`，
    // 坐标口径当场散架（`stmtEndOf(undefined)` 抛异常）——「闭的是哪一格」不能交给
    // 「调用方记得传第三个参数」。
    // **第 1044 轮把 `astNodeFor` 那一层并了进来**：那一格本来就是「把同一个 `astNode` 按这一格
    // 的坐标闭好」的转发，只有这一个调用点；实现仍然只有 `astNode` 一处。
    Make: (view) => (kind: string, props: any) => astNode(kind, props, view, ctx),
    // **坐标在前的键序**（第 199 轮）：搬家前那批内联写法的节点用它——键序正是
    //
    //     return { kind: "ForStatement", pos: v.start, end: v.end, ...props };
    //
    // 第 181~198 轮把它们逐块搬进各 token 的 `PrintAst`、改走 `ctx.Node` 之后，键序变成了
    // 「props 在前、坐标在后」：**值一个没变，字节变了**。`samples` 的 `*.expected.tsast.json`
    // 是**逐字节**比的，它当场抓出 13 类；按第 96 轮那份实现（夹具就是它生成的）逐个 kind 对下来，
    // 共 **30 处构造点**（`ForStatement` / `TypeParameter` / `HeritageClause` / `SwitchStatement`、
    // `Field` 的两种 kind、`Foreach` 的两种 kind、`FunctionType` / `ConstructorType` …）。
    // `cases:tsast` 看不见这一条：它比 kind / 区间 / 字段名，比不了 JSON 的键序。
    //
    // 所以这一支只为「搬家前的键序」存在：**实现复用 `astNode`**（同一个坐标口径不抄第二遍），
    // 拿到结果后按 `kind` / `pos` / `end` 重新排一遍键——**值原封不动**。新写的节点用 `ctx.Node` 即可。
    // **第 1044 轮把 `astNodeHead` 那一格并了进来**：它本来就只有这一个调用点。
    NodeHead: (kind, props, view) => {
      const node = astNode(kind, props, view, ctx);
      const ordered: any = { kind: node.kind, pos: node.pos, end: node.end };
      for (const key of Object.keys(node)) {
        if (key === "kind" || key === "pos" || key === "end") {
          continue;
        }
        ordered[key] = node[key];
      }
      return ordered;
    },
    // **空段不写这一格**：通用支里 `structuralProps` 的段循环是「`kept.length > 0` 才写」，
    // 所以 `<TupleType></TupleType>`（空元组）在 TS 那边是 `{kind,pos,end}`、**没有** `elements`。
    // `undefined` 在 `JSON.stringify` 里不出现（`projectParameter` 的 `name` / `type` 也是这个写法），
    // 于是覆写与通用支的产物逐字节相同——这一条是第 77 轮对拍时抓出来的（10 个空元组 / 具名元组文件）。
    // **第二格（父 kind 名）第 1056 轮删掉了**：父单元**就是**第一个参数那一格 token，
    // 而「它是什么」由它自己的 `AstKind` / `IsClassBody` / `IsSignatureList` 答——
    // 所以这里不再由调用方转手一个 kind 名（那是同一格事实的第二处存储）。
    Each: (view) => {
      const out = projectEachIn(kidsOf(view, "children"), ctx, view);
      return out.length === 0 ? undefined : out;
    },
    Project: (node) => projectNode(node, ctx),
    // **`ValueOf` 这个出口第 1069 轮删掉了**（它原来就挂在这里）：它读的是「这一格自己记的
    // `value`」——`typeof one.value === "string" ? one.value : ""`——而 `value` 是**各页自己的
    // 一个字段**（`SymbolToken` / `Keyword` / 注释那一族 / `BlockToken`…）。按这一族的判据
    // （第 1041 / 1042 / 1057 那几条）：答案在**这一格自己**身上、而且**收完正文那一刻**就定下来了
    // ⇒ 第 1069 轮把它收成 `core/syntax/token.xl.md` 的 `Token.TextValue`（基类 `## property` +
    // `### get`，取值口径与这一格逐字符相同），16 页 58 处调用点全改成属性读。
    // 出口删了，同一格事实就不会有第二个入口；名字补进 `direct:lint` 的 `CTX_BANNED`
    // （写回来这一门当场红）。下面那一句记的是第 1015 轮删掉那三个「回原文」出口时的账：
    //
    // **第 1015 轮：ctx 上那三个「回原文」的出口整条删掉**——`Text` / `TextOf` / `StringText`
    // 的实现在值为空时会去 `source.slice(...)`（正是直出版不许有的第二份近似）。老路
    // （`PrintAst`）删掉之后，这三个出口就只剩注解里的名字：全仓唯一一处真实调用是
    // `method.xl.md` 的 `ctx.TextOf(inner) === ","`（第 1015 轮改成 `ctx.ValueOf`，
    // 第 1069 轮再改成读 `inner.TextValue`）。
    // ⇒ 现在「这一层拿不到原文」是**结构上的事**，不是靠逐页扫描拦下来的。
    // **字符串 / 模板串那一格第 1073 轮删掉了**（它原来就挂在这里）：模板串要递归投内插里的
    // 表达式或类型，那段算式过去留在这里（`projectString`）、由 `String.PrintAst` 转过来。
    // 可那一格的每一半事实都在**被投的那一页自己身上**（「我是不是模板」= 构造时赋好的
    // `String.StringChar`、「我攒下哪些段」= 自己的 `ConstString` / `InterpolationString` 子单元、
    // 「我的正文与坐标」= 自己的 `Text` / `start` / `end`），所以按这一族一贯的判据
    // （第 1041 / 1042 / 1057 / 1068 / 1069 那几条）那份算式**整段搬进了 `String.PrintAst`**，
    // `projectString` 与这个出口一并删掉。那一页仍然经 `ctx.Expression` / `ctx.TypeExpression`
    // 递归投内插里的正文（`token` 层不能 import 投影层），所以搬走的是**算式所在的那一页**、
    // 不是能力——`Template` 这个名字补进 `direct:lint` 的 `CTX_BANNED`，写回来这一门当场红。
    // **按文本查词的出口第 1028 / 1029 轮全删掉了**（`KeywordKind` / `TokenKind` / `LeafKind` /
    // `NumericLiteral`）：那三张词汇表搬回了各自那一页（`Keyword.KeywordKind` /
    // `SymbolToken.KindOfText` / `Identifier.LeafKindOfText`，理由见本文件上半部分那两段记录），
    // 投影层不再有第二个按文本查词的地方，
    // 所以这一层也拿不到它们——与 `Text` / `TextOf` / `StringText` 那三个出口同一手法：
    // 能力面收窄之后，「大家记得别写」才变成**结构上做不到**。
    // **搬迁用的补充出口**（第 181 轮）：`case "X": return projectX(v, ctx)` 那 100 条要逐块
    // 搬进各 token 自己的 `PrintAst(ctx, v)`，而那一层**不能 import 本文件**
    // （token 层反过来被本文件依赖，会成环）。所以这些横切的小工具只能经 `ctx` 递过去——
    // 与上面那一组同款：逐个转调共享实现，行为不变。
    // **`PrintAst` 收到的 `v` 就是那一格 token 自己**（见 `projectNode` 开头那句
    // `const v = node`），坐标读的就是它自己的 `start` / `end` 两个属性——
    // 搬迁过去的代码里 `v.start` / `v.end` 就是这么用的。
    StartOf: (node) => startOf(node),
    EndOf: (node) => endOf(node),
    StmtEndOf: (view) => stmtEndOf(view, ctx),
    // **尾分号那一格的出口**（第 840 轮）：`declare module "mm";` 那个 `;` 到达时
    // 声明早已成形（收尾规则问「简写」的那一刻列表只到名字），所以它由**投影侧**
    // 按「没体的声明自己吃尾分号」补进区间——与第 838 轮那条口径同一份实现。
    SemicolonEndOf: (end) => semicolonEndOf(end, ctx),
    Split: (list, separator) => splitTopLevel(list, separator),
    // **`Invisible` 那个出口第 1030 轮删掉了**：要跳过哪些单元由单元自己答
    // （`k.IsInvisible`，见 `core/syntax/token.xl.md`），所以这一层不再需要「名单」这件东西。
    // **`IsIndexBracket` 这个出口第 1089 轮也删掉了**：它第 1058 轮起就只剩「一行转手」
    // （实现是 `(node) => node.IsIndexBracket`），当时留着是因为 `json/object-literal`
    // 那一页在用它——而那一页读的本来就是同名的属性（`nameUnits[0].IsIndexBracket`，
    // 构造时赋好），改成属性读之后这个出口**零真实读者**（全仓实测：活代码 0 处）。
    // 名字补进 `direct:lint` 的 `CTX_BANNED`，写回来这一门当场红。
    ChainWithOptional: (node, nco) => chainWithOptional(node, nco, ctx),
    // **`NameOf` 这个出口第 1130 轮删掉了**（它原来就挂在这里）：它问的是「把一个名字单元
    // 投成 `Identifier` 节点」，而这一问的两半事实（正文 = `TextValue`、坐标 = `start`
    // 与正文长度）**都在这一格单元自己身上**——按用户口径 1.1~1.4 由**这一格自己**答，
    // 所以 `Identifier` 与 `Keyword` 两页各自显式声明了同一格 `## property NameNode`
    // （能当一个名字的就是那两页，`IsNameNode`，第 1057 轮）：
    // 本页那五处外部读者（`import-type` / `import` / `object-literal` /
    // `lamda-parameter` / `type-operator`）改成读 `unit.NameNode`。
    // 第 1131 轮把本页那两处也改成了属性读、并把这个 helper 整格删掉——同一格事实今天只有一个入口（`Identifier` / `Keyword` 两页的 `NameNode`）。
    // 出口删了，同一格事实就不会有第二个入口；名字补进 `direct:lint` 的 `CTX_BANNED`
    // （写回来这一门当场红）。
    // **`TextOf` 这个出口第 1071 轮删掉了**（它原来就挂在这里）：本页那一格
    // `textOfNode` 早就只剩「叶子读自己的 `value`、其余读 `Token.Text`」两层事实，
    // 而第 1069 轮把前一层收成了 `Token.TextValue`（基类 `## property`）——
    // 于是它变成「两层事实、一行转手」。这一轮把本页 99 处调用点改成属性读
    // （`x.TextValue`），整个 helper 连同这个**零真实读者**的出口一起删掉：
    // 全仓 `ctx.TextOf(` 的 32 处**全是注释**（记着第 993 / 1015 轮把它改成 `ctx.ValueOf` 的账），
    // 没有一处是活代码——所以删出口不动任何一页。
    // **`Kids` 就是那一格自己的 `ProjectableKids`**（第 1066 轮）：这一格是「我有哪些子单元、
    // 哪几个进投影」的读数，本来就住在 token 上（见 `core/syntax/token.xl.md` 的
    // `ProjectableKids`）——这个出口只是把它接到 `ctx` 上，**一行实现都不留**。
    // （第 185 轮那套「手上可能是单个 token、也可能是一段单元数组，所以这里自己归一」
    // 也随之退场：各页现在读的都是**某一个 token** 的那一格。）
    Kids: (node) => node.ProjectableKids,
    Expression: (list) => projectExpression(list, ctx),
    TypeExpression: (list) => projectTypeExpression(list, ctx),
    ProjectEach: (list) => projectEach(list, ctx),
    // **把一串单元当作「成员表」投**（第 934 轮）：`MappedType` 的值类型之后还能再跟成员
    // （TS 的 `parseMappedType` 在值类型之后照样 `parseTypeMembers()`），而那一格住不进
    // 映射类型那一层的成员段（映射类型自己装的是「修饰词 / 键 / 值类型」那几格）⇒
    // 由它的 `PrintAst` 把那一小段按成员位投一次。
    // 实现与通用支那一支**共用同一份**（`projectEachIn`）。**第二个参数是「父单元」**：
    // 成员读的 `IsSignatureList` 就在那一格上（`MappedType` 自己声明了它，第 1055 轮），
    // 所以**父单元必须是真的那一格 token**——第 1056 轮把过去夹在中间那个 `"TypeLiteral"`
    // kind 名删掉了（同一格事实的第二处存储）。
    MemberList: (list, view) => projectEachIn(list, ctx, view),
    KidsOf: (node, key) => kidsOf(node, key),
    NamedSpecifiers: (brace, kind) => namedSpecifiersOf(brace, kind, ctx),
    MemberNameOf: (view) => memberNameOf(view, ctx),
    // **第 1052 轮它不再收第三个参数**：修饰词的位置只有一个来源（token 记的 `modifierSpans`），
    // 所以那个「外层起点」不再需要往里递——`TypeAssign` 里调用的那一处也只传两格。
    AddModifiers: (view, props) => addModifiers(view, props),
    Decorators: (view, props) => addDecorators(view, props, ctx),
    FoldBinaryFrom: (left, list) => foldBinaryFrom(left, list, ctx),
    // **`ParameterModifiers` 那个出口第 1037 轮删掉了**：那份词表（`public` / `private` /
    // `protected` / `readonly` / `override`）只有一个读者（`tokens/lamda/lamda-parameter.xl.md`
    // 的 `PrintAst`），所以它搬回了那一页——投影层不再替它记一份，`ctx` 也不再递它。
    SynthName: (text, view) => synthName(text, view),
    StatementOf: (view) => projectStatement(view, ctx),
    // **第 1070 轮删掉的是「别的页一处不用」的那几格**：判据只有一条——把
    // `ctx.<名字>` 在全仓（`core` / `typescript` / `typescript-exec` / `runtime` 的
    // 全部 `*.xl.md`，除本文件外）扫一遍，**0 处**的那些才是投影层多出来的入口。
    // 每一格都只剩一条调用链（出口 → 本页唯一的读者），所以删出口不牵动任何调用点，
    // 只是把「除了本页没人能用」的能力面收回本页。那一轮删掉五格：
    // `ModuleSpecifierIn` / `ModuleHolderOf`（唯一读者 `namedExportClause`；
    // **宿主那两格声明第 1087 轮也并进了那个唯一读者**）、
    // `ComputedNameUnit`（唯一读者 `memberNameOf`，已就地展开）、`TrailingSemicolonOf`
    // （唯一读者 `projectEach`）、`SpecifierNameOf`（唯一读者 `namedSpecifiersOf` 两处）、
    // `KindsInAst`（唯一读者 `projectRoot`）。**第一次扫表扫错了**（只扫了一层目录，
    // 于是把 `heritage-clause` / `type-parameter` 等页真在用的 `DottedExpression` /
    // `TypeOf` 也当成「没人用」删掉），`cases:direct` 当场 415 处异常 ——
    // 所以这里的判据是「**递归扫**全部 `*.xl.md`」，不是「扫一层」。
    // `ctx` 上留下的名字个个都有本页之外的读者，`direct:lint` 的 `CTX_BANNED` 名单因此不变。
    // **`StatementOfList` 与 `SwitchClause` 留着**：前者 `label.xl.md` 用、后者 `switch.xl.md` 用
    // ——「本页只在别处用它」这件事按上面的判据不算删的理由。
    StatementOfList: (list) => statementOfList(list, ctx),
    Nothing: NOTHING,
    // **`from` 那个形参第 1084 轮删掉了**：它只喂空体那一支「跳空白找 `;`」的兜底，
    // 而那一支在全语料进入 0 次（空体由 token 的 `EmptyBodyAt` 答，三个调用点各自先读完它）。
    // **`bodyBlockOf` 这一格第 1102 轮并进了这个出口**（同一把尺子：全仓只有
    // `while` / `foreach` / `do-while` 三页经这个出口读它，而函数体不是转手、是**循环体**的算式）。
    // 它说的是：**循环体**的体 → `Block`（或没有花括号时的单条语句 / 空体时 `undefined`）。
    // **判据只有一条：token 记下的整对花括号**（第 641 轮，`brace` = 各页自己显式声明的那一格
    // `BodyBrace`，构造时赋好）；**第 1084 轮把「跳空白找 `;`」那处兜底与它的 `from` 形参
    // 一起删掉了**（空体由 token 的 `EmptyBodyAt` 答，三个调用点各自在调它之前就读完了）。
    BodyBlockOf: (list, brace) => {
      const kids = list.filter((k) => k instanceof Token && !k.IsInvisible);
      const projections = projectEach(kids, ctx);
      // **整对读字段那一支**（第 641 轮）：字段只在「体就是一对花括号」时才会被 token 写下
      //（`While.BodyBrace` 的 `CaptureBodyBrace` 那一处就是这个条件），
      // 所以有它 ⇒ TS 那边就是一个 `Block`——空块那一档（`while (c) {}`）也一并落在这里。
      const knownBrace = brace !== null && brace !== undefined && brace.IsSet === true
        ? brace.Range
        : null;
      if (knownBrace !== null && knownBrace !== undefined
        && knownBrace.Start !== null && knownBrace.End !== null) {
        return {
          kind: "Block",
          statements: projections,
          pos: knownBrace.Start.Index,
          end: knownBrace.End.Index + 1,
        };
      }
      // **空体语句那一支的兜底第 1084 轮删掉了**：它在全语料里进入 0 次，
      // 而这一格事实由 token 的 `EmptyBodyAt` 答、三个调用点各自在调本方法之前就读完了它。
      if (projections.length === 1) return projections[0];
      if (projections.length === 0) return undefined;
      return { kind: "Block", statements: projections, pos: startOf(kids[0]), end: endOf(kids[kids.length - 1]) };
    },
    // **`IndexBracketOf` 那个出口第 1060 轮删掉了**：下标那个 `[` 是 `IndexedAccessType`
    // 自己造出来那一刻的事实（`IndexBracketAt`），所以那一页直接读自己的属性——
    // 投影层不再有「回原文按深度配对方括号」的第二处答案。
    // **`parenthesizedOf` 这一格第 1112 轮整格删掉了**（判据与第 1103 / 1104 / 1109 / 1110 /
    // 1111 轮同一把尺子：一格声明若只剩「被本页某两处读者调用」与「被这一条出口转手」，
    // 那它就是多一层间接）。算式**就地展开**在它的两个调用点（`projectExpression` 里
    // `kids.length === 1` 那一支、`chainWithOptional` 里链头那一格），出口**名字与实参表
    // 一个字不动**（`method` / `new` / `heritage-clause` / `enum-member` / `lamda-parameter`
    // 五页经它走），这里就地写同一份算式：
    // 括号表达式 `( … )` → `ParenthesizedExpression`（括号本身**属于**这个节点，与 TS 一致）。
    // 产物那边值位的括号就是一个 `Bracket` 单元（`startBracket="("`），内容在它里面；
    // 判据只认「括号是这一层的操作数」——实参表 / 形参表 / 类型括号不会走到这里。
    ParenthesizedOf: (unit) => {
      const inner = unit.ProjectableKids;
      return {
        kind: "ParenthesizedExpression",
        expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
        pos: startOf(unit),
        end: endOf(unit),
      };
    },
    LetFrom: (list, view) => projectLetFrom(list, ctx, view),
    // **`projectHeadDeclare` 这一格第 1100 轮并进了这个出口**（同一把尺子：全仓只有
    // `foreach.xl.md` 一个读者）。它说的是**没有 `Let` 的声明段**：`for (const v of xs)` /
    // `for (const k in o)` 的头部（第 545 轮）——TS 那边 `ForOfStatement.initializer` 与
    // `for (let i = 0; …)` 一样**直接就是 `VariableDeclarationList`**（不套 `VariableStatement`），
    // 而产物在这一档里**没有 `Let`**（`of` / `in` 不进 `LetBranch`），声明段一直是
    // `[Keyword(const), Identifier(v)]` **两格平铺**。名字那一格是**唯一**一个名字单元 /
    // 模式括号（`for (const [a, b] of xs)`），按形态分派给 `NameNode` / `projectBindingPattern`；
    // 列表的标志位从头顶那个词读。名字那一格的判据与 `IsNameNode` 同一条（第 598 轮），
    // 名字那一格**一律投 `Identifier`**：绑定名按定义就是一个标识符。
    HeadDeclare: (list) => {
      const inner = list.filter((k) => !k.IsInvisible);
      if (inner.length === 0) return undefined;
      // **名字那一格从后往前找**：`const` / `let` / `var` / `using` 与 `await` 都可能还是
      // `Identifier`（关键字升级在本单元的那一趟里跑，投影这一趟是**之后**的事）——
      // 从前往后找会把那个词当成名字。
      // **两格判据第 1121 轮都收进被问的那一页**（用户口径 1.1~1.4：投影要的信息由具体
      // token 子类在自己那一页显式声明、在构造 / 记下正文那一刻赋好，读时备齐）：
      // ① 「我这一格是不是绑定模式」第 1074 轮起就是 `k.IsBindingPattern`（`ArrayLiteral` /
      // `ObjectLiteral` 各自显式声明 `true`）；② 「声明段里那一格模式」这一问**不是**它——
      // 它还要认 `for (const [a] of xs)` 里那个**还没被收成 `ArrayLiteral`** 的 `[`
      //（第 533 轮那条规则只在有空括号对时才收），于是原先那个现场闭包 `isPatternKid`
      //（`IsBindingPattern` 加三个括号属性连比）整个收成一格属性 `k.IsPatternKid`
      //（基类默认 `false`、四页各自显式声明：`Bracket` 按自己的 `startBracket`、
      // 两个模式类常量答 `true`）。
      let nameKid = undefined;
      for (let at = inner.length - 1; at >= 0; at--) {
        const one = inner[at];
        if ((one.IsNameNode || one.IsPatternKid) && one.IsDeclareWord === false) {
          nameKid = one;
          break;
        }
      }
      if (nameKid === undefined) return undefined;
      const declared = nameKid.IsPatternKid ? projectBindingPattern(nameKid, ctx) : nameKid.NameNode;
      // **列表的起点是那个声明词**、不是段里的第一格：`for await (const v of xs)` 的段里
      // `await` 排在 `const` 前面（TS 那边它是 `ForOfStatement.awaitModifier`、
      // 不是列表的一部分）——**所以这个声明词要从后往前找**（第 546 轮）。
      // **「哪几个词是声明词」第 1121 轮也收进被问的那一页**：原先那个现场闭包
      // `isDeclareWord`（一行里把 `const` / `let` / `var` / `using` 四个词连比一遍）
      // 收成一格属性 `k.IsDeclareWord`（`Keyword` 认 keyword 那一态的三个词、
      // `Identifier` 认 `using`，都在记下正文那一刻赋好）——「四个词里哪一个进了产物、
      // 停在哪一态」只有那两页知道，投影层不再替它们记第二遍。
      let declareKid = undefined;
      for (let at = inner.length - 1; at >= 0; at--) {
        if (inner[at].IsDeclareWord) {
          declareKid = inner[at];
          break;
        }
      }
      const head = declareKid === undefined ? inner[0] : declareKid;
      const headText = head.TextValue;
      const flags = headText === "const" ? "Const" : headText === "var" ? "None" : "Let";
      return {
        kind: "VariableDeclarationList",
        declarations: [{ kind: "VariableDeclaration", name: declared, pos: startOf(nameKid), end: endOf(nameKid) }],
        flags,
        pos: startOf(head),
        end: endOf(inner[inner.length - 1]),
      };
    },
    QualifiedNameFrom: (list) => dottedExpression(list, "QualifiedName"),
    DottedExpression: (list) => dottedExpression(list),
    // **`TypeArguments` 这个出口第 1132 轮删掉了**（它原来就挂在这里）：那一格
    // **全仓只有 `heritage-clause.xl.md` 一个读者**，而算式只有三件东西
    // （`generic.ProjectableKids` 是本页第 1066 轮起就有的读数、本页 `splitTopLevel`
    // 那一份按逗号切、把每一组交给 `projectTypeExpression`）——按第 1112 轮
    // `parenthesizedOf` 那一把尺子（只剩「被本页某处读者调用」与「被出口转手」的一格声明
    // 就是多一层间接），算式就地展开在那一页、出口一并删掉。名字补进 `direct:lint` 的
    // `CTX_BANNED`（写回来这一门当场红）。**这一格 private method 仍留着**：
    // 本页自己还有四处（3720 / 3895 / 8741 / 9025 那一族，都是模块内调用、不经出口）
    // ——就地展开的那一处把切法交给 `ctx.Split`、把每一组交给 `ctx.TypeExpression`，
    // 与本页那四处同答（同一份 `splitTopLevel`、同一份 `projectTypeExpression`）。
    // **`conditionalNode` 这一格第 1113 轮整格删掉了**——它在本页代码块里**只有这一条出口**
    // 一个读者（`projectTypeExpression` 那两处读者都在**本函数自己的body**里：递归那一句与
    // 那一格自己的调用），而出口的实参表（`list` / `from` / `to`）与三个调用点
    // （`conditional-type` / `mapped-type` / `type-parameter`）一个字不动——
    // 所以算式整段搬进这条出口，本页少一格声明。判据与第 1103 / 1104 / 1109 / 1110 / 1111 /
    // 1112 轮同一把尺子。
    //
    // `[T, extends, U, ?, A, :, B]` 那一段单元 → 一个 `ConditionalType`。
    //
    // **假分支又是条件类型时要递归**（第 116 轮）：TS 的条件类型是**右嵌套**的——
    // `A extends B ? C : D extends E ? F : G` 的 `falseType` 是一个 `ConditionalType`。
    // 产物把它们**平铺在同一串单元里**，而 `typeOf`（→ `projectTypeExpression`）折不动平铺的
    // `extends` / `?` / `:`——于是内层那条条件类型只剩几个孤立的名字：实测 `@types/node/test.d.ts` 的
    // `ReturnType = F extends (...) => infer T ? T ⏎ : F extends abstract new(...) => infer T ? T ⏎ : unknown`
    // 缺 `ConditionalType` / `ConstructorType` / `AbstractKeyword` / `Parameter` / `DotDotDotToken`
    // 等 13 个节点（`Identifier` 缺 375 / `TypeReference` 缺 118 的样本全在这一族）。
    ConditionalNode: (list, from, to) => {
      // **递归就靠这一格自己的名字**（原来那一格声明里的 `conditionalNode(tail, 0, tail.length, ctx)`
      // 搬进来之后写成 `conditionalNodeOf(tail)`）：`tail.length` 与 `slice.length` 逐格同答
      // （`tail` 就是 `slice.slice(colonIndex + 1)`），所以两处调用逐字节相同。
      const conditionalNodeOf = (kids) => {
        // **第 1119 轮**：三个「这一格的正文是不是那个符号 / 那个词」都改读被问的那一页
        // （`IsQuestionSymbol` / `IsColonSymbol` 在 `SymbolToken` 那一页、
        // `IsExtendsKeyword` 在 `Keyword` / `Identifier` 两页，都在记下正文那一刻赋好）——
        // 原来的局部 `isSymbol(k, text)` 转手连同两次现拼一起收掉。
        const slice = kids;
        // **第 1123 轮**：那一格局部转手 `isExtends`（`(k) => k.IsExtendsKeyword === true`）
        // 也一并收掉——它只有两处读者（下面 `extIndex` 与尾段那个 `tailExt`），
        // 而它答的就是被问那一页那一格属性（与上面 `IsQuestionSymbol` / `IsColonSymbol`
        // 同一形态，一处声明一处读）。
        const extIndex = slice.findIndex((k) => k.IsExtendsKeyword === true);
        const questionIndex = slice.findIndex((k) => k.IsQuestionSymbol === true);
        const colonIndex = slice.findIndex((k) => k.IsColonSymbol === true);
        const node = {
          kind: "ConditionalType",
          pos: startOf(slice[0]),
          end: endOf(slice[slice.length - 1]),
        };
        if (extIndex > 0) node.checkType = typeOf(slice.slice(0, extIndex), ctx);
        if (extIndex >= 0) {
          const stop = questionIndex > extIndex ? questionIndex : slice.length;
          node.extendsType = typeOf(slice.slice(extIndex + 1, stop), ctx);
        }
        if (questionIndex >= 0) {
          const stop = colonIndex > questionIndex ? colonIndex : slice.length;
          node.trueType = typeOf(slice.slice(questionIndex + 1, stop), ctx);
        }
        if (colonIndex >= 0) {
          const tail = slice.slice(colonIndex + 1);
          const tailExt = tail.findIndex((k) => k.IsExtendsKeyword === true);
          const tailQuestion = tail.findIndex((k) => k.IsQuestionSymbol === true);
          const tailColon = tail.findIndex((k) => k.IsColonSymbol === true);
          node.falseType =
            tailExt > 0 && tailQuestion > tailExt && tailColon > tailQuestion
              ? conditionalNodeOf(tail)
              : typeOf(tail, ctx);
        }
        return node;
      };
      return conditionalNodeOf(list.slice(from, to));
    },
    // **`projectSegment` 这一格第 1100 轮并进了这个出口**（同一把尺子：全仓只有
    // `ternary-operator.xl.md` 一个读者，而它拿到的就是这一行出口返回的东西）。
    // 说明整段搬在这里：**整段一起投，只在遇到「分段壳」时才摊平一层**（第 97 轮）……
    // （原来那一节的全文见 git 历史；这里只留判据）
    Segment: (view, key) => {
      const kids = kidsOf(view, key);
      if (kids.length === 0) return undefined;
      const first = kids[0];
      // **整段一起投，只在遇到「分段壳」时才摊平一层**（第 97 轮）：
      // `TernaryOperator` 的三个段在段数组里**已经摊平**（`trueStatement` 直接就是
      // `Method(f(1))` 那一格、`falseStatement` 直接就是 `PropertyAccess(y.z)`）——
      // 照「先摊平一层」的老写法会把那个单元**自己的子单元**当成整段，
      // 于是 `f(1)` 只剩 `1`、`y.z` 只剩 `y`、`p === q` 只剩 `p`：
      // 实测缺 `PropertyAccessExpression` 502 / `CallExpression` 246 / `BinaryExpression` 273
      // 里成片都是它（三元的两个分支 + 条件）。
      //
      // 判据是「这一格自己的 `AstKind` 答 `undefined`**且**名字以 `Condition` / `Statement` / `Segment`
      // 结尾」——那才是分段壳（`TernaryOperatorCondition` 这种）。
      // **不能只看「答 `undefined`」**：`PropertyAccess` 的 `AstKind` 也答 `undefined`（它自己覆写了
      // `PrintAst`），只看那一格会把 `y.z` 摊成两个裸名字。
      const leaf = first.IsNameNode || first.IsSymbolToken;
      const wrapper =
        !leaf &&
        first.AstKind === undefined &&
        ONLY_CONDITION_STATEMENT_SEGMENT.test(first.Tag);
      if (wrapper) {
        const inner = first.ProjectableKids.filter((k) => k.IsSymbolToken === false);
        return inner.length === 0 ? projectNode(first, ctx) : projectExpression(inner, ctx);
      }
      // **只排掉分段自己的标点**（`?` / `:`），**不能把所有 `SymbolToken` 都排掉**（第 106 轮）：
      // 条件里就有比较运算符——`i > 0 ? a : b` 的 `>` 会被整条丢掉，`projectExpression` 拿到
      // `[i, 0]` 于是折不动、只投出第一个操作数（实测缺 `BinaryExpression` 79 +
      // `GreaterThanToken` + 右侧那个字面量，样本集中在 `? :` 的条件位上）。
      const inner = kids.filter(
        (k) => !(k.IsColonSymbol === true || k.IsQuestionSymbol === true),
      );
      if (inner.length === 0) return projectNode(first, ctx);
      return projectExpression(inner, ctx);
    },
    // **`UnwrapNodes` 这个出口第 1073 轮删掉了**（它原来就挂在这里）：它读的就是那一格自己的
    // `ProjectableKids`（第 1066 轮起实现只有 token 上那一处），全仓 5 处调用点
    // （`lamda` 2 / `signature` 2 / `mapped-type` 1 / `type-assign` 1）全改成属性读。
    // 顺带删掉本页那个**一个真实读者都没有**的 `projectableKids`——它也只是这一行的转调
    // （「投影对 token 只读属性、不调方法」那一门早就把它排除在外了）。出口删了就补进
    // `direct:lint` 的 `CTX_BANNED`，名字写回来这一门当场红。
    // **`AllKids` 这个出口第 1067 轮删掉了**（它原来就挂在这里）：给 token 页面看
    // 「含 trivia 的完整子单元表」。三处调用点（`try` 两处、`if-set` 一处）查的都是**可见**的
    // 东西，而同一格读数在这一层已经有一个 `Kids` ⇒ 多一个「我也看得见 trivia」的出口
    // 只会诱着下一页再写一遍「自己滤一遍」的算式（与第 1065 / 1066 轮删掉的那些同一条口径）。
    // 名字补进了 `direct:lint` 的 `CTX_BANNED`，写回来这一门当场红。
    TypeOf: (list) => typeOf(list, ctx),
    FunctionTypeProps: (kids) => functionTypeProps(kids, ctx),
    // **`blockOfBody` 这一格第 1102 轮并进了这个出口**（同一把尺子：全仓只有
    // `if-segment` 经这个出口读它）。一个段的体 → `Block`（或没有花括号时的单条语句），
    // 返回的是 `{ node, end }`（调用方要那个 `end` 来收整个 `IfStatement` 的尾巴）。
    // **判据只有一条：token 记下的整对花括号**（`IfSegment.BodyBrace`，构造时赋好）。
    BlockOfBody: (list, brace) => {
      const kids = list.filter((k) => k instanceof Token && !k.IsInvisible);
      const projections = projectEach(kids, ctx);
      const known = brace !== null && brace !== undefined && brace.IsSet === true
        ? brace.Range
        : null;
      if (known !== null && known !== undefined && known.Start !== null && known.End !== null) {
        return {
          node: {
            kind: "Block",
            statements: projections,
            pos: known.Start.Index,
            end: known.End.Index + 1,
          },
          end: known.End.Index + 1,
        };
      }
      if (projections.length === 0) {
        // **体里只有注释**（第 140 轮）：那种体**带着整对花括号**，所以上面那一支已经把它接住了
        //——落到这一行只可能是**真的没有体**。
        return undefined;
      }
      const first = startOf(kids[0]);
      const last = endOf(kids[kids.length - 1]);
      // 没有花括号：TS 那边就是那条语句本身（`if (a) f();` ⇒ `ExpressionStatement`）。
      // **终点取投影出来的那个节点自己的 `end`**（第 157 轮）：`last` 是**产物单元**的终点，
      // 它会带上尾随那个软换行，而投影节点的 `end` 已经过 `stmtEndOf` 剪过 trivia。
      const lastProjected = projections.length > 0 ? projections[projections.length - 1] : undefined;
      const bodyEnd = lastProjected !== undefined && typeof lastProjected.end === "number" ? lastProjected.end : last;
      return {
        node:
          projections.length === 1
            ? projections[0]
            : { kind: "Block", statements: projections, pos: first, end: last },
        end: bodyEnd,
      };
    },
    // **`projectSwitchClause` 这一格第 1100 轮并进了这个出口**（判据与第 1043 / 1044 /
    // 1067 / 1070 / 1080 / 1087 轮并掉那些「一格声明、一个调用点」的转发同一把尺子）：
    // 它全仓只有 `switch.xl.md` 一个读者、而且那个读者拿到的就是这一行出口返回的东西
    // ——函数体没有第二处调用点，所以实现搬到这里，本页少一格声明、少一层间接。
    // 说明整段也一并搬到这一行旁边（见本行下方那一段注释）。
    SwitchClause: (seg) => {
      const sv = seg;  // 这一格就是 `seg` 自己（不再包一层接收者）
      const kindWord = String(sv.key ?? "");
      const kids = sv.ProjectableKids;
      const caseUnit = kids.find((k) => k.IsSwitchCaseUnit);
      const bodyUnit = kids.find((k) => k.IsSwitchStatementUnit);
      const props = {};
      if (kindWord !== "default" && caseUnit !== undefined) {
        props.expression = projectExpression(caseUnit.ProjectableKids, ctx);
      }
      if (bodyUnit !== undefined) {
        const body = bodyUnit.ProjectableKids;
        const statements = projectEach(body, ctx);
        if (statements.length > 0) props.statements = statements;
      }
      // **区间结尾按最后一个语句算**（第 89 轮修）：`SwitchSegment` 自己的区间比 TS 多一个字符
      // （实测 `case "\r":` 产物 [345,400) vs TS [345,399)，192 处漂移 + 192 处「多出来」——
      // 同一个节点两边都记了一次）。没有语句的那些（`case 2:` 后面直接跟下一个 `case`）
      // 用 segment 自己的尾巴就正好。
      const last = props.statements !== undefined ? props.statements[props.statements.length - 1] : undefined;
      let end = last !== undefined && typeof last.end === "number" ? last.end : sv.end;
      // **没有语句的分支（贯穿到下一条 `case`）**：区间到那个 `:` 为止（第 97 轮）。
      // `SwitchSegment` 自己的尾巴比 TS 多一个字符——实测 `case ",":` 产物 [1129,1139)
      // vs TS [1129,1138)：108 处漂移 + 108 处「多出来」是同一个节点两边各记一次。
      // **位置由 token 自己记**（`SwitchSegment.ColonPos`，第 615 轮）：认下这一段那一刻
      // 那个 `SymbolToken` 就在手上 ⇒ 这里直读字段，不再回原文 `lastIndexOf(":")` 猜。
      if (last === undefined) {
        const colonPos = sv.colonPos;
        if (typeof colonPos === "number" && colonPos >= sv.start) end = colonPos + 1;
      }
      return {
        kind: kindWord === "default" ? "DefaultClause" : "CaseClause",
        pos: sv.start,
        end,
        ...props,
      };
    },
    // **`ctx.BindingPattern` 是「模式 → `ObjectBindingPattern` / `ArrayBindingPattern`」那一格**
    // （各页调的就是它），所以这里接回原来的 `projectBindingPattern`。
    // **绑定元素那一格（原来的 `projectBindingElement`）第 1114 轮并进了它唯一的调用点**
    // ——就是上面 `projectBindingPattern` 体里那个 `projectBindingElementOf`（那一处写明了判据）。
    BindingPattern: (unit) => projectBindingPattern(unit, ctx),
    ComputedNameExpression: (unit) => computedNameExpression(unit, ctx),
    Structural: (view, kind) => structuralProps(view, kind, ctx),
    // **声明族那一格的形状**（第 1002 轮）：`MethodDeclaration` / `Function` / `Class` /
    // `Interface` / `TypeLiteral` / `Enum` 六页的 `PrintAst` 就是这一句。
    // 它与 `projectNode` 落在**同一份实现**（`projectDeclaration`）上——
    // 所以「覆写了仍然与通用支逐字节相同」是结构上的事，不是巧合。
    //
    // **第二格是那个「就这一格」的造节点闭包**（`ctx.Make`，与 `projectNode` 里的
    // `mk` 是同一份实现 `astNode`）：直出版算完 kind 之后要**自己**把节点造出来，
    // 而「带坐标与尾部 trivia 剪裁」的口径只能有一份——所以递过去，不抄第二遍。
    // **第三格是「调用方已经算好的 kind」**（可选）：声明族的直出版自己判过一次
    // （见 `method-declaration.xl.md` 的 `PrintAst`），而换 kind 的规则只在
    // `projectDeclaration` 里有一份——所以递进来之后那几条规则**照跑**，
    // 两边对同一种上下文因此不可能给出两个答案。
    // **父 kind 那个参数第 1056 轮整格删掉了**：它先在第 1054 轮失去「构造」那一档
    //（改读 `v.Parent.IsClassBody`）、第 1055 轮失去「签名」那一档
    //（改读 `v.Parent.IsSignatureList`），最后只剩 `ArrayLiteralExpression` 一个消费者
    // ——而那一格在父单元自己的 `AstKind` 上，所以连参数一起撤。
    Declaration: (view, make, kind) =>
      projectDeclaration(view, ctx, make ?? ctx.Make(view), kind),
    // **`MemberInObject` 那个出口第 1037 轮删掉了**：那份名单（`MethodDeclaration` /
    // `GetAccessor` / `SetAccessor` / `PropertyAssignment` / `ShorthandPropertyAssignment` /
    // `SpreadAssignment`）只有一个读者（`tokens/json/object-literal.xl.md`），所以它搬回了
    // 那一页——投影层不再替它记一份，`ctx` 也不再递它。
    // **`NumericLiteral` 那张正则第 1029 轮搬走了**：数字字面量的写法是 `Identifier` 那一页的事实，
    // 要问它的两处（`memberNameOf` 与 `object-literal.xl.md`）走 `Identifier.IsNumericLiteral(text)`——
    // 递一个问句，不把整张表复制到 `ctx` 上。**第 1135 轮试过把 `memberNameOf` 那一处改读属性、
    // 当场被 `coverage` 抓住并还原**（那里的收件人是**声明名字的那一格**，不是名字单元自己）；
    // **第 1136 轮把收件人换对了再收**：那一格立在 `Field` / `MethodDeclaration` 两页上
    // （各 `## field IsNumericLiteralName`，认下名字那一趟赋好），投影改读 `v.IsNumericLiteralName`
    // ——本页对 `Identifier` 的最后一个代码读者就是那一句，于是这一页的 `import` 也没了。
    // **运算符那一格的叶子节点**（第 550 轮）：`in` / `instanceof` 在深度界那一层
    // 还是 `Identifier`，照 `Project` 投会投成 `Identifier("in")` ——
    // `BinaryOperator.PrintAst` 那一支正需要它。
    //
    // **判据与那两个名字第 1106 轮搬回了被问的那一格**（用户口径 1.1 / 1.3）：
    // 这里过去是一格 `operatorTokenOf`，自己按 `op.TextValue` 认那两个词、再拼出
    // `"InKeyword"` / `"InstanceOfKeyword"` 两个字面量——而那是**被问那一格自己的正文**
    // 与**它自己那一页的词汇**（`Keyword` 的 `KEYWORD_KIND` 里本来就写着这两条）。
    // 今天只读一格：`unit.OperatorWordKind`（`Keyword` 在 `SetValue`、`Identifier` 在
    // `Close()` 里按自己的正文赋好，空串＝这一态不是词形运算符），本页不再判「我这一格长什么样」。
    OperatorNode: (unit) => {
      const kind = unit.OperatorWordKind;
      if (kind === "") return projectNode(unit, ctx);
      const text = unit.TextValue;
      return {
        kind,
        text,
        pos: startOf(unit),
        end: startOf(unit) + text.length,
      };
    },
  };
  const statements = projectEach(exported, ctx);

  // **没有语句的文件**（整份文件只有注释）：TS 的 `SourceFile.getStart()` **就是文件长度**
  // （没有 token 可跳，`getStart` 退回 `end`），而本工程原来退回 `0`——于是
  // `@types/node/index.d.ts` 那 38 个「只有许可注释」的桩文件整份对不上
  //（实测缺 `SourceFile` 38，三个样本都是这种桩）。
  const firstStart = statements.length > 0 ? statements[0].pos : source.length;
  const ast = {
    kind: "SourceFile",
    statements,
    endOfFileToken: { kind: "EndOfFileToken", pos: source.length, end: source.length },
    pos: firstStart,
    end: source.length,
  };
  // **只报真的透传进产物的那一批**（第 199 轮）：`ctx.unmapped` 里混着「投影只是问了一下、
  // 结果被调用方丢掉」的标签（见上面那一节的实测数），拿产物自己的 `kind` 集合对一次账就干净了。
  //
  // 对账那把尺子就地收在这里（第 1104 轮）：它全仓只有这一处真实调用点，而它读的正是
  // **刚造出来的 `ast`**——所以不必占本页一格声明（原来是 `kindsInAst`）。
  const landed: Set<string> = new Set<string>();
  const collectKinds = (node: any): void => {
    if (node === null || typeof node !== "object" || !("kind" in node)) {
      return;
    }
    landed.add(node.kind);
    for (const key of Object.keys(node)) {
      if (key === "kind" || key === "pos" || key === "end" || key === "text") {
        continue;
      }
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) collectKinds(item);
      } else {
        collectKinds(value);
      }
    }
  };
  collectKinds(ast);
  return {
    ast,
    unmapped: [...ctx.unmapped].filter((tag) => landed.has(tag)).sort(),
    count: ctx.count,
    // **直出覆盖率**（第 992 轮）：这一趟有多少个节点是 `PrintAst` 自己出的。
    // 它是「这一格搬完了没有」的读数，不是判据——判据是 `cases:direct` 的逐字节对拍。
    direct: ctx.direct,
  };
```

（**`moduleSpecifierIn` / `moduleHolderOf` 这两格第 1087 轮删掉了**：它们全仓只有
`namedExportClause` 一个读者，而且函数体都只是「在 `kids` 里找那个 `String` / 找它装在谁里面」
——所以连同这两节一起并进了那个唯一的调用点，本页少两格声明。
两件事实本身没有变：**在哪儿找**（只往 `Method` 里面看一层，因为 `export { a } ⏎ from("m")`
里那个字符串装在 `Method(name="from")` 里；而 `export { "a-b" as c }` 的字符串名在具名子句的
花括号里、是 `ExportSpecifier` 的名字，**不能一律递归**，实测 `mod-export-string-name` 当场红）
与**找的是哪一个**（`inner === module_`，只有那一个字符串算装在谁里面）。
账目按第 1043 / 1044 / 1070 / 1080 轮那把尺子记：**一格声明只剩一个转手读者，就是多一层间接**。）

`target`（那个模块路径字符串）**装在谁里面**；它自己就在 `kids` 这一层时给 `undefined`。

`from("m")` 里那个字符串装在 `Method(name="from")` 里面，而 TS 那边那一格是
`ParenthesizedExpression` ⇒ 投影要知道「它是不是被括号裹着」（见 `namedExportClause`）。

# method ToJsonText:(projected:any)=>string

把 `projectRoot` 的结果串成**紧凑单行 JSON**：取 `ast`（那个 `SourceFile` 同形的节点），
过一遍 `JSON.stringify`。
再 `JSON.stringify`——不带第三参数，单行是刻意选的形态。

**为什么不把 `unmapped` 也塞进来**：`cjcli --ts-ast` 的 stdout 要能**直接 diff** 一个
`ts.createSourceFile` 的转储，多一个包装键就得让每个下游先取 `.ast`；
那份记账走 stderr（`unmapped` 仍然在 `projectRoot` 的返回值里，库的调用方拿得到）。

```ts
return JSON.stringify(projected.ast);
```
