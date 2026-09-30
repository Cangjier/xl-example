// 精确差额仪表：把 TypeScript 自带 AST 的每个构造与产物的对应标签逐文件对账，
// **正向差额（缺）与负向差额（多）分开统计**，并把每个缺的节点落到行号与容器上下文。
//
//   node tests/parse/gap-dashboard.mjs                 全部语料
//   node tests/parse/gap-dashboard.mjs cases            只用 tests/parse/cases
//   node tests/parse/gap-dashboard.mjs real             只用 node_modules / dist / samples
//   node tests/parse/gap-dashboard.mjs --top 8          每组最多列 8 个样本
//   node tests/parse/gap-dashboard.mjs --json out.json
//
// 为什么需要它：differential.mjs 按「标签」算 net = 源码构造数 − 产物节点数，
// **同一个标签在 A 文件多、在 B 文件少时会互相抵消**，于是「差额全为 0」并不代表没有缺口
// （实测：方法成员真缺 172、真多 313，净额只报 −141）。本工具把两侧分开，
// 并且只把「有明确标签归属」的构造计入账目。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "dawn", "text", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "dawn", "text", "text-context.js"));

/**
 * 构造组：一组 TS 构造 → 产物里的一个标签。
 * 只有当这些构造**全部**都该产出该标签时才能归成一组（同标签共享计数）。
 * `expect` 是「这一组必须完全对账」的开关；不参与的构造不写进来。
 */
export const GROUPS = [
  {
    id: "member-method",
    label: "成员·方法类 (MethodSignature+MethodDeclaration+Get/SetAccessor → MethodDeclaration)",
    kinds: [
      ["MethodSignature", ts.isMethodSignature],
      ["MethodDeclaration", ts.isMethodDeclaration],
      ["GetAccessor", ts.isGetAccessor],
      ["SetAccessor", ts.isSetAccessor],
    ],
    tag: "MethodDeclaration",
  },
  {
    id: "member-field",
    label: "成员·字段类 (PropertySignature+IndexSignature+PropertyDeclaration → Field)",
    kinds: [
      ["PropertySignature", ts.isPropertySignature],
      ["IndexSignatureDeclaration", ts.isIndexSignatureDeclaration],
      ["PropertyDeclaration", ts.isPropertyDeclaration],
    ],
    tag: "Field",
  },
  {
    id: "member-signature",
    label: "成员·签名类 (CallSignature+ConstructSignature → Signature)",
    kinds: [
      ["CallSignatureDeclaration", ts.isCallSignatureDeclaration],
      ["ConstructSignatureDeclaration", ts.isConstructSignatureDeclaration],
    ],
    tag: "Signature",
  },
  { id: "interface", label: "接口 (InterfaceDeclaration → Interface)", kinds: [["InterfaceDeclaration", ts.isInterfaceDeclaration]], tag: "Interface" },
  {
    id: "class",
    label: "类 (ClassDeclaration+ClassExpression → Class)",
    kinds: [["ClassDeclaration", ts.isClassDeclaration], ["ClassExpression", ts.isClassExpression]],
    tag: "Class",
  },
  {
    id: "function",
    label: "函数 (FunctionDeclaration+FunctionExpression → Function)",
    kinds: [["FunctionDeclaration", ts.isFunctionDeclaration], ["FunctionExpression", ts.isFunctionExpression]],
    tag: "Function",
  },
  { id: "enum", label: "枚举 (EnumDeclaration → Enum)", kinds: [["EnumDeclaration", ts.isEnumDeclaration]], tag: "Enum" },
  { id: "type-alias", label: "类型别名 (TypeAliasDeclaration → TypeAssign)", kinds: [["TypeAliasDeclaration", ts.isTypeAliasDeclaration]], tag: "TypeAssign" },
  { id: "type-literal", label: "类型字面量 (TypeLiteral → TypeLiteral)", kinds: [["TypeLiteral", ts.isTypeLiteralNode]], tag: "TypeLiteral" },
  {
    id: "namespace",
    label: "命名空间 (ModuleDeclaration → Namespace)",
    kinds: [["ModuleDeclaration", ts.isModuleDeclaration]],
    tag: "Namespace",
  },
  { id: "import", label: "导入 (ImportDeclaration → Import)", kinds: [["ImportDeclaration", ts.isImportDeclaration]], tag: "Import" },
  {
    id: "export",
    label: "导出 (ExportDeclaration+ExportAssignment → Export)",
    kinds: [["ExportDeclaration", ts.isExportDeclaration], ["ExportAssignment", ts.isExportAssignment]],
    tag: "Export",
  },
  {
    id: "variable",
    label: "变量声明 (VariableDeclaration → Let)",
    kinds: [["VariableDeclaration", ts.isVariableDeclaration]],
    tag: "Let",
  },
  {
    id: "binary",
    label: "二元运算 (BinaryExpression → BinaryOperator)",
    kinds: [["BinaryExpression", ts.isBinaryExpression]],
    tag: "BinaryOperator",
  },
  {
    id: "unary",
    label: "一元/更新 (Prefix+PostfixUnaryExpression → UnaryOperator)",
    kinds: [["PrefixUnaryExpression", ts.isPrefixUnaryExpression], ["PostfixUnaryExpression", ts.isPostfixUnaryExpression]],
    tag: "UnaryOperator",
  },
  {
    id: "spread",
    label: "展开 (SpreadElement+SpreadAssignment → Spread)",
    kinds: [["SpreadElement", ts.isSpreadElement], ["SpreadAssignment", ts.isSpreadAssignment]],
    tag: "Spread",
  },
  { id: "nonnull", label: "非空断言 (NonNullExpression → NotNull)", kinds: [["NonNullExpression", ts.isNonNullExpression]], tag: "NotNull" },
  { id: "decorator", label: "装饰器 (Decorator → Decorator)", kinds: [["Decorator", ts.isDecorator]], tag: "Decorator" },
  {
    id: "ternary",
    label: "三元 (ConditionalExpression → TernaryOperator)",
    kinds: [["ConditionalExpression", ts.isConditionalExpression]],
    tag: "TernaryOperator",
  },
  { id: "new", label: "new 表达式 (NewExpression → New)", kinds: [["NewExpression", ts.isNewExpression]], tag: "New" },
  { id: "arrow", label: "箭头函数 (ArrowFunction → Lamda)", kinds: [["ArrowFunction", ts.isArrowFunction]], tag: "Lamda" },
  { id: "array", label: "数组字面量 (ArrayLiteralExpression → JsonArray)", kinds: [["ArrayLiteralExpression", ts.isArrayLiteralExpression]], tag: "JsonArray" },
  { id: "object", label: "对象字面量 (ObjectLiteralExpression → JsonObject)", kinds: [["ObjectLiteralExpression", ts.isObjectLiteralExpression]], tag: "JsonObject" },
  { id: "regex", label: "正则 (RegularExpressionLiteral → RegexToken)", kinds: [["RegularExpressionLiteral", ts.isRegularExpressionLiteral]], tag: "RegexToken" },
  { id: "label", label: "标签语句 (LabeledStatement → Label)", kinds: [["LabeledStatement", ts.isLabeledStatement]], tag: "Label" },
];

