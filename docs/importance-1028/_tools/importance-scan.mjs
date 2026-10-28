// 机械扫描：为每个 *.xl.md 生成 IMPORTANCE 审计所需的事实行（不做判断）。
// 输出：docs/importance-1028/_facts/<area>.md（人读）+ tmp/importance-facts.json（机读）
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const OUT_DIR = path.join(root, "docs", "importance-1028", "_facts");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/^(node_modules|dist|build|tmp|tests|samples|\.git|\.xl)$/.test(entry.name)) continue;
      walk(full, out);
    } else if (entry.name.endsWith(".xl.md")) {
      out.push(full);
    }
  }
  return out;
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  const classes = [];
  let current = null;
  let method = null;
  let inFence = false;
  let target = null; // array receiving fence body
  const prose = [];
  const fences = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        target = method ? method.code : (fences.push([]), fences[fences.length - 1]);
      } else {
        inFence = false;
        target = null;
      }
      continue;
    }
    if (inFence) {
      if (target) target.push(line);
      continue;
    }
    const h1 = line.match(/^#\s+class\s+([A-Za-z0-9_]+)(.*)$/);
    if (h1) {
      const rest = h1[2] || "";
      const ext = rest.match(/extends\s+([A-Za-z0-9_]+)/);
      const impl = rest.match(/implements\s+([A-Za-z0-9_,\s]+)/);
      current = {
        name: h1[1],
        base: ext ? ext[1] : null,
        impl: impl ? impl[1].split(",").map((s) => s.trim()).filter(Boolean) : [],
        file,
        line: i + 1,
        methods: [],
        fields: 0,
      };
      classes.push(current);
      method = null;
      continue;
    }
    if (/^#\s+/.test(line)) {
      if (/^#\s+(namespace|dependencies|enum|interface|type|const)\b/.test(line)) {
        current = null;
        method = null;
      }
      continue;
    }
    const h2 = line.match(/^##\s+(?:static\s+|protected\s+|private\s+|public\s+)*method\s+([A-Za-z0-9_]+)\s*(?::(.*))?$/);
    if (h2) {
      method = { name: h2[1], signature: (h2[2] || "").trim(), file, line: i + 1, code: [] };
      if (current) current.methods.push(method);
      continue;
    }
    if (/^##\s+.*\bfield\b/.test(line)) {
      if (current) current.fields += 1;
      method = null;
      continue;
    }
    if (/^##\s+(?:static\s+|protected\s+|private\s+|public\s+)*constructor\s*:/.test(line)) {
      method = { name: "constructor", signature: "", file, line: i + 1, code: [] };
      if (current) current.methods.push(method);
      continue;
    }
    if (/^##\s+/.test(line)) {
      method = null;
      continue;
    }
    const t = line.trim();
    // 散文 = 围栏外、非标题、非 enum case、非 import 的非空行
    if (t.length > 0 && !t.startsWith("#") && !t.startsWith("- ") && !/^(import|export)\b/.test(t)) {
      prose.push({ line: i + 1, text: t });
    }
  }
  return { file, classes, prose, fences };
}

function countMatches(body, re) {
  return (body.match(re) || []).length;
}

const files = walk(root);
const byName = new Map();
const parsed = files.map(parse);
for (const r of parsed) for (const c of r.classes) {
  if (!byName.has(c.name)) byName.set(c.name, []);
  byName.get(c.name).push(c);
}

function resolveBase(c, seen = new Set()) {
  // returns chain of base names
  const chain = [];
  let cur = c;
  while (cur && cur.base && !seen.has(cur.base)) {
    seen.add(cur.base);
    chain.push(cur.base);
    const nexts = byName.get(cur.base);
    cur = nexts && nexts.length ? nexts[0] : null;
  }
  return chain;
}

