// AST JSON 尺子：**两个出口必须说同一棵树**。
//
//   node tests/parse/ast-json.mjs              真实语料 + 用例语料
//   node tests/parse/ast-json.mjs cases        只跑用例
//   node tests/parse/ast-json.mjs real         只跑真实语料
//   node tests/parse/ast-json.mjs --top 20
//   node tests/parse/ast-json.mjs --self-test  变异自检：故意改坏 JSON，尺子必须报警
//
// 口径：对同一个文件，先取 `Root.ToXmlString()`（XML 出口），再取 `Root.ToJsonString()`
// （AST JSON 出口，见 `core/syntax/token.xl.md` 的 `ToDictionary` / `ToList` / `ToPlain`），
// 然后把两边折算成**同一种形状**逐节点比对。
//
// 折算要抹掉的只是**排版差异**，一共三类，全部列在下面的表里：
//
//   1. 叶子：`<Identifier>x</Identifier>` ↔ `{"type":"Identifier","value":"x"}`
//   2. 空节点：`<LineWrap />` ↔ `{"type":"LineWrap"}`
//   3. 具名分段：`<For><ForInitial>…</ForInitial><ForCompare>…</ForCompare></For>`
//      ↔ `{"type":"For","initial":[…],"compare":[…]}`——**段元素本身不成为节点**，
//      它的子单元就是那个数组的元素。这条最容易看走眼，见 `SEGMENTS`。
//
// 折算完之后两边就是同一棵有 `type` / 属性 / 文本 / 子单元的树，深比即可。
//
// 值按一张**类型表**（`BOOL_KEYS` / `NUMBER_KEYS`）折回 XML 属性的写法：布尔写 "true"/"false"、
// 数字写十进制、数组按 "," 拼。表是**两边的契约**，不是「以某一侧为准的猜测」——
// 表里写错一个字段，这一把尺子立刻会红，而不是悄悄放过。
//
// 为什么要这一把尺子：`ToDictionary` 是照 `ToXmlString` 抄的第二套拼串，
// 两处不同步**不会有任何别的尺子看得见**（节点数、名字、括号、边界全都正常）。
// 上游 Cangjie 的 `Token.ToDictionary` 与 `Token.ToXmlString` 之间就有若干处已经漂开
// （`methodName` vs `MethodName`、`startBracketChar` vs `StartBracketChar`），
// 这一把尺子是防止本工程重演同一件事。
//
// 自检（`--self-test`）用的是**同一套比对函数**，只是喂给它的 JSON 被故意改坏：
// 节点名错位、内容被改、属性键被删，另外还有一处 XML 侧被改坏。
// 四种都必须被抓到——一个「永远绿」的尺子比没有尺子更危险。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";
// `parseXml` 从 structure.mjs 借：那是**同一把尺子**在用的 XML 解析器，
// 另写一份只会让两把尺子对「XML 长什么样」有两种理解。
import { parseXml } from "./structure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

// ---------------------------------------------------------------------------
// 契约表
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

/** 这些键在 JSON 里是 `int` 字段。 */
const NUMBER_KEYS = new Set(["interpolationCount", "rawQuoteCount", "rawIndent", "start", "end"]);

/** 这些键在 JSON 里是 `bool` 字段（XML 侧写的是 "true"/"false"）。 */
const BOOL_KEYS = new Set([
  "typeOnly",
  "export",
  "interpolation",
  "verbatim",
  "raw",
  "IsRawIndentFormated",
]);

/**
 * 「JSON 有、XML 没有」的属性：`父类型 -> Set<键名>`。
 *
 * `Lamda.async` 是**刻意**的：XML 那侧 `<Lamda>` 从来只串子单元（`async` 不写进标签），
 * 而 JSON 侧要把「这个箭头函数是不是 async」表达出来——否则 `async x => x` 与 `x => x`
 * 的 JSON 一模一样。两处要不要对齐是**口径问题**，这一把尺子只负责把它**登记在案**：
 * 没登记的「多一个键」照样会红。
 */
