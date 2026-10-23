// AST 对拍内核：TS 侧真值 与 本仓形状树 的唯一一套归一 / 投影口径。
//
// 两端都投影成同一个可比较形状：
//   { kind, pos, end, text?, name?, isTypeOnly?, children? }
// 只有这里的实现说了算 —— ast-json.mjs（快照生成）、ast-json-diff.mjs（快照对拍）、
// token-ast.mjs（真实多行语料现场对拍）都 import 本模块，禁止各自再写一份归一表。
//
// 为什么归一表必须只有一份：
//   ts.SyntaxKind 是数值枚举，同一个数值上挂了好几个「别名」，反查
//   ts.SyntaxKind[number] 只留最后一个名字（例如 NumericLiteral 反查成
//   FirstLiteralToken、QualifiedName 反查成 FirstNode）。产物侧的 kind 是形状类名，
//   永远不是别名。所以 TS 侧必须先按下面的表折回规范名，两侧才可比；
//   表若两份，任何一份漏了别名都会变成假的「结构差」。

/** TS 反查名 → 规范名。每条都来自同一个枚举值，不改变任何合法节点的语义。 */
export const TS_KIND_ALIASES = new Map([
  // SyntaxKind.VariableStatement 的反查名被别名 FirstStatement 盖掉。
  ["FirstStatement", "VariableStatement"],
  // SyntaxKind.NumericLiteral 的反查名被别名 FirstLiteralToken 盖掉。
  ["FirstLiteralToken", "NumericLiteral"],
  // SyntaxKind.QualifiedName 的反查名被别名 FirstNode 盖掉（与 tests/parse/ts-ast.mjs 同款）。
  ["FirstNode", "QualifiedName"],
  // TypePredicate / ImportType / abstract 修饰的反查名被别名盖掉。
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  // SyntaxKind.DebuggerStatement 的反查名被别名 LastStatement 盖掉。
  ["LastStatement", "DebuggerStatement"],
  // 模板的两个 kind 同理：反查印 FirstTemplateToken / LastTemplateToken，
  // 产物侧按规范名叫 NoSubstitutionTemplateLiteral / TemplateTail。
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  // 复合赋值结尾的几个标点/运算符共用 SyntaxKind.CaretEqualsToken 这一格。
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["LastBinaryOperator", "CaretEqualsToken"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  // SyntaxKind.ImportAttributes 的反查名被旧名 AssertClause / AssertEntry 盖掉
  // （`with` 与 `assert` 用同一个 kind，产物侧叫 ImportAttributes / ImportAttribute）。
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

export const kindOf = (kind) => TS_KIND_ALIASES.get(kind) || kind;

/** 只保留参与对拍的字段；未出现的键不写（两侧都缺 = 一致）。 */
export function norm(node) {
  const out = { kind: node.kind, pos: node.pos, end: node.end };
  if (node.text !== undefined) out.text = node.text;
  if (node.name !== undefined) out.name = node.name;
  if (node.isTypeOnly === true) out.isTypeOnly = true;
  if (node.children && node.children.length > 0) out.children = node.children;
  return out;
}

/**
 * TS 侧：ts.Node → 可比较节点。
 * 需要传入 ts 模块（本模块不自己 require，好让调用方决定用哪份 TypeScript）。
 */
export function createAstCore(ts) {
  function tsAst(node) {
    const kind = ts.SyntaxKind[node.kind];
    const out = { kind: kindOf(kind), pos: node.pos, end: node.end };
    // 模板的几种节点（NoSubstitutionTemplateLiteral / TemplateHead / TemplateMiddle / TemplateTail）
    // 在 ts 里 `isStringLiteral` 为 false，但 `node.text` 有 cooked 文本；漏了它们会变成「字段差」。
    if (
      ts.isIdentifier(node) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isNumericLiteral(node) ||
      ts.isBigIntLiteral(node) ||
      ts.isRegularExpressionLiteral(node)
    ) {
      out.text = node.text;
    }
    // 与投影字段同名的那些：没出现的键不写，diff 两侧都缺就是一致。
    // ImportDeclaration 的 type-only 在 TS 里记在子句上、产物侧记在声明上，这里把子句的 true 提上来；
    // 少了这一句，`import type …` 那几条会从「一致」变成「字段差」。
    if (ts.isImportDeclaration(node) && node.importClause && node.importClause.isTypeOnly === true) {
      out.isTypeOnly = true;
    }
    if (node.isTypeOnly === true) out.isTypeOnly = true;
    if (ts.isImportClause(node) && node.name && node.name.text) out.name = node.name.text;
    if (ts.isImportSpecifier(node) && node.name && node.name.text) out.name = node.name.text;
    if (ts.isNamespaceImport(node) && node.name && node.name.text) out.name = node.name.text;
    if (ts.isExportSpecifier(node) && node.name && node.name.text) out.name = node.name.text;
    if (ts.isNamespaceExport(node) && node.name && node.name.text) out.name = node.name.text;
    const children = [];
    node.forEachChild((child) => {
      children.push(tsAst(child));
    });
    if (children.length > 0) out.children = children.map(norm);
    return norm(out);
  }
  return { tsAst };
}

/** 产物侧：形状对象 → 可比较节点。 */
export function cjAst(shape) {
  // buffer 契约 §1.6：SourceRange 是半开 [Start, End)，Start / End 是 **int**（-1 = 未设置，
  // 不再有 Source 对象）。End 已经是「最后字符 + 1」，与 TS 的 node.end 同口径 —— 这里不再 +1。
  const range = shape.SourceRange || {};
  const startIndex = typeof range.StartIndex === "number" ? range.StartIndex : -1;
  const endIndex = typeof range.EndIndex === "number" ? range.EndIndex : -1;
  const out = {
    kind: shape.constructor.name.replace("Shape", ""),
    pos: shape.Pos >= 0 ? shape.Pos : startIndex >= 0 ? startIndex : 0,
    end: endIndex >= 0 ? endIndex : 0,
  };
  // 空文本也是取值（throw 恢复形里的零宽 Identifier，TS 侧 text=""）；非空标识符的取值不变。
  if (typeof shape.EscapedText === "string") out.text = shape.EscapedText;
  // 字面量的 text 可以是空串（`""`），空串也是一个真实取值；只有带 Text 字段的那几种字面量会走到这里。
  if (typeof shape.Text === "string") out.text = shape.Text;
  if (shape.Name && shape.Name.text !== undefined) out.name = shape.Name.text;
  if (shape.Name && shape.Name.EscapedText) out.name = shape.Name.EscapedText;
  // 字符串导出名（`export { "a-b" as c }` / `export { a as "b-c" }` / `export { "a-b" }`）：
  // TS 的 ExportSpecifier.name 是字符串文本；本仓 StringLiteralShape 把它放在 Text 字段（IdentifierShape 用 EscapedText）。
  if (shape.Name && typeof shape.Name.Text === "string") out.name = shape.Name.Text;
  if (shape.IsTypeOnly === true) out.isTypeOnly = true;
  const children = (shape.Data || []).map(cjAst);
  if (children.length > 0) out.children = children;
  return norm(out);
}

/** 前序遍历成一维表，保留节点本身（children 已经在里面）。 */
export function flatten(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

/** 按归一后的 kind 分组，保持前序出现顺序。 */
export function groupByKind(nodes) {
  const map = new Map();
  for (const node of nodes) {
    const kind = kindOf(node.kind);
    if (!map.has(kind)) map.set(kind, []);
    map.get(kind).push(node);
  }
  return map;
}

/** ast-json-diff 的历史字段集（快照里可能出现的全部投影字段）。 */
export const FIELD_NAMES = ["text", "name", "isTypeOnly", "attributes", "namedBindings"];

/** token 尺子的字段集：真实语料只比这三项（口径与 ast-json.mjs 的字段取值规则一致）。 */
export const TOKEN_FIELDS = ["text", "name", "isTypeOnly"];

/** 两侧字段名大小写不同（TS 侧小写开头、产物侧按形状字段名），统一成小写首字母再比。 */
export function fieldOf(node, name) {
  const lower = name[0].toLowerCase() + name.slice(1);
  if (node[name] !== undefined) return node[name];
  return node[lower];
}
