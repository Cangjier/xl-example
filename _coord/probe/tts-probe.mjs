// P5 侦察探针（只读：不改任何实现源码，只 monkey-patch 已编译的 build/ts 原型/静态方法）
//
// 用法：
//   node _coord/probe/tts-probe.mjs                    # 全量 success（302）出 JSON + 摘要
//   node _coord/probe/tts-probe.mjs --dir todo         # 换目录
//   node _coord/probe/tts-probe.mjs --label base       # 指纹文件 _coord/probe/fp-<label>.json
//   node _coord/probe/tts-probe.mjs --compare a b      # 比较两份指纹，只报差异 id
//
// 测四件事：
//   1) 兜底调用：TypeParserApi.ParseAlias / ParseCompleteReturnType（及同族静态方法）每条 case 的次数 + 调用点
//   2) 兜底 case 的类型形式分布（用 typescript 自己的 AST 分类，不靠猜）
//   3) 基线：IdentifierShape 的 CreatedAt - SourceRange.Start 直方图；>2 的名单
//   4) 逐字树指纹：每个字符推进后的 ToAstLine 全树哈希（用于证明「只影响目标用例」）
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const CASES = path.join(ROOT, "typescript", "cases", "tts");
const ts = require(path.join(ROOT, "node_modules", "typescript"));

const P = (...seg) => path.join(BUILD, ...seg);
const { SyntaxContext } = require(P("core", "syntax", "syntax-context.js"));
const { SourceRange } = require(P("core", "syntax", "source-range.js"));
const { TextDocument } = require(P("typescript", "run", "text-document.js"));
const { TypescriptTemplate } = require(P("typescript", "run", "typescript-template.js"));
const { SourceFileShape } = require(P("typescript", "shapes", "files", "source-file-shape.js"));
const { TypeParserApi } = require(P("typescript", "shapes", "types", "type-parser-api.js"));

// ---------------------------------------------------------------- 探针装配
const API_NAMES = [
  "ParseAlias",
  "ParseCompleteType",
  "ParseCompleteReturnType",
  "ParseParameterPrefix",
  "ParseTypeParameterList",
  "ParseTypeParameterOnly",
  "ParseTypeParameterTail",
  "ParseTypeArgumentTail",
  "ParseEntityNamePrefix",
];
const FALLBACK_APIS = new Set(["ParseAlias", "ParseCompleteReturnType"]);

let current = null; // 当前 case 的采集槽

for (const name of API_NAMES) {
  const original = TypeParserApi[name];
  if (typeof original !== "function") {
    console.error(`[probe] 缺少静态方法 TypeParserApi.${name}`);
    process.exit(2);
  }
  TypeParserApi[name] = function patched(...args) {
    if (current !== null) {
      current.api[name] = (current.api[name] ?? 0) + 1;
      if (FALLBACK_APIS.has(name)) {
        // 只对兜底调用抓栈：调用点决定它属于「Close 全量兜底」还是「终结候选兜底」。
        const stack = new Error().stack ?? "";
        const sites = [];
        if (stack.includes("type-alias-declaration-shape")) sites.push("TypeAliasDeclarationShape.Close");
        if (stack.includes("type-alias-end-possible-shape")) sites.push("TypeAliasEndPossibleShape.BuildByIndex");
        if (stack.includes("type-function-incremental")) sites.push("TypeFunctionIncremental");
        if (stack.includes("type-alias-grow-util")) sites.push("TypeAliasGrow.Finish");
        const key = sites.length > 0 ? sites.join("+") : "unknown";
        current.sites[key] = (current.sites[key] ?? 0) + 1;
      }
    }
    return original.apply(this, args);
  };
}

// ---------------------------------------------------------------- 类型形式分类（ts AST，权威）
const FORM_OF_KIND = new Map([
  ["UnionType", "union"],
  ["IntersectionType", "intersection"],
  ["ParenthesizedType", "parenthesized"],
  ["TupleType", "tuple"],
  ["NamedTupleMember", "named-tuple"],
  ["TypeLiteral", "object-literal"],
  ["MappedType", "mapped"],
  ["TemplateLiteralType", "template-literal"],
  ["TemplateLiteralTypeSpan", "template-literal"],
  ["FunctionType", "function"],
  ["ConstructorType", "constructor"],
  ["ConditionalType", "conditional"],
  ["IndexedAccessType", "indexed-access"],
  ["ArrayType", "array"],
  ["TypeOperator", "type-operator"],
  ["TypeQuery", "type-query"],
  ["ImportType", "import-type"],
  ["LiteralType", "literal"],
  ["TypeReference", "type-reference"],
  ["QualifiedName", "qualified-name"],
  ["TypeParameterDeclaration", "type-parameters"],
  ["InferType", "infer"],
  ["TypePredicate", "predicate"],
  ["OptionalType", "optional-type"],
  ["RestType", "rest-type"],
  ["ThisType", "this-type"],
  ["TypeParameterInstantiation", "type-arguments"],
]);