const JSON_ONLY_ATTRS = new Map([["Lamda", new Set(["async"])]]);

/**
 * 具名分段表：`父类型 -> (XML 里的分段元素名 -> { key, unwrap })`。
 *
 * 分段元素在 XML 里是「一层包装」（`<ForInitial>…</ForInitial>`），而 JSON 里那一层包装
 * **不存在**——段数组的元素是那个包装的**内容**。`unwrap: true` 表示抹掉包装那一层；
 * `unwrap: false` 表示 JSON 装的就是包装元素本身（`Switch` 的 `segments` 装的是
 * `<SwitchSegment>` 节点，不是它的内容）。
 *
 * 表里每一行都必须与那个 token 的 `ToDictionary` 覆写里
 * `result.set("<段名>", …ToList())` 那一行一致。判错不会静默通过：
 * 折算出来的形状与 JSON 对不上，尺子立刻报警。
 *
 * **为什么按父亲分组**：同名子元素在不同父亲下的待遇不一样——`<ReturnType>` 在 `Lamda` 里是
 * `returnType` 段，在 `MethodDeclaration` 里却只是普通子单元（跟着 `children` 走）。
 * 只按名字认会当场判错。
 *
 * **同一个段名可以对应多个元素名**（`Try` 的 `catches` 同时收 `CatchDefine` 与 `CatchBody`）。
 */
const SEGMENTS = new Map([
  ["While", new Map([["WhileCompare", { key: "compare" }], ["WhileBody", { key: "body" }]])],
  ["DoWhile", new Map([["WhileBody", { key: "body" }], ["WhileCompare", { key: "compare" }]])],
  [
    "For",
    new Map([
      ["ForInitial", { key: "initial" }],
      ["ForCompare", { key: "compare" }],
      ["ForNext", { key: "next" }],
      ["ForBody", { key: "body" }],
    ]),
  ],
  [
    "Foreach",
    new Map([
      ["ForeachDefine", { key: "define" }],
      ["ForeachEnumable", { key: "enumable" }],
      ["ForeachBody", { key: "body" }],
    ]),
  ],
  ["IfSegment", new Map([["IfCondition", { key: "condition" }], ["IfStatement", { key: "statement" }]])],
  // Try：`catches` 在 JSON 里是「按源码顺序把 CatchDefine / CatchBody 的**内容**装成一串」，
  // XML 里则是两个平级的段元素交替出现，所以两个名字都指向同一个段名。
  [
    "Try",
    new Map([
      ["TryBody", { key: "body" }],
      ["FinallyBody", { key: "finally" }],
      ["CatchDefine", { key: "catches", unwrap: false }],
      ["CatchBody", { key: "catches", unwrap: false }],
    ]),
  ],
  [
    "TernaryOperator",
    new Map([
      ["TernaryOperatorCondition", { key: "condition" }],
      ["TernaryOperatorTrueStatement", { key: "trueStatement" }],
      ["TernaryOperatorFalseStatement", { key: "falseStatement" }],
    ]),
  ],
  [
    "Lamda",
    new Map([
      ["LamdaParameters", { key: "parameters" }],
      ["ReturnType", { key: "returnType" }],
      ["LamdaBody", { key: "body" }],
    ]),
  ],
  ["New", new Map([["NewType", { key: "name" }], ["NewArguments", { key: "arguments" }]])],
  // Switch 是唯一 `unwrap: false` 的：`segments` 装的就是那几个 `<SwitchSegment>` 节点。
  [
    "Switch",
    new Map([
      ["SwitchCompare", { key: "compare" }],
      ["SwitchSegment", { key: "segments", unwrap: false }],
    ]),
  ],
]);

/** 所有段名的集合：JSON 侧靠它把「键 → 节点数组」认成段，而不是普通属性。 */
const SEGMENT_KEY_NAMES = new Set();
for (const table of SEGMENTS.values()) {
  for (const entry of table.values()) SEGMENT_KEY_NAMES.add(entry.key);
}

