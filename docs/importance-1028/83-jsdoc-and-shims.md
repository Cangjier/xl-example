# 83 — jsdoc / jsx / trivia / synthetic / literals / aliases / names / positions

审计范围：8 个目录共 117 个文件——`jsdoc/`(43)、`jsx/`(12)、`trivia/`(9)、`synthetic/`(7)、`literals/`(11)、`aliases/`(32)、`names/`(2)、`positions/`(1)。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：117 个文件里，**104 个是纯标记/占位类**（类体只有构造函数，或连构造函数都没有），其中 **99 个在符号级零实例化**（`jsdoc` 42/43、`jsx` 12/12、`synthetic` 7/7、`trivia` 8/9、`aliases` 31/32、`literals` 里 5 个、`names` 1/2）。有实质逻辑的只有 13 个：`literals` 的 6 个（`string-literal-possible`、`string-literal`、`numeric-literal`、`big-int-literal`、`no-substitution-template`、`regular-expression`）、`trivia/end-of-file-token`、`names/identifier`、`names/private-identifier`（无体）、`positions/shape-position`，以及 `aliases` 的 `jsdoc-comment-shape`（唯一被引用的）。

三个结论要单独记住：

1. **`aliases/` 32 个 `First*/Last*Shape` 是把 TS 的 `SyntaxKind` 区间哨兵实现成了 shape 类**。`firstAssignment` / `lastAssignment` / `firstKeyword` … 在 TS 里是**枚举区间标量**，不是 AST 节点，也没有 shape 语义。本仓为它们各建了一个 `extends ShapeToken` 的类，且 31 个零实例化——这是把「枚举坐标」误当「形状」的典型（`S3`/`X1`）。
2. **`jsx/` 12 个类全是空壳**，`literals` 里还有 `JsxTextShape`/`JsxTextAllWhiteSpacesShape` 两个。IMPORTANCE 明确「不支持 tsx」（`R36`），这些类与 `LessThanSlashTokenShape`（第 82 篇）一起构成 `X3` 残留。
3. **`jsdoc/` 42 个类零实例化**：43 个里只有 `JSDocCommentShape`（别名类）被引用。也就是本仓没有任何 JSDoc 解析能力，却铺了整套 42 个节点形状。

---

## 有实质逻辑的 13 个文件

### typescript/tokens/literals/string-literal-possible-shape.xl.md（4391B / 136 行；`StringLiteralPossibleShape`、`StringLiteralScan`）
- 结构：字符串字面量候选——增量记录 `LastCode`/`PreviousCode`/`HasLiteral`，只在「前一个代码单元是 `from`/`import`」时 `Accept`。
- 偏离：
  - `[B1]` ○ 越界返回 `Uncertain` 而非 `Nothing`（`:40-42`）；根因是 `ShapeStates` 没有 `Nothing` 成员（`core/syntax/shape-states.xl.md:5-7`），R25 在候选侧不可表达。
  - `[P2]` ○ `BuildByIndex` 在拿不到 `String` 时 `return host`（`:111-113`）——已 `Accept` 却无产出，属「僵尸候选」。
  - `[X1]` ○ `from` / `import` / `*` 三个特例用 `instanceof` + 文本判（`:73-99`），是候选收敛之外的启发式。
- 符合项：cache 用法正确——`cache.GetState/SetState` + `state.Checked` 只增量推进（`:43-65`），`ItemStartCached` 复用起点（`:47`），符合 R09/R11；build 走 `StringLiteralShape.FromBasicToken` 后 `splice` 换入（`:124-134`），R31/R35。
- 结论：偏离（3 条，均疑似）。

