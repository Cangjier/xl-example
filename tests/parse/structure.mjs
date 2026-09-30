// 结构尺子：产物的**嵌套形状**是不是源码的形状。
//
//   node tests/parse/structure.mjs            跑真实语料 + 用例语料
//   node tests/parse/structure.mjs cases      只跑 tests/parse/cases
//   node tests/parse/structure.mjs real       只跑真实语料
//   node tests/parse/structure.mjs --top 20   每组最多列 20 个样本
//   node tests/parse/structure.mjs --json out.json
//
// 为什么还要第五把尺子：现有四把都看不见「形状」。
//   run.mjs        手写期望值——只查标签**在不在**、**几个**，不查它套在谁身上
//   differential   构造个数——净额口径，两侧口径不同就互相抵消
//   gap-dashboard  正 / 负差额分开统计，但仍是**计数**：一个节点套错父亲，计数不变
//   lossless       名字与字面量是否还在，与嵌套无关
//
// 判据（representation-independent，不需要标签映射）：
//
//   源码文本里每个配对成功的括号（`(…)` / `[…]` / `{…}`）都是一个区间。
//   产物里「一个单元 = 一对括号」的那些标签（`Bracket` / `ObjectLiteral` / …）也各有一个区间。
//   把两侧的区间按**先序**对齐后，不变量是：
//
//     **两对括号在源码里是包含关系 ⇔ 它们在产物树里是祖先关系。**
//
//   这直接抓「括号被收进错误的单元」：配对错、整段内容被搬到别的深度、成员跑出类体。
//   它不去猜「哪个标签代表哪个括号」——只要求两边对**同一对括号**给出同一个区间；
//   认领不到括号的标签（`Root`、各种 `*Body`、`SymbolToken` 装的括号）不参与，不会误报。

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
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

// ---------------------------------------------------------------------------
// 产物侧：XML → 带父亲的树
// ---------------------------------------------------------------------------

// 标签扫描要**认得引号**：本工程的属性值里会出现 `>`（`modifiers="export,default"`、
// 说明性属性），用 `[^<>]*` 偷懒会在引号里误判定界。
const TAG_RE = /<(\/?)([A-Za-z_][A-Za-z0-9_]*)((?:"[^"]*"|'[^']*'|[^<>"'])*?)(\/?)>/g;

export function unescapeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** 解析产物 XML：返回带 `parent` / `children` / `text` 的根节点。 */
export function parseXml(xml) {
  const tree = { name: "#root", attrs: {}, selfClosing: false, text: "", children: [], parent: undefined };
  const stack = [tree];
  let cursor = 0;
  let match;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(xml)) !== null) {
    const between = xml.slice(cursor, match.index);
    if (between !== "") stack[stack.length - 1].text += between;
    cursor = TAG_RE.lastIndex;
    const [raw, closing, name, attrText, selfClosing] = match;
    if (closing === "/") {
      const top = stack.pop();
      if (top === undefined || top.name !== name) {
        throw new Error(`XML 嵌套不闭合：</${name}> 对不上 <${top ? top.name : "(空栈)"}>`);
      }
      continue;
    }
    const attrs = {};
    const ATTR_RE = /([A-Za-z_][A-Za-z0-9_:-]*)\s*=\s*"([^"]*)"/g;
    let am;
    while ((am = ATTR_RE.exec(attrText)) !== null) attrs[am[1]] = unescapeXml(am[2]);
    const node = {
      name,
      attrs,
      selfClosing: selfClosing === "/",
      text: "",
      children: [],
      parent: stack[stack.length - 1],
      openAt: match.index,
      closeAt: match.index + raw.length,
    };
    stack[stack.length - 1].children.push(node);
    if (!node.selfClosing) stack.push(node);
  }
  const tail = xml.slice(cursor);
  if (tail !== "") stack[stack.length - 1].text += tail;
  if (stack.length !== 1) throw new Error(`XML 有未闭合的标签：<${stack[stack.length - 1].name}>`);
  return tree;
}

export function* walkXml(node) {
  yield node;
  for (const c of node.children) yield* walkXml(c);
}

function* descendants(node) {
  for (const c of node.children) {
    yield c;
    yield* descendants(c);
  }
}

