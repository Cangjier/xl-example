# 82 — punctuation（61 个标点 token 形状）

审计范围：`typescript/tokens/punctuation/*.xl.md` 共 61 个。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：61 个文件全是 `XxxTokenShape extends ShapeToken`，59 个只有构造函数（1 行代码），2 个（`plus`/`asterisk`）多一个 `FromSymbol` 静态工厂。它们本身没有 possible/end、没有 `Close` 覆盖、不消费 `Data`，所以 `C1/C2/P1–P4/R1/R2` 一族与它们无关。

真正的偏离有两类，全部是**结构性**的：

1. **15 个形状类全仓零引用**（符号级）：`AtTokenShape`、`BacktickTokenShape`、`CloseBraceTokenShape`、`CloseBracketTokenShape`、`CloseParenTokenShape`、`DotTokenShape`、`HashTokenShape`、`LessThanSlashTokenShape`、`MinusMinusTokenShape`、`OpenBraceTokenShape`、`OpenBracketTokenShape`、`OpenParenTokenShape`、`PlusPlusTokenShape`、`SemicolonTokenShape`、`TildeTokenShape`。TS 的 AST 里这些都有对应 `*Token` 节点（`OpenParenToken`、`SemicolonToken`…），本仓却从没有一处 `new` 它们——`R18` 的「shape 树与 TS AST 同构」在这一维上是空的。
2. **46 个形状类的唯一实例化点在 legacy 建造器**：`expression-builder`（第 50 篇）与 `operator-shape-map` 里成片的 `new XxxTokenShape(template)`，即「标点形状由 builder 直接造」，而不是由 possible 的 `BuildByIndex` 造（`R31` 的正规路径）。这类实例**从不写 `Op` 字段**，于是 `ShapeToken.AstOperator()` 只能回读源码补文本（`shape-token.xl.md:84-106`）——`R19` 的「build 那一刻提取数据」在这一族是缺的（记 `U1`）。

正向证据：`plus` / `asterisk` 的 `FromSymbol` 是 `R31`「立即关闭」的标准形态——签范围 → 取字段（`Op`）→ `TryToClose()`。

> 说明：下表的「外部实例化点」由 `tmp/refs.mjs` 全仓符号检索得出，只算**类名出现**在自身文件之外的位置（`文件:行`）。

---

