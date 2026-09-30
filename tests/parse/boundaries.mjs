// 语句边界尺子：TS 认为是两条语句的地方，产物里是不是也断成了两个单元。
//
//   node tests/parse/boundaries.mjs            跑真实语料 + 用例语料
//   node tests/parse/boundaries.mjs cases      只跑用例
//   node tests/parse/boundaries.mjs --top 20
//   node tests/parse/boundaries.mjs --file <路径>
//
// 为什么还要这一把：其他尺子都对**语句边界**不敏感。
//   differential / gap-dashboard  数的是标签个数——两条语句合成一条，标签还在，数不变
//   lossless                      名字都在，只是换了个父亲
//   structure                     只查括号包含关系；`return\n-1` 的两侧括号关系恰好没变
//
// 判据（对着 TypeScript 自己的 AST）：
//
//   取任意一个语句表（SourceFile 顶层 / Block / ModuleBlock / CaseClause / ClassStaticBlock…），
//   里面相邻的两条语句 S1、S2 之间有一个边界位置 B = S2 的起点。
//   产物里**不应该**存在一个「语句级单元」横跨 B：
//   横跨就说明两条 TS 语句被读成了一条（ASI 没做，或者别的合并）。
//
// 「语句级单元」= 不是容器标签、且拥有自己叶子的产物元素。
// 容器标签（Root / \*Body / Bracket / ObjectLiteral…）本来就该横跨，全部排除。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";
import { parseXml, walkXml, locateLeaves, scanTokens, scanComments, unescapeXml } from "./structure.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

/** 本来就该横跨语句边界的容器标签。 */
const CONTAINER_TAGS = new Set([
  "Root",
  "ClassBody", "InterfaceBody", "NamespaceBody", "EnumBody", "TypeLiteralBody",
  "FunctionBody", "MethodBody", "LamdaBody", "GetAccessorBody", "SetAccessorBody",
  "ForBody", "ForeachBody", "WhileBody", "DoWhile",
  "IfStatement", "SwitchStatement", "SwitchSegment", "SwitchCase", "SwitchCompare",
  "TryBody", "CatchBody", "FinallyBody", "CatchDefine",
  "Bracket", "ObjectLiteral", "ArrayLiteral", "NewArguments", "Decorator",
  "GenericType", "Signature", "LamdaParameters", "LamdaParameter",
  "IfSet", "IfSegment", "IfCondition",
  "Class", "Interface", "Namespace", "Enum", "Function", "MethodDeclaration",
  "Method", "TypeAssign", "TypeDefine", "As", "New", "NewType",
  "BinaryOperator", "UnaryOperator", "LogicalOperator", "NotNull",
  "TernaryOperator", "TernaryOperatorCondition", "TernaryOperatorTrueStatement", "TernaryOperatorFalseStatement",
  "Spread", "NullConditionalOperator", "CompoundAssignmentOperator", "RegexToken",
  "Switch", "SwitchCase",
  "For", "ForInitial", "ForCompare", "ForNext",
  "Foreach", "ForeachDefine", "ForeachEnumable",
  "While", "WhileCompare", "Try", "DoWhile",
  "String", "InterpolationString", "ConstString",
]);

/**
 * 产物叶子 → 源码位置的**保守**定位。
 *
 * `structure.mjs` 的 `locateLeaves` 从左往右贪心，遇到「源码里有、产物里没有叶子的 token」
 * （声明名、修饰词——它们被存进了属性）会就地跳过，于是重复名字（`let r;` 换行 `r = ...`）
 * 会让后一个 `r` 的叶子被贴到前一个 `r` 上，**整体前移一格**。
 *
 * 这里再加一遍**从右往左**的贪心，只保留两次结果一致的叶子。
 * 上面那个例子里，左贪心给 @100、右贪心给 @103，不一致 → 丢弃这个叶子，
 * 边界就判不了而不是报假缺口。**宁可少查，也不要拿错的对齐去报假缺口。**
 *
 * 右往左那一遍**也要认复合 token**（`+=` 在产物里是 `=` 与 `+` 两个叶子、顺序还相反）：
 * 只在逐字相同的 token 上对账的话，`a >>= b;` 这类行会整段没有第二个意见，
 * 左贪心贴错一格就没人纠正（实测：那会凭空报出一个跨行的假缺口）。
 */

/** 字符多重集：`Map<char, 次数>`。 */
function countChars(text) {
  const counts = new Map();
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1);
  return counts;
}