// ---------------------------------------------------------------------------
// 源码侧：非平凡 token、定界符配对、叶子定位
// ---------------------------------------------------------------------------

const TRIVIA = new Set([
  ts.SyntaxKind.WhitespaceTrivia,
  ts.SyntaxKind.NewLineTrivia,
  ts.SyntaxKind.SingleLineCommentTrivia,
  ts.SyntaxKind.MultiLineCommentTrivia,
  ts.SyntaxKind.ShebangTrivia,
  ts.SyntaxKind.ConflictMarkerTrivia,
]);

/**
 * 扫源文件，返回**非平凡** token（跳过空白与注释），带源码位置。
 *
 * 用 TS 的 scanner 而不是自己写词法：它在词法阶段就已经判定了
 * 「`/` 是除号还是正则开头」「`'` 里有没有结束」这些难事，
 * 而本尺子要判的是**结构**，不是把词法再实现一遍。
 */
export function scanTokens(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
  const out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (TRIVIA.has(kind)) continue;
    out.push({ kind, text: scanner.getTokenText(), pos: scanner.getTokenStart(), end: scanner.getTokenEnd() });
  }
  return out;
}

const OPENERS = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = { ")": "(", "]": "[", "}": "{" };

/**
 * 把源码里的定界符配成对，只留下**配对成功**的那些。
 *
 * 字符串 / 模板 / 注释 / 正则里的括号不会被算进来：它们在 scanner 眼里是一个 token。
 * 配不上的收尾括号直接丢掉——源码侧保持「不猜」。
 */
export function scanDelimiters(source) {
  const delims = [];
  const stack = [];
  for (const t of scanTokens(source)) {
    if (t.text.length !== 1) continue;
    if (OPENERS[t.text] !== undefined) {
      const rec = { char: t.text, pos: t.pos, closePos: -1 };
      delims.push(rec);
      stack.push(rec);
      continue;
    }
    if (CLOSERS[t.text] !== undefined) {
      const top = stack.length > 0 ? stack[stack.length - 1] : undefined;
      if (top !== undefined && top.char === CLOSERS[t.text]) {
        stack.pop();
        top.closePos = t.pos;
      }
    }
  }
  return delims.filter((d) => d.closePos >= 0);
}

const ESCAPES = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", v: "\u000b", a: "\u0007", "0": "\0" };

/** 把产物里的转义写法还原成实际字符（与 `lossless.mjs` 同一口径）。 */
export function decodeEscapes(text) {
  if (!text.includes("\\")) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") {
      out += text[i];
      continue;
    }
    const c = text[i + 1];
    if (c === undefined) {
      out += "\\";
      break;
    }
    if (c === "x") {
      out += String.fromCharCode(parseInt(text.substr(i + 2, 2), 16));
      i += 3;
      continue;
    }
    if (c === "u") {
      if (text[i + 2] === "{") {
        const close = text.indexOf("}", i + 3);
        const code = close > i + 3 ? parseInt(text.slice(i + 3, close), 16) : NaN;
        if (Number.isFinite(code)) out += String.fromCodePoint(code);
        else out += text.slice(i, close > 0 ? close + 1 : i + 2);
        i = close > 0 ? close : i + 1;
        continue;
      }
      const code = parseInt(text.substr(i + 2, 4), 16);
      if (Number.isFinite(code)) out += String.fromCharCode(code);
      i += 5;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(ESCAPES, c)) {
      out += ESCAPES[c];
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * 把一个源码 token 或产物叶子归一化成「可比文本」。
 *
 * 两侧的差异只有三种，归一化时要一起消掉：
 *   1. 字符串字面量在源码里**带引号**，在产物里是 `<ConstString>` 的**内容**；
 *   2. 产物对转义有自己的写法（`'\n'` → `'\r\n'`，`<\/` → `</`）；
 *   3. 模板串两侧都是反引号，但内插段会被拆成多个单元。
 *
 * 单位不同（`\n` 是两个字符还是真的换行）在这里统一成「真的换行」：
 * 叶子用**原始文本**（未解码），这样与源码 token 的写法一致。
 */
function normalizeToken(raw, isLeaf) {
  let s = isLeaf ? raw : raw;
  const first = s[0];
  const last = s[s.length - 1];
  if (s.length >= 2 && (first === "'" || first === '"' || first === "`") && last === first) {
    s = s.slice(1, -1);
  }
  return decodeEscapes(s);
}

/** 字符多重集：`Map<char, 次数>`。 */
function countChars(text) {
  const counts = new Map();
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1);
  return counts;
}

