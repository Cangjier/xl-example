// 多构造 AST 对拍：把 ast-json.mjs 写出的两份快照逐条比出 gap。
//
//   node typescript/cases/ast-json.mjs              # 1) 生成快照（默认全量）
//   node typescript/cases/ast-json-diff.mjs         # 2) 逐条对比（默认全量）
//   node typescript/cases/ast-json-diff.mjs export  # 只比指定构造（可给多个）
//
// 两份快照是「一行一个用例、同序」的（见 ast-json.mjs），所以按下标配对。
// 三栏分开报，因为它们是三种不同的修法：
//
//   结构   某类节点整个不见（或被凭空多出）——要补/收形状
//   位置   同一类的第 n 个节点两边都有，但区间不同——改 SignIn/SignOut 或 Pos
//   字段   text / name / isTypeOnly / attributes / namedBindings 不一致——改字段赋值
//
// 位置对比只在「该 kind 两边个数相同」时才配对（按前序第 n 个对第 n 个）：
// 个数不同说明结构已经不对，再按序号配只会把后面的节点错位成假漂移。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// 构造名 = 用例文件名去掉 .ts；目录里的 *.ts 就是全部可用构造。
function availableStems() {
  return fs
    .readdirSync(here)
    .filter((name) => name.endsWith(".ts") && fs.statSync(path.join(here, name)).isFile())
    .map((name) => name.slice(0, -3))
    .sort();
}

function selectedStems(args) {
  const all = availableStems();
  if (args.length === 0) return all;
  const unknown = [];
  const picked = new Set();
  for (const arg of args) {
    const base = path.basename(arg);
    const stem = base.endsWith(".ts") ? base.slice(0, -3) : base;
    if (all.includes(stem)) picked.add(stem);
    else unknown.push(arg);
  }
  if (unknown.length > 0) {
    console.error(`未知构造：${unknown.join(", ")}`);
    console.error(`可用构造：${all.join(", ")}`);
    process.exit(1);
  }
  return [...picked];
}

