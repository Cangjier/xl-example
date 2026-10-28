# 86 — AST 节点规范、两个 tokens 顶层工具、根入口 cjcli

审计范围：`typescript/ast/`（13 个 AST 节点文件）、`typescript/tokens/item-util.xl.md`、`typescript/tokens/shape-insert-util.xl.md`、`cjcli.xl.md`，共 16 个。
判据见 [`01-rules.md`](01-rules.md)。

**本层总评**：AST 节点规范本身没有问题——它们是纯数据、与 TS AST 同名同字段，正是 R18「shape 树与 TS AST 同构」的目标形状。问题在于**它们与 shape 之间没有桥**：13 个节点里只有 `ImportDeclarationAstNode` 写了 `ParseFromShape`，而它的方法体是 `throw new Error("...未实现")`。也就是说 R21 的入口在全仓只出现过这一次，且是空的。`item-util` 与 `shape-insert-util` 则是两个「让形状树被就地改写」的工具，设计里没有这一层。

---

### typescript/ast/ast-node.xl.md（173B / 13 行；`AstNode`）
- 结构：AST 节点基类——`Kind`/`Flags`/`Parent`/`Pos`/`End`，与 TS 的 `Node` 对齐。
- 偏离：无。
- 符合项：字段集就是 R18 要求的「同构」词汇表（`Kind` 对 `kind`、`Pos/End` 对 `pos/end`），`ast-node.xl.md:5-13`。
- 结论：符合。

### typescript/ast/expressions/expression-ast-node.xl.md（133B / 8 行；`ExpressionAstNode`）
- 结构：表达式节点空基类。
- 符合项：只做类型分档，无逻辑；R18 的同构要求由子类承担。
- 结论：符合（不涉及 possible）。

### typescript/ast/declarations/import-declaration-ast-node.xl.md（1168B / 32 行；`ImportDeclarationAstNode`）
- 结构：`ImportDeclaration` 节点，字段对齐 TS（`Modifiers`/`ImportClause`/`ModuleSpecifier`/`AssertClause`/`Attributes`）。
- 偏离：
  - `[S4]` ● **全仓唯一的 `ParseFromShape`，而且未实现**：`throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现")`（`:28-32`）。R21 要求「AST 节点由 `ParseFromShape(shape)` 从关闭后的 shape 产出」——这个唯一入口是空壳，等于承认 R21 没有落地。证据 `import-declaration-ast-node.xl.md:28-32`。
  - `[X1]` ○ 该文件是唯一 import 了 shape 类型的 AST 节点（`:8`），却只为了签名；其余 12 个节点连 shape 类型都不 import——「AST 从 shape 来」这条链在类型层面就没有建立。
- 结论：偏离（2 条，1 条明确）。

### typescript/ast/declarations/import-clause-ast-node.xl.md（589B / 21 行；`ImportClauseAstNode`）
- 结构：`ImportClause` 节点（`IsTypeOnly`/`PhaseModifier`/`Name`/`NamedBindings`）。
- 偏离：
  - `[S4]` ○ 纯数据节点，无任何从 shape 构造的入口；产出只能由别处（builder/session）负责，与 R21 相反。证据 `import-clause-ast-node.xl.md:11-21`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/declarations/import-specifier-ast-node.xl.md（491B / 18 行；`ImportSpecifierAstNode`）
- 结构：`ImportSpecifier` 节点。
- 偏离：
  - `[S4]` ○ 同上：纯数据，无 `ParseFromShape`。证据 `import-specifier-ast-node.xl.md:10-18`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/declarations/named-imports-ast-node.xl.md（303B / 13 行；`NamedImportsAstNode`）
- 结构：`NamedImports` 节点，`Elements:Array<ImportSpecifierAstNode>`。
- 偏离：
  - `[S4]` ○ 纯数据，无构造入口。证据 `named-imports-ast-node.xl.md:9-13`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/declarations/namespace-import-ast-node.xl.md（298B / 13 行；`NamespaceImportAstNode`）
