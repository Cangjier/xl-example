// B4e / K1 的**只读探针**：容器 shape 在「关闭格」上到底在不在父单元的 `Data` 里。
//
// 口径（与验收逐条对应）：
//   - 对每一只表达式括号（`{` / `[` / `(`），在它**关闭的那一拍**记录父单元 `Data` 的前后快照
//     （`Bracket.Close` 的 before / after：before = 父单元候选还没被问，after = 问完之后）；
//   - 要求 after 里**没有 `Bracket`**、而且它原来的槽位是容器形状
//     （`ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `CallExpressionShape` /
//     `ParenthesizedExpressionShape`）；
//   - 同时打出 `pos` / `src` 与「这一格是谁建的」：`k1` = 本机制（`ContainerShapeCatalog`），
//     `legacy` = 既有收口方（A4 / A4b / P1 / P4，在本机制之前就消费了括号）；
//   - 最后把整棵树与 TypeScript 的 AST 对拍（只看结构 / pos / text，不看 EndOfFileToken）。
//
// 用法：
//   node typescript/cases/tts/tools/container-shape-probe.mjs
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const BUILD = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);

const { SourceFileRunner } = require(path.join(BUILD, "typescript", "run", "source-file-runner.js"));
const { Bracket } = require(path.join(BUILD, "core", "syntax", "basic-tokens", "bracket.js"));
const { StatementRouteUtil } = require(path.join(BUILD, "typescript", "tokens", "statements", "statement-route-util.js"));
const { ContainerShapeCatalog } = require(
  path.join(BUILD, "typescript", "tokens", "expressions", "forms", "shared", "container-shape-catalog.js"));

const ts = require(path.join(root, "node_modules", "typescript"));
const { createAstCore, cjAst } = require(path.join(root, "typescript", "cases", "ast-compare.mjs"));
const { tsAst } = createAstCore(ts);

const CONTAINERS = new Set([
  "ObjectLiteralExpressionShape",
  "ArrayLiteralExpressionShape",
  "CallExpressionShape",
  "ParenthesizedExpressionShape",
]);
const EXPR_ROLES = new Set(["ObjectLiteral", "ArrayLiteral", "CallArgs", "ParenExpression", "ArrowParams"]);

const prune = (node) => {
  const out = { ...node };
  if (out.children) {
    out.children = out.children.filter((child) => child.kind !== "EndOfFileToken").map(prune);
    if (out.children.length === 0) delete out.children;
  }
  return out;
};

// 只在**本进程**打开（默认值已经是 true，这里显式写出来便于在别的构造上复算）。
StatementRouteUtil.EnableContainerShape = true;

const ticks = [];
const originalClose = Bracket.prototype.Close;
Bracket.prototype.Close = function (context) {
  const parent = this.Parent;
  const before = parent === null ? [] : parent.Data.map((unit) => unit.constructor.name);
  const at = parent === null ? -1 : parent.Data.indexOf(this);
  const builds = ContainerShapeCatalog.BuildCount;
  const start = this.SourceRange.StartIndex;
  const end = this.SourceRange.EndIndex;
  const state = originalClose.call(this, context);
  const after = parent === null ? [] : parent.Data.map((unit) => unit.constructor.name);
  // `at` 在「父单元先手」的格上会失效（括号已经被换成形状、下标指向下一格）。可靠口径是
  // **按区间认那个容器**：它必须与原括号的 src 完全相同。
  let slot = null;
  const found = [];
  if (parent !== null) {
    for (const unit of parent.Data) {
      if (!CONTAINERS.has(unit.constructor.name)) {
        continue;
      }
      found.push(unit);
      if (unit.SourceRange.StartIndex === start && unit.SourceRange.EndIndex === end) {
        slot = unit;
      }
    }
  }
  // `CallArgs` 的槽位前移到 callee（`f(1,2)` 的 shape src 从 `f` 起），区间不等于括号自己；
  // 父单元里恰好只有一个容器形状时它就是这个括号的产物。
  if (slot === null && found.length === 1) {
    slot = found[0];
  }
  if (EXPR_ROLES.has(this.Role) || (parent !== null && parent.Data.indexOf(this) >= 0)) {
    ticks.push({
      bracket: this.StartBracketChar,
      role: this.Role,
      roleState: this.RoleState,
      host: parent === null ? "null" : parent.constructor.name,
      src: "[" + start + "," + end + ")",
      before,
      after,
      slot,
      stillBracket: parent !== null && parent.Data.indexOf(this) >= 0,
      byK1: ContainerShapeCatalog.BuildCount > builds,
    });
  }
  return state;
};