### typescript/tokens/literals/string-literal-shape.xl.md（1234B / 50 行；`StringLiteralShape`）
- 结构：字符串字面量形状，`FromBasicToken` 把 `ConstString` 分片拼成 `Text`。
- 偏离：
  - `[U1]` ● `HasExtendedUnicodeEscape` 字段声明了（`:22`）却**从未被赋值**：`FromBasicToken` 只写 `Text` 与 `IsUnterminated`（`:46-47`）。R19 要求数据在 build 那一刻提取到字段，这里少了一项。
  - `[U1]` ○ `IsUnterminated = !token.Closed`（`:47`）是反推而不是记录：basic token 是否真的没闭合，取决于 `String` 的 `Closed` 标志，而这个标志在第 12 篇里已被证明有空串路径 `Closed` 恒 false 的问题（`string-guide.xl.md:123-128`）→ 会误报未闭合。
- 符合项：`Text` 在 build 时一次拼好（`:40-46`），签范围 + `TryToClose`（`:34-48`）= R31。
- 结论：偏离（2 条，1 条明确）。

### typescript/tokens/literals/numeric-literal-shape.xl.md（1112B / 50 行；`NumericLiteralShape`）
- 结构：数字字面量，`FromBasicToken` 去掉 `_` 分隔符后取 `Number(raw)` 的字符串形式。
- 偏离：
  - `[U1]` ○ `String(Number(raw))`（`:47`）会把超出 IEEE754 精度的整数（如 `12345678901234567890`）改写成科学计数法/丢位——**提取出的 `Text` 可能与源码不一致**。R19 要求「数据在 build 时提取」，但没说可以改写；AST 对拍的 `text` 字段会因此失真（这也是「用运行时数值冒充源码文本」的通病）。
- 符合项：签范围 + `TryToClose`（`:34-48`）= R31；`_` 分隔符在提取时被剔除（`:41-46`），与 TS 的 `text` 口径一致。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/literals/big-int-literal-shape.xl.md（2214B / 87 行；`BigIntLiteralShape`）
- 结构：BigInt 字面量，`ToText` 把 `0x`/`0b`/`0o` 归一（`0b`/`0o` 转十进制），`ConvertToDecimal` 是手写的大数进制转换。
- 偏离：
  - `[X1]` ○ 进制转换写在 shape 里（`:45-87`），是 AST 文本归一化逻辑，设计里没有「shape 负责文本改写」这一职责（R19 只说提取）。
- 符合项：签范围 + `TryToClose`（`:34-42`）；`Text` 在 build 时提取（R19）；`0x` 前缀转小写（`:54-56`）与 TS 一致。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/literals/no-substitution-template-literal-shape.xl.md（1158B / 45 行；`NoSubstitutionTemplateLiteralShape`）
- 结构：无插值模板串，`FromBasicToken` 拼 `ConstString` 分片成 `Text`。
- 偏离：无。
- 符合项：R31（签范围 + 取 `Text` + `TryToClose`，`:29-44`）；数据在 build 时提取（R19）。
- 结论：符合。

### typescript/tokens/literals/regular-expression-literal-shape.xl.md（930B / 34 行；`RegularExpressionLiteralShape`）
- 结构：正则字面量标记 shape（`Text` 字段）。
- 偏离：
  - `[U1]` ○ 全文只有构造函数与一个 `Text` 字段，没有任何 `FromBasicToken` 或赋值点（`:9-33`）：`RegexToken` 的原文（`ToText()`）没有在 build 时被搬进 shape → R19 缺一项；AST 文本只能靠 `AstText`/`AstOperator` 回读源码。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/trivia/end-of-file-token-shape.xl.md（1277B / 41 行；`EndOfFileTokenShape`）
- 结构：EOF 哨兵。它 `extends ShapeToken`，同时声明 `IsBasicToken = true`，`Close` 时按 basic token 的口径去问父单元 possible。
- 偏离：
  - `[S1]` ● **两层身份混用**：一个 `ShapeToken`（语法层）把自己声明成 `IsBasicToken = true`（词法层，`:21`），并在 `Close` 里执行「basic token 关闭 → 触发父 possible」的动作（`:29-40`）。IMPORTANCE 的分层是 basic token 与 shape 两类，没有「既是 shape 又是 basic token」的第三种。
  - `[P1]` ○ 它成了 EOF 处的 possible 触发点：`SourceFileShape.Process` 造出它并让 `Close` 触发收口（第 70 篇 `source-file-shape.xl.md:144-171`）。设计里 EOF 触发消费应走 R17② 的「按形状预期挂到 shape 下、EOF 触发消费」，不是造一个假 token。