const TS_KIND_ALIASES = new Map([
  // SyntaxKind.QualifiedName 的反查名被别名 FirstNode 盖掉（与 tests/parse/ts-ast.mjs 同款）。
  ["FirstNode", "QualifiedName"],
  ["FirstStatement", "VariableStatement"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
]);

const kindOf = (kind) => TS_KIND_ALIASES.get(kind) || kind;

/** 前序遍历成一维表，保留节点本身（children 已经在里面）。 */
function flatten(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

function groupByKind(nodes) {
  const map = new Map();
  for (const node of nodes) {
    const kind = kindOf(node.kind);
    if (!map.has(kind)) map.set(kind, []);
    map.get(kind).push(node);
  }
  return map;
}

const FIELD_NAMES = ["text", "name", "isTypeOnly", "attributes", "namedBindings"];

/** 两侧字段名大小写不同（TS 侧小写开头、产物侧按形状字段名），统一成小写首字母再比。 */
function fieldOf(node, name) {
  const lower = name[0].toLowerCase() + name.slice(1);
  if (node[name] !== undefined) return node[name];
  return node[lower];
}

function load(stem, suffix) {
  return JSON.parse(fs.readFileSync(path.join(here, `${stem}${suffix}`), "utf8"));
}

/** 比一个构造；快照缺失或不同步时返回 null（由调用方记成失败）。 */
function diffStem(stem) {
  const tsPath = path.join(here, `${stem}.ts-ast.json`);
  const cjPath = path.join(here, `${stem}.cj-ast.json`);
  if (!fs.existsSync(tsPath) || !fs.existsSync(cjPath)) {
    console.error(`[${stem}] 缺少快照，先跑：node typescript/cases/ast-json.mjs ${stem}`);
    return null;
  }
  const tsData = load(stem, ".ts-ast.json");
  const cjData = load(stem, ".cj-ast.json");
  if (tsData.cases.length !== cjData.cases.length) {
    console.error(
      `[${stem}] 两份快照的用例数不一致（TS ${tsData.cases.length} / cj ${cjData.cases.length}），先重跑 ast-json.mjs`,
    );
    return null;
  }

  let structuralCases = 0;
  let positionCases = 0;
  let fieldCases = 0;
  let identical = 0;
  const lines = [];

  for (let i = 0; i < tsData.cases.length; i++) {
    const src = tsData.cases[i].src;
    const cjCase = cjData.cases[i];
    const head = `#${String(i + 1).padStart(2)} ${JSON.stringify(src)}`;

    if (cjCase.error) {
      structuralCases++;
      lines.push(`${head}\n  CRASH  ${cjCase.error}`);
      continue;
    }

    const theirs = flatten(tsData.cases[i].ast);
    const ours = flatten(cjCase.ast);
    const theirKinds = groupByKind(theirs);
    const ourKinds = groupByKind(ours);

    // 结构：按 kind 计数的差
    const structural = [];
    for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
      const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
      if (delta !== 0) structural.push(`${kind}${delta > 0 ? " +" : " "}${delta}`);
    }

    // 位置：只配个数相同的 kind
    const moved = [];
    for (const [kind, theirList] of theirKinds) {
      const ourList = ourKinds.get(kind);
      if (!ourList || ourList.length !== theirList.length) continue;
      for (let at = 0; at < theirList.length; at++) {
        const t = theirList[at];
        const o = ourList[at];
        if (t.pos !== o.pos || t.end !== o.end) {
          moved.push(`${kind} ts[${t.pos},${t.end}] cj[${o.pos},${o.end}]`);
        }
      }
    }

    // 字段：同 kind 同个数、且区间也对上的节点才比
    const fields = [];
    for (const [kind, theirList] of theirKinds) {
      const ourList = ourKinds.get(kind);
      if (!ourList || ourList.length !== theirList.length) continue;
      for (let at = 0; at < theirList.length; at++) {
        const t = theirList[at];
        const o = ourList[at];
        if (t.pos !== o.pos || t.end !== o.end) continue;
        for (const name of FIELD_NAMES) {
          const tv = fieldOf(t, name);
          const ov = fieldOf(o, name);
          if (String(tv) !== String(ov)) fields.push(`${kind}[${t.pos},${t.end}] ${name}: ts=${JSON.stringify(tv)} cj=${JSON.stringify(ov)}`);
        }
      }
    }

    if (!structural.length && !moved.length && !fields.length) {
      identical++;
      continue;
    }

    if (structural.length) structuralCases++;
    if (moved.length) positionCases++;
    if (fields.length) fieldCases++;
    lines.push(head);
    if (structural.length) lines.push(`  结构  ${structural.join("  ")}`);
    if (moved.length) lines.push(`  位置  ${moved.join("\n        ")}`);
    if (fields.length) lines.push(`  字段  ${fields.join("\n        ")}`);
  }

  return {
    stem,
    total: tsData.cases.length,
    identical,
    structuralCases,
    positionCases,
    fieldCases,
    lines,
  };
}

const stems = selectedStems(process.argv.slice(2));
const totals = { total: 0, identical: 0, structuralCases: 0, positionCases: 0, fieldCases: 0 };
const failed = [];

for (const stem of stems) {
  const result = diffStem(stem);
  if (result === null) {
    failed.push(stem);
    continue;
  }
  console.log(`=== ${result.stem} ===`);
  console.log(`用例 ${result.total}：完全一致 ${result.identical} / ${result.total}`);
  console.log(`有结构差 ${result.structuralCases} 条、有位置差 ${result.positionCases} 条、有字段差 ${result.fieldCases} 条`);
  console.log(result.lines.length ? "\n" + result.lines.join("\n") : "（没有 gap）");
  console.log("");
  totals.total += result.total;
  totals.identical += result.identical;
  totals.structuralCases += result.structuralCases;
  totals.positionCases += result.positionCases;
  totals.fieldCases += result.fieldCases;
}

if (stems.length > 1) {
  console.log(
    `合计 ${totals.total} 条：完全一致 ${totals.identical} / ${totals.total}；` +
      `有结构差 ${totals.structuralCases} 条、有位置差 ${totals.positionCases} 条、有字段差 ${totals.fieldCases} 条`,
  );
}

if (failed.length > 0) {
  console.error(`有 ${failed.length} 个构造没比成：${failed.join(", ")}`);
  process.exitCode = 1;
}