/**
 * 用一个叶子的原文去冲抵累积器里的字符。
 *
 * 叶子的每个字符都必须还在累积器里，否则返回 `false` 且**不做任何修改**。
 * 成功时消耗掉这些字符并维护 `left`（还剩多少字符没用完）。
 */
function takeChars(acc, text) {
  const counts = acc.counts;
  for (const ch of text) {
    if ((counts.get(ch) || 0) === 0) return false;
  }
  for (const ch of text) counts.set(ch, counts.get(ch) - 1);
  acc.left -= text.length;
  return true;
}

const ANNOTATION_TAGS = new Set(["LineAnnotation", "AreaAnnotation"]);

/**
 * 注释碎片与注释正文的**可比形态**。
 *
 * 两侧差三件事，都要归一化掉：
 *   1. 产物的注释正文是**转义写法**（换行是字面的 `\n` 两个字符），源码侧是真的换行；
 *   2. 产物的块注释碎片带 `*` 前缀与缩进，源码侧带 `/*` `*\/` 标记；
 *   3. 空白量不同。
 */
export function comparableCommentText(text) {
  return decodeEscapes(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*+\s?/, "").trim())
    .filter((line) => line !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 把产物的每个叶子对齐到源码的一个位置。
 *
 * 原理：本工程是无损的（`lossless.mjs` 覆盖），产物叶子在**文档顺序**上与源码同序。
 * 两类叶子要分开处理：
 *
 *   1. **注释叶子**（`LineAnnotation` / `AreaAnnotation`）——注释在源码里是 trivia，
 *      不是 token。它们按注释正文**包含关系**直接定位，并且天然把整条链切成若干段。
 *   2. **其余叶子**——与源码非平凡 token 同序。分段之后，段内「叶子数」与「token 数」
 *      差得很小，于是用**段内偏移搜索**定基准，再用就近贪心补跳位。
 *
 * 分段 + 段内定基准这两步都是为了**不连锁**：局部同名 token 重复出现时，贪心会吃错，
 * 而基准是整段按匹配数投票选出来的，个别歧义影响不了它。
 *
 * 返回 `{ posOf, matched, total, rate }`：`rate` 是可信度，调用方据此决定要不要信它。
 */
export function locateLeaves(source, tree) {
  const tokens = scanTokens(source);
  const normToken = tokens.map((t) => normalizeToken(t.text, false));
  const comments = scanComments(source);

  const leaves = [];
  const visit = (node) => {
    if (node.selfClosing) return;
    if (node.children.length === 0) {
      leaves.push(node);
      return;
    }
    for (const c of node.children) visit(c);
  };
  visit(tree);

  const posOf = new Map();
  let matched = 0;

  // --- 1. 注释叶子：按正文包含关系定位，同时记录它们把链切成了几段 ---
  const commentCursor = { value: 0 };
  const segments = []; // { leafStart, leafEnd, tokenStart, tokenEnd }
  const skippedLeaves = new Set(); // 注释碎片：不占 token，也不计入可信度分母
  let segStartLeaf = 0;
  let emptyLeaves = 0;
  const tokensAfter = (pos) => {
    let lo = 0;
    let hi = tokens.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tokens[mid].pos < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  let segStartToken = 0;
  for (let l = 0; l < leaves.length; l++) {
    const node = leaves[l];
    const leafText = unescapeXml(node.text);
    if (leafText === "" && node.children.length === 0 && !ANNOTATION_TAGS.has(node.name)) emptyLeaves++;
    if (!ANNOTATION_TAGS.has(node.name)) continue;
    const raw = comparableCommentText(leafText);
    if (raw === "") continue;
    // 注释在源码里是 trivia，不是 token，所以只能按**正文**定位。
    // 一个 `/* … */` 在本工程里会被切成**很多** `AreaAnnotation` 片段，
    // 而源码侧一条注释只有一个区间。于是按「片段 ⊆ 注释正文」匹配，
    // **每条注释可以被多个片段认领**：注释游标只在真的越过当前注释时才前进。
    // 贪心地「找到就跳到下一条注释」会把 800 多条注释在头两个片段上吃完，后面全错位。
    let hit = -1;
    for (let c = Math.max(0, commentCursor.value - 1); c < Math.min(comments.length, commentCursor.value + 4); c++) {
      const body = comparableCommentText(comments[c].text);
      if (body !== "" && body.includes(raw)) {
        hit = c;
        break;
      }
    }
    if (hit < 0) {
      // 碎片与注释正文对不上（例如注释被换行拆得只剩 `*`）：只跳过这个叶子
      skippedLeaves.add(l);
      if (process.env.XL_STRUCTURE_DEBUG === "1" && l < 4) console.error("comment miss at leaf", l, node.name, JSON.stringify(raw.slice(0, 60)), "cursor", commentCursor.value);
      continue;
    }
    if (process.env.XL_STRUCTURE_DEBUG === "1" && l < 4) console.error("comment hit at leaf", l, node.name, "→", hit);
    commentCursor.value = hit + 1;
    posOf.set(node, { start: comments[hit].start, end: comments[hit].end });
    matched++;
    // 注释把叶子链与 token 链同时切开
    const after = tokensAfter(comments[hit].end);
    segments.push({ leafStart: segStartLeaf, leafEnd: l, tokenStart: segStartToken, tokenEnd: after });
    segStartLeaf = l + 1;
    segStartToken = after;
  }
  segments.push({ leafStart: segStartLeaf, leafEnd: leaves.length, tokenStart: segStartToken, tokenEnd: tokens.length });

  // --- 2. 每段内做偏移搜索 + 就近贪心 ---
  if (process.env.XL_STRUCTURE_DEBUG === "1") {
    console.error("segments:", JSON.stringify(segments), "comments:", JSON.stringify(comments.map((c) => [c.start, c.end, c.text.slice(0, 20)])));
  }
  for (const seg of segments) {
    const segLeaves = [];
    for (let l = seg.leafStart; l < seg.leafEnd; l++) segLeaves.push(l);
    if (segLeaves.length === 0) continue;
    const needles = segLeaves.map((l) => normalizeToken(unescapeXml(leaves[l].text), true));

    // 匹配分三种情况，按精确程度从高到低：
    //
    //   1. **整 token 命中**：叶子原文 == 这个 token 的原文（字符串字面量走这条：
    //      产物 `<ConstString>` 里存的原文与源码 token 逐字相同）。
    //   2. **复合 token 累积**：一个源码 token 被拆成多个叶子（`+=` → `=` + `+`，
    //      `>>>=` → 更多），而且**叶子的顺序不保证**（`+=` 在产物里先是 `=` 再是 `+`）。
    //      所以按**字符多重集**累积：本 token 的字符用掉了多少、还剩多少，
    //      全部用光才算认领完，游标才前进。用多重集而不是前缀，正是为了不受顺序影响。
    //   3. **就近前跳**：源码里的 token 没产出叶子（形参名、修饰词、标点），
    //      只往前走、取窗口内最近的候选，窗口按剩余密度逐级放大。
    //
    // 只往前走用的是「叶子顺序 = 源码顺序」这条硬不变量。
    let cursor = seg.tokenStart;
    let pending = null; // 复合 token 的累积器：{ counts, left }
    for (let i = 0; i < segLeaves.length; i++) {
      const rawLeaf = unescapeXml(leaves[segLeaves[i]].text);
      const needle = needles[i];
      if (rawLeaf === "" && needle === "") continue;
      const tokenText = cursor < seg.tokenEnd ? tokens[cursor].text : "";
      let hit = -1;
      let consumed = false;

      if (pending !== null) {
        hit = cursor;
        takeChars(pending, rawLeaf);
        if (pending.left <= 0) consumed = true;
        else if (pending.left < 0) {
          // 用过头了：这个 token 与这批叶子对不上，退回情况 3 重新找
          pending = null;
          hit = -1;
        }
      }

      if (hit < 0 && pending === null && tokenText !== "" && rawLeaf === tokenText) {
        hit = cursor; // 情况 1
        consumed = true;
      }

      if (hit < 0 && pending === null && tokenText !== "" && rawLeaf !== "") {
        // 情况 2 的起点：叶子的字符全都在这个 token 里，且还有剩余没用完
        const acc = { counts: countChars(tokenText), left: tokenText.length };
        if (takeChars(acc, rawLeaf) && acc.left > 0) {
          pending = acc;
          hit = cursor;
        }
      }

      if (hit < 0 && pending === null) {
        // 情况 3
        const remainLeaves = Math.max(1, segLeaves.length - i);
        const remainTokens = seg.tokenEnd - cursor;
        for (const factor of [4, 32, 256, 4096]) {
          const width = Math.min(seg.tokenEnd - cursor, Math.max(8, Math.ceil(remainTokens / remainLeaves) * factor));
          for (let k = cursor; k < cursor + width; k++) {
            if (normToken[k] === needle) {
              hit = k;
              break;
            }
          }
          if (hit >= 0) break;
        }
        consumed = hit >= 0;
      }

      if (hit < 0) continue;
      posOf.set(leaves[segLeaves[i]], { start: tokens[hit].pos, end: tokens[hit].end });
      matched++;
      if (consumed) {
        cursor = hit + 1;
        pending = null;
      }
    }
  }

  // --- 3. 空文本 + 开合字符属性的单元（`[]` / `()` / `{}`）：不吐文本，但确实占一对括号 ---
  for (const node of walkXml(tree)) {
    if (node.selfClosing || node.children.length > 0) continue;
    if (posOf.has(node)) continue;
    const openChar = leafBracketChars(node);
    if (openChar === undefined || node.text !== "") continue;
    const found = findPairNear(tokens, posOf, leaves, node, openChar);
    if (found !== undefined) posOf.set(node, found);
  }

  const denom = Math.max(1, leaves.length - emptyLeaves - skippedLeaves.size);
  return { posOf, matched, total: leaves.length, emptyLeaves, rate: matched / denom };
}

/** 源码里的注释：`{ start, end, text }`（文字不含 `//` / `/*` 标记）。 */
export function scanComments(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
  const out = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (kind !== ts.SyntaxKind.SingleLineCommentTrivia && kind !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    const start = scanner.getTokenStart();
    const end = scanner.getTokenEnd();
    const raw = source.slice(start, end);
    let text = raw;
    if (raw.startsWith("//")) text = raw.slice(2);
    else if (raw.startsWith("/*")) text = raw.slice(2, raw.endsWith("*/") ? -2 : undefined);
    out.push({ start, end, text });
  }
  return out;
}

/** 第一个位置 **大于等于** pos 的 token 下标。 */
function tokenIndexAfter(tokens, pos) {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].pos < pos) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * 给「空文本但代表一对定界符」的叶子找位置。
 *
 * 不做全局 DP（这些单元在源码里就是一对括号，位置由**它在叶子序列里的前后邻居**夹住），
 * 直接拿前后两个已定位叶子的 token 下标当边界，在中间找一对。
 */
function findPairNear(tokens, posOf, leaves, node, openChar) {
  const idx = leaves.indexOf(node);
  let lo = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const p = posOf.get(leaves[i]);
    if (p !== undefined) {
      lo = tokenIndexAt(tokens, p.start) + 1;
      break;
    }
  }
  let hi = tokens.length;
  for (let i = idx + 1; i < leaves.length; i++) {
    const p = posOf.get(leaves[i]);
    if (p !== undefined) {
      hi = tokenIndexAt(tokens, p.start);
      break;
    }
  }
  for (let i = lo; i < hi; i++) {
    if (tokens[i].text !== openChar) continue;
    let depth = 0;
    for (let j = i; j < hi; j++) {
      if (tokens[j].text === openChar) depth++;
      else if (tokens[j].text === OPENERS[openChar]) {
        depth--;
        if (depth === 0) return { start: tokens[i].pos, end: tokens[j].end };
      }
    }
  }
  return undefined;
}

