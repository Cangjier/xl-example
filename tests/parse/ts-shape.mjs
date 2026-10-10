// TS 形状投影：**实现已经搬进规范**（`typescript/print-ast-common.xl.md` → `dist/ts/typescript/print-ast-common.ts`
// → `build/ts/typescript/print-ast-common.js`），这里只剩一层转发。
//
//   import { projectRoot } from "./ts-shape.mjs"
//   const { ast, unmapped } = projectRoot(root, source);
//
// **为什么只留一份实现**：投影原来是这个文件里的 2464 行 JS，运行时没有它——
// 于是「投影的账」与「运行时的账」可以各算各的。搬进规范之后，`cases:tsast` 量的就是
// 发布路径那一份（`cjcli --ts-ast` 打出来的也是同一份），两边不可能再分开漂。
//
// 搬家是**逐字**的：函数体一字未改。等价的证据是 `ts-shape-crossover.mjs` 在全语料上
// 逐字节对拍过（1399 个文件、0 处不一致），那一次跑完那个脚本就删了——
// 长期判据是 `cases:tsast` 的成绩（对 `ts.createSourceFile` 的逐节点对拍）。
//
// 这里用 `createRequire` 加载 `build/` 的产物，与 `ts-ast.mjs` / `run.mjs` 等尺子同一口径：
// 尺子量的必须是**构建产物**，不是 `dist/` 里的源码。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const runtime = createRequire(import.meta.url)(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));

export const projectRoot = runtime.projectRoot;
export const projectNode = runtime.projectNode;
export const leafKindOfText = runtime.leafKindOfText;
export const INVISIBLE = runtime.INVISIBLE;
export const FIELD_BY_KIND = runtime.FIELD_BY_KIND;
// **第 1028 轮删掉的四行**：`tokenKind` / `KEYWORD_KIND` / `TOKEN_KIND`（两张词汇表搬回
// `Keyword` 与 `SymbolToken` 各自那一页）、`KIND_BY_TAG`（第 1025 轮删）。它们在这里
// 本来就一个消费者都没有（`ts-ast.mjs` 只 import `projectRoot`），转发一层早就是空的。