- 结论：偏离（2 条，1 条明确）。

### typescript/tokens/names/identifier-shape.xl.md（2207B / 82 行；`IdentifierShape`）
- 结构：标识符，`FromBasicToken` 解 `\u` 转义得 `EscapedText`。
- 偏离：无。
- 符合项：R31（签范围 + `EscapedText` + `TryToClose`，`:28-37`）；`AstText` 直接返回 `EscapedText`（`:78-82`），是 R19 的正确形态——**AST 阶段的文本来自 build 时提取的字段，不回读源码**，这在全仓是少数几个正面样板之一。
- 结论：符合。

### typescript/tokens/names/private-identifier-shape.xl.md（340B / 15 行；`PrivateIdentifierShape`）
- 结构：`#name` 标记 shape，无方法体。
- 偏离：
  - `[S4]` ○ 纯标记、无 `FromBasicToken`、无字段：私有名的文本不进 shape，AST 文本只能靠回读源码（R19）。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/positions/shape-position.xl.md（1050B / 56 行；`ShapePosition`）
- 结构：位置工具——`PosAt`（向前找上一个非 trivia 单元的 `End`）、`HostStart`（括号宿主取 `Start+1`）、`PreviousCode`。
- 偏离：
  - `[X1]` ○ 它是「Pos 口径」的第二份实现：`array-binding-pattern-possible-shape` 里内联手写了一版同样的向前扫描（第 85 篇），`item-util` 里还有第三份 `PreviousCode`。同一语义三处代码。
- 符合项：只向前扫描，不读 `tokenIndex` 之后（R22）；`HostStart` 对括号宿主返回 `Start+1`，与「Pos 含前导 trivia」的口径一致。
- 结论：偏离（1 条，疑似）。

---

## 纯标记 / 零实例化（104 个文件，逐文件一行）

下表每行一个文件。「零引用」= 类名在自身文件之外 0 次出现（`tmp/refs.mjs` 符号级检索）；`B`/`L` = 字节 / 代码行。

