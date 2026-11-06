// T5 证据探针：把逐字开关打开（TypeRouteUtil.EnableIncrementalTypes = true）后跑全量 success。
//
// 目的：证明「没有未覆盖形态被静默放过」。
//   开关开时 TypeFallbackGuard 会在两个 Close 兜底点上 throw（TypeAliasDeclarationShape.Close /
//   TypeAliasEndPossibleShape.BuildByIndex），而 run.mjs 会把 throw 记成 parse-error = FAIL。
//   因此「302/302 PASS」等价于「全量 302 条一次都没走到 Close 全量解析」。
//
// 用法: node _coord/probe/t5-guard-on.mjs [--dir <目录>]
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");

const { TypeRouteUtil } = require(path.join(BUILD, "typescript/shapes/types/type-route-util.js"));
TypeRouteUtil.EnableIncrementalTypes = true;
console.log(`[t5-guard-on] EnableIncrementalTypes = ${TypeRouteUtil.EnableIncrementalTypes}（运行时置位，不改源码默认值）`);

// run.mjs 顶层即 main(process.argv.slice(2))；同一进程共用 CJS 缓存，所以上面置的开关对它生效。
await import(pathToFileURL(path.join(ROOT, "typescript", "cases", "tts", "run.mjs")).href);
