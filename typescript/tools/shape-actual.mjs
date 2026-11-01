// 形状树的「实际创建位置」：用 build/ts 逐字符推进，记录每个节点第一次出现在树里的那一格。
//
// case-infer.mjs（对照 .infer）、cases-viewer（case.ast 页标注）和 case_fix 的验收共用这一份，
// 免得几边对「节点身份」和「TS 区间别名」各写一套。
//
// 两条通道，按「本进程里的模块还能不能代表磁盘」选：
// - 进程内（`channel: "process"`）：快，但用的是本进程 require 过的 build/ts 模块。
//   宿主进程（DSH 插件宿主）会把这些模块一直留在内存里，删 `require.cache` 也换不回新实现：
//   于是 `npm run build` 之后对拍量到的仍是旧代码，而磁盘、门禁、新起的 node 都是新的。
// - 子进程（`channel: "child"`）：经 fresh-build.mjs 起一个新的 node 读 build/ts，读到的永远是
//   磁盘上的当前实现，代价约 150ms。所以只要「本进程载入之后 build/ts 变过」（指纹不同）或
//   调用方明确说 `fresh: true`（刚重建过，什么都别信），就走这一条。这是「对拍读到旧实现」的兜底。
//
// 调用方不需要关心走的是哪条：两者返回同一个形状（`map` / `created` 是 Map，`final` 是数组），
// 额外带一个 `channel` 字段说明这次是谁量的。
import path from "node:path";
import { createRequire } from "node:module";
import {
  BUILD,
  BUILD_ENTRY,
  ROOT,
  buildStamp,
  newestBuildMtime,
  parserAvailable,
  runInFreshProcess,
} from "./fresh-build.mjs";

const require = createRequire(import.meta.url);

export { BUILD, BUILD_ENTRY, ROOT, buildStamp, newestBuildMtime, parserAvailable };

// TS 的 SyntaxKind 里有些名字是区间别名（FirstLiteralToken 之类），ts-ast-line 打出来的是别名，
// 形状侧用的是区间首项的名字。和 run.mjs 的对拍表保持一致。
export const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

export const canonicalKind = (kind) => TS_KIND_ALIASES.get(kind) ?? kind;

/** 本进程载入的解析器模块；`null` = 还没载入。 */
let loaded = null;

/** 载入那一刻 `build/ts` 的指纹。当前指纹与它不同，就说明本进程里的模块已经落后于磁盘。 */
let loadedStamp = null;

function loadParser() {
  if (loaded !== null) {
    return loaded;
  }
  if (!parserAvailable()) {
    throw new Error(`缺少 ${path.relative(ROOT, BUILD)}：先跑 npm run build`);
  }
  // 指纹取在 require 之前：万一读盘与载入之间正好被重建，下一次对拍会判成「变过」而改走子进程，
  // 不会把旧模块当成新的。
  loadedStamp = buildStamp();
  loaded = {
    SyntaxContext: require(path.join(BUILD, "core/syntax/syntax-context.js")).SyntaxContext,
    SourceRange: require(path.join(BUILD, "core/syntax/source-range.js")).SourceRange,
    TextDocument: require(path.join(BUILD, "typescript/run/text-document.js")).TextDocument,
    TypescriptTemplate: require(path.join(BUILD, "typescript/run/typescript-template.js")).TypescriptTemplate,
    SourceFileShape: require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js")).SourceFileShape,
  };
  return loaded;
}

/** 本进程里的解析器模块是否已经落后于磁盘。还没载入过就不算落后：首次载入读到的一定是当前实现。 */
export function inProcessStale() {
  if (loaded === null) {
    return false;
  }
  return buildStamp() !== loadedStamp;
}

/** 把 build/ts 下的模块从 require 缓存里清掉，返回清掉的个数。
 *  注意：这只在「`require.cache` 就是加载器那份注册表」的进程里有效；DSH 插件宿主里删不动，
 *  对拍因此不再依赖它（见文件头的两条通道）。留给同一进程里重建的调试脚本。 */