### jsdoc（43 个：42 个零引用）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `jsdoc/jsdoc-shape.xl.md` | `JSDocShape` | 335 / 0 | `X1` ○ 零引用（本目录唯一被别处 import 的是 `jsdoc-comment-shape` 别名） |
| `jsdoc/jsdoc-tag-shape.xl.md` | `JSDocTagShape` | 342 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-all-type-shape.xl.md` | `JSDocAllTypeShape` | 348 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-augments-tag-shape.xl.md` | `JSDocAugmentsTagShape` | 354 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-author-tag-shape.xl.md` | `JSDocAuthorTagShape` | 350 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-callback-tag-shape.xl.md` | `JSDocCallbackTagShape` | 355 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-class-tag-shape.xl.md` | `JSDocClassTagShape` | 346 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-deprecated-tag-shape.xl.md` | `JSDocDeprecatedTagShape` | 356 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-enum-tag-shape.xl.md` | `JSDocEnumTagShape` | 353 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-function-type-shape.xl.md` | `JSDocFunctionTypeShape` | 376 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-implements-tag-shape.xl.md` | `JSDocImplementsTagShape` | 358 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-import-tag-shape.xl.md` | `JSDocImportTagShape` | 363 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-link-code-shape.xl.md` | `JSDocLinkCodeShape` | 353 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-link-plain-shape.xl.md` | `JSDocLinkPlainShape` | 355 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-link-shape.xl.md` | `JSDocLinkShape` | 345 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-member-name-shape.xl.md` | `JSDocMemberNameShape` | 350 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-name-reference-shape.xl.md` | `JSDocNameReferenceShape` | 353 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-namepath-type-shape.xl.md` | `JSDocNamepathTypeShape` | 364 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-non-nullable-type-shape.xl.md` | `JSDocNonNullableTypeShape` | 362 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-nullable-type-shape.xl.md` | `JSDocNullableTypeShape` | 359 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-optional-type-shape.xl.md` | `JSDocOptionalTypeShape` | 359 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-overload-tag-shape.xl.md` | `JSDocOverloadTagShape` | 352 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-override-tag-shape.xl.md` | `JSDocOverrideTagShape` | 352 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-parameter-tag-shape.xl.md` | `JSDocParameterTagShape` | 352 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-private-tag-shape.xl.md` | `JSDocPrivateTagShape` | 350 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-property-tag-shape.xl.md` | `JSDocPropertyTagShape` | 386 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-protected-tag-shape.xl.md` | `JSDocProtectedTagShape` | 354 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-public-tag-shape.xl.md` | `JSDocPublicTagShape` | 348 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-readonly-tag-shape.xl.md` | `JSDocReadonlyTagShape` | 352 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-return-tag-shape.xl.md` | `JSDocReturnTagShape` | 358 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-satisfies-tag-shape.xl.md` | `JSDocSatisfiesTagShape` | 358 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-see-tag-shape.xl.md` | `JSDocSeeTagShape` | 344 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-signature-shape.xl.md` | `JSDocSignatureShape` | 374 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-template-tag-shape.xl.md` | `JSDocTemplateTagShape` | 354 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-text-shape.xl.md` | `JSDocTextShape` | 349 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-this-tag-shape.xl.md` | `JSDocThisTagShape` | 346 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-throws-tag-shape.xl.md` | `JSDocThrowsTagShape` | 356 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-type-expression-shape.xl.md` | `JSDocTypeExpressionShape` | 360 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-type-literal-shape.xl.md` | `JSDocTypeLiteralShape` | 386 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-type-tag-shape.xl.md` | `JSDocTypeTagShape` | 353 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-typedef-tag-shape.xl.md` | `JSDocTypedefTagShape` | 361 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-unknown-type-shape.xl.md` | `JSDocUnknownTypeShape` | 352 / 0 | `X1` ○ 零引用 |
| `jsdoc/jsdoc-variadic-type-shape.xl.md` | `JSDocVariadicTypeShape` | 361 / 0 | `X1` ○ 零引用 |

### jsx（12 个：全部零引用 → 全是 `X3`，因为 IMPORTANCE 明确不支持 tsx）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `jsx/jsx-attribute-shape.xl.md` | `JsxAttributeShape` | 327 / 0 | `X3` ○ +`X1` ○ 空壳零引用，与 `R36`「不支持 tsx」相悖 |
| `jsx/jsx-attributes-shape.xl.md` | `JsxAttributesShape` | 328 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-closing-element-shape.xl.md` | `JsxClosingElementShape` | 328 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-closing-fragment-shape.xl.md` | `JsxClosingFragmentShape` | 327 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-element-shape.xl.md` | `JsxElementShape` | 321 / 0 | `X3` ○ +`X1` ○（`:9-19` 只有 `super(template)`） |
| `jsx/jsx-expression-shape.xl.md` | `JsxExpressionShape` | 327 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-fragment-shape.xl.md` | `JsxFragmentShape` | 320 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-namespaced-name-shape.xl.md` | `JsxNamespacedNameShape` | 328 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-opening-element-shape.xl.md` | `JsxOpeningElementShape` | 328 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-opening-fragment-shape.xl.md` | `JsxOpeningFragmentShape` | 327 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-self-closing-element-shape.xl.md` | `JsxSelfClosingElementShape` | 330 / 0 | `X3` ○ +`X1` ○ |
| `jsx/jsx-spread-attribute-shape.xl.md` | `JsxSpreadAttributeShape` | 334 / 0 | `X3` ○ +`X1` ○ |

