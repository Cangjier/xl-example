// 形状普查：**逐 token 比「产物 token 树」与「TS AST」的树形**。
//
//   node tests/compare-shape-token-ast/run.mjs                      跑全部目录
//   node tests/compare-shape-token-ast/run.mjs binary-operator      只跑一个（名字就是目录名）
//   node tests/compare-shape-token-ast/run.mjs --all                连外壳差异也算进退出码
//   node tests/compare-shape-token-ast/run.mjs --details            把两棵树形一起打出来
//   node tests/compare-shape-token-ast/run.mjs --json tmp/rep.json  逐条读数写文件（不进 stdout）
//
// **它问的问题**：这个 token 的产物树与 TS 的 AST，**内核形状**差在哪一节？
//
// 与 `tests/parse/ts-ast.mjs` 的分工：那把尺子问「**投影之后**与 TS 是否完全一致」（判据是
// kind / 区间 / 字段名，八项全 0）；这一把**不看投影**，直接比成形时那一棵树。投影可以补出
// TS 要的节点（所以那一门能全绿），而这一门量的是**补之前差多远** —— 差额就是投影的负担。
//
// 三层口径（中文注释里那三个词就是这三层）：
//
//   1. **外壳**（`Statement` / `ExpressionStatement` / `Root` / `SourceFile` / `EndOfFileToken`…）
//      —— 一侧有、另一侧没有的包装。**不计入判据**，只数「补了几个壳」。
//   2. **标点与关键字**（`SymbolToken` / `Keyword` 对 `PlusToken` / `InKeyword`…）
//      —— **不计入内核形状**，但单独数一栏：TS 的 `operatorToken` 就在这一层。
//   3. **内核形状** —— 去掉上面两层之后的树形。**这一层不等就是真的形状不同**
//      （`a + b` 的产物内核是 `BinaryOperator(Identifier,Identifier)`，
//       而 TS 的内核是 `BinaryExpression(Identifier,PlusToken,Identifier)`：
//       运算符那一格产物也**有**，只是不是具名字段）。
//
// 归一表按仓库自己那两张表来（`typescript/print-ast-common.xl.md` 的 `KIND_BY_TAG` /
// `TOKEN_KIND`），不另立第二份答案。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

// ---------------------------------------------------------------------------
// 归一表（与 `print-ast-common.xl.md` 同源，取的是「同一件东西两边的名字」）
// ---------------------------------------------------------------------------

/** 外壳：一侧有、另一侧没有的包装。**不计入内核形状**。 */
const SHELLS = new Set([
  "Root", "SourceFile", "EndOfFileToken", "Statement", "ExpressionStatement",
  "Block", "ModuleBlock", "SyntaxList", "SourceFileStatement", "ClassBody", "InterfaceBody",
  "TypeLiteralBody", "FunctionBody", "MethodBody", "LambdaBody", "NamespaceBody",
  "ForBody", "ForeachBody", "WhileBody", "TryBody", "CatchBody", "FinallyBody",
]);

/**
 * 这个节点算不算「外壳」。
 *
 * `Bracket` 要分两种：**带 `startBracket` 属性**的是源码里的真括号（`(` / `[` / `{`），
 * 那是**真节点**（TS 那边常常没有它，投影要把内容提上去）；**不带** `startBracket` 的
 * 是「实参括号」那种壳（`f(x)` 的那对括号），与 `Statement` 同类，算外壳。
 */
function isShell(node) {
  if (node.tag === "Bracket") return node.startBracket === undefined || node.startBracket === null;
  return SHELLS.has(node.kind);
}

/**
 * 产物标签 → TS kind 名。
 *
 * **这张表是 `typescript/print-ast-common.xl.md` 的 `KIND_BY_TAG` 的逐条副本**（79 条，
 * 一条不多一条不少）。为什么不 import 那一份：本文件的产物是 `build/ts/**` 下的 JS 产物，
 * 而那一份是投影的实现——**本门要量的正是「投影之前」的形状，借它的实现就是借被量者本身**。
 * 代价是它会漂：那边加一条标签，这里要跟着加（漂了的症状是「凭空多出一类 onlyOurs / onlyTs」，
 * 而这门本来就是量差额的，所以漂了**看得出来**）。
 *
 * 本仓第一次试就踩到了：漏 `BinaryOperator → BinaryExpression` 那一条时，8 条用例全报
 * 「产物 <BinaryOperator> vs TS BinaryExpression」——**那不是形状不同，是本表漏了一行**。
 */
const KIND_BY_TAG = new Map([
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
]);