// ---------------------------------------------------------------------------
// 折算：XML 元素 / JSON 节点 → 同一种形状
// ---------------------------------------------------------------------------

/** 值 → XML 属性的写法（已经是字符串的（XML 侧）原样返回）。 */
function attrValue(key, value) {
  if (BOOL_KEYS.has(key)) return value === true ? "true" : value === false ? "false" : String(value);
  if (NUMBER_KEYS.has(key)) return String(value);
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

/**
 * XML 出口的文本 → **原文**（与 JSON 的 `value` 同一个形态，也就是 `JSON.parse` 之后的那一份）。
 *
 * XML 侧只有一层要解：`CommonUtil.XmlDecode` 的反斜杠序列，外加 XML 自己那几个实体。
 * 逐字符扫，不用正则——`\b` 在正则里是词边界，`\f` 是换页，用 `replace` 会当场把文本改坏
 * （这条是踩过的：它会把 `@param` 里的 `p` 前面插上乱码）。
 *
 * **JSON 侧不需要做任何事**：`value` 就是原文，`JSON.stringify` 那一层由 `JSON.parse` 抵掉了。
 * 两边的差别只是「XML 先转义再进标签」对「JSON 先解析再 stringify」，
 * 所以只要把 XML 那一层解掉，比较的就是同一段原文。
 */
function xmlToRaw(value) {
  return unescapeXmlLayer(String(value));
}

/** 解掉 XML 出口那一层：反斜杠序列 + XML 实体。逐字符扫，不用正则。 */
function unescapeXmlLayer(text) {
  let result = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === "r") result += "\r";
      else if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "b") result += "\b";
      else if (next === "f") result += "\f";
      else if (next === "v") result += "\v";
      else if (next === "a") result += "\x07";
      else if (next === "\\") result += "\\";
      else if (next === "'") result += "'";
      else if (next === '"') result += '"';
      else {
        // **不认识的转义序列原样保留**（`\uFEFF` / `\x41` / `` \` `` 这些 `XmlDecode` 根本不碰）。
        // 这里不能「吞掉反斜杠只留后一个字符」：那等于把原文改了，
        // 于是 `\uFEFF` 会变成 `uFEFF`，尺子会报一处根本不存在的差异。
        result += ch + next;
      }
      i += 2;
      continue;
    }
    if (ch === "&") {
      const stop = text.indexOf(";", i);
      if (stop !== -1) {
        const entity = text.slice(i, stop + 1);
        if (entity === "&lt;") result += "<";
        else if (entity === "&gt;") result += ">";
        else if (entity === "&quot;") result += '"';
        else if (entity === "&apos;") result += "'";
        else if (entity === "&amp;") result += "&";
        else result += entity;
        i = stop + 1;
        continue;
      }
    }
    result += ch;
    i++;
  }
  return result;
}

/**
 * 两边的文本折到同一个形态再比：**去掉末尾换行**。
 *
 * `AreaAnnotation` / `LineAnnotation` 的 `Tmp` 把注释后面那个换行也收进去了，
 * 而 XML 的渲染与 JSON 的 `value` 对它的处理差一层（产物的元素文本里带着它，
 * JSON 的原文里没有）。末行换行不影响「内容有没有被吃掉」这个判据，
 * 所以这里统一去掉——**只去末尾的换行，不动中间的**。
 */
function trimText(value) {
  return String(value).replace(/[\r\n]+$/, "");
}