### typescript/tokens/punctuation/ampersand-ampersand-equals-token-shape.xl.md（336B / 1 代码行；`AmpersandAmpersandEqualsTokenShape`）
- 结构：`&&=` 的标记 shape，无字段、无方法体（除构造）。
- 偏离：`[U1]` ○ 实例化点在 `expression-builder.xl.md:19,2693` 与 `operator-shape-map.xl.md:9,307`（`new` 后不写 `Op`），AST 文本只能靠 `AstOperator` 回读源码。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/ampersand-ampersand-token-shape.xl.md（329B / 1 代码行；`AmpersandAmpersandTokenShape`）
- 结构：`&&` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:20,2659`、`operator-shape-map.xl.md:10,259`，均走 `new` 且不写 `Op`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/ampersand-equals-token-shape.xl.md（326B / 1 代码行；`AmpersandEqualsTokenShape`）
- 结构：`&=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:21,2689`、`operator-shape-map.xl.md:11,298`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/ampersand-token-shape.xl.md（319B / 1 代码行；`AmpersandTokenShape`）
- 结构：`&` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:22,2647`、`operator-shape-map.xl.md:12,250`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/asterisk-asterisk-equals-token-shape.xl.md（334B / 1 代码行；`AsteriskAsteriskEqualsTokenShape`）
- 结构：`**=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:23,2681`、`operator-shape-map.xl.md:13,286`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/asterisk-asterisk-token-shape.xl.md（327B / 1 代码行；`AsteriskAsteriskTokenShape`）
- 结构：`**` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:24,2631`、`operator-shape-map.xl.md:14,208`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/asterisk-equals-token-shape.xl.md（325B / 1 代码行；`AsteriskEqualsTokenShape`）
- 结构：`*=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:25,2675`、`operator-shape-map.xl.md:15,277`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/asterisk-token-shape.xl.md（980B / 14 代码行；`AsteriskTokenShape`）
- 结构：`*` 标记 shape，带 `Op` 字段与 `FromSymbol` 静态工厂。
- 偏离：
  - `[U1]` ○ 同一个类有两条产出路径：`FromSymbol` 会写 `Op="*"` 并 `TryToClose`（`asterisk-token-shape.xl.md:25-41`，**这是 R31 的正向样板**），而 `expression-builder.xl.md:26,2607` 等 8 处直接 `new`，不写 `Op` → 后者的 AST 运算符文本靠回读源码。
- 结论：偏离（1 条，疑似；同时是 R31 的正向证据）。

### typescript/tokens/punctuation/at-token-shape.xl.md（312B / 1 代码行；`AtTokenShape`）
- 结构：`@` 标记 shape。
- 偏离：
  - `[X1]` ○ 全仓零实例化（`refs=0`）：TS 的 `AtToken` 节点在装饰器 AST 里必现，本仓却没有任何地方造它。
  - `[S3]` ○ 形状树因此不可能产出 `AtToken` 子节点，R18 的同构在这一格不成立。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/backtick-token-shape.xl.md（434B / 1 代码行；`BacktickTokenShape`）
- 结构：`` ` `` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（模板字面量的 `` ` `` 在 TS AST 里是 `TemplateHead`/`NoSubstitutionTemplateLiteral` 的一部分，不是独立节点——这个类既没人用，也没有 AST 归属）。
  - `[S3]` ○ 留壳类。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/bar-bar-equals-token-shape.xl.md（324B / 1 代码行；`BarBarEqualsTokenShape`）
- 结构：`||=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:27,2695`、`operator-shape-map.xl.md:17,310`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/bar-bar-token-shape.xl.md（317B / 1 代码行；`BarBarTokenShape`）
- 结构：`||` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:28,2661`、`operator-shape-map.xl.md:18,262`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/bar-equals-token-shape.xl.md（320B / 1 代码行；`BarEqualsTokenShape`）
- 结构：`|=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:29,2691`、`operator-shape-map.xl.md:19,304`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/bar-token-shape.xl.md（313B / 1 代码行；`BarTokenShape`）
- 结构：`|` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:30,2649`、`operator-shape-map.xl.md:20,256`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/caret-equals-token-shape.xl.md（322B / 1 代码行；`CaretEqualsTokenShape`）
- 结构：`^=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:31,2617`、`operator-shape-map.xl.md:21,301`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/caret-token-shape.xl.md（315B / 1 代码行；`CaretTokenShape`）
- 结构：`^` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:32,2651`、`operator-shape-map.xl.md:22,253`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/close-brace-token-shape.xl.md（320B / 1 代码行；`CloseBraceTokenShape`）
- 结构：`}` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：TS 的 `CloseBraceToken` 是每个块/对象字面量的 children 成员。
  - `[S3]` ○ 形状树不产出该节点，R18 不成立。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/close-bracket-token-shape.xl.md（322B / 1 代码行；`CloseBracketTokenShape`）