/**
 * 有意不参与对账的构造（口径差异，不是缺口）——必须写明理由，否则会变成掩盖缺口的黑洞。
 */
export const EXCLUDED = [
  ["VariableDeclaration@多声明符列表", "同一个 VariableStatement 的多个声明符只有一个 Let 节点（differential.mjs 同口径）"],
  ["PrefixUnaryExpression@字面量类型内", "`-1 | 0 | 1` 在 TS 里是字面量类型里的 PrefixUnary，本工程按类型收，口径不同"],
  ["BinaryExpression@赋值族", "`=` 与复合赋值本工程不做节点（另有归属）"],
  ["BinaryExpression@`&&`/`||`", "走 LogicalOperator"],
  ["BinaryExpression@`<`/`>`", "与泛型实参同形，GenericType 在词法阶段就要靠它们配对"],
  ["Parameter@catch 绑定", "catch 的绑定对应 CatchDefine"],
  ["LabeledStatement@ASI 后的对象字面量", "`return` 换行后 `{ a: 1 }`：TS 把 `a:` 记成标签，本工程按对象字面量收（口径不同）"],
  ["BinaryExpression@`,`（条件位）", "`if (a, b)` 的 `(` 已被 `IfCondition` 吸收，逗号规则看不到那个括号（保守取舍）"],
  ["ObjectLiteralExpression/ArrayLiteralExpression@解构默认值", "`{ a = {} }` / `[x = []]` 的默认值不产出 Json 节点（解构形状收进 `Let` 的 unpack*FieldNames，补回来只会让「真多」更大；名字本身**递归收集**，见 let.xl.md 的 CollectFieldNames）"],
  ["MethodSignature/MethodDeclaration@成员位的 `abstract new`", "`interface I { abstract new (): A }`：TS 读成「名叫 `new` 的方法」，本工程读成抽象构造签名（`<Signature Kind=\"construct\">`）。类型位两边一致，只有成员位口径不同"],
];