/** JSON 节点 → `{ type, attrs, text, children }`。 */
function fromJson(node) {
  if (node === null || typeof node !== "object") {
    throw new Error(`AST JSON 里出现了不是对象的节点：${JSON.stringify(node)}`);
  }
  const shape = { type: node.type, attrs: {}, text: "", children: [] };
  for (const [key, value] of Object.entries(node)) {
    if (key === "type" || key === "range") continue;
    if (key === "value") {
      // `value` 是**原文本**，XML 那侧渲染时是逐字符原样进元素的（注释的缩进一起进去）。
      // 两边各自折到同一个形态再比，见 `xmlToRaw` / `trimText` 的说明。
      shape.text = trimText(String(value).trim());
      continue;
    }
    if (key === "children") {
      shape.children = value.map(fromJson);
      continue;
    }
    // 段：值是一批节点。**段元素本身不是节点**，所以这里直接摊进属性位，
    // 与 XML 侧把 `<ForInitial>` 那层包装摘掉的做法对称。
    if (SEGMENT_KEY_NAMES.has(key) && Array.isArray(value)) {
      shape.attrs[key] = value.map(fromJson);
      continue;
    }
    shape.attrs[key] = value;
  }
  return shape;
}

/** XML 元素 → 同形对象；分段元素按表抹掉（或不抹掉）自己那一层包装。 */
function fromXml(node) {
  const shape = {
    type: node.name,
    attrs: { ...node.attrs },
    // 两边都 trim 一次：XML 那侧把文本逐字符放进元素里（注释体的缩进一起进去），
    // 抹掉的是注释块首尾的缩进空白，不是内容。
    text: trimText(xmlToRaw(node.text).trim()),
    children: [],
  };
  const segments = SEGMENTS.get(node.name);
  for (const child of node.children) {
    const entry = segments === undefined ? undefined : segments.get(child.name);
    if (entry === undefined) {
      shape.children.push(fromXml(child));
      continue;
    }
    if (!Array.isArray(shape.attrs[entry.key])) shape.attrs[entry.key] = [];
    // `unwrap === false`：JSON 装的就是这个元素本身（`Switch` 的 `segments`）。
    // 其余情况抹掉包装那一层——`<ForInitial>a b</ForInitial>` 在 JSON 里是 a、b 两个元素，
    // 包装元素自己不出现。
    if (entry.unwrap === false) {
      shape.attrs[entry.key].push(fromXml(child));
    } else {
      for (const grandChild of child.children) shape.attrs[entry.key].push(fromXml(grandChild));
    }
  }
  return shape;
}

/** 一个值是不是「一个节点」。 */
function isNode(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.type === "string";
}

/** 一个值是不是「一批节点」。 */
function isNodeList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNode);
}

/** 深比两个形状，返回差异描述数组（空数组＝一致）。 */
function diffShapes(a, b, at, out) {
  if (a === undefined || b === undefined) {
    out.push(`${at}: 一侧没有节点（产物 ${a === undefined ? "缺" : "有"} / JSON ${b === undefined ? "缺" : "有"}）`);
    return out;
  }
  if (a.type !== b.type) {
    out.push(`${at}: 节点名 ${a.type} ≠ ${b.type}`);
    return out;
  }
  const keys = new Set([...Object.keys(a.attrs), ...Object.keys(b.attrs)]);
  const jsonOnly = JSON_ONLY_ATTRS.get(a.type);
  for (const key of [...keys].sort()) {
    const hasLeft = Object.prototype.hasOwnProperty.call(a.attrs, key);
    const hasRight = Object.prototype.hasOwnProperty.call(b.attrs, key);
    if (!hasLeft || !hasRight) {
      // 「JSON 有、XML 没有」在登记过的键上放行（见 `JSON_ONLY_ATTRS` 的说明）。
      if (!hasLeft && hasRight && jsonOnly !== undefined && jsonOnly.has(key)) continue;
      out.push(`${at}<${a.type}> 属性 ${key}: ${hasLeft ? "产物有、JSON 没有" : "JSON 有、产物没有"}`);
      continue;
    }
    const left = a.attrs[key];
    const right = b.attrs[key];
    // 段：两边都是节点数组，逐个比下去。
    // 「是不是段」用**两边的值形状**判定，而不是只看段名集合：段名是全局的
    // （`While.body` 与 `Foreach.body` 共用一个名字），而某个节点的普通属性完全可能
    // 正好叫 `body`。值形状（对象 / 对象数组）才是可靠判据——属性值只能是字符串、布尔或数字。
    if (isNode(left) && isNode(right)) {
      diffShapes(left, right, `${at}<${a.type}>.${key}`, out);
      continue;
    }
    if (isNodeList(left) && isNodeList(right)) {
      if (left.length !== right.length) {
        out.push(`${at}<${a.type}> 段 ${key} 的子单元个数 ${left.length} ≠ JSON ${right.length}`);
        continue;
      }
      for (let i = 0; i < left.length; i++) {
        diffShapes(left[i], right[i], `${at}<${a.type}>.${key}[${i}]`, out);
      }
      continue;
    }
    const leftText = attrValue(key, left);
    const rightText = attrValue(key, right);
    if (leftText !== rightText) out.push(`${at}<${a.type}> 属性 ${key}: 产物 "${leftText}" ≠ JSON "${rightText}"`);
  }
  if (a.text !== b.text) out.push(`${at}<${a.type}> 文本 "${a.text}" ≠ JSON "${b.text}"`);
  if (a.children.length !== b.children.length) {
    out.push(`${at}<${a.type}> 子单元个数 ${a.children.length} ≠ JSON ${b.children.length}`);
    return out;
  }
  for (let i = 0; i < a.children.length; i++) {
    diffShapes(a.children[i], b.children[i], `${at}<${a.type}>[${i}]`, out);
  }
  return out;
}