- 结构：`]` 标记 shape。
- 偏离：`[X1]` ○ 零实例化；`[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/close-paren-token-shape.xl.md（320B / 1 代码行；`CloseParenTokenShape`）
- 结构：`)` 标记 shape。
- 偏离：`[X1]` ○ 零实例化；`[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/colon-token-shape.xl.md（315B / 1 代码行；`ColonTokenShape`）
- 结构：`:` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:33,2667` 与 `conditional-possible-shape.xl.md:16,580,638,666`（后者是 possible，但同样只 `new` 不写 `Op`）。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/comma-token-shape.xl.md（315B / 1 代码行；`CommaTokenShape`）
- 结构：`,` 标记 shape。
- 偏离：`[U1]` ○ 唯一实例化点 `expression-builder.xl.md:34,2669`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/dot-dot-dot-token-shape.xl.md（321B / 1 代码行；`DotDotDotTokenShape`）
- 结构：`...` 标记 shape。
- 偏离：`[U1]` ○ 实例化点分散在 `binding-element-shape`、`class-declaration-shape`、`expression-builder` 等（12 处），全部 `new` 后不写 `Op`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/dot-token-shape.xl.md（313B / 1 代码行；`DotTokenShape`）
- 结构：`.` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：属性访问的 `.` 在 TS AST 里是 `PropertyAccessExpression` 的 children 之一，本仓从不产出。
  - `[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/equals-equals-equals-token-shape.xl.md（330B / 1 代码行；`EqualsEqualsEqualsTokenShape`）
- 结构：`===` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:36,2643`、`operator-shape-map.xl.md:24,244`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/equals-equals-token-shape.xl.md（323B / 1 代码行；`EqualsEqualsTokenShape`）
- 结构：`==` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:37,2639`、`operator-shape-map.xl.md:25,238`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/equals-greater-than-token-shape.xl.md（328B / 1 代码行；`EqualsGreaterThanTokenShape`）
- 结构：`=>` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:38,2613`、`arrow-possible-shape`、`assignment-possible-shape`、`direct-expression-engine:2554`（四个家族各自 `new`）。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/equals-token-shape.xl.md（316B / 1 代码行；`EqualsTokenShape`）
- 结构：`=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:39,2609`、`assignment-possible-shape.xl.md:28`、`operator-shape-map.xl.md:26,268`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/exclamation-equals-equals-token-shape.xl.md（335B / 1 代码行；`ExclamationEqualsEqualsTokenShape`）
- 结构：`!==` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:40,2645`、`operator-shape-map.xl.md:27,247`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/exclamation-equals-token-shape.xl.md（328B / 1 代码行；`ExclamationEqualsTokenShape`）
- 结构：`!=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:41,2641`、`operator-shape-map.xl.md:28,241`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/exclamation-token-shape.xl.md（321B / 1 代码行；`ExclamationTokenShape`）
- 结构：`!` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 8 处（`class-declaration-shape`、`variable-declaration-*`、`expression-builder` 等），全部 `new` 不写 `Op`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-equals-token-shape.xl.md（328B / 1 代码行；`GreaterThanEqualsTokenShape`）
- 结构：`>=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:42,2637`、`operator-shape-map.xl.md:29,229`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-greater-than-equals-token-shape.xl.md（340B / 1 代码行；`GreaterThanGreaterThanEqualsTokenShape`）
- 结构：`>>=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:43,2685`、`operator-shape-map.xl.md:30,292`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-greater-than-greater-than-equals-token-shape.xl.md（352B / 1 代码行；`GreaterThanGreaterThanGreaterThanEqualsTokenShape`）
- 结构：`>>>=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:44,2687`、`operator-shape-map.xl.md:31,295`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-greater-than-greater-than-token-shape.xl.md（345B / 1 代码行；`GreaterThanGreaterThanGreaterThanTokenShape`）
- 结构：`>>>` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:45,2657`、`operator-shape-map.xl.md:32,217`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-greater-than-token-shape.xl.md（333B / 1 代码行；`GreaterThanGreaterThanTokenShape`）
- 结构：`>>` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:46,2655`、`operator-shape-map.xl.md:33,214`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/greater-than-token-shape.xl.md（321B / 1 代码行；`GreaterThanTokenShape`）
- 结构：`>` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:47,2633`、`operator-shape-map.xl.md:34,223`、`right-operand-possible-shape.xl.md:223`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/hash-token-shape.xl.md（422B / 1 代码行；`HashTokenShape`）
- 结构：`#` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：TS 的私有名 `#x` 由 `PrivateIdentifier` 承担，`HashToken` 只在个别恢复形里出现。
  - `[S3]` ○ 留壳类。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/less-than-equals-token-shape.xl.md（325B / 1 代码行；`LessThanEqualsTokenShape`）
- 结构：`<=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:48,2635`、`operator-shape-map.xl.md:35,226`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/less-than-less-than-equals-token-shape.xl.md（334B / 1 代码行；`LessThanLessThanEqualsTokenShape`）
- 结构：`<<=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:49,2683`、`operator-shape-map.xl.md:36,289`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/less-than-less-than-token-shape.xl.md（327B / 1 代码行；`LessThanLessThanTokenShape`）
- 结构：`<<` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:50,2653`、`operator-shape-map.xl.md:37,211`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/less-than-slash-token-shape.xl.md（326B / 1 代码行；`LessThanSlashTokenShape`）
- 结构：`</` 标记 shape（JSX 关闭标签的开头）。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：本仓不支持 tsx（R36），这个类没有存在理由。
  - `[X3]` ○ 它是 JSX 的专属 token 形状，属于「与不支持 tsx 相悖」的残留物。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/less-than-token-shape.xl.md（318B / 1 代码行；`LessThanTokenShape`）
- 结构：`<` 标记 shape。
- 偏离：`[U1]` ○ 唯一符号引用在 `right-operand-possible-shape.xl.md:223`（类型判断），全仓没有一处 `new` —— 但这个类**应该**在泛型实参/尖括号断言里出现，说明尖括号那一路绕过了它。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/minus-equals-token-shape.xl.md（322B / 1 代码行；`MinusEqualsTokenShape`）
- 结构：`-=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:51,2673`、`operator-shape-map.xl.md:38,274`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/minus-minus-token-shape.xl.md（321B / 1 代码行；`MinusMinusTokenShape`）
- 结构：`--` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：前缀/后缀自减在 TS AST 里是 `PrefixUnaryExpression` + `MinusMinusToken`，本仓从不产出后者。
  - `[S3]` ○ 形状树缺该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/minus-token-shape.xl.md（315B / 1 代码行；`MinusTokenShape`）
- 结构：`-` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:52,2623`、`operator-shape-map.xl.md:39,205`、`type-builder.xl.md:15,2540`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/open-brace-token-shape.xl.md（319B / 1 代码行；`OpenBraceTokenShape`）
- 结构：`{` 标记 shape。
- 偏离：`[X1]` ○ 零实例化；`[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/open-bracket-token-shape.xl.md（321B / 1 代码行；`OpenBracketTokenShape`）
- 结构：`[` 标记 shape。
- 偏离：`[X1]` ○ 零实例化；`[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/open-paren-token-shape.xl.md（319B / 1 代码行；`OpenParenTokenShape`）
- 结构：`(` 标记 shape。
- 偏离：`[X1]` ○ 零实例化；`[S3]` ○ 形状树不产出该节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/percent-equals-token-shape.xl.md（324B / 1 代码行；`PercentEqualsTokenShape`）
- 结构：`%=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:53,2679`、`operator-shape-map.xl.md:40,283`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/percent-token-shape.xl.md（317B / 1 代码行；`PercentTokenShape`）
- 结构：`%` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:54,2629`、`operator-shape-map.xl.md:41,199`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/plus-equals-token-shape.xl.md（321B / 1 代码行；`PlusEqualsTokenShape`）
- 结构：`+=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:55,2615`、`operator-shape-map.xl.md:42,271`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/plus-plus-token-shape.xl.md（319B / 1 代码行；`PlusPlusTokenShape`）
- 结构：`++` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：`update-expression-possible-shape` 与 `expression-builder` 都走 `Symbol`/`Common` 文本，没有造这个形状。
  - `[S3]` ○ `PlusPlusToken` 节点永远不出现。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/plus-token-shape.xl.md（968B / 14 代码行；`PlusTokenShape`）
- 结构：`+` 标记 shape，带 `Op` 字段与 `FromSymbol`。
- 偏离：
  - `[U1]` ○ 两条产出路径：`FromSymbol` 写 `Op="+"` 并 `TryToClose`（`plus-token-shape.xl.md:25-41`，R31 正向样板）；`expression-builder.xl.md:56,2621`、`operator-shape-map.xl.md`、`binary-expression-possible-shape.xl.md:14,101` 等处直接 `new`，不写 `Op`。
- 结论：偏离（1 条，疑似；同时是 R31 的正向证据）。

### typescript/tokens/punctuation/question-dot-token-shape.xl.md（322B / 1 代码行；`QuestionDotTokenShape`）
- 结构：`?.` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:57,2671`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/question-question-equals-token-shape.xl.md（334B / 1 代码行；`QuestionQuestionEqualsTokenShape`）
- 结构：`??=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:58,2697`、`operator-shape-map.xl.md:44,313`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/question-question-token-shape.xl.md（327B / 1 代码行；`QuestionQuestionTokenShape`）
- 结构：`??` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:59,2663`、`operator-shape-map.xl.md:45,265`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/question-token-shape.xl.md（318B / 1 代码行；`QuestionTokenShape`）
- 结构：`?` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 21 处（`class-declaration-shape`、`expression-builder`、条件表达式族…），全部 `new` 不写 `Op`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/semicolon-token-shape.xl.md（319B / 1 代码行；`SemicolonTokenShape`）
- 结构：`;` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：`;` 在 TS AST 里是 `VariableStatement`/`ExpressionStatement` 的 children，本仓从不产出它（`statement-builder` 反而用「合成一个零宽 `Symbol` 再撤掉」的办法处理分号，见第 20 篇）。
  - `[S3]` ○ 形状树缺 `SemicolonToken` 节点。
- 结论：偏离（2 条，均疑似）。

### typescript/tokens/punctuation/slash-equals-token-shape.xl.md（322B / 1 代码行；`SlashEqualsTokenShape`）
- 结构：`/=` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:61,2677`、`operator-shape-map.xl.md:47,280`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/slash-token-shape.xl.md（315B / 1 代码行；`SlashTokenShape`）
- 结构：`/` 标记 shape。
- 偏离：`[U1]` ○ 实例化点 `expression-builder.xl.md:62,2627`、`operator-shape-map.xl.md:48,196`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/punctuation/tilde-token-shape.xl.md（315B / 1 代码行；`TildeTokenShape`）
- 结构：`~` 标记 shape。
- 偏离：
  - `[X1]` ○ 零实例化（`refs=0`）：按位取反在 `prefix-unary-possible-shape` 里走 `Symbol` 文本，没有这个形状。
  - `[S3]` ○ `TildeToken` 节点永远不出现。
- 结论：偏离（2 条，均疑似）。

---

## 本批统计

- 文件数：61；有偏离：61（全部为疑似 `○`，无一条明确违反判据）。
- 按编号计数：`U1:44`、`X1:15`、`S3:15`、`X3:1`（合计 75 条；一个文件可含多条）。
- 零实例化清单（15）：`at` `backtick` `close-brace` `close-bracket` `close-paren` `dot` `hash` `less-than-slash` `minus-minus` `open-brace` `open-bracket` `open-paren` `plus-plus` `semicolon` `tilde`。
- 本批最严重 3 条：
  1. `[X1]/[S3]` 15 个标点形状（括号、分号、`@`、`++/--`…）全仓零实例化，形状树因此不可能与 TS AST 同构（R18）。
  2. `[U1]` 46 个类的唯一实例化点在 legacy `expression-builder`/`operator-shape-map`，且实例不写 `Op`，AST 运算符文本靠回读源码（R19 缺位）。
  3. `[X3]` `LessThanSlashTokenShape` 是 JSX 专属 token，与「不支持 tsx」相悖（R36）。
