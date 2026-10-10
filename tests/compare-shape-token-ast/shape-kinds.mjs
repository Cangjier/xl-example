// 产物标签 ↔ TS kind 的**归一表**：本门唯一的一份（`run.mjs` 与 `tools/*` 都 import 它）。
//
// 为什么单独成文件：这一层原先在 `run.mjs` 与临时脚本里各有一份，**于是两边漂了**——
// 临时报告缺 `PropertyAccess → PropertyAccessExpression` 与 `Foreach` 的 for-in 分支，
// 把 5 处「换名」误报成「真缺」。同一个口径两处维护就一定会漂，这是本仓反复记过的那条。
//
// 三张表的内容与 [`typescript/print-ast-common.xl.md`](../../../typescript/print-ast-common.xl.md)
// 的 `KIND_BY_TAG` / `KEYWORD_KIND` / `TOKEN_KIND` **同源**（那三张是投影的事实用表）。
// **为什么不 import 那一份**：本门要量的正是「投影之前」的形状，借投影的实现就是借被量者本身；
// 代价是它会漂，所以 `tools/coverage.mjs` 与 `tools/keys.mjs` 负责把漂动报出来。
export const KIND_BY_TAG = new Map([
  ["Root", "SourceFile"],
  ["Let", "VariableDeclaration"],
  ["BinaryOperator", "BinaryExpression"],
  ["LogicalOperator", "BinaryExpression"],
  ["UnaryOperator", "PrefixUnaryExpression"],
  ["NotNull", "NonNullExpression"],
  ["TernaryOperator", "ConditionalExpression"],
  ["Method", "CallExpression"],
  ["New", "NewExpression"],
  ["Lamda", "ArrowFunction"],
  ["LamdaParameter", "Parameter"],
  ["Parameter", "Parameter"],
  ["BindingElement", "BindingElement"],
  ["Spread", "SpreadElement"],
  ["ObjectLiteral", "ObjectLiteralExpression"],
  ["ArrayLiteral", "ArrayLiteralExpression"],
  ["As", "AsExpression"],
  ["Satisfies", "SatisfiesExpression"],
  ["TypeAssign", "TypeAliasDeclaration"],
  ["TypeDefine", "TypeReference"],
  ["TypeLiteral", "TypeLiteral"],
  ["GenericType", "TypeReference"],
  ["TypeParameter", "TypeParameter"],
  ["UnionType", "UnionType"],
  ["IntersectionType", "IntersectionType"],
  ["ArrayType", "ArrayType"],
  ["TupleType", "TupleType"],
  ["IndexedAccessType", "IndexedAccessType"],
  ["LiteralType", "LiteralType"],
  ["ConditionalType", "ConditionalType"],
  ["MappedType", "MappedType"],
  ["InferType", "InferType"],
  ["TypePredicate", "TypePredicate"],
  ["TypeOperator", "TypeOperator"],
  ["TypeQuery", "TypeQuery"],
  ["ImportType", "ImportType"],
  ["FunctionType", "FunctionType"],
  ["ParenthesizedType", "ParenthesizedType"],
  ["OptionalType", "OptionalType"],
  ["RestType", "RestType"],
  ["NamedTupleMember", "NamedTupleMember"],
  ["EnumMember", "EnumMember"],
  ["Field", "PropertyDeclaration"],
  ["MethodDeclaration", "MethodDeclaration"],
  ["IndexSignature", "IndexSignature"],
  ["NamespaceBody", "ModuleBlock"],
  ["FunctionBody", "Block"],
  ["MethodBody", "Block"],
  ["LambdaBody", "Block"],
  ["ForBody", "Block"],
  ["ForeachBody", "Block"],
  ["WhileBody", "Block"],
  ["TryBody", "Block"],
  ["CatchBody", "Block"],
  ["FinallyBody", "Block"],
  ["Decorator", "Decorator"],
  ["HeritageClause", "HeritageClause"],
  ["ExpressionWithTypeArguments", "ExpressionWithTypeArguments"],
  ["Signature", "CallSignature"],
  ["ConstString", "StringLiteral"],
  ["String", "StringLiteral"],
  ["RegexToken", "RegularExpressionLiteral"],
  ["Label", "LabeledStatement"],
  ["StaticBlock", "ClassStaticBlockDeclaration"],
  ["NamespaceExport", "NamespaceExportDeclaration"],
  ["Import", "ImportDeclaration"],
  ["Export", "ExportDeclaration"],
  ["Interface", "InterfaceDeclaration"],
  ["Enum", "EnumDeclaration"],
  ["Function", "FunctionDeclaration"],
  ["Class", "ClassDeclaration"],
  ["Namespace", "ModuleDeclaration"],
  ["Try", "TryStatement"],
  ["Switch", "SwitchStatement"],
  ["While", "WhileStatement"],
  ["DoWhile", "DoStatement"],
  ["For", "ForStatement"],
  ["Foreach", "ForOfStatement"],
  ["IfSet", "IfStatement"],
  // ---- 上面那 79 条是投影 `KIND_BY_TAG` 的逐条副本；下面这几条是**本门比形状时**要认的同义 ----
  // 它们不在投影那张表里（投影在自己的支路里直接把标签改名了，不走表），
  // 但比形状时两边指的是同一件东西 —— 缺一条就会误报「真缺」。
  ["PropertyAccess", "PropertyAccessExpression"],
  ["NullConditionalOperator", "PropertyAccessExpression"],
  ["SemicolonClassElement", "SemicolonClassElement"],
]);