/**
 * 把 `ToXmlString()` 的产物折算成与 `ToList()` **同一层**的形状。
 *
 * `ToXmlString()` 的根是那一个 `<Root>` 元素，而 `ToList()` 的根是 `<Root>` 的**子单元数组**
 * （上游 `code.analyse` 取的也是这一层）。所以比对面是
 * `Root 元素.children` ↔ `ToList()` 数组——不是拿 `<Root>` 去比数组。
 */
function xmlSideOf(xmlText) {
  const xmlRoot = parseXml(xmlText);
  if (xmlRoot.children.length !== 1) {
    throw new Error(`产物的根不是单个元素（${xmlRoot.children.length} 个）`);
  }
  const rootElement = xmlRoot.children[0];
  if (rootElement.name !== "Root") {
    throw new Error(`产物的根元素叫 <${rootElement.name}>，不是 <Root>`);
  }
  return { type: "Root", attrs: {}, text: "", children: rootElement.children.map(fromXml) };
}

function jsonSideOf(jsonText) {
  const jsonArray = JSON.parse(jsonText);
  if (!Array.isArray(jsonArray)) {
    throw new Error("AST JSON 的顶层不是数组");
  }
  return { type: "Root", attrs: {}, text: "", children: jsonArray.map(fromJson) };
}

// 折算层对外可见：定位单条差异时直接 import 这几个，
// 不必再写一遍「XML ↔ JSON」的同一套折算——两套折算就是两个事实来源。
export {
  diffShapes,
  xmlSideOf,
  jsonSideOf,
  fromXml,
  fromJson,
  attrValue,
  xmlToRaw,
  trimText,
  unescapeXmlLayer,
  SEGMENTS,
  SEGMENT_KEY_NAMES,
  BOOL_KEYS,
  NUMBER_KEYS,
  JSON_ONLY_ATTRS,
};

// ---------------------------------------------------------------------------
// 解析与比对
// ---------------------------------------------------------------------------

function parseWith(source, file) {
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root;
}

function countNodes(shape) {
  let total = 1;
  for (const child of shape.children) total += countNodes(child);
  return total;
}

/** 同上，但直接吃两段文本（自检用：可以喂改坏过的那一份）。 */
function compareTexts(xmlText, jsonText) {
  return diffShapes(xmlSideOf(xmlText), jsonSideOf(jsonText), "", []);
}

