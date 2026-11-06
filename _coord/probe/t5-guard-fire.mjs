// T5 反证探针（只 monkey-patch 已编译产物，不改源码、不重建）：
// 把「递归 `{` 体」候选在运行期废掉，alias-recursive 就必然退回 Close 全量解析；
// 此时开关开着，TypeFallbackGuard 必须抛出「增量变量形状未支持：type 对象字面量」。
// 这证明闸门确实接在两个兜底点上，而不是一个没人调用的空函数。
//
// 用法: node _coord/probe/t5-guard-fire.mjs typescript/cases/tts/success/types/alias-recursive.ts
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const P = (...seg) => path.join(BUILD, ...seg);

const { TypeRouteUtil } = require(P("typescript", "shapes", "types", "type-route-util.js"));
TypeRouteUtil.EnableIncrementalTypes = true;

const { ShapeStates } = require(P("core", "syntax", "shape-states.js"));
const { TypeLiteralRecursivePossibleShape } = require(P("typescript", "shapes", "types", "forms", "recursive-fragments.js"));
TypeLiteralRecursivePossibleShape.prototype.ComputeByIndex = function () {
  return ShapeStates.Reject;
};
TypeLiteralRecursivePossibleShape.prototype.IsBuildable = function () {
  return false;
};
console.log("[t5-guard-fire] 递归候选已废掉，开关=on；期望 alias-recursive 报「增量变量形状未支持：type 对象字面量」");

await import(pathToFileURL(path.join(ROOT, "typescript", "cases", "tts", "run.mjs")).href);