function countTag(xml, tag) {
  return (xml.match(new RegExp("<" + tag + "(?=[ />])", "g")) || []).length;
}

/**
 * 产物侧的计数：`<New>` 里的 `<Signature>` 也要算上。
 *
 * 构造签名 `new (value?: any): Object` 的产物形状是
 * `<Signature Kind="construct"><New><NewType>…</NewType><NewArguments/></New></Signature>`——
 * `Signature` 被 `New` 包了一层。原来只数 `Signature` 标签本身，于是这类成员被报成「缺」，
 * 而它其实有节点（`lib.es5.d.ts` 的 `Function.apply` 那几条就是这么被误报的）。
 */
function countTagDeep(xml, tag) {
  if (tag !== "Signature") return countTag(xml, tag);
  return countTag(xml, "Signature");
}

/**
 * 构造是否可数。
 * 除了多声明符 / 字面量类型里的负号 / 赋值族 / 逻辑运算符 / `<` `>` 之外，
 * 新加一条**映射类型的成员**：`{ [K in keyof T]: V }` 在 TS 的 AST 里是 `MappedTypeNode`，
 * 里面的 `K` 是**类型参数**而不是 `PropertySignature`。仪表如果按 `PropertySignature` 去数产物里的
 * `Field`，就会把 `[K in keyof T]?: V` 当成一个「没产出节点的成员」——
 * 而产物那边是正确的：它就是一个 `<Field FieldName="K">`。
 * 这条属于**仪表口径**问题（见 `docs/typescript-parsing-gaps.md` 的坑地图），不要改解析器。
 */