export function clearBuildCache() {
  let cleared = 0;
  for (const key of Object.keys(require.cache)) {
    if (key === BUILD || key.startsWith(BUILD + path.sep)) {
      delete require.cache[key];
      cleared++;
    }
  }
  return cleared;
}

const kindOf = (node) => node.constructor.name.replace(/Shape$/, "");

function collect(node, depth, isLast, out) {
  const range = node.SourceRange ?? {};
  const kind = kindOf(node);
  const pos = node.Pos ?? -1;
  const start = range.Start ?? -1;
  out.push({
    // 只按 kind + pos + src 起点做身份：End 会随形状生长变化，不能进身份。
    // 根节点的 Pos 在形状侧是 -1、在 TS 侧是 0，统一按 0 记。
    key: kind === "SourceFile" ? "SourceFile|0|0" : `${kind}|${pos}|${start}`,
    kind,
    pos,
    start,
    end: range.End ?? -1,
    text: node.Text !== undefined ? node.Text : (node.Temp !== undefined ? node.Temp : ""),
    // ShapeToken.CreatedAt：possible / end 的 build 建出这颗形状的那一格；-1 = 还没写 create 入口。
    createdAt: typeof node.CreatedAt === "number" ? node.CreatedAt : -1,
    // ShapeToken.CreatedRevisionAt：创建时拿不到、end 时才知道的「本该建在这一格」的修订位置；-1 = 没有修订。
    createdRevisionAt: typeof node.CreatedRevisionAt === "number" ? node.CreatedRevisionAt : -1,
    isLast,
    depth,
  });
  const children = node.Data ?? [];
  for (let i = 0; i < children.length; i++) {
    collect(children[i], depth + 1, i === children.length - 1, out);
  }
  return out;
}

/** 进程内通道：用本进程 require 过的 build/ts 逐字符推进。子进程一侧也调这一个。 */
export function traceActualInProcess(source, name) {
  const parser = loadParser();
  const template = parser.TypescriptTemplate.Create();
  const root = new parser.SourceFileShape(template);
  const context = new parser.SyntaxContext(root, 32);
  const document = new parser.TextDocument(source, name);
  parser.SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const total = document.GetCount();
  const map = new Map();
  for (let index = 0; index < total; index++) {
    context.ProcessRange(root, new parser.SourceRange(document, index, index + 1), index);
    for (const rec of collect(root, 0, true, [])) {
      if (!map.has(rec.key)) {
        map.set(rec.key, index);
      }
    }
  }
  context.Index = total;
  root.SignOut(total);
  context.ProcessRange(root, new parser.SourceRange(document, total, total), total);
  const final = collect(root, 0, true, []);
  const created = new Map();
  for (const rec of final) {
    // `.infer` 的 created 列优先用修订位置：有修订时它才是「本该建在这一格」的位置。
    const at = rec.createdRevisionAt >= 0
      ? rec.createdRevisionAt
      : rec.createdAt >= 0 ? rec.createdAt : null;
    created.set(rec.key, at);
  }
  return { map, created, final, channel: "process" };
}

/** 子进程通道：经 fresh-build.mjs 起一个新的 node 读 build/ts，不受本进程模块缓存影响。 */
export function traceActualIsolated(source, name) {
  const parsed = runInFreshProcess({ job: "actual", source, name });
  return {
    map: new Map(parsed.map),
    created: new Map(parsed.created),
    final: parsed.final,
    channel: "child",
  };
}

/** 返回 { map, created, final, channel }；key = kind|pos|src 起点，与 .ast / .infer 行用同一套。
 *  map 是「首次出现在树里」的那一格；created 优先取 CreatedRevisionAt（修订后的创建位置），
 *  没有修订才取 ShapeToken.CreatedAt（实际建出形状的那一格），都没有记 null；final 是最终树。
 *
 *  `options.fresh === true`：调用方刚重建过，必须走子进程读磁盘上的当前实现。 */
export function traceActual(source, name, options = {}) {
  if (options.fresh === true || inProcessStale()) {
    return traceActualIsolated(source, name);
  }
  return traceActualInProcess(source, name);
}