function tokenIndexAt(tokens, pos) {
  let lo = 0;
  let hi = tokens.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].pos <= pos) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** 产物的这个叶子是不是「一对定界符」；是就返回开字符。 */
function leafBracketChars(node) {
  const open = node.attrs.startBracket;
  const close = node.attrs.endBracket;
  if (open === undefined || close === undefined) return undefined;
  if (open.length !== 1 || OPENERS[open] !== close) return undefined;
  return open;
}

/** 从 token 游标的 `from` 开始，找**紧接着**的一对 `open`…`close`。 */
function findPair(tokens, from, open) {
  let openAt = -1;
  for (let i = from; i < tokens.length; i++) {
    if (tokens[i].text === open) {
      openAt = i;
      break;
    }
    // 只允许跳过同类定界符字符，别跨过实义内容
    if (tokens[i].text.length !== 1 || (OPENERS[tokens[i].text] === undefined && CLOSERS[tokens[i].text] === undefined)) return undefined;
  }
  if (openAt < 0) return undefined;
  let depth = 0;
  for (let i = openAt; i < tokens.length; i++) {
    const t = tokens[i].text;
    if (t === open) depth++;
    else if (t === OPENERS[open]) {
      depth--;
      if (depth === 0) return { openPos: tokens[openAt].pos, closeEnd: tokens[i].end, after: i + 1 };
    }
  }
  return undefined;
}