/** 用一个叶子的原文去冲抵累积器里的字符；字符不够就返回 `false` 且不做修改。 */
function takeChars(acc, text) {
  const counts = acc.counts;
  for (const ch of text) {
    if ((counts.get(ch) || 0) === 0) return false;
  }
  for (const ch of text) counts.set(ch, counts.get(ch) - 1);
  acc.left -= text.length;
  return true;
}

function locateLeavesStrict(source, tree) {
  const base = locateLeaves(source, tree);
  const tokens = scanTokens(source);

  const leaves = [];
  (function visit(node) {
    if (node.selfClosing) return;
    if (node.children.length === 0) {
      leaves.push(node);
      return;
    }
    for (const c of node.children) visit(c);
  })(tree);

  const SKIP_TAGS = new Set(["LineAnnotation", "AreaAnnotation"]);
  const right = new Map();
  let cursor = tokens.length - 1;
  let pending = null; // 复合 token 的累积器：{ counts, left }
  for (let i = leaves.length - 1; i >= 0; i--) {
    const node = leaves[i];
    if (SKIP_TAGS.has(node.name)) continue;
    const text = unescapeXml(node.text);
    if (text === "") continue;
    let hit = -1;
    // 复合 token（`<<=` → 叶子 `=` + `<<`，且**顺序与源码相反**）必须按字符多重集累积，
    // 否则这一遍会在复合 token 上直接放弃、给不出第二个意见，贴错的叶子就溜过去了。
    if (pending !== null) {
      hit = cursor;
      takeChars(pending, text);
      if (pending.left <= 0) pending = null;
    }
    if (hit < 0 && cursor >= 0 && tokens[cursor].text === text) {
      hit = cursor;
      pending = null;
    }
    if (hit < 0 && cursor >= 0) {
      const acc = { counts: countChars(tokens[cursor].text), left: tokens[cursor].text.length };
      if (takeChars(acc, text) && acc.left > 0) {
        pending = acc;
        hit = cursor;
      }
    }
    if (hit < 0) {
      // 兜底：往回找一个逐字相同的 token，只允许跳过单字符定界符，不跨过实义内容。
      for (let k = cursor; k >= 0; k--) {
        const t = tokens[k];
        if (t.text === text) {
          hit = k;
          break;
        }
        if (t.text.length > 1) break;
      }
    }
    if (hit < 0) continue;
    right.set(node, { start: tokens[hit].pos, end: tokens[hit].end });
    // 复合 token 还没凑完（`pending` 还在）时游标不动——同一个 token 还要被别的叶子认领。
    if (pending === null) cursor = hit - 1;
  }

  // 只统计**两遍都定位到**的叶子：`rate` 是它们的一致率，不是覆盖率。
  // 覆盖率天生低（右往左那一遍碰到复合 token 就停），拿覆盖率当门槛会把绝大多数文件误杀。
  //
  // `posOf` 里**丢掉两遍不一致**的那些叶子：不一致说明至少有一遍贴错了，
  // 而错的那个位置正是「假缺口」的来源（实测：`expr-compound-assign-all.ts` 里
  // `a >>= b;` 的叶子被左贪心往后贴了一格，凭空造出一个跨行的单元）。
  // 只有一遍定位到、另一遍根本没走到的叶子保留左贪心的结果——那种情况没有第二个意见。
  let doubly = 0;
  let agree = 0;
  const posOf = new Map();
  for (const [node, p] of base.posOf) {
    const r = right.get(node);
    if (r === undefined) {
      posOf.set(node, p);
      continue;
    }
    doubly++;
    if (r.start === p.start && r.end === p.end) {
      agree++;
      posOf.set(node, p);
    }
  }
  return { posOf, agree, doubly, total: leaves.length, rate: doubly === 0 ? 1 : agree / doubly };
}

function parseWith(source, file) {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(template);
  context.Process(document);
  return context.Root.ToString();
}