### trivia（9 个：8 个零引用；`end-of-file-token` 见上）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `trivia/whitespace-trivia-shape.xl.md` | `WhitespaceTriviaShape` | 364 / 0 | `X1` ○ 零引用：空白由 `WrapSymbol` basic token 承担，不产 shape |
| `trivia/new-line-trivia-shape.xl.md` | `NewLineTriviaShape` | 374 / 0 | `X1` ○ 零引用 |
| `trivia/single-line-comment-trivia-shape.xl.md` | `SingleLineCommentTriviaShape` | 331 / 0 | `X1` ○ 零引用（注释由 `LineAnnotation` basic token 承担） |
| `trivia/multi-line-comment-trivia-shape.xl.md` | `MultiLineCommentTriviaShape` | 333 / 0 | `X1` ○ 零引用（注释由 `AreaAnnotation` 承担） |
| `trivia/shebang-trivia-shape.xl.md` | `ShebangTriviaShape` | 336 / 0 | `X1` ○ 零引用（`Shebang` basic token 承担） |
| `trivia/conflict-marker-trivia-shape.xl.md` | `ConflictMarkerTriviaShape` | 336 / 0 | `X1` ○ 零引用 |
| `trivia/non-text-file-marker-trivia-shape.xl.md` | `NonTextFileMarkerTriviaShape` | 408 / 0 | `X1` ○ 零引用 |
| `trivia/unknown-shape.xl.md` | `UnknownShape` | 356 / 0 | `X1` ○ 零引用 |

### synthetic（7 个：全部零引用）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `synthetic/comma-list-expression-shape.xl.md` | `CommaListExpressionShape` | 386 / 0 | `X1` ○ 零引用（TS 的合成节点，本仓不产） |
| `synthetic/count-shape.xl.md` | `CountShape` | 364 / 0 | `X1` ○ 零引用（计数器形状，语义可疑） |
| `synthetic/not-emitted-statement-shape.xl.md` | `NotEmittedStatementShape` | 386 / 0 | `X1` ○ 零引用 |
| `synthetic/not-emitted-type-element-shape.xl.md` | `NotEmittedTypeElementShape` | 394 / 0 | `X1` ○ 零引用 |
| `synthetic/partially-emitted-expression-shape.xl.md` | `PartiallyEmittedExpressionShape` | 369 / 0 | `X1` ○ 零引用 |
| `synthetic/syntax-list-shape.xl.md` | `SyntaxListShape` | 368 / 0 | `X1` ○ 零引用 |
| `synthetic/synthetic-reference-expression-shape.xl.md` | `SyntheticReferenceExpressionShape` | 371 / 0 | `X1` ○ 零引用 |

### literals 的纯标记部分（5 个零引用 / 2 个有引用）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `literals/jsx-text-shape.xl.md` | `JsxTextShape` | 322 / 0 | `X3` ○ +`X1` ○ 零引用（tsx 残留） |
| `literals/jsx-text-all-white-spaces-shape.xl.md` | `JsxTextAllWhiteSpacesShape` | 424 / 0 | `X3` ○（该文件自己注明「TS 6 的解析器不产出」）+`X1` ○ |
| `literals/template-head-shape.xl.md` | `TemplateHeadShape` | 350 / 0 | `X1` ○ 零引用：模板头由 `String`/`ConstString` 承担，不产 shape |
| `literals/template-middle-shape.xl.md` | `TemplateMiddleShape` | 357 / 0 | `X1` ○ 零引用 |
| `literals/template-tail-shape.xl.md` | `TemplateTailShape` | 350 / 0 | `X1` ○ 零引用 |

### aliases（32 个：31 个零引用，只有 `jsdoc-comment-shape` 被引用）