function countable(kind, node, parents) {
  if (kind === "VariableDeclaration") {
    const list = parents.get(node);
    // 多声明符列表只有一个 Let 节点（`const a = 1, b = 2`）——differential.mjs 同口径
    if (!list || !ts.isVariableDeclarationList(list) || list.declarations.length !== 1) return false;
    // for / for-in / for-of 的声明属于 ForInitial / ForeachDefine，不是 Let
    const holder = parents.get(list);
    if (
      holder &&
      (ts.isForStatement(holder) || ts.isForInStatement(holder) || ts.isForOfStatement(holder))
    ) {
      return false;
    }
  }
  if (kind === "PrefixUnaryExpression") {
    const holder = parents.get(node);
    if (holder && ts.isLiteralTypeNode(holder)) return false;
  }
  if (kind === "RegularExpressionLiteral") {
    // **未终止的正则**：`const re = /abc` （没有收尾 `/`）时 TS 自己也是错误恢复
    // （它把正则吃到行尾、报 Unterminated regular expression literal）。
    // 本工程**有意**不把这种形状认成正则——那正是 `</div>` 吞掉文件余下代码的根因
    // （见 `dawn/text/tokens/regex-token.xl.md` 的说明）。两边的恢复策略不同，按口径排除。
    const text = node.getText();
    if (!/\/[^/\n]*\/[a-z]*$/i.test(text)) return false;
  }
  if (kind === "ObjectLiteralExpression" || kind === "ArrayLiteralExpression") {
    // **解构模式里的默认值**：`let { a = {} } = obj` / `let [x = []] = arr` 里那个
    // `{}` / `[]` 在 TS 的 AST 里是 BindingElement 的 initializer（对象/数组字面量），
    // 而本工程把解构形状收进 `Let` 的 `unpackObjectFieldNames` 属性、**有意丢弃默认值**。
    // 补回来只会让「真多」更大（JsonObject 真多 17、JsonArray 真多 578），所以按口径排除。
    let p = parents.get(node);
    while (p) {
      if (ts.isBindingElement(p)) return false;
      if (ts.isStatement(p) || ts.isSourceFile(p)) break;
      p = parents.get(p);
    }
  }
  if (kind === "LabeledStatement") {
    // `return` 换行后跟 `{ a: 1 }`：ASI 让那个花括号成为**独立语句**，
    // 而 TS 的解析器把花括号读成 **Block**（不是对象字面量），里面那个 `a:`
    // 于是成了 `LabeledStatement`。本工程按「对象字面量」收（这正是 ASI 用例要的形状）——
    // 口径不同，不是缺口。
    // 形状：`Block`（内层）→ 它的父是外层的 `Block`/`SourceFile`，前一条语句必须是**裸 `return`**。
    let inner = parents.get(node);
    while (inner && !ts.isBlock(inner) && !ts.isSourceFile(inner)) {
      inner = parents.get(inner);
    }
    if (inner && ts.isBlock(inner)) {
      const owner = parents.get(inner);
      if (owner && (ts.isBlock(owner) || ts.isSourceFile(owner))) {
        const statements = owner.statements;
        const at = statements.indexOf(inner);
        const before = at > 0 ? statements[at - 1] : null;
        if (before && ts.isReturnStatement(before) && before.expression === undefined) {
          return false;
        }
      }
    }
  }
  if (kind === "PropertySignature" || kind === "IndexSignatureDeclaration") {
    let p = parents.get(node);
    while (p) {
      if (ts.isMappedTypeNode(p)) return false;
      if (ts.isTypeLiteralNode(p) || ts.isInterfaceDeclaration(p) || ts.isSourceFile(p)) break;
      p = parents.get(p);
    }
  }
  if (kind === "MethodSignature" || kind === "MethodDeclaration") {
    // **成员位上的 `abstract new (): A`**：TypeScript 把它读成「名字叫 `new` 的方法」
    // （`modifiers=[abstract]` + `Identifier «new»`），本工程读成**抽象构造签名**
    // （`<Signature Kind="construct">`，`abstract` 是签名的第一个子单元）。
    // 类型位两边一致（TS 那边是带 `abstract` 的 ConstructorType），只有成员位这一处口径不同。
    // 本工程这一侧的读法更贴语义：`abstract new (…)` 是抽象构造签名，不是名叫 `new` 的方法。
    const name = node.name;
    if (name && name.getText().trim() === "new" && /^\s*abstract\b/.test(node.getText().trim())) {
      return false;
    }
  }
  if (kind === "BinaryExpression") {
    const op = node.operatorToken.kind;
    const skip = [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.EqualsToken,
      ts.SyntaxKind.PlusEqualsToken,
      ts.SyntaxKind.MinusEqualsToken,
      ts.SyntaxKind.AsteriskEqualsToken,
      ts.SyntaxKind.SlashEqualsToken,
      ts.SyntaxKind.PercentEqualsToken,
      ts.SyntaxKind.AsteriskAsteriskEqualsToken,
      ts.SyntaxKind.LessThanLessThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
      ts.SyntaxKind.AmpersandEqualsToken,
      ts.SyntaxKind.BarEqualsToken,
      ts.SyntaxKind.CaretEqualsToken,
      ts.SyntaxKind.LessThanToken,
      ts.SyntaxKind.GreaterThanToken,
      // 逗号（序列）表达式：能折的（`(a, b)` / `for` 更新段的 `ForNext` / 语句层）都折了，
      // 但 `if (a, b)` 这一类**条件位**的逗号够不到——它的 `(` 已经被 `IfCondition` 吸收，
      // 逗号规则的判据看不到那个括号（产品侧是保守取舍：宁可少折，也不把参数表折成序列表达式）。
      ts.SyntaxKind.CommaToken,
    ];
    if (skip.includes(op)) return false;
  }
  return true;
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(p) && !p.endsWith(".d.ts.map")) out.push(p);
  }
  return out;
}