/** TS 侧：所有语句表。返回 [{ list: stmt[], owner }]。 */
function statementLists(sf) {
  const lists = [];
  const visit = (node) => {
    const statements = ts.isSourceFile(node)
      ? node.statements
      : ts.isBlock(node)
        ? node.statements
        : ts.isModuleBlock(node)
          ? node.statements
          : ts.isCaseClause(node) || ts.isDefaultClause(node)
            ? node.statements
            : ts.isClassStaticBlockDeclaration(node)
              ? node.body.statements
              : undefined;
    if (statements !== undefined) lists.push({ list: statements, owner: node });
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return lists;
}

/** 每个产物元素在源码里的区间（取后代叶子的最小 / 最大位置）。 */
function spansOf(tree, posOf) {
  const spans = new Map();
  const compute = (node) => {
    let start = Infinity;
    let end = -Infinity;
    for (const c of node.children) {
      const s = compute(c);
      if (s === undefined) continue;
      if (s.start < start) start = s.start;
      if (s.end > end) end = s.end;
    }
    const own = posOf.get(node);
    if (own !== undefined) {
      if (own.start < start) start = own.start;
      if (own.end > end) end = own.end;
    }
    if (start === Infinity) return undefined;
    const span = { start, end };
    spans.set(node, span);
    return span;
  };
  compute(tree);
  return spans;
}

const problems = [];
let checkedFiles = 0;
let skippedFiles = 0;
let listCount = 0;
let boundaryCount = 0;

/**
 * 核心判据：给定源码与产物树，返回被横跨的语句边界。
 *
 * 单独抽出来是为了让 `--self-test` 能在**同一段源码**上喂一棵故意改坏的树，
 * 从而证明这条判据不是永远为真。
 */
function findMergedBoundaries(source, tree, file) {
  const loc = locateLeavesStrict(source, tree);
  if (loc.rate < 0.6) return { skipped: true, bad: [], loc };
  const spans = spansOf(tree, loc.posOf);

  // 已定位的叶子按源码位置排序，用来给「S1 的第一个叶子」快速定位。
  const leaves = [];
  for (const [node, p] of loc.posOf) leaves.push({ node, start: p.start, end: p.end });
  leaves.sort((a, b) => a.start - b.start);

  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bad = [];
  for (const { list } of statementLists(sf)) {
    if (list.length < 2) continue;
    listCount++;
    for (let i = 0; i + 1 < list.length; i++) {
      const next = list[i + 1];
      const B = next.getStart(sf);
      boundaryCount++;
      // S1 的第一个**已定位**叶子；它必须在 B 之前，否则这条边界判不了（S1 没有叶子）
      let lo = 0;
      let hi = leaves.length;
      const start1 = list[i].getStart(sf);
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (leaves[mid].start < start1) lo = mid + 1;
        else hi = mid;
      }
      const first = leaves[lo];
      if (first === undefined || first.start >= B) continue;
      // 从那个叶子往上走：**最先**结束位置越过 B 的那个祖先就是「装 S1 的语句级单元」。
      // 它是容器（Root / *Body / Bracket…）就说明边界本来就在容器里，不是合并。
      let cur = first.node;
      let culprit = null;
      while (cur !== undefined) {
        const span = spans.get(cur);
        if (span !== undefined && span.end >= B && cur.name !== "#root") {
          culprit = cur;
          break;
        }
        cur = cur.parent;
      }
      if (culprit === null || CONTAINER_TAGS.has(culprit.name)) continue;
      if (process.env.XL_BOUNDARY_DEBUG === "1") {
        console.error(
          `[boundary] @${B} S1=${JSON.stringify(source.slice(start1, Math.min(B, start1 + 30)))} ` +
            `firstLeaf=${JSON.stringify(source.slice(first.start, first.end))}@${first.start} culprit=<${culprit.name}> ` +
            `span=${JSON.stringify(spans.get(culprit))} parent=<${culprit.parent ? culprit.parent.name : "-"}>`,
        );
      }
      const text = (n) => `<${n.name}${n.attrs.op !== undefined ? " op=" + n.attrs.op : ""}>`;
      bad.push({
        at: B,
        from: source.slice(list[i].getStart(sf), Math.min(B, list[i].getStart(sf) + 40)).replace(/\s+/g, " "),
        to: source.slice(B, Math.min(next.getEnd(), B + 40)).replace(/\s+/g, " "),
        nodes: [text(culprit)],
      });
    }
  }
  return { skipped: false, bad, loc };
}

function checkFile(file, source) {
  const rel = path.relative(root, file);
  let xml;
  try {
    xml = parseWith(source, file);
  } catch (e) {
    problems.push({ file: rel, kind: "THROW", message: String(e && e.message).split("\n")[0] });
    return;
  }
  let result;
  try {
    result = findMergedBoundaries(source, parseXml(xml), file);
  } catch (e) {
    problems.push({ file: rel, kind: "XML", message: String(e.message).split("\n")[0] });
    return;
  }
  if (result.skipped) {
    skippedFiles++;
    return;
  }
  checkedFiles++;
  if (result.bad.length > 0) problems.push({ file: rel, kind: "MERGE", count: result.bad.length, samples: result.bad.slice(0, 3) });
}

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