/** 一个单元在源码里的区间（取它所有**后代叶子**的最小 / 最大位置）。 */
function spanOf(node, posOf) {
  let start = Infinity;
  let end = -Infinity;
  for (const d of descendants(node)) {
    const p = posOf.get(d);
    if (p === undefined) continue;
    if (p.start < start) start = p.start;
    if (p.end > end) end = p.end;
  }
  return start === Infinity ? undefined : { start, end };
}

// ---------------------------------------------------------------------------
// 判据：括号配对的包含关系
// ---------------------------------------------------------------------------

/**
 * 产物里**一个单元 = 一对括号**的标签。
 *
 * 两类：literal 括号（`Bracket` / `ObjectLiteral` / …）与**块体**（`*Body` / `IfStatement`…）。
 * `Root` 不在此列：它对应文件本身，没有括号。
 */
const BRACKET_TAGS = new Set([
  "Bracket", "ObjectLiteral", "ArrayLiteral", "Decorator", "NewArguments", "Signature", "LamdaParameters",
  "ClassBody", "InterfaceBody", "NamespaceBody", "EnumBody", "TypeLiteralBody",
  "FunctionBody", "MethodBody", "LamdaBody", "GetAccessorBody", "SetAccessorBody",
  "ForBody", "ForeachBody", "WhileBody", "DoWhile", "IfStatement", "SwitchStatement",
  "SwitchSegment", "TryBody", "CatchBody", "FinallyBody", "NewArguments",
]);