export function corpusFiles(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walk(path.join(root, "node_modules", "@types"), []));
    files.push(...walk(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walk(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walk(path.join(root, "dist", "ts"), []));
    files.push(...walk(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    for (const c of listCases()) files.push(c.file);
  }
  return [...new Set(files)];
}

function contextOf(node, parents) {
  let p = parents.get(node);
  while (p) {
    if (ts.isInterfaceDeclaration(p)) return "interface 体";
    if (ts.isTypeLiteralNode(p)) return "类型字面量体";
    if (ts.isClassDeclaration(p) || ts.isClassExpression(p)) return "类体";
    if (ts.isObjectLiteralExpression(p)) return "对象字面量";
    if (ts.isModuleDeclaration(p)) return "namespace/module 体";
    if (ts.isSourceFile(p)) return "顶层";
    p = parents.get(p);
  }
  return "?";
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const topIndex = args.indexOf("--top");
  const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 5;
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : null;

  const files = corpusFiles(mode);
  const stats = new Map(GROUPS.map((g) => [g.id, { deficit: 0, excess: 0, filesDeficit: 0, filesExcess: 0, samples: [], excessSamples: [] }]));
  let parseFailures = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      const template = new Template();
      const document = new TextDocument(source);
      document.FilePath = file;
      const context = new TextContext(template);
      context.Process(document);
      xml = context.Root.ToString();
    } catch {
      parseFailures++;
      continue;
    }
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const parents = new Map();
    (function link(n) {
      ts.forEachChild(n, (child) => {
        parents.set(child, n);
        link(child);
      });
    })(sf);

    const counts = new Map();
    const perGroupSamples = new Map();
    (function visit(node) {
      for (const g of GROUPS) {
        for (const [kind, test] of g.kinds) {
          if (test(node) && countable(kind, node, parents)) {
            counts.set(g.id, (counts.get(g.id) || 0) + 1);
            if (!perGroupSamples.has(g.id)) perGroupSamples.set(g.id, []);
            perGroupSamples.get(g.id).push({
              file: path.relative(root, file),
              line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
              ctx: contextOf(node, parents),
              text: node.getText(sf).split("\n").map((s) => s.trim()).filter(Boolean).join(" ").slice(0, 100),
            });
            break;
          }
        }
      }
      ts.forEachChild(node, visit);
    })(sf);

    for (const g of GROUPS) {
      const want = counts.get(g.id) || 0;
      const got = countTagDeep(xml, g.tag);
      const d = want - got;
      if (want === 0 && got === 0) continue;
      const s = stats.get(g.id);
      if (d > 0) {
        s.deficit += d;
        s.filesDeficit++;
        // 缺的样本：按文档顺序取前 d 个（近似；同一标签混类时只作定位线索）
        for (const item of (perGroupSamples.get(g.id) || []).slice(0, d)) if (s.samples.length < 400) s.samples.push(item);
      } else if (d < 0) {
        s.excess += -d;
        s.filesExcess++;
        if (s.excessSamples.length < 40) s.excessSamples.push({ file: path.relative(root, file), excess: -d });
      }
    }
  }

  console.log(`语料 ${files.length} 个文件（解析失败 ${parseFailures} 个）\n`);
  console.log("构造组".padEnd(52) + "真缺".padStart(7) + "缺的文件".padStart(9) + "真多".padStart(7) + "多的文件".padStart(9));
  const rows = [...stats.entries()].sort((a, b) => b[1].deficit - a[1].deficit || b[1].excess - a[1].excess);
  let totalDeficit = 0;
  let totalExcess = 0;
  for (const [id, s] of rows) {
    const g = GROUPS.find((x) => x.id === id);
    if (s.deficit === 0 && s.excess === 0) continue;
    totalDeficit += s.deficit;
    totalExcess += s.excess;
    const mark = s.deficit > 0 ? "  ←缺" : "";
    console.log(g.label.slice(0, 50).padEnd(52) + String(s.deficit).padStart(7) + String(s.filesDeficit).padStart(9) + String(s.excess).padStart(7) + String(s.filesExcess).padStart(9) + mark);
  }
  console.log(`\n合计：真缺 ${totalDeficit} 个节点，真多 ${totalExcess} 个节点`);

  console.log("\n缺得最多的构造（按组，样本各取前 " + top + " 条）：");
  for (const [id, s] of rows) {
    if (s.deficit === 0) continue;
    const g = GROUPS.find((x) => x.id === id);
    const byCtx = new Map();
    for (const it of s.samples) {
      if (!byCtx.has(it.ctx)) byCtx.set(it.ctx, []);
      if (byCtx.get(it.ctx).length < top) byCtx.get(it.ctx).push(it);
    }
    console.log(`\n[${g.label}]  真缺 ${s.deficit}（${s.filesDeficit} 个文件）`);
    for (const [ctx, items] of [...byCtx.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  -- ${ctx}`);
      for (const it of items) console.log(`     ${it.file}:${it.line}  ${it.text}`);
    }
  }

  const excessRows = rows.filter(([, s]) => s.excess > 0);
  if (excessRows.length) {
    console.log("\n多出来的节点（标签被非对应构造占用 / 重复产出）：");
    for (const [id, s] of excessRows) {
      const g = GROUPS.find((x) => x.id === id);
      console.log(`  ${g.label}  真多 ${s.excess}（${s.filesExcess} 个文件）`);
      for (const e of s.excessSamples.slice(0, 5)) console.log(`     +${e.excess}  ${e.file}`);
    }
  }

  console.log("\n有意排除、不计入账目的构造（口径差异）：");
  for (const [what, why] of EXCLUDED) console.log(`  ${what} — ${why}`);

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ files: files.length, parseFailures, stats: Object.fromEntries(stats) }, null, 1), "utf8");
    console.log(`\n完整结果 → ${jsonPath}`);
  }
  process.exitCode = totalDeficit === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