/**
 * 自检：**故意把两条语句并成一条**，尺子必须报警。
 *
 * 做法是在 XML 文本层把 `Root` 下**相邻的两个** `<Statement>` 合成一个
 * （去掉中间那对 `</Statement>` 与 `<Statement>`）。这等价于「解析器把两条语句读成了一条」，
 * 正是本尺子要抓的形状，而且不需要理解语义。
 *
 * 逐个候选位置试：只要有**一个**变异被抓到，就证明这条判据在这个文件上有牙。
 * 全都抓不到才算失败——一个永远绿的尺子比没有尺子更危险（`structure.mjs` 有同样的自检）。
 */
function selfTest() {
  const samples = [
    "tests/parse/cases/statements/stmt-let-multi.ts",
    "tests/parse/cases/declarations/cls-basic.ts",
    "tests/parse/cases/statements/stmt-if-else.ts",
    "samples/hello.ts",
  ];
  let failures = 0;
  let tried = 0;
  for (const rel of samples) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let xml;
    try {
      xml = parseWith(source, file);
    } catch {
      continue;
    }
    const variants = mergeVariants(xml);
    if (variants.length === 0) continue;
    tried++;
    let caught = false;
    for (const mutated of variants) {
      let bad;
      try {
        bad = findMergedBoundaries(source, parseXml(mutated), file);
      } catch {
        caught = true; // 变异把 XML 弄坏了也算抓到
        break;
      }
      if (!bad.skipped && bad.bad.length > 0) {
        caught = true;
        break;
      }
    }
    if (!caught) {
      console.log(`  自检失败（合并相邻两条语句没被抓到）：${rel}`);
      failures++;
    }
  }
  if (tried === 0) {
    console.log("  自检失败（没有一个样本能被变异）");
    failures++;
  }
  return failures;
}

/** 把 `Root` 下相邻的两个 `<Statement>` 合成一个，返回全部候选（每个位置一份）。 */
function mergeVariants(xml) {
  const tree = parseXml(xml);
  // `parseXml` 顶层是一个合成的 `#root`，真正的 `<Root>` 是它的第一个子元素。
  const rootElement = tree.children.find((c) => c.name === "Root") ?? tree;
  const statements = rootElement.children.filter((c) => c.name === "Statement");
  const out = [];
  const OPEN = "<Statement>".length;
  const CLOSE = "</Statement>".length;
  for (let k = 0; k + 1 < statements.length; k++) {
    const a = statements[k];
    const b = statements[k + 1];
    out.push(xml.slice(0, a.closeAt - CLOSE) + xml.slice(b.openAt + OPEN));
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const top = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : 20;
  const at = args.indexOf("--file");
  const only = at >= 0 ? [path.resolve(args[at + 1])] : null;

  if (args.includes("--self-test")) {
    const bad = selfTest();
    console.log(bad === 0 ? "自检通过：故意合并的语句都被抓到了。" : `自检失败 ${bad} 项。`);
    process.exitCode = bad === 0 ? 0 : 1;
    return;
  }

  const files = only !== null ? only : corpus(mode);
  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    checkFile(file, source);
  }

  const merges = problems.filter((p) => p.kind === "MERGE");
  console.log(
    `语句边界尺子：语料 ${files.length} 个文件，检查 ${checkedFiles}，对齐不可信跳过 ${skippedFiles}\n` +
      `             语句表 ${listCount} 个、边界 ${boundaryCount} 处，边界被横跨 ${merges.length} 处（${merges.length ? merges.length : 0} 个文件）\n`,
  );
  if (merges.length === 0) {
    console.log("所有语句边界与 TypeScript 一致。");
  } else {
    console.log("按横跨单元聚合：");
    const groups = new Map();
    for (const p of merges) {
      for (const s of p.samples) {
        const key = s.nodes.join("+");
        groups.set(key, (groups.get(key) || 0) + 1);
      }
    }
    for (const [k, v] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`  ${String(v).padStart(5)}  ${k}`);
    console.log("\n样本：");
    for (const p of merges.slice(0, top)) {
      const s = p.samples[0];
      console.log(`  ${p.file}  (${p.count} 处)  例: 「${s.from}」⏎「${s.to}」  被 ${s.nodes.join(" ")} 横跨`);
    }
  }
  const other = problems.filter((p) => p.kind !== "MERGE");
  if (other.length > 0) {
    console.log(`\n其他问题 ${other.length} 个：`);
    for (const p of other.slice(0, top)) console.log(`  ${p.file} [${p.kind}] ${p.message}`);
  }
  process.exitCode = problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main();
}