const SHAPE_LIKE = new Set(["ShapeToken", "PossibleShape", "BasicToken", "UnitToken"]);
const records = [];
for (const r of parsed) {
  const rel = path.relative(root, r.file).replace(/\\/g, "/");
  const codeLines = r.classes.reduce((a, c) => a + c.methods.reduce((b, m) => b + m.code.length, 0), 0);
  const allBody = r.classes.map((c) => c.methods.map((m) => m.code.join("\n")).join("\n")).join("\n");
  const rec = {
    file: rel,
    bytes: fs.statSync(r.file).size,
    lines: fs.readFileSync(r.file, "utf8").split("\n").length,
    proseLines: r.prose.length,
    proseSample: r.prose.slice(0, 3).map((p) => `L${p.line}: ${p.text.slice(0, 120)}`),
    classes: [],
    codeLines,
    flags: {},
  };
  for (const c of r.classes) {
    const chain = resolveBase(c);
    const isShape = chain.some((b) => SHAPE_LIKE.has(b)) || c.name.endsWith("Shape") || chain.includes("ShapeToken");
    rec.classes.push({
      name: c.name,
      base: c.base,
      chain: chain.slice(0, 4),
      isShape,
      fields: c.fields,
      methods: c.methods.map((m) => ({
        name: m.name,
        sig: m.signature,
        line: m.line,
        codeLines: m.code.length,
        hasBody: m.code.some((l) => l.trim().length > 0),
      })),
    });
  }
  const methodBodies = r.classes.flatMap((c) =>
    c.methods.map((m) => ({ cls: c.name, name: m.name, body: m.code.join("\n"), line: m.line, codeLines: m.code.filter((l) => l.trim().length > 0).length })),
  );
  const method = (n) => methodBodies.filter((m) => m.name === n);
  const bodyOf = (names) => methodBodies.filter((m) => names.includes(m.name)).map((m) => m.body).join("\n");

  const possibleBody = bodyOf(["Compute", "ComputeByIndex", "ComputePossibleShapes", "ComputePossibleShapesByIndex", "EndPossible", "Accept", "Reject", "IsBuildable", "ContinuationClaim"]);
  const buildBody = bodyOf(["Build", "BuildByIndex", "BuildFromBasicToken", "BuildFromBracket"]);

  rec.flags = {
    isShapeFile: rec.classes.some((c) => c.isShape),
    exitOrPreOverride: method("ExitOrPre").filter((m) => m.codeLines > 0).length,
    computePossibleShapesOverride: method("ComputePossibleShapes").filter((m) => m.codeLines > 0).length,
    processOverride: method("Process").filter((m) => m.codeLines > 0).length,
    closeOverride: method("Close").filter((m) => m.codeLines > 0).length,
    tryToCloseCalls: countMatches(allBody, /\bTryToClose\s*\(/g),
    signOutCalls: countMatches(allBody, /\bSignOut\s*\(/g),
    mountedAssign: countMatches(allBody, /MountedUnit\s*=/g),
    mountedRead: countMatches(allBody, /MountedUnit\b/g),
    recloseCalls: countMatches(allBody, /\bReclose\s*\(/g),
    reloadRefs: countMatches(allBody, /ReloadMessage/g),
    catchTotal: countMatches(allBody, /\bcatch\b/g),
    catchInPossible: countMatches(possibleBody, /\bcatch\b/g),
    catchInBuild: countMatches(buildBody, /\bcatch\b/g),
    tryInPossible: countMatches(possibleBody, /\btry\b/g),
    lookahead: [
      ...new Set([
        ...(bodyOf(["Compute", "ComputeByIndex", "ComputePossibleShapes", "ComputePossibleShapesByIndex"]).match(/tokenIndex\s*\+\s*\d+/g) || []),
        ...(bodyOf(["Compute", "ComputeByIndex", "ComputePossibleShapes", "ComputePossibleShapesByIndex"]).match(/\bNextCode\s*\(/g) || []),
        ...(bodyOf(["Compute", "ComputeByIndex", "ComputePossibleShapes", "ComputePossibleShapesByIndex"]).match(/slice\s*\(\s*tokenIndex\s*\+/g) || []),
      ]),
    ],
    loopInPossible: countMatches(possibleBody, /\b(for|while)\s*\(/g),
    loopInBuild: countMatches(buildBody, /\b(for|while)\s*\(/g),
    scannerCalls: countMatches(allBody, /\b(ScanRoot|ScanToken|ScanStatement|TryScan|Scan)\s*\(/g),
    cacheStateGet: countMatches(allBody, /\bGetState\b/g),
    cacheStateSet: countMatches(allBody, /\bSetState\b/g),
    cacheShareGet: countMatches(allBody, /\bGetShare\b/g),
    cacheShareSet: countMatches(allBody, /\bSetShare\b/g),
    dataSplice: countMatches(allBody, /\bData\s*\.\s*splice\s*\(/g),
    dataFilter: countMatches(allBody, /\bData\s*=\s*[^;\n]*\.filter\s*\(/g),
    dataLengthZero: countMatches(allBody, /\bData\s*\.\s*length\s*=\s*0\b/g),
    moveDataTo: countMatches(allBody, /\bMoveDataTo\s*\(/g),
    removeSelf: countMatches(allBody, /\bRemoveSelf\s*\(/g),
    isTriviaFilter: countMatches(allBody, /IsTriviaToken/g),
    catalogInstall: countMatches(allBody, /new\s+CatalogGuide|CatalogGuide\s*=/g),
    handleCloseDispatch: countMatches(allBody, /HandleCloseDispatch/g),
    endPossibleRefs: countMatches(allBody, /EndPossible/g),
    candidatesRefs: countMatches(allBody, /Candidates/g),
    parseFromShape: countMatches(allBody, /ParseFromShape/g),
    legacyRefs: countMatches(allBody, /Legacy|legacy/g),
    buildStatementRefs: countMatches(allBody, /BuildStatement\s*\(/g),
    jsxRefs: countMatches(allBody, /Jsx|JSX/g),
    rawSliceRefs: countMatches(allBody, /\bGetRaw\s*\(/g),
    throws: countMatches(allBody, /\bthrow\b/g),
  };
  records.push(rec);
}

// ---------- write machine-readable ----------
fs.writeFileSync(path.join(root, "tmp", "importance-facts.json"), JSON.stringify(records, null, 1));

// ---------- write human-readable per area ----------
fs.mkdirSync(OUT_DIR, { recursive: true });
const areas = new Map();
for (const rec of records) {
  const parts = rec.file.split("/");
  const area = parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
  if (!areas.has(area)) areas.set(area, []);
  areas.get(area).push(rec);
}

const rows = [];
for (const [area, recs] of [...areas.entries()].sort()) {
  const name = area.replace(/\//g, "-");
  const md = [];
  md.push(`# 机械事实 — ${area}`);
  md.push("");
  md.push(`文件数 ${recs.length}；字节 ${recs.reduce((a, r) => a + r.bytes, 0)}；代码行 ${recs.reduce((a, r) => a + r.codeLines, 0)}。`);
  md.push("");
  md.push("| 文件 | 字节 | 代码行 | 类 | 基类 | 方法 | prose | 关键标记 |");
  md.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const r of recs.sort((a, b) => a.file.localeCompare(b.file))) {
    const cls = r.classes.map((c) => `${c.name}${c.base ? " extends " + c.base : ""}`).join("<br>");
    const ms = r.classes.flatMap((c) => c.methods.map((m) => m.name)).filter((n) => n !== "constructor").join(" ");
    const f = r.flags;
    const marks = [];
    if (f.exitOrPreOverride) marks.push(`ExitOrPre×${f.exitOrPreOverride}`);
    if (f.computePossibleShapesOverride) marks.push(`ComputePossibleShapes×${f.computePossibleShapesOverride}`);
    if (f.processOverride) marks.push(`Process×${f.processOverride}`);
    if (f.catchInPossible) marks.push(`catch(possible)×${f.catchInPossible}`);
    if (f.catchInBuild) marks.push(`catch(build)×${f.catchInBuild}`);
    if (f.lookahead.length) marks.push(`lookahead:${f.lookahead.join(",")}`);
    if (f.loopInPossible) marks.push(`loop(possible)×${f.loopInPossible}`);
    if (f.handleCloseDispatch) marks.push(`HandleCloseDispatch×${f.handleCloseDispatch}`);
    if (f.mountedAssign) marks.push(`MountedUnit=×${f.mountedAssign}`);
    if (f.recloseCalls) marks.push(`Reclose×${f.recloseCalls}`);
    if (f.dataSplice || f.dataFilter || f.dataLengthZero || f.moveDataTo) marks.push(`dropBasic:${[f.dataSplice && "splice" + f.dataSplice, f.dataFilter && "filter" + f.dataFilter, f.dataLengthZero && "len=0", f.moveDataTo && "MoveDataTo" + f.moveDataTo].filter(Boolean).join("/")}`);
    if (f.cacheShareSet || f.cacheShareGet) marks.push(`share:${f.cacheShareGet}/${f.cacheShareSet}`);
    if (f.scannerCalls) marks.push(`Scan×${f.scannerCalls}`);
    if (f.buildStatementRefs) marks.push(`BuildStatement×${f.buildStatementRefs}`);
    if (f.parseFromShape) marks.push(`ParseFromShape×${f.parseFromShape}`);
    if (r.proseLines) marks.push(`prose×${r.proseLines}`);
    md.push(`| \`${r.file}\` | ${r.bytes} | ${r.codeLines} | ${cls} | | ${ms} | ${r.proseLines} | ${marks.join(" ") || "—"} |`);
  }
  md.push("");
  fs.writeFileSync(path.join(OUT_DIR, `${name}.md`), md.join("\n"));
  rows.push({ area, files: recs.length, bytes: recs.reduce((a, r) => a + r.bytes, 0), codeLines: recs.reduce((a, r) => a + r.codeLines, 0) });
}

console.log("files:", records.length, "areas:", areas.size);
for (const r of rows.sort((a, b) => b.bytes - a.bytes)) console.log(`${r.area}\t${r.files}\t${r.bytes}\t${r.codeLines}`);
console.log("total bytes:", records.reduce((a, r) => a + r.bytes, 0));
console.log("total codeLines:", records.reduce((a, r) => a + r.codeLines, 0));
console.log("prose files:", records.filter((r) => r.proseLines > 0).length);
console.log("shape files:", records.filter((r) => r.flags.isShapeFile).length);