function classifyForms(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const forms = new Set();
  const walk = (node) => {
    const raw = ts.SyntaxKind[node.kind];
    const form = FORM_OF_KIND.get(raw);
    if (form !== undefined) forms.add(form);
    node.forEachChild(walk);
  };
  sf.forEachChild(walk);
  return [...forms].sort();
}

// ---------------------------------------------------------------- 逐字树指纹
function treeText(shape) {
  try {
    return shape.ToAstLine(0);
  } catch {
    return "";
  }
}

function fingerprintOf(source, name) {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 32);
  const document = new TextDocument(source, name);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  const chain = crypto.createHash("sha1");
  let lines = 0;
  const perChar = [];
  for (let index = 0; index < count; index++) {
    context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
    const text = treeText(root);
    lines += text.split("\n").length;
    chain.update(`${index}\u0000${text}\u0001`);
    perChar.push(crypto.createHash("sha1").update(text).digest("hex").slice(0, 8));
  }
  context.Index = count;
  root.SignOut(count);
  context.ProcessRange(root, new SourceRange(document, count, count), count);
  const eofText = treeText(root);
  chain.update(`EOF\u0000${eofText}\u0001`);
  return { fingerprint: chain.digest("hex"), chars: count, astLines: lines + eofText.split("\n").length, perChar, eofText };
}

// ---------------------------------------------------------------- 单条 case 采集
const IDENT_STATS = [];
function collectIdentifiers(shape, rel, out) {
  const name = shape.constructor?.name ?? "";
  if (name === "IdentifierShape") {
    const start = shape.SourceRange?.Start ?? -1;
    const createdAt = shape.CreatedAt;
    const rev = shape.CreatedRevisionAt;
    const created = rev >= 0 ? rev : createdAt;
    out.push({ rel, pos: shape.Pos, start, created, createdAt, rev, delta: created - start, deltaRaw: createdAt - start });
  }
  for (const child of shape.Data ?? []) collectIdentifiers(child, rel, out);
}

function walkShapes(shape, fn) {
  fn(shape);
  for (const child of shape.Data ?? []) walkShapes(child, fn);
}

function probeCase(file) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const short = path.relative(CASES, file).replace(/\\/g, "/");

  // 纯解析（探针采集窗口）
  current = { api: {}, sites: {} };
  let root = null;
  let error = null;
  try {
    const template = TypescriptTemplate.Create();
    root = new SourceFileShape(template);
    const context = new SyntaxContext(root, 32);
    const document = new TextDocument(source, path.basename(file));
    SourceRange.CurrentDocument = document;
    context.CurrentDocument = document;
    const count = document.GetCount();
    for (let index = 0; index < count; index++) {
      context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
    }
    context.Index = count;
    root.SignOut(count);
    context.ProcessRange(root, new SourceRange(document, count, count), count);
  } catch (e) {
    error = String(e?.Message ?? e?.message ?? e).split("\n")[0];
  }
  const api = current.api;
  const sites = current.sites;
  current = null;

  const ids = [];
  if (root !== null) collectIdentifiers(root, short, ids);
  for (const item of ids) IDENT_STATS.push(item);

  const kinds = new Map();
  if (root !== null) {
    walkShapes(root, (s) => {
      const k = s.constructor?.name ?? "?";
      kinds.set(k, (kinds.get(k) ?? 0) + 1);
    });
  }

  let fp = null;
  if (error === null) {
    try {
      fp = fingerprintOf(source, path.basename(file));
    } catch (e) {
      fp = null;
    }
  }

  const fallback = (api.ParseAlias ?? 0) + (api.ParseCompleteReturnType ?? 0);
  return {
    id: short,
    rel,
    api,
    sites,
    fallback,
    error,
    forms: classifyForms(source, path.basename(file)),
    chars: source.length,
    fingerprint: fp?.fingerprint ?? null,
    perChar: fp?.perChar ?? null,
    astLines: fp?.astLines ?? 0,
    nodeKinds: Object.fromEntries([...kinds.entries()].sort()),
    identifiers: ids.length,
  };
}

// ---------------------------------------------------------------- 目录遍历
function collect(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) out.push(full);
    }
  };
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) return [dir];
  walk(dir);
  return out;
}

// ---------------------------------------------------------------- 指纹比对
function compare(aPath, bPath) {
  const a = JSON.parse(fs.readFileSync(aPath, "utf8"));
  const b = JSON.parse(fs.readFileSync(bPath, "utf8"));
  const ids = new Set([...Object.keys(a.cases), ...Object.keys(b.cases)]);
  const changed = [];
  const added = [];
  const removed = [];
  for (const id of [...ids].sort()) {
    const x = a.cases[id];
    const y = b.cases[id];
    if (x === undefined) added.push(id);
    else if (y === undefined) removed.push(id);
    else if (x.fingerprint !== y.fingerprint) {
      const at = [];
      const n = Math.max(x.perChar?.length ?? 0, y.perChar?.length ?? 0);
      for (let i = 0; i < n; i++) {
        if ((x.perChar?.[i] ?? "-") !== (y.perChar?.[i] ?? "-")) at.push(i);
      }
      changed.push({ id, firstChar: at[0] ?? null, chars: at.length });
    }
  }
  console.log(JSON.stringify({ changed, added, removed, same: ids.size - changed.length - added.length - removed.length }, null, 2));
  return 0;
}