const SNIPPETS = [
  ["object", "let x = { a: 1 };\n", true],
  ["array", "let y = [1, 2];\n", true],
  ["call", "let z = f(1, 2);\n", true],
  ["paren", "let w = (a + b);\n", true],
  // 本机制真正接手的两种位置（既有收口方不接的）：`as` 初始化器。
  ["as-object", "let a = { x: 1 } as unknown as T;\n", true],
  // 只在**声明初始化器**这一格接手（`IsSafeHost` 白名单）；嵌套括号留给父括号的收口方，
  // 这里只作为读数打印，不是验收项（`_reports/B4e.md` §4）。
  ["nested", "let n = [1, { a: 2 }];\n", false],
];

const failures = [];
for (const [label, source, required] of SNIPPETS) {
  ticks.length = 0;
  let root = null;
  let error = "";
  try {
    root = SourceFileRunner.Parse(source, label + ".ts");
  } catch (error_) {
    error = error_ && error_.Message ? String(error_.Message).split("\n")[0] : String(error_);
  }
  console.log("=== " + label + " === " + JSON.stringify(source));
  if (error !== "") {
    console.log("  PARSE ERROR: " + error);
    failures.push(label + ": parse error");
    continue;
  }
  for (const tick of ticks) {
    const slotName = tick.slot === null ? "(none)" : tick.slot.constructor.name;
    const pos = tick.slot === null ? "-" : tick.slot.Pos;
    const range = tick.slot === null ? "-" : "[" + tick.slot.SourceRange.StartIndex + "," + tick.slot.SourceRange.EndIndex + ")";
    console.log("  " + tick.bracket + " role=" + (tick.role || "-") + " state=" + tick.roleState
      + " host=" + tick.host + " by=" + (tick.byK1 ? "k1" : "legacy")
      + " -> slot=" + slotName + " pos=" + pos + " src=" + range
      + " stillBracket=" + tick.stillBracket);
    console.log("     data: " + tick.after.join(" | "));
  }
  const checked = ticks.filter((tick) => EXPR_ROLES.has(tick.role));
  if (required && checked.length === 0) {
    failures.push(label + ": no close tick recorded");
  }
  if (required) {
    for (const tick of checked) {
      const slotName = tick.slot === null ? "" : tick.slot.constructor.name;
      if (!CONTAINERS.has(slotName) || tick.stillBracket) {
        failures.push(label + ": " + tick.bracket + " slot is " + (slotName || "(none)") + " stillBracket=" + tick.stillBracket);
      }
    }
  }
  const mine = prune(cjAst(root));
  const tsRoot = prune(tsAst(ts.createSourceFile(label + ".ts", source, ts.ScriptTarget.Latest, true)));
  const same = JSON.stringify(mine) === JSON.stringify(tsRoot);
  console.log("  ast: " + (same ? "OK" : "DIFF"));
  if (!same) {
    failures.push(label + ": ast diff");
  }
  console.log("");
}

console.log("BuildCount=" + ContainerShapeCatalog.BuildCount
  + " AlreadyConsumed=" + ContainerShapeCatalog.AlreadyConsumedCount
  + " Refused=" + ContainerShapeCatalog.RefusedCount
  + " RouteCount=" + StatementRouteUtil.ContainerShapeBuildCount);
if (failures.length > 0) {
  console.log("FAIL " + failures.join(" ; "));
  process.exit(1);
}
console.log("PASS container-shape probe (四个族的创建格都是容器形状、AST 与 TS 一致)");