/** 运算符文本 → TS 的 token kind 名（`TOKEN_KIND` 的那一段）。 */
const TOKEN_KIND = new Map([
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
  [">>>", "GreaterThanGreaterThanGreaterThanToken"], [">>>=", "GreaterThanGreaterThanGreaterThanEqualsToken"],
  ["&", "AmpersandToken"], ["|", "BarToken"], ["^", "CaretToken"],
  ["&=", "AmpersandEqualsToken"], ["|=", "BarEqualsToken"], ["^=", "CaretEqualsToken"],
  ["&&=", "AmpersandAmpersandEqualsToken"], ["||=", "BarBarEqualsToken"], ["??=", "QuestionQuestionEqualsToken"],
]);

/** 关键字文本 → TS kind 名（`KEYWORD_KIND` 里会作为语义子节点出现的那一批）。 */
const KEYWORD_KIND = new Map([
  ["in", "InKeyword"], ["instanceof", "InstanceOfKeyword"], ["asserts", "AssertsKeyword"],
  ["typeof", "TypeOfKeyword"], ["keyof", "KeyOfKeyword"], ["readonly", "ReadonlyKeyword"],
  ["new", "NewKeyword"], ["this", "ThisKeyword"], ["super", "SuperKeyword"],
  ["null", "NullKeyword"], ["true", "TrueKeyword"], ["false", "FalseKeyword"],
  ["undefined", "UndefinedKeyword"], ["any", "AnyKeyword"], ["unknown", "UnknownKeyword"],
  ["never", "NeverKeyword"], ["object", "ObjectKeyword"], ["symbol", "SymbolKeyword"],
  ["bigint", "BigIntKeyword"], ["string", "StringKeyword"], ["number", "NumberKeyword"],
  ["boolean", "BooleanKeyword"], ["void", "VoidKeyword"], ["intrinsic", "IntrinsicKeyword"],
]);

const isTokenKindName = (name) => /Token$/.test(name) || /Keyword$/.test(name);

// ---------------------------------------------------------------------------
// 一、产物侧：**读出口 1（XML）**，读成「节点名（已归一）+ 子格」
// ---------------------------------------------------------------------------
//
// **为什么读 XML 而不是 `ToList()` 的字典**（第 987 轮六订正）：
// `ToDictionary` 会把 `ForBody` / `TryBody` / `NewType` / `MethodBody` 这一批**提层**掉
//（`print-ast-common.xl.md` 的 `WRAPPER_FIELDS` 那张表就是干这个的）——它们在**成形期的树**上是
// 实打实的标签，在字典里却一个都不出现。本门量的正是成形期那一棵树，所以事实来源是
// `Token.ToXmlString()`（出口 1）。
//
// 这一条是被「117 格补全」逼出来的：第一版走字典，`for (;;) {}` 的 `ForBody` 被判成
// 「产物里没有这个标签」，52 条用例当场报假 CRASH；`for` 的字典里连 `children` 键都没有，
// 四个段各是一个数组。**XML 那份是带 `range` 的**（第 987 轮续给每个开标签都印了），
// 所以按区间配 AST、按段子格算读数都做得到。
//
// 解析用现成的口径：标签名 / `range` / 其它属性；注释与 PI 跳过；自闭合与收尾标签都要认
//（第一版的对齐器漏了收尾标签，`<X></X>` 会把后面的兄弟全吃进去）。
function parseProductXml(text) {
  const root = { tag: null, attrs: new Map(), kids: [] };
  const stack = [root];
  const re =
    /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([A-Za-z_][A-Za-z0-9_]*)\s*>|<([A-Za-z_][A-Za-z0-9_]*)((?:\s+[A-Za-z_][A-Za-z0-9_]*="(?:[^"\\]|\\.)*")*)\s*(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[5] !== undefined) {
      const t = m[5];
      if (t.trim() !== "") {
        const top = stack[stack.length - 1];
        top.text = (top.text ?? "") + t;
      }
      continue;
    }
    if (m[1] !== undefined) {
      stack.pop();
      continue;
    }
    if (m[2] === undefined) continue; // 注释 / PI
    const attrs = new Map();
    for (const a of m[3].matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"((?:[^"\\]|\\.)*)"/g)) attrs.set(a[1], a[2]);
    const node = { tag: m[2], attrs, kids: [], text: "" };
    stack[stack.length - 1].kids.push(node);
    if (m[4] !== "/") stack.push(node);
  }
  return root.kids;
}