/**
 * 按树的**先序**把表示括号的单元落回源码的括号配对。
 *
 * 每一层认领「跨度上最贴合自己内容」的那一对括号：括号字符本身不是叶子
 * （`<Bracket>` 的 `{}` 不吐文本），所以要用**内容区间**反过来找：
 *
 *   - 开括号必须在第一个内容叶之前、且中间只有空白；
 *   - 闭括号必须在最后一个内容叶之后、且中间只有空白。
 *
 * 先序保证外层先认领，嵌套关系自然正确；认领不到就跳过（这个标签不是括号）。
 * 字符类型也要对得上：`ArrayLiteral` 只认 `[…]`，`Bracket` 看它的 `startBracket`。
 */
export function anchorBrackets(source, tree, located) {
  const delims = scanDelimiters(source);
  const { posOf } = located !== undefined ? located : locateLeaves(source, tree);
  const unmatched = located !== undefined ? located.total - located.matched : 0;
  const claimed = new Set();
  const anchors = [];
  const onlySpace = (from, to) => from >= to || /^\s*$/.test(source.slice(from, to));
  for (const node of walkXml(tree)) {
    if (!BRACKET_TAGS.has(node.name)) continue;
    const span = spanOf(node, posOf);
    if (span === undefined) continue;
    const want = allowedChars(node);
    let best;
    for (const d of delims) {
      if (claimed.has(d)) continue;
      if (want !== undefined && !want.has(d.char)) continue;
      if (d.pos > span.start || d.closePos < span.end) continue;
      if (!onlySpace(d.pos + 1, span.start)) continue;
      if (!onlySpace(span.end, d.closePos)) continue;
      if (best === undefined || d.pos > best.pos) best = d;
    }
    if (best === undefined) continue;
    claimed.add(best);
    anchors.push({ node, delim: best });
  }
  return { delims, anchors, unmatched };
}