| 文件 | 类 | B / L | 判定 |
| --- | --- | --- | --- |
| `aliases/first-assignment-shape.xl.md` | `FirstAssignmentShape` | 336 / 1 | `S3` ● +`X1` ○ 把 `SyntaxKind.firstAssignment` 区间标量当 shape |
| `aliases/last-assignment-shape.xl.md` | `LastAssignmentShape` | 341 / 1 | `S3` ● +`X1` ○ 同上（`lastAssignment`） |
| `aliases/first-binary-operator-shape.xl.md` | `FirstBinaryOperatorShape` | 342 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-binary-operator-shape.xl.md` | `LastBinaryOperatorShape` | 345 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-compound-assignment-shape.xl.md` | `FirstCompoundAssignmentShape` | 349 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-compound-assignment-shape.xl.md` | `LastCompoundAssignmentShape` | 349 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-future-reserved-word-shape.xl.md` | `FirstFutureReservedWordShape` | 359 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-future-reserved-word-shape.xl.md` | `LastFutureReservedWordShape` | 348 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-jsdoc-node-shape.xl.md` | `FirstJSDocNodeShape` | 379 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-jsdoc-node-shape.xl.md` | `LastJSDocNodeShape` | 381 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-jsdoc-tag-node-shape.xl.md` | `FirstJSDocTagNodeShape` | 364 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-jsdoc-tag-node-shape.xl.md` | `LastJSDocTagNodeShape` | 384 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-keyword-shape.xl.md` | `FirstKeywordShape` | 338 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-keyword-shape.xl.md` | `LastKeywordShape` | 337 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-literal-token-shape.xl.md` | `FirstLiteralTokenShape` | 341 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-literal-token-shape.xl.md` | `LastLiteralTokenShape` | 357 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-node-shape.xl.md` | `FirstNodeShape` | 346 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-punctuation-shape.xl.md` | `FirstPunctuationShape` | 340 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-punctuation-shape.xl.md` | `LastPunctuationShape` | 342 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-reserved-word-shape.xl.md` | `FirstReservedWordShape` | 343 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-reserved-word-shape.xl.md` | `LastReservedWordShape` | 340 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-statement-shape.xl.md` | `FirstStatementShape` | 504 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-statement-shape.xl.md` | `LastStatementShape` | 348 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-template-token-shape.xl.md` | `FirstTemplateTokenShape` | 359 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-template-token-shape.xl.md` | `LastTemplateTokenShape` | 345 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-token-shape.xl.md` | `FirstTokenShape` | 371 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-token-shape.xl.md` | `LastTokenShape` | 335 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-trivia-token-shape.xl.md` | `FirstTriviaTokenShape` | 352 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-trivia-token-shape.xl.md` | `LastTriviaTokenShape` | 356 / 1 | `S3` ● +`X1` ○ |
| `aliases/first-type-node-shape.xl.md` | `FirstTypeNodeShape` | 373 / 1 | `S3` ● +`X1` ○ |
| `aliases/last-type-node-shape.xl.md` | `LastTypeNodeShape` | 352 / 1 | `S3` ● +`X1` ○ |
| `aliases/jsdoc-comment-shape.xl.md` | `JSDocCommentShape` | 352 / 1 | 符合（唯一被引用的别名类，作为 `JSDocComment` 的类型别名；本身无逻辑） |

---

## 本批统计

- 文件数：117；有偏离：116（明确 35 —— 其中 `aliases` 31 条 `S3` 均为明确、jsx 类为 `X3` 明确）；完全符合：1（`jsdoc-comment-shape`）。
- 按编号计数：`X1:99`、`S3:33`、`X3:15`、`S4:2`、`U1:4`、`B1:1`、`P1:1`、`P2:1`、`S1:1`。
- 零实例化：99 个类（jsdoc 42、jsx 12、trivia 8、synthetic 7、literals 5、aliases 31、names 1，去重后 99）。
- 本批最严重 3 条：
  1. `[S3]` `aliases/` 把 TS 的 32 个 `SyntaxKind` 区间哨兵（`firstAssignment`…`lastTypeNode`）实现成了 `ShapeToken` 子类——它们不是 AST 节点，没有 shape 语义，且 31 个零引用。
  2. `[S1]` `EndOfFileTokenShape` 同时是 shape 与 `IsBasicToken=true` 的 basic token，并在 `Close` 里触发父 possible（两层身份混用）。
  3. `[X3]` 14 个 JSX 形状（`jsx/` 12 + `literals` 2）与 `LessThanSlashTokenShape` 一起，与「不支持 tsx」相悖。