- 结构：`NamespaceImport` 节点。
- 偏离：
  - `[S4]` ○ 纯数据，无构造入口。证据 `namespace-import-ast-node.xl.md:9-13`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/keywords/declare-keyword-ast-node.xl.md（178B / 10 行；`DeclareKeywordAstNode`）
- 结构：`DeclareKeyword` 标记节点。
- 符合项：TS 的 `DeclareKeyword` 就是零字段标记节点，与设计目标一致；无需 shape 构造逻辑（可由 builder 直接 `new`）。
- 结论：符合（不涉及 possible）。

### typescript/ast/keywords/export-keyword-ast-node.xl.md（176B / 10 行；`ExportKeywordAstNode`）
- 结构：`ExportKeyword` 标记节点。
- 符合项：同上，零字段标记与 TS 一致。
- 结论：符合（不涉及 possible）。

### typescript/ast/literals/string-literal-ast-node.xl.md（289B / 16 行；`StringLiteralAstNode`）
- 结构：`StringLiteral` 节点（`Text`/`IsUnterminated`/`HasExtendedUnicodeEscape`）。
- 偏离：
  - `[S4]` ○ 无构造入口；它的三个字段恰恰是 basic token 在 build 时必须提取的数据（R19），现在既没有 `ParseFromShape`，也没有任何 shape 把这三项写成字段的约定——`IsUnterminated` 靠 `!token.Closed` 反推（见 [`12-core-basic-tokens-string.md`](12-core-basic-tokens-string.md) 的 `P3` 条）。证据 `string-literal-ast-node.xl.md:8-16`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/members/import-attribute-ast-node.xl.md（527B / 17 行；`ImportAttributeAstNode`）
- 结构：`ImportAttribute` 节点（`Name`/`Value`）。
- 偏离：
  - `[S4]` ○ 纯数据，无构造入口。证据 `import-attribute-ast-node.xl.md:11-17`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/members/import-attributes-ast-node.xl.md（372B / 17 行；`ImportAttributesAstNode`）
- 结构：`ImportAttributes` 节点（`Token`/`Elements`/`MultiLine`）。
- 偏离：
  - `[S4]` ○ 纯数据，无构造入口。IMPORTANCE 里恰好点名 `ImportAttributesShape.FromBracket` 是「立即关闭」的样板（`IMPORTANCE.md:80`），但从那个 shape 到这个节点之间没有代码。证据 `import-attributes-ast-node.xl.md:9-17`。
- 结论：偏离（1 条，疑似）。

### typescript/ast/names/identifier-ast-node.xl.md（204B / 12 行；`IdentifierAstNode`）
- 结构：`Identifier` 节点（`EscapedText`）。
- 偏离：
  - `[S4]` ○ 纯数据，无构造入口；`EscapedText` 由 `IdentifierShape.FromBasicToken` 之类在别处赋值（`binary-operator-possible-shape.xl.md:246-248` 就是这种「就地 Replace」），走的是 builder 而不是 `ParseFromShape`。
- 结论：偏离（1 条，疑似）。

### typescript/tokens/item-util.xl.md（4468B / 197 行；`ItemUtil`）
- 结构：单元数组工具——找条目的起点、前后代码格、取 trivia、`ItemStart` 缓存，以及一个「前方是否有复合三目」的源码扫描器。
- 偏离：
  - `[B4]` ● `NextCode` 从 `index` 向后扫到 `units.length`（`:23-32`），是「看 `tokenIndex` 之后」的现成入口；本仓 34 个文件在 compute 里用了它或同形写法。证据 `item-util.xl.md:23-32`。
  - `[B4]` ● `IsCompoundTernaryAhead` 直接拿 `SourceRange.EndIndex` 往后扫**整份原文**（`document.GetValue(at)`，`at` 到 `count`），还会跳过注释与字符串（`:106-195`）。这不只是「看后面的 token」，而是「看还没被 token 化的字符」——R22 禁止的正是这件事。证据 `item-util.xl.md:90-197`。
  - `[X1]` ○ `IsCompoundTernaryAhead` 是语法判断（三目是否复合）却写在工具层、靠手写字符扫描实现，等于第二份词法。证据同上。