/** 这个标签允许认领哪些开括号字符；`undefined` = 不限。 */
function allowedChars(node) {
  const explicit = leafBracketChars(node);
  if (explicit !== undefined) return new Set([explicit]);
  if (node.name === "ObjectLiteral") return new Set(["{", "Z"]);
  if (node.name === "ArrayLiteral") return new Set(["[", "A"]);
  return undefined;
}

/**
 * 不变量：两对括号在**源码文本**里是包含关系 ⇔ 它们在**产物树**里是祖先关系。
 *
 * 只比「产物里真的认领到括号」的那些单元，所以不依赖「哪个标签代表哪个括号」这一层
 * 映射；未认领的括号（例如本工程把 `(` `)` 收成 `SymbolToken`）不参与，不会误报。
 */
export function containmentProblems(anchors) {
  const bad = [];
  const list = anchors.anchors;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const aStart = a.delim.pos;
      const aEnd = a.delim.closePos;
      const bStart = b.delim.pos;
      const bEnd = b.delim.closePos;
      const sourceNested = aStart < bStart && bEnd < aEnd;
      const sourceReverse = bStart < aStart && aEnd < bEnd;
      if (!sourceNested && !sourceReverse) continue;
      // 一个单元只认领一对括号，所以 a.node !== b.node
      if (sourceNested && !isAncestor(a.node, b.node)) {
        bad.push(`源码 @${aStart} 的 ${a.delim.char}… 包含 @${bStart} 的 ${b.delim.char}…，产物里 <${a.node.name}> 不包含 <${b.node.name}>`);
      } else if (sourceReverse && !isAncestor(b.node, a.node)) {
        bad.push(`源码 @${bStart} 的 ${b.delim.char}… 包含 @${aStart} 的 ${a.delim.char}…，产物里 <${b.node.name}> 不包含 <${a.node.name}>`);
      }
    }
  }
  return bad;
}

function isAncestor(maybeAncestor, node) {
  let cur = node.parent;
  while (cur !== undefined) {
    if (cur === maybeAncestor) return true;
    cur = cur.parent;
  }
  return false;
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

export function parseWith(source, file) {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(template);
  context.Process(document);
  return context.Root.ToString();
}

/**
 * 自检：把产物树故意改坏，尺子必须报警。
 *
 * 一个「永远是绿的」尺子比没有尺子更危险，所以这里用**变异测试**证明它有牙：
 * 取一批文件，对每个文件的产物做几种结构破坏，要求 `containmentProblems` 至少抓到一种。
 *
 *   - **换括号对**：把两对括号的叶子内容整体交换（等于把括号配错）；
 *   - **外提**：把一对嵌套括号的后代搬到它前面的兄弟位置（等于把内容挪出括号）。
 *
 * 破坏是在 **XML 文本**层做的（按标签位置重排片段），所以不需要理解语义。
 */
function selfTest() {
  const samples = [
    "tests/parse/cases/declarations/decl-func-basic.ts",
    "tests/parse/cases/declarations/cls-basic.ts",
    "tests/parse/cases/statements/stmt-if-else.ts",
    "tests/parse/cases/expressions/expr-precedence-arith.ts",
    "samples/hello.ts",
  ];
  let failures = 0;
  for (const rel of samples) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    let xml;
    try {
      xml = parseWith(source, file);
    } catch {
      continue;
    }
    const baseTree = parseXml(xml);
    const base = containmentProblems(anchorBrackets(source, baseTree));
    if (base.length > 0) {
      console.log(`  自检失败（干净产物就报错）：${rel}`);
      failures++;
      continue;
    }
    // 变异一：把两个 ObjectLiteral 的内容互换
    const mutated = mutateSwap(xml);
    if (mutated !== null) {
      try {
        const tree = parseXml(mutated);
        const bad = containmentProblems(anchorBrackets(source, tree));
        if (bad.length === 0) {
          console.log(`  自检失败（换括号对没抓到）：${rel}`);
          failures++;
        }
      } catch {
        /* 变异把 XML 改坏了也算抓到 */
      }
    }
  }
  return failures;
}