/** 一次比对：源文件 → 两个出口 → 形状差异。 */
function compareFile(source, file) {
  const tree = parseWith(source, file);
  const xmlSide = xmlSideOf(tree.ToXmlString());
  const jsonSide = jsonSideOf(tree.ToJsonString());
  return {
    xmlNodes: countNodes(xmlSide),
    jsonNodes: countNodes(jsonSide),
    problems: diffShapes(xmlSide, jsonSide, "", []),
  };
}

// ---------------------------------------------------------------------------
// 自检：故意把两侧改坏，比对必须报警
// ---------------------------------------------------------------------------

/** 取第一个存在的样本文件。 */
function sampleSource() {
  const candidates = [
    "samples/declarations.ts",
    "samples/hello.ts",
    "tests/parse/cases/declarations/cls-basic.ts",
    "tests/parse/cases/statements/stmt-if-else.ts",
  ];
  for (const rel of candidates) {
    const file = path.join(root, rel);
    if (fs.existsSync(file)) return { source: fs.readFileSync(file, "utf8"), file };
  }
  return null;
}

/**
 * 变异一：把某个节点的 `type` 改成它**父亲**的类型名（等于节点名错位）。
 *
 * 不能拿「根数组前两个节点互换类型」来做：两个根节点常常**本来就是同一个类型**
 * （两条 `<Statement>`），互换等于什么都没做，变异就白做了。
 */
function mutateTypeToParent(jsonText) {
  const value = JSON.parse(jsonText);
  let mutated = false;
  const walk = (node, parentType) => {
    if (mutated || parentType === null) return;
    if (node.type !== parentType) {
      node.type = parentType;
      mutated = true;
      return;
    }
    if (Array.isArray(node.children)) for (const child of node.children) walk(child, node.type);
  };
  // 根节点的父亲类型给一个不可能相等的哨兵值，于是第一层子节点一定会被改到。
  for (const node of value) walk(node, "<root>");
  return mutated ? JSON.stringify(value) : null;
}

/** 变异二：把最深处一个 `value` 改掉（等于内容被吃 / 被换）。 */
function mutateValue(jsonText) {
  const value = JSON.parse(jsonText);
  let mutated = false;
  const walk = (node) => {
    if (mutated) return;
    if (typeof node.value === "string" && node.value !== "") {
      node.value = node.value + "X";
      mutated = true;
    }
    if (Array.isArray(node.children)) for (const child of node.children) walk(child);
  };
  for (const node of value) walk(node);
  return mutated ? JSON.stringify(value) : null;
}

/** 变异三：把最外层一个属性键删掉（等于两个出口的拼串漂开了）。 */
function mutateDropKey(jsonText) {
  const value = JSON.parse(jsonText);
  let mutated = false;
  const walk = (node) => {
    if (mutated) return;
    for (const key of Object.keys(node)) {
      if (key === "type" || key === "children" || key === "value" || key === "range") continue;
      delete node[key];
      mutated = true;
      return;
    }
    if (Array.isArray(node.children)) for (const child of node.children) walk(child);
  };
  for (const node of value) walk(node);
  return mutated ? JSON.stringify(value) : null;
}

/** 变异四：把一个段数组清空（等于分段结构丢了）。 */
function mutateDropSegment(jsonText) {
  const value = JSON.parse(jsonText);
  let mutated = false;
  const walk = (node) => {
    if (mutated) return;
    for (const key of Object.keys(node)) {
      if (!SEGMENT_KEY_NAMES.has(key) || !Array.isArray(node[key]) || node[key].length === 0) continue;
      delete node[key];
      mutated = true;
      return;
    }
    if (Array.isArray(node.children)) for (const child of node.children) walk(child);
  };
  for (const node of value) walk(node);
  return mutated ? JSON.stringify(value) : null;
}