/** 关键字文本 → TS kind 名。 */
export const KEYWORD_KIND = new Map([
  ["in", "InKeyword"], ["instanceof", "InstanceOfKeyword"], ["asserts", "AssertsKeyword"],
  ["typeof", "TypeOfKeyword"], ["keyof", "KeyOfKeyword"], ["readonly", "ReadonlyKeyword"],
  ["new", "NewKeyword"], ["this", "ThisKeyword"], ["super", "SuperKeyword"],
  ["null", "NullKeyword"], ["true", "TrueKeyword"], ["false", "FalseKeyword"],
  ["undefined", "UndefinedKeyword"], ["any", "AnyKeyword"], ["unknown", "UnknownKeyword"],
  ["never", "NeverKeyword"], ["object", "ObjectKeyword"], ["symbol", "SymbolKeyword"],
  ["bigint", "BigIntKeyword"], ["string", "StringKeyword"], ["number", "NumberKeyword"],
  ["boolean", "BooleanKeyword"], ["void", "VoidKeyword"], ["intrinsic", "IntrinsicKeyword"],
]);

/** 运算符/标点文本 → TS token kind 名。 */
export const TOKEN_KIND = new Map([
  ["=", "EqualsToken"], ["+=", "PlusEqualsToken"], ["-=", "MinusEqualsToken"],
  ["*=", "AsteriskEqualsToken"], ["/=", "SlashEqualsToken"], ["%=", "PercentEqualsToken"],
  ["+", "PlusToken"], ["-", "MinusToken"], ["*", "AsteriskToken"], ["/", "SlashToken"],
  ["%", "PercentToken"], ["<", "LessThanToken"], [">", "GreaterThanToken"],
  ["<=", "LessThanEqualsToken"], [">=", "GreaterThanEqualsToken"],
  ["==", "EqualsEqualsToken"], ["===", "EqualsEqualsEqualsToken"],
  ["!=", "ExclamationEqualsToken"], ["!==", "ExclamationEqualsEqualsToken"],
  ["&&", "AmpersandAmpersandToken"], ["||", "BarBarToken"], ["??", "QuestionQuestionToken"],
  ["!", "ExclamationToken"], ["?", "QuestionToken"], [":", "ColonToken"],
  [",", "CommaToken"], [";", "SemicolonToken"], ["(", "OpenParenToken"], [")", "CloseParenToken"],
  ["[", "OpenBracketToken"], ["]", "CloseBracketToken"], ["{", "OpenBraceToken"], ["}", "CloseBraceToken"],
  ["=>", "EqualsGreaterThanToken"], ["++", "PlusPlusToken"], ["--", "MinusMinusToken"],
  [".", "DotToken"], ["...", "DotDotDotToken"],
  ["**", "AsteriskAsteriskToken"], ["**=", "AsteriskAsteriskEqualsToken"],
  ["<<", "LessThanLessThanToken"], ["<<=", "LessThanLessThanEqualsToken"],
  [">>", "GreaterThanGreaterThanToken"], [">>=", "GreaterThanGreaterThanEqualsToken"],
  [">>>", "GreaterThanGreaterThanGreaterThanToken"],
  [">>>=", "GreaterThanGreaterThanGreaterThanEqualsToken"],
  ["&", "AmpersandToken"], ["|", "BarToken"], ["^", "CaretToken"],
  ["&=", "AmpersandEqualsToken"], ["|=", "BarEqualsToken"], ["^=", "CaretEqualsToken"],
  ["&&=", "AmpersandAmpersandEqualsToken"], ["||=", "BarBarEqualsToken"], ["??=", "QuestionQuestionEqualsToken"],
]);

/** TS 印出来的枚举别名（`FirstStatement` 其实是 `VariableStatement`）——与 `ts-ast.mjs` 同源。 */
export const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["ThisType", "ThisKeyword"],
  ["FirstAssignment", "EqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["LastBinaryOperator", "CaretEqualsToken"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastLiteralToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["FirstFutureReservedWord", "ImplementsKeyword"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastContextualKeyword", "DeferKeyword"],
  ["LastStatement", "DebuggerStatement"],
]);

/** 一行归一：产物标签（+ 文本）→ TS kind 名。 */
export function productKindOf(tag, text) {
  const value = text === undefined || text === null ? "" : String(text);
  if (tag === "SymbolToken") return TOKEN_KIND.get(value) ?? value;
  if (tag === "Keyword") return KEYWORD_KIND.get(value) ?? value;
  if (tag === "Identifier") {
    if (/^\d/.test(value) || /^\.\d/.test(value)) return "NumericLiteral";
    if (/^["'`]/.test(value)) return "StringLiteral";
    return "Identifier";
  }
  return KIND_BY_TAG.get(tag) ?? tag;
}

/** TS 侧一行归一：`SyntaxKind` 名 → 真名（别名先翻掉）。 */
export const tsKindOf = (name) => TS_KIND_ALIASES.get(name) ?? name;
