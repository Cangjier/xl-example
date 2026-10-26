// B4 表达式括号目录的**只读探针**（可复算）。
//
// 为什么需要它：`EnableExprBracketCatalog` 默认 `false`（理由见
// `typescript/tokens/statements/statement-route-util.xl.md` 的该字段文档与 `_reports/B4.md` §3），
// 而验收要看「开关打开以后，`{` / `[` / `(` 里每一格建出了什么」。所以本探针在**运行时**
// 把开关打开，再解析给定的片段，把每只括号的角色与它 `Data` 里的子单元类名打出来。
//
// 它只读：不写任何文件、不改任何默认值（开关只在本进程内翻一次）。
//
// 用法：
//   node typescript/cases/tts/tools/expr-bracket-probe.mjs                 # 内置六个片段
//   node typescript/cases/tts/tools/expr-bracket-probe.mjs <file.ts> ...   # 解析给定文件
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const BUILD = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);

const { SourceFileRunner } = require(path.join(BUILD, "typescript", "run", "source-file-runner.js"));
const { StatementRouteUtil } = require(path.join(BUILD, "typescript", "tokens", "statements", "statement-route-util.js"));
const { Bracket } = require(path.join(BUILD, "core", "syntax", "basic-tokens", "bracket.js"));
const { ShapeToken } = require(path.join(BUILD, "core", "syntax", "shape-token.js"));

const SNIPPETS = [
  ["object-literal", "let x = { a: 1, b: 2, c };\n"],
  ["array-literal", "let y = [1, 2];\n"],
  ["call", "let z = f(a, b);\n"],
  ["paren", "let w = 1 * (a + b);\n"],
  ["arrow-paren", "let v = (a);\n"],
  ["method-params", "class C { m(a: number) {} }\n"],
];

function walk(token, visit) {
  visit(token);
  if (!token || !token.Data) {
    return;
  }
  for (const child of token.Data) {
    walk(child, visit);
  }
}

function describeBracket(bracket) {
  const role = bracket.Role || "-";
  const state = ["None", "Known", "Deferred", "Fallback"][bracket.RoleState] || "?";
  const guide = bracket.CatalogGuide === null ? "no-guide" : "guide";
  const kids = bracket.Data
    .filter((unit) => !unit.IsTriviaToken)
    .map((unit) => {
      const name = unit.constructor.name;
      const pos = unit.Pos === undefined ? "-" : unit.Pos;
      return name + "(pos=" + pos + ")";
    });
  return "  " + bracket.StartBracketChar + "  role=" + role + " state=" + state + " " + guide
    + "\n     data: " + (kids.length === 0 ? "(empty)" : kids.join(" | "));
}

function run(label, source, file) {
  const before = {
    atoms: StatementRouteUtil.ExprBracketAtomCount,
    members: StatementRouteUtil.ExprBracketMemberCount,
    guides: StatementRouteUtil.ExprBracketGuideCount,
    deferred: StatementRouteUtil.BracketRoleDeferredCount,
    fallback: StatementRouteUtil.BracketRoleFallbackCount,
  };
  let rootShape = null;
  let error = "";
  try {
    rootShape = SourceFileRunner.Parse(source, file);
  } catch (e) {
    error = e && e.Message ? String(e.Message).split("\n")[0] : String(e);
  }
  console.log("=== " + label + " ===");
  console.log(source.replace(/\n/g, "\\n"));
  if (rootShape === null) {
    console.log("  PARSE ERROR: " + error);
  }
  drainResolveLog();
  if (rootShape !== null) {
    let count = 0;
    walk(rootShape, (token) => {
      if (token instanceof Bracket) {
        const role = token.Role || "";
        if (role === "" && (token.CatalogGuide === null || token.CatalogGuide === undefined)) {
          return;
        }
        count += 1;
        console.log(describeBracket(token));
      }
    });
    if (count === 0) {
      console.log("  (收口后树里已无括号：容器形状顶替了它，逐格证据看计数)");
    }
  }
  console.log("  atoms+" + (StatementRouteUtil.ExprBracketAtomCount - before.atoms)
    + " members+" + (StatementRouteUtil.ExprBracketMemberCount - before.members)
    + " guides+" + (StatementRouteUtil.ExprBracketGuideCount - before.guides)
    + " deferred+" + (StatementRouteUtil.BracketRoleDeferredCount - before.deferred)
    + " fallback+" + (StatementRouteUtil.BracketRoleFallbackCount - before.fallback));
  console.log("");
}

// 只在**本进程**翻开关：默认值仍是 false（`statement-route-util.xl.md`）。
StatementRouteUtil.EnableExprBracketCatalog = true;

// 角色解析那一刻是**唯一**能看见「括号 + 宿主 + 前一格」的时机：括号收口后会被容器形状顶替，
// 收口后的树里再也找不到它。所以这里包一层 `Resolve`，把三态与理由记下来（只读，不改行为）。
const { BracketRoleResolver } = require(path.join(BUILD, "typescript", "tokens", "statements", "bracket-role-resolver.js"));
const originalResolve = BracketRoleResolver.Resolve;
const resolveLog = [];
BracketRoleResolver.Resolve = function (host, bracket, context) {
  const result = originalResolve.call(BracketRoleResolver, host, bracket, context);
  let state = "Fallback";
  if (result.IsKnown()) {
    state = "Known";
  } else if (result.IsDeferred()) {
    state = "Deferred";
  }
  const previous = BracketRoleResolver.PreviousCode(host, bracket);
  const previousText = previous === null ? "null" : previous.constructor.name;
  resolveLog.push("  " + bracket.StartBracketChar + "  host=" + host.constructor.name
    + "  prev=" + previousText + "  -> " + state + " " + result.Role
    + (result.Reason ? " (" + result.Reason + ")" : ""));
  return result;
};

function drainResolveLog() {
  if (resolveLog.length === 0) {
    console.log("  (BracketRoleResolver 一次都没被调用)");
  }
  for (const line of resolveLog) {
    console.log(line);
  }
  resolveLog.length = 0;
}

const files = process.argv.slice(2);
if (files.length > 0) {
  for (const file of files) {
    run(path.basename(file), fs.readFileSync(file, "utf8"), path.basename(file));
  }
} else {
  for (const [label, source] of SNIPPETS) {
    run(label, source, label + ".ts");
  }
}