/** 把 XML 里前两个 `<ObjectLiteral>` 的内容互换，用来验证「括号配错」能被抓到。 */
function mutateSwap(xml) {
  const spans = [];
  const re = /<ObjectLiteral>([\s\S]*?)<\/ObjectLiteral>/g;
  let m;
  while ((m = re.exec(xml)) !== null) spans.push({ start: m.index, end: re.lastIndex, inner: m[1] });
  if (spans.length < 2) return null;
  const [a, b] = spans;
  return xml.slice(0, a.start) + `<ObjectLiteral>${b.inner}</ObjectLiteral>` + xml.slice(a.end, b.start) + `<ObjectLiteral>${a.inner}</ObjectLiteral>` + xml.slice(b.end);
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 40;
  const jsonAt = args.indexOf("--json");
  const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : null;

  const files = corpus(mode);
  const problems = [];
  const skipped = [];
  const groups = new Map();
  let parsed = 0;
  let failed = 0;
  let checked = 0;
  let unlocated = 0;
  const MIN_RATE = 0.6;

  if (args.includes("--self-test")) {
    const bad = selfTest();
    console.log(bad === 0 ? "自检通过：故意改坏的产物都被抓到了。" : `自检失败 ${bad} 项。`);
    process.exitCode = bad === 0 ? 0 : 1;
    return;
  }

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      xml = parseWith(source, file);
    } catch (e) {
      failed++;
      problems.push({ file: path.relative(root, file), kind: "THROW", message: String(e && e.message).split("\n")[0] });
      groups.set("THROW", (groups.get("THROW") || 0) + 1);
      continue;
    }
    parsed++;
    let anchors;
    let loc;
    try {
      const tree = parseXml(xml);
      loc = locateLeaves(source, tree);
      anchors = anchorBrackets(source, tree, loc);
    } catch (e) {
      problems.push({ file: path.relative(root, file), kind: "XML", message: String(e.message).split("\n")[0] });
      groups.set("malformed-xml", (groups.get("malformed-xml") || 0) + 1);
      continue;
    }
    // 对齐不可信就**跳过**这个文件：宁可少查，也不能拿错的对齐去报假缺口。
    if (loc.rate < MIN_RATE) {
      skipped.push({ file: path.relative(root, file), rate: loc.rate });
      continue;
    }
    checked++;
    unlocated += loc.total - loc.matched;
    const bad = containmentProblems(anchors);
    if (bad.length > 0) {
      problems.push({ file: path.relative(root, file), kind: "NEST", message: bad[0], count: bad.length });
      const key = `NEST: ${bad[0].replace(/@\d+/g, "@N").slice(0, 100)}`;
      groups.set(key, (groups.get(key) || 0) + 1);
    }
  }

  const nestedFiles = new Set(problems.filter((p) => p.kind === "NEST").map((p) => p.file));
  console.log(
    `结构尺子：语料 ${files.length} 个文件，解析成功 ${parsed}，抛异常 ${failed}，对齐不可信跳过 ${skipped.length}\n` +
      `         实际检查 ${checked} 个文件，括号归属不符 ${nestedFiles.size} 个（未定位叶子 ${unlocated} 个）\n`,
  );
  if (skipped.length > 0) {
    console.log("对齐不可信（匹配率 < " + MIN_RATE + "）的文件：");
    for (const s of skipped.slice(0, 20)) console.log(`  ${s.file}  rate=${s.rate.toFixed(2)}`);
    console.log("");
  }
  if (groups.size === 0) {
    console.log("所有文件的括号包含关系与源码一致。");
  } else {
    console.log("按形状聚合：");
    for (const [key, count] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) {
      console.log(`  ${String(count).padStart(5)}  ${key}`);
    }
    console.log("\n样本：");
    for (const p of problems.slice(0, 60)) console.log(`  ${p.file}  [${p.kind}] ${p.message}`);
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({ problems, groups: Object.fromEntries(groups) }, null, 1), "utf8");
    console.log(`\n完整结果 → ${jsonPath}`);
  }

  process.exitCode = problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