// ---------------------------------------------------------------- main
function main(argv) {
  if (argv[0] === "--compare") return compare(argv[1], argv[2]);

  const dirArg = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : "success";
  const label = argv.includes("--label") ? argv[argv.indexOf("--label") + 1] : "base";
  const target = path.isAbsolute(dirArg) ? dirArg : path.join(CASES, dirArg);
  const files = collect(target);

  const cases = {};
  const rows = [];
  for (const file of files) {
    const row = probeCase(file);
    rows.push(row);
    cases[row.id] = {
      fallback: row.fallback,
      api: row.api,
      sites: row.sites,
      forms: row.forms,
      chars: row.chars,
      fingerprint: row.fingerprint,
      perChar: row.perChar,
      error: row.error,
    };
    if (row.fallback > 0) {
      console.log(
        `[FALLBACK] ${row.id}  ParseAlias=${row.api.ParseAlias ?? 0} ParseCompleteReturnType=${row.api.ParseCompleteReturnType ?? 0}  sites=${JSON.stringify(row.sites)}`,
      );
    }
    if (row.error !== null) console.log(`[ERROR] ${row.id}: ${row.error}`);
  }

  const fallbackRows = rows.filter((r) => r.fallback > 0);
  const cleanRows = rows.filter((r) => r.fallback === 0 && r.error === null);

  // 形式分布（只在兜底集合内统计）
  const formCount = new Map();
  for (const r of fallbackRows) {
    for (const f of r.forms) formCount.set(f, (formCount.get(f) ?? 0) + 1);
  }
  const formRanked = [...formCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // Identifier 基线
  const deltaHist = new Map();
  const deltaRawHist = new Map();
  for (const item of IDENT_STATS) {
    deltaHist.set(item.delta, (deltaHist.get(item.delta) ?? 0) + 1);
    deltaRawHist.set(item.deltaRaw, (deltaRawHist.get(item.deltaRaw) ?? 0) + 1);
  }
  const over2 = IDENT_STATS.filter((i) => i.delta > 2);
  const over2Raw = IDENT_STATS.filter((i) => i.deltaRaw > 2);

  const outDir = HERE;
  fs.mkdirSync(outDir, { recursive: true });
  const fpPath = path.join(outDir, `fp-${label}.json`);
  fs.writeFileSync(
    fpPath,
    JSON.stringify(
      {
        label,
        dir: path.relative(ROOT, target).replace(/\\/g, "/"),
        generatedAt: new Date().toISOString(),
        caseCount: rows.length,
        cases,
      },
      null,
      0,
    ),
    "utf8",
  );

  const report = {
    label,
    dir: path.relative(ROOT, target).replace(/\\/g, "/"),
    caseCount: rows.length,
    fallbackCount: fallbackRows.length,
    cleanCount: cleanRows.length,
    fallbackIds: fallbackRows.map((r) => r.id),
    fallbackDetail: fallbackRows.map((r) => ({
      id: r.id,
      ParseAlias: r.api.ParseAlias ?? 0,
      ParseCompleteReturnType: r.api.ParseCompleteReturnType ?? 0,
      sites: r.sites,
      forms: r.forms,
      chars: r.chars,
    })),
    formDistribution: Object.fromEntries(formRanked),
    otherApiCalls: [...new Set(rows.flatMap((r) => Object.keys(r.api)))].sort(),
    identifierBaseline: {
      total: IDENT_STATS.length,
      deltaHistogram: Object.fromEntries([...deltaHist.entries()].sort((a, b) => a[0] - b[0])),
      deltaRawHistogram: Object.fromEntries([...deltaRawHist.entries()].sort((a, b) => a[0] - b[0])),
      over2Count: over2.length,
      over2RawCount: over2Raw.length,
      over2: over2.map((i) => `${i.rel}@pos${i.pos}[start=${i.start},created=${i.created}]`),
      over2Raw: over2Raw.map((i) => `${i.rel}@pos${i.pos}[start=${i.start},createdAt=${i.createdAt},rev=${i.rev}]`),
    },
    fingerprintPath: path.relative(ROOT, fpPath).replace(/\\/g, "/"),
  };
  const reportPath = path.join(outDir, `report-${label}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log(`[probe] dir=${report.dir}  case=${rows.length}`);
  console.log(`[probe] 走兜底（ParseAlias / ParseCompleteReturnType）= ${fallbackRows.length} 条；无兜底 = ${cleanRows.length} 条`);
  console.log(`[probe] 形式分布（兜底集合内，一 case 可多形式）：`);
  for (const [f, n] of formRanked) console.log(`         ${String(n).padStart(3)}  ${f}`);
  console.log(`[probe] IdentifierShape 共 ${IDENT_STATS.length}；CreatedAt-Start>2 有 ${over2.length} 条`);
  console.log(`[probe] 指纹 -> ${report.fingerprintPath}`);
  console.log(`[probe] 报告 -> ${path.relative(ROOT, reportPath).replace(/\\/g, "/")}`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