function selfTest() {
  const sample = sampleSource();
  if (sample === null) {
    console.log("自检失败：找不到任何样本文件。");
    return 1;
  }
  const tree = parseWith(sample.source, sample.file);
  const xmlText = tree.ToXmlString();
  const jsonText = tree.ToJsonString();

  if (compareTexts(xmlText, jsonText).length !== 0) {
    console.log(`自检失败：干净的两个出口就对不上。`);
    console.log(`  ${compareTexts(xmlText, jsonText)[0]}`);
    return 1;
  }

  const mutations = [
    ["JSON 节点名错位", mutateTypeToParent(jsonText)],
    ["JSON 内容被改", mutateValue(jsonText)],
    ["JSON 属性键被删", mutateDropKey(jsonText)],
    ["JSON 分段键被删", mutateDropSegment(jsonText)],
    ["XML 标签名被改", xmlText.replace("<Identifier>", "<IdentifierX>").replace("</Identifier>", "</IdentifierX>") === xmlText ? null : xmlText.replace("<Identifier>", "<IdentifierX>").replace("</Identifier>", "</IdentifierX>")],
  ];
  let failures = 0;
  let ran = 0;
  for (const [name, mutated] of mutations) {
    if (mutated === null) {
      console.log(`  自检跳过（这个样本上没有可改的目标）：${name}`);
      continue;
    }
    ran++;
    const left = name.startsWith("XML") ? mutated : xmlText;
    const right = name.startsWith("XML") ? jsonText : mutated;
    if (compareTexts(left, right).length === 0) {
      console.log(`  自检失败（没抓到）：${name}`);
      failures++;
    }
  }
  console.log(
    failures === 0
      ? `自检通过：${ran} 种变异都被抓到了（JSON 侧 4 种 + XML 侧 1 种）。`
      : `自检失败 ${failures} 项。`,
  );
  return failures === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// 语料
// ---------------------------------------------------------------------------

function walkDir(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.(ts|mts|cts)$/.test(p)) out.push(p);
  }
  return out;
}

function corpus(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walkDir(path.join(root, "node_modules", "@types"), []));
    files.push(...walkDir(path.join(root, "node_modules", "typescript", "lib"), []));
    files.push(...walkDir(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walkDir(path.join(root, "dist", "ts"), []));
    files.push(...walkDir(path.join(root, "samples"), []));
  }
  if (mode !== "real") {
    for (const c of listCases()) {
      if (c.directives.tsInvalid) continue;
      if (c.file.endsWith(".tsx")) continue;
      files.push(c.file);
    }
  }
  return [...new Set(files)];
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 20;

  if (args.includes("--self-test")) {
    process.exitCode = selfTest();
    return;
  }

  const files = corpus(mode);
  const problems = [];
  const groups = new Map();
  let parsed = 0;
  let failed = 0;
  let nodes = 0;

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let result;
    try {
      result = compareFile(source, file);
    } catch (e) {
      failed++;
      problems.push({ file: path.relative(root, file), kind: "THROW", message: String(e && e.message).split("\n")[0] });
      groups.set("THROW", (groups.get("THROW") || 0) + 1);
      continue;
    }
    parsed++;
    nodes += result.xmlNodes;
    if (result.problems.length > 0) {
      const first = result.problems[0];
      problems.push({
        file: path.relative(root, file),
        kind: "DRIFT",
        message: first,
        count: result.problems.length,
      });
      const key = `DRIFT: ${first.replace(/\[\d+\]/g, "[N]").slice(0, 120)}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }

  const driftedFiles = new Set(problems.filter((p) => p.kind === "DRIFT").map((p) => p.file));
  console.log(
    `AST JSON 尺子：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}\n` +
      `              产物节点 ${nodes} 个，两个出口对不上的文件 ${driftedFiles.size} 个\n`,
  );
  if (groups.size === 0) {
    console.log("每个文件的 XML 出口与 AST JSON 出口逐节点一致。");
  } else {
    console.log("按差异聚合：");
    for (const [key, count] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      console.log(`  ${String(count).padStart(5)}  ${key}`);
    }
    console.log("\n样本：");
    for (const p of problems.slice(0, 60)) console.log(`  ${p.file}  [${p.kind}] ${p.message}`);
  }

  process.exitCode = problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