- 符合项：`ItemStartCached` 用 `cache.GetItemStart/SetItemStart` 把「本轮起点」记进 cache（`:78-88`），是 R08「把寻找结果记进 cache」的正面例子；`TriviaBetween` 只扫 `leftIndex+1 .. tokenIndex-1`（`:57-67`），落在允许区间内。
- 结论：偏离（3 条，2 条明确）。

### typescript/tokens/shape-insert-util.xl.md（1579B / 51 行；`ShapeInsertUtil`）
- 结构：把一个已存在的子形状塞进新建的 wrapper 形状里，并把 `MountedUnit` 链、`SourceRange`、`Pos` 一起搬过去。
- 偏离：
  - `[X1]` ● 设计里形状由 `BuildByIndex` **一次建出**（R31/R32），没有「事后把已有子形状包一层」的操作。这个工具是「形状树就地改写」的通用入口（注释自述 `[A, child, B] -> [A, wrapper, B]`，`:11-14`），表达式层的二元/后缀重结合都靠它。证据 `shape-insert-util.xl.md:16-50`。
  - `[P3]` ○ 它会同时改写 `parent.MountedUnit` 与 `wrapper.MountedUnit`（`:36-39`），即 R32 的挂载关系被第三方工具改写；设计里挂载只由 build 设置、由 `Quit` 清除。证据 `shape-insert-util.xl.md:36-39`。
  - `[X1]` ○ 用 `throw` 做前置条件校验（`:19-31` 五处），把「形状树不变量」变成运行期抛错而不是构建期保证。
- 结论：偏离（3 条，1 条明确）。

### cjcli.xl.md（2963B / 105 行；`CjcliHost` + 4 个模块函数）
- 结构：命令行入口——读源码、逐字符 `ProcessRange` 一遍、每字符打印一次 `root.ToAstLine(0)`。
- 偏离：
  - `[X1]` ○ 入口直接改写全局开关 `StatementRouteUtil.EnableIncrementalVariableShapes = true`（`:47`）。解析行为由「谁先跑」决定，IMPORTANCE 没有开关层。
  - `[B2]` ○ 解析异常被 `catch` 后只打印并置 `exitCode`（`:36-41`）；作为 CLI 顶层可以接受，但它把 possible 的诊断异常也收成了「解析失败：…」，与 R23 的「异常是用户期望看到的诊断」相比丢了分类。
- 符合项：驱动方式是**全仓最贴 R12 的一处**——`for (index...) ProcessRange(..., index, index+1)` 每字符推进一次并打印 AST（`:55-58`），正是 IMPORTANCE 的「逐字 ast 树」验证口径；EOF 也补了一次 `SignOut` + 空窗口 `Process`（`:59-62`），对应 R17②。
- 结论：偏离（2 条，均疑似）——但它是 R12 正向证据的样板。

---

## 本批统计

- 文件数：16；有偏离：11（明确 4）；完全符合：5。
- 按编号计数：`S4:8`、`B4:2`、`X1:5`、`P3:1`、`B2:1`。
- 本批最严重 3 条：
  1. `[S4]` R21 的唯一入口 `ParseFromShape` 是 `throw new Error("未实现")`（`import-declaration-ast-node.xl.md:28-32`）——「AST 由关闭后的 shape 产出」这条设计在中枢上是断的。
  2. `[B4]` `ItemUtil.IsCompoundTernaryAhead` 直接扫未被 token 化的原文（`item-util.xl.md:90-197`），是 `B4` 类偏离最赤裸的一处。
  3. `[X1]` `ShapeInsertUtil` 的「形状树就地包装」是设计外机制，且会改写 `MountedUnit` 链（R32）。