/** XML 属性里的 `[起,止]`（闭区间）→ 两个下标。 */
function rangeOfAttrs(attrs) {
  const raw = attrs.get("range");
  if (typeof raw !== "string") return [null, null];
  const m = /^\[(-?\d+),(-?\d+)\]$/.exec(raw);
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

/** 产物一个节点的归一节点名：标签先过 `KIND_BY_TAG`；叶子按值分名（数字 / 字符串 / 关键字）。 */
function productKindOf(tag, text) {
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

/**
 * 把 XML 节点读成与 `productNode` 同形的树。
 *
 * 子格的 `field`：XML 里**没有**「平 `children`」这个概念——每个子元素都只是子元素。
 * 为了与投影那侧对齐沿用同一条口径：**具名段**（`For` 的 `initial` / `body`…）在 XML 里
 * 也是**子元素**，分不出来；所以这里对**单子元素的容器**记它自己的名字（绝大多数情况一对一），
 * 其余一律记 `children`。读数里那两栏（平子格 / 具名段）因此是**近似**，
 * 而**判据那几栏（内核形状 / 区间 / 标签名）不看它**。
 */
function productNodeFromXml(xmlNode) {
  const [start, end] = rangeOfAttrs(xmlNode.attrs);
  const scalars = [];
  for (const [key, value] of xmlNode.attrs) {
    if (key === "range") continue;
    scalars.push(`${key}=${JSON.stringify(value)}`);
  }
  // 段名：对 `For` 这种「属性里带 initial/compare/next/body 四个名」的节点，
  // 子元素与段按顺序一一对应 —— 按属性的出现顺序配不上，所以这里**只沿用标签名**，
  // 段名在读数里不参与判据（见上面那段注释）。
  return {
    kind: productKindOf(xmlNode.tag, xmlNode.text),
    tag: xmlNode.tag,
    start,
    end,
    value: xmlNode.text === "" ? undefined : xmlNode.text,
    startBracket: xmlNode.attrs.get("startBracket"),
    scalars,
    children: xmlNode.kids.map((k) => ({ field: "children", ...productNodeFromXml(k) })),
  };
}

/**
 * 产物侧的**原始标签**树形（不归一、**不过滤标点**）。
 *
 * 用例头那行 `// token: <标签>` 写的是**产物标签**（`BinaryOperator`、`Keyword`、`SymbolToken`…），
 * 而内核树形走的是归一后的名字（`BinaryExpression`）并且会滤掉标点——拿那一份去核那行头，
 * `Keyword` / `SymbolToken` 这两格永远核不过（它们**正是**被过滤掉的那些）。
 * 所以核头要用这一份：**一个标签都不许少**。
 *
 * **走 XML 那一棵树**（与上面 `productNodeFromXml` 同源）：标签一个不缺，
 * 包括被 `ToDictionary` 提层掉的 `ForBody` / `TryBody` 那一批。
 */
function productShapeRaw(node) {
  const inner = node.children.map(productShapeRaw).filter((s) => s !== "").join(",");
  return inner === "" ? node.tag : `${node.tag}(${inner})`;
}

// ---------------------------------------------------------------------------
// 二、TS 侧：同一形状，子格带**具名字段**
// ---------------------------------------------------------------------------

function tsNode(node, sf) {
  const children = [];
  ts.forEachChild(node, (child, key) => {
    let field = key;
    if (field === undefined) {
      field = Object.keys(node).find((k) => {
        const value = node[k];
        return value === child || (Array.isArray(value) && value.includes(child));
      });
    }
    children.push({ field: field ?? "(未知)", ...tsNode(child, sf) });
  });
  return {
    kind: ts.SyntaxKind[node.kind],
    start: node.getStart(sf),
    end: node.end,
    children,
  };
}

// ---------------------------------------------------------------------------
// 三、三层口径
// ---------------------------------------------------------------------------

/** 内核子节点：去掉外壳与标点之后的那些（外壳去掉时把它的内核子节点接上来）。 */
function coreChildren(node) {
  const out = [];
  for (const k of node.children) {
    if (isTokenKindName(k.kind)) continue;
    if (isShell(k)) {
      out.push(...coreChildren(k));
      continue;
    }
    out.push(k);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 三、五栏读数（比内核树形更能说明「负担在哪」）
// ---------------------------------------------------------------------------

/**
 * 一栏一栏地数。**这几栏就是这一门的结论**：
 *
 *   · `flat`      —— 平子格（产物堆在 `children` 里的那些；TS 那边是按具名字段分的）
 *   · `named`     —— 具名子格 / 段（两边是一回事）
 *   · `nodeChars` —— **TS 里是子节点、产物里只是一行属性字符串**的处数。
 *                    只数**结构性**的那些（`NODE_SCALARS`）：`f(x)` 的被调用者（`name:"f"`）、
 *                    `type T` 的别名（`alias:"T"`）、`BinaryOperator` 的运算符（`op:"+"`）、
 *                    `async` 那个修饰词（`modifiers:"async"`）……
 *                    **`value` 不算**：那是叶子的文本，两边都有（`Identifier` / `NumericLiteral`），
 *                    把它算进来会让每一格都虚增一大截（第一版就是这么错的）。
 *   · `nameDiff`  —— 两边都有、名字却不同（`PropertyAccess` / `BinaryOperator` /
 *                    `LogicalOperator(op="And")` 那种：`op` 里装的是产物自己的词，
 *                    TS 那边是 `AmpersandAmpersandToken`）
 *   · `noNode`    —— **TS 有、产物一个节点都没有**（`f(x)` 的被调用者就是这一栏：
 *                    产物的 `Method` 只有 `name:"f"` 一行字符串，没有那个 `Identifier` 节点）
 *   · `bracket`   —— 产物的**真括号**节点（`startBracket` 是 `(` / `[`），
 *                    TS 常常把内容提上去、不留这个节点
 */
const NODE_SCALARS = new Set([
  "name", "alias", "op", "modifiers", "extends", "implements",
  "exported", "imported", "defaultImport", "namespace", "From", "fieldName",
  "objectPattern", "typeOnly",
]);

function measurements(ourTree, tsTree, ourCore, tsCore) {
  const ourKinds = countKinds(coreTree(ourTree), new Map());
  const tsKinds = countKinds(coreTree(tsTree), new Map());
  const nameDiff = [];
  for (const [kind, n] of ourKinds) {
    // **两侧都有的不算换名**：`Identifier` / `NumericLiteral` 这些标签本来就是同名
    //（叶子的名字是投影**按值分**出来的，不是换名），把它们算进来只会淹掉真的那几条。
    if (tsKinds.has(kind)) continue;
    if (n > 0) nameDiff.push(kind);
  }
  const acc = { flat: 0, named: 0, nodeChars: 0, otherChars: 0, noNode: 0, bracket: 0 };
  const walkOurs = (node) => {
    for (const k of node.children ?? []) {
      if (k.field === "children") acc.flat++;
      else if (k.field) acc.named++;
      walkOurs(k);
    }
    for (const s of node.scalars ?? []) {
      const key = s.slice(0, s.indexOf("="));
      if (NODE_SCALARS.has(key)) acc.nodeChars++;
      else acc.otherChars++;
    }
    if (node.tag === "Bracket" && (node.startBracket === "(" || node.startBracket === "[")) acc.bracket++;
  };
  walkOurs(ourTree);
  // **TS 有、产物没有**：按 (kind, 区间) 配对；配对不上的那一批就是这一栏。
  //
  // 两个收集函数吃的都是**内核树**（`{ kind, kids }`）——不能吃包装树：包装树的子格字段叫
  // `children`，而这里要的是已经去掉外壳与标点之后的 `kids`（第一版就是吃错了树，
  // 于是这一栏恒为 0：`f(x)` 的被调用者明明整格不在产物里，读数却是 0）。
  const ourSlots = new Set();
  const collect = (node) => {
    for (const k of node.kids ?? []) {
      ourSlots.add(`${k.kind}@${k.start}-${k.end}`);
      collect(k);
    }
  };
  collect(ourCore);
  const countNoNode = (node) => {
    for (const k of node.kids ?? []) {
      if (!ourSlots.has(`${k.kind}@${k.start}-${k.end}`)) acc.noNode++;
      countNoNode(k);
    }
  };
  countNoNode(tsCore);
  if (process.env.PA_DEBUG) process.stderr.write(`DEBUG noNode=${acc.noNode}\n`);
  return { ...acc, nameDiff };
}

/** 内核树形签名。 */
function coreShape(node) {
  const kids = coreChildren(node).map(coreShape);
  return kids.length === 0 ? node.kind : `${node.kind}(${kids.join(",")})`;
}

/** 内核树（比较用）：**带区间**——`TS 有产物没有` 那一栏要靠 (kind, 区间) 配对。 */
function coreTree(node) {
  return { kind: node.kind, start: node.start, end: node.end, kids: coreChildren(node).map(coreTree) };
}

function countNodes(node) {
  const kids = node.children ?? node.kids ?? [];
  return 1 + kids.reduce((sum, k) => sum + countNodes(k), 0);
}
function maxDepth(node) {
  const kids = node.children ?? node.kids ?? [];
  return 1 + kids.reduce((m, k) => Math.max(m, maxDepth(k)), 0);
}

/** 逐层找第一处分叉（人读用）。 */
function firstDivergence(ours, theirs, trail) {
  const where = trail.length ? trail.join(" > ") : "(根)";
  if (ours.kind !== theirs.kind) return `${where}：产物 <${ours.kind}> vs TS ${theirs.kind}`;
  const ok = ours.kids ?? [];
  const tk = theirs.kids ?? [];
  if (ok.length !== tk.length) {
    return `${where} <${ours.kind}>：产物 ${ok.length} 个内核子节点 [${ok.map((k) => k.kind).join(" ")}] vs TS ${tk.length} 个 [${tk.map((k) => k.kind).join(" ")}]`;
  }
  for (let i = 0; i < ok.length; i++) {
    const got = firstDivergence(ok[i], tk[i], trail.concat(`${ours.kind}[${i}]`));
    if (got) return got;
  }
  return "";
}

/** 子格怎么摆：产物侧一律是**平的**数组键，TS 侧是**具名字段**。 */
const FLAT_KEYS = new Set([
  "children", "compare", "body", "initial", "next", "define", "enumable", "condition", "statement",
  "catches", "finally", "trueStatement", "falseStatement", "parameters", "returnType", "name",
  "arguments", "segments",
]);

/** 内核节点名逐个对上的都少 / 多（先按名字计数，看整体差在哪一类）。 */
function countKinds(node, acc) {
  acc.set(node.kind, (acc.get(node.kind) ?? 0) + 1);
  for (const k of node.kids ?? []) countKinds(k, acc);
  return acc;
}

// ---------------------------------------------------------------------------
// 四、一条用例
// ---------------------------------------------------------------------------

function parse(source) {
  const document = new TextDocument(source);
  document.FilePath = "probe.ts";
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

/** 用例文件：可以有一行 `// token: <标签>`（写错会被判红），其余是源码。 */
function readCase(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const m = text.match(/^\/\/\s*token:\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/m);
  return { file, token: m ? m[1] : "", source: text.replace(/^\/\/\s*token:.*$/m, "").trim() };
}

function compareOne(cs) {
  const rootToken = parse(cs.source);
  // **产物侧读出口 1（XML）**：这是成形期那棵树的事实来源（117 个标签一个不缺）。
  // 同一棵树、同一次 `Process`，只是最后取 `ToXmlString()` 那一份——与 cjcli 的默认出口逐字节同源。
  const { CommonUtil } = require(path.join(root, "build", "ts", "core", "common-util.js"));
  const productXml = CommonUtil.FormatXml(rootToken.ToXmlString());
  const ours = parseProductXml(productXml).map(productNodeFromXml);
  const sf = ts.createSourceFile("probe.ts", cs.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const theirs = [tsNode(sf, sf)];

  const ourWrap = { kind: "ROOT", children: ours };
  const tsWrap = { kind: "ROOT", children: theirs };
  const ourShape = coreShape(ourWrap).replace(/^ROOT\(?/, "").replace(/\)$/, "");
  const tsShape = coreShape(tsWrap).replace(/^ROOT\(?/, "").replace(/\)$/, "");
  const ourRawShape = ours.map(productShapeRaw).filter((s) => s !== "").join(" ");
  const ourCore = coreTree(ourWrap);
  const tsCore = coreTree(tsWrap);

  const measure = measurements(ourWrap, tsWrap, ourCore, tsCore);
  const kindsOurs = countKinds(ourCore, new Map());
  const kindsTs = countKinds(tsCore, new Map());
  const allKinds = new Set([...kindsOurs.keys(), ...kindsTs.keys()]);
  const onlyOurs = [];
  const onlyTs = [];
  for (const kind of allKinds) {
    const a = kindsOurs.get(kind) ?? 0;
    const b = kindsTs.get(kind) ?? 0;
    if (a > b) onlyOurs.push(`${kind}×${a - b}`);
    if (b > a) onlyTs.push(`${kind}×${b - a}`);
  }

  return {
    id: cs.id,
    token: cs.token,
    source: cs.source,
    rootToken,
    ourShape,
    tsShape,
    ourRawShape,
    coreSame: ourShape === tsShape,
    shapeSame: countNodes(ourWrap) === countNodes(tsWrap),
    ourNodes: countNodes(ourWrap),
    tsNodes: countNodes(tsWrap),
    ourDepth: maxDepth(ourWrap),
    tsDepth: maxDepth(tsWrap),
    divergence: ourShape === tsShape ? "" : firstDivergence(ourCore, tsCore, []),
    flatChildren: measure.flat,
    namedChildren: measure.named,
    scalarAsNode: measure.nodeChars,
    bracketShells: measure.bracket,
    noNode: measure.noNode,
    nameDiff: measure.nameDiff,
    oursOnly: onlyOurs,
    tsOnly: onlyTs,
  };
}

// ---------------------------------------------------------------------------
// 五、报告
// ---------------------------------------------------------------------------

const out = (line) => process.stdout.write(line + "\n");

/**
 * 把两份产物写进用例所在的目录（`--snapshot`）。**就两份**，一个出口一份：
 *
 *   `xml/<用例>.xml`   —— **出口 1**：`Token.ToXmlString()` 的原样（`Root.ToString()` 是同一个）。
 *                         **不过 `FormatXml`**：排版只发生在打印层，验收与夹具用的是紧凑那一份；
 *                         要看缩进的样子，`cjcli <文件>` 打出来就是。
 *   `ast/<用例>.json`  —— **出口 3**（`cjcli <文件> --ts-ast`）的真实 stdout，**紧凑单行 JSON**
 *
 * 出口 3 那一份**真开进程拿**（`spawnSync`），不是我在库里再拼一遍：出口 3 有两个层次
 * （`cases:tsast` 的默认量的是库路径，`--cli` 量的是发布路径），中间隔着参数解析、读文件与
 * BOM、`CjcliParseTsAst`、`ToJsonText`、标准输出。落盘的是**发布路径的原样字节**。
 * 顺带与库路径那一份核一遍（不等就打一行提示）——`cases:tsast --cli` 才是那件事的判据。
 *
 * **喂给 cjcli 的是去掉 `// token:` 头的那条源码**：那行头是这一门的元数据，不带它比对，
 * 那行注释会变成一个 `LineAnnotation` 节点、还带自己的区间，两条路必然不等
 * （第一版就是这么比的：46 条全报「库 340 B vs 发布 352 B」）。
 */
function snapshot(at, cs, rootToken) {
  const { projectRoot, ToJsonText } = require(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));
  const { spawnSync } = require("node:child_process");
  const stem = path.basename(cs.file, ".ts");
  const xmlAt = path.join(at, "xml");
  const astAt = path.join(at, "ast");
  fs.mkdirSync(xmlAt, { recursive: true });
  fs.mkdirSync(astAt, { recursive: true });

  // 出口 1：`ToXmlString()` 原样
  fs.writeFileSync(path.join(xmlAt, `${stem}.xml`), rootToken.ToXmlString() + "\n", "utf8");

  // 出口 3：真开 cjcli，stdout 原样落盘
  const cli = path.join(root, "build", "ts", "cjcli.js");
  const feed = path.join(root, "tmp", "shape-token-ast", `${stem}.ts`);
  fs.mkdirSync(path.dirname(feed), { recursive: true });
  fs.writeFileSync(feed, cs.source, "utf8");
  const run = spawnSync(process.execPath, [cli, feed, "--ts-ast"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const published = (run.stdout ?? "").trim();
  if ((run.status ?? 1) !== 0 || published === "") {
    throw new Error(`cjcli --ts-ast 没给出产物（退出码 ${run.status}）：${(run.stderr ?? "").trim().split("\n")[0]}`);
  }
  fs.writeFileSync(path.join(astAt, `${stem}.json`), published + "\n", "utf8");

  // 换出口/换扩展名时留下的旧副本一律清掉：两份形态并存只会让人改错那一份
  for (const stale of ["ast.txt", "raw.ast.txt"]) {
    const p = path.join(astAt, `${stem}.${stale}`);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  if (fs.existsSync(path.join(at, "tsast"))) fs.rmSync(path.join(at, "tsast"), { recursive: true });

  // 提示（不判红）：库路径与发布路径应当逐字节相同
  const library = ToJsonText(projectRoot(rootToken.ToList(), cs.source));
  if (published !== library) {
    const first = [...published].findIndex((ch, i) => ch !== library[i]);
    return { exitMismatch: { library: library.length, published: published.length, firstDiff: first } };
  }
  return {};
}

/** 每个 token 目录的 README：逐格读数表（`--snapshot` 时刷新）。 */function writeTokenReadme(dir, at, rows) {
  const ok = rows.filter((r) => !r.crash && r.coreSame).length;
  const sum = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
  const names = new Set();
  for (const r of rows) for (const n of r.nameDiff ?? []) names.add(n);
  const lines = [];
  lines.push(`# ${dir}：产物 token 树 vs TS AST`);
  lines.push("");
  lines.push(`由 \`node tests/compare-shape-token-ast/run.mjs ${dir} --snapshot\` 生成。`);
  lines.push("");
  lines.push(
    `内核同形 **${ok}/${rows.length}**；平子格 ${sum("flatChildren")}　标量当节点 ${sum("scalarAsNode")}　` +
      `TS 有产物没有 ${sum("noNode")}　真括号 ${sum("bracketShells")}　换名 ${[...names].join(" ") || "—"}`,
  );
  lines.push("");
  lines.push("| 用例 | 内核 | 产物节点 | TS 节点 | 平子格 | 标量当节点 | TS 有产物没有 | 第一处分叉 |");
  lines.push("| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const r of rows) {
    lines.push(
      `| ${r.id.split("/").pop()} | ${r.crash ? "CRASH" : r.coreSame ? "同形" : "**不同**"} | ` +
        `${r.ourNodes ?? "—"} | ${r.tsNodes ?? "—"} | ${r.flatChildren ?? "—"} | ${r.scalarAsNode ?? "—"} | ` +
        `${r.noNode ?? "—"} | ${r.crash ?? r.divergence ?? "—"} |`,
    );
  }
  lines.push("");
  lines.push("三份产物在 `xml/`（缩进 XML）与 `ast/`（`--ts-ast` 形状、`--ast-json` 原始树）下。");
  lines.push("");
  fs.writeFileSync(path.join(at, "README.md"), lines.join("\n"), "utf8");
}

function main() {
  const args = process.argv.slice(2);
  const only = args.filter((a) => !a.startsWith("--"));
  const details = args.includes("--details");
  const strict = args.includes("--all");
  const wantSnapshot = args.includes("--snapshot");
  const jsonAt = args.includes("--json") ? args[args.indexOf("--json") + 1] : "";

  const dirs = fs
    .readdirSync(here, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !only.length || only.includes(name))
    .sort();
  if (!dirs.length) {
    out(`（${here} 下没有目录：每一格 token 一个目录，见 README.md）`);
    process.exitCode = 1;
    return;
  }

  const report = { generatedBy: "tests/compare-shape-token-ast/run.mjs", tokens: {} };
  let coreBad = 0;
  let shellOnly = 0;
  let total = 0;
  for (const dir of dirs) {
    const at = path.join(here, dir);
    const files = fs.readdirSync(at).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx")).sort();
    out(`=== ${dir}（${files.length} 条用例）===`);
    const rows = [];
    for (const f of files) {
      const cs = readCase(path.join(at, f));
      let row;
      try {
        row = compareOne({ ...cs, id: `${dir}/${f.replace(/\.tsx?$/, "")}` });
      } catch (error) {
        row = { id: `${dir}/${f}`, source: cs.source, crash: String(error && error.message ? error.message : error).split("\n")[0] };
      }
      // `token:` 头写着哪一格，产物里就得真有那一格（写错等于这条用例量的不是它）
      if (cs.token && !row.crash && !row.ourRawShape.includes(cs.token)) {
        row.crash = `用例头写着 token: ${cs.token}，但产物树形里没有这个标签`;
      }
      total++;
      if (row.crash || !row.coreSame) coreBad++;
      else if (!row.shapeSame) shellOnly++;
      rows.push(row);
      out(
        `  ${row.crash ? "CRASH" : row.coreSame ? (row.shapeSame ? "全同 " : "内核同") : "不同 "} ${f.padEnd(34)}` +
          (row.crash
            ? `  ${row.crash}`
            : `  产物 ${row.ourNodes} 节点/深 ${row.ourDepth}　TS ${row.tsNodes} 节点/深 ${row.tsDepth}` +
              `　平子格 ${row.flatChildren}　标量当节点 ${row.scalarAsNode}　TS 有产物没有 ${row.noNode}　真括号 ${row.bracketShells}`),
      );
      if (!row.crash && !row.coreSame) {
        out(`        内核分叉：${row.divergence}`);
        if (row.tsOnly.length) out(`        TS 多：${row.tsOnly.join(" ")}`);
        if (row.oursOnly.length) out(`        产物多：${row.oursOnly.join(" ")}`);
      }
      if (!row.crash && row.nameDiff.length) out(`        名字不同（产物 → TS 要换名）：${row.nameDiff.join(" ")}`);
      if (details && !row.crash) {
        out(`        产物内核：${row.ourShape}`);
        out(`        TS 内核：${row.tsShape}`);
      }
    }
    report.tokens[dir] = rows;
    // **先落盘、再写这一格的读数**：落盘失败会把 `crash` 记在行上，读数表要看得见那个失败。
    if (wantSnapshot) {
      let saved = 0;
      for (const row of rows) {
        if (row.crash) continue;
        // **没有树就响亮地报**：静默写 0 份比写错更糟（第一版就是那样，`--snapshot` 报了「0 份」而没人停下）
        if (!row.rootToken) {
          row.snapshotError = "这条用例没有留下产物树，落盘写不出来";
          continue;
        }
        try {
          const extra = snapshot(at, readCase(path.join(at, path.basename(row.id) + ".ts")), row.rootToken) ?? {};
          row.snapshotted = true;
          saved++;
          if (extra.exitMismatch) {
            row.exitMismatch = extra.exitMismatch;
            out(
              `       （提示）出口 3 两条路不等：库 ${extra.exitMismatch.library} B vs 发布 ${extra.exitMismatch.published} B，` +
                `第一个不同的位置 ${extra.exitMismatch.firstDiff}（判据是 cases:tsast --cli）`,
            );
          }
        } catch (error) {
          row.snapshotError = String(error && error.message ? error.message : error).split("\n")[0];
        }
      }
      writeTokenReadme(dir, at, rows);
      out(`  —— 已落盘：xml/ 与 ast/（各 ${saved} 份）${saved === rows.length ? "" : `，**有 ${rows.length - saved} 份没写成**`}`);
      for (const row of rows) if (row.snapshotError) out(`       落盘失败 ${row.id}：${row.snapshotError}`);
    }
    for (const row of rows) delete row.rootToken; // Token 对象不进 JSON 报告
    const same = rows.filter((r) => !r.crash && r.coreSame).length;
    out(`  —— 内核同形 ${same}/${rows.length}`);
    out("");
  }

  // **逐格汇总**（这一门最该看的一张表）：把每一格的负担摊成那几栏。
  out("=== 逐格汇总（用例数 / 内核同形 / 平子格 / 标量当节点 / TS 有产物没有 / 真括号 / 换名）===");
  for (const dir of dirs) {
    const rows = report.tokens[dir];
    const ok = rows.filter((r) => r.crash === undefined && r.coreSame).length;
    const sum = (k) => rows.reduce((n, r) => n + (r[k] ?? 0), 0);
    const names = new Set();
    for (const r of rows) for (const n of r.nameDiff ?? []) names.add(n);
    out(
      `  ${dir.padEnd(26)} ${String(rows.length).padStart(2)} 条　内核同形 ${ok}　` +
        `平子格 ${String(sum("flatChildren")).padStart(3)}　标量当节点 ${String(sum("scalarAsNode")).padStart(2)}　` +
        `TS 有产物没有 ${String(sum("noNode")).padStart(2)}　真括号 ${String(sum("bracketShells")).padStart(2)}　` +
        `换名 ${[...names].join(",") || "—"}`,
    );
  }
  out("");
  out(`${total} 条用例：内核同形 ${total - coreBad}、内核不同 ${coreBad}；另有 ${shellOnly} 条只差外壳/标点`);
  out("（这一门是**量差额**的：目录里的用例挑的就是形状还没对上的那几格）");
  out("");
  out("读数怎么读：**平子格**＝产物把一段子节点堆在 `children` 里（TS 那边按具名字段分）；");
  out("**标量当节点**＝TS 是子节点、产物只是一行字符串属性（投影只能自己造那个节点）；");
  out("**TS 有产物没有**＝按 (kind, 区间) 配不上（投影得凭空补）；");
  out("**真括号**＝产物有、TS 把内容提上去的括号节点；**换名**＝两边同一件东西名字不同。");

  if (jsonAt) {
    fs.writeFileSync(path.resolve(root, jsonAt), JSON.stringify(report, null, 2), "utf8");
    out(`逐条读数已写入 ${jsonAt}（不进 stdout）`);
  }
  // **退出码只认「坏掉」，不认「形状不同」**：
  // 这一门量的是差额（目录里的用例挑的就是还没对上的那几格），「内核不同」是**读数**而不是失败。
  // 坏掉有两种：产物抛异常（CRASH），或 `--snapshot` 该写的三份产物没写成。
  const broken = Object.values(report.tokens)
    .flat()
    .filter((r) => r.crash || r.snapshotError).length;
  out("");
  out(`坏掉的（CRASH / 落盘失败）：${broken} 条`);
  process.exitCode = broken ? 1 : 0;
}

process.stdout.write("\uFEFF");
main();
