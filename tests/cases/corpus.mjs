// 用例语料的**发现层**：五类用例目录扫成一份清单，两条判据共用它。
//
//   token     tests/cases/token/<功能域>/<名字>.ts        逐节点对 ts.createSourceFile（AST 尺子）
//   exec      tests/cases/exec/<功能域>/<序号>-<名字>.ts  真跑，比 stdout + 退出码（执行尺子）
//   runtime   tests/cases/runtime/<功能域>/…              同上
//   stdlib    tests/cases/stdlib/<功能域>/…               同上
//   e2e       tests/cases/e2e/<功能域>/…                  同上
//
// 「一条用例 = 一个 `.ts` 文件」是**五类共同的形态**（见 `case-file.mjs` 的头文法）：
// 文件头写元数据、正文就是被跑/被解析的那段源码。id 由路径派生
// （`<类别>/<功能域>/<slug>`），所以**不存在「id 与文件对不上」这一档**。
//
// 这一层的职责只有三件：找出文件、读出元数据、给出一条稳定排序。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCaseFile } from "./case-file.mjs";

export const CASES_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)));

/** 五类，顺序即报告顺序（AST → 降级 → 引擎 → 标准库 → 端到端）。 */
export const CATEGORIES = ["token", "exec", "runtime", "stdlib", "e2e"];

/** 哪些类别是「比 stdout」的（其余是 token 那一种 AST 尺子）。 */
export const STDOUT_CATEGORIES = ["exec", "runtime", "stdlib", "e2e"];

/** 一条用例的 id `token/statements/stmt-asi-as-then-statement` → 文件路径。 */
export function casePath(id) {
  return path.join(CASES_ROOT, ...id.split("/")) + ".ts";
}

/** 扫一个类别的所有文件（按路径排序，与文件系统顺序无关）。 */
export function listCategory(category, options = {}) {
  // `.tsx` 只有 token 语料有（4 份 JSX 用例）；`cases:tags` / `cases:check` 认它们，
  // 而 AST 尺子（`ts-ast.mjs`）按 TS 语义节点对拍时**自己把 `.tsx` 排除**——
  // 这一层的口径照旧：**认出来，用不用由上面那两把尺子决定**。
  const extensions = options.extensions ?? [".ts", ".tsx"];
  const dir = path.join(CASES_ROOT, category);
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const walk = (current, depth, domain) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (depth >= 2) continue; // 只两级：类别/<功能域>/文件
        walk(full, depth + 1, entry.name);
        continue;
      }
      if (!extensions.some((ext) => entry.name.endsWith(ext))) continue;
      if (domain === null) continue; // 直接躺在类别目录下的文件不算用例
      files.push({ category, domain, file: full, name: entry.name.replace(/\.tsx?$/, "") });
    }
  };
  walk(dir, 0, null);
  return files.map((row) => {
    const parsed = readCaseFile(row.file, category);
    return {
      ...row,
      id: `${category}/${row.domain}/${row.name}`,
      source: parsed.source,
      body: parsed.body,
      directives: parsed.directives,
      problems: parsed.problems,
    };
  });
}

/** 五类全扫。 */
export function listAll() {
  return CATEGORIES.flatMap((category) => listCategory(category));
}

/** 这一条要不要**真的跑**（token 走 AST 尺子、其余走 stdout 尺子）。 */
export function isStdoutCase(entry) {
  return STDOUT_CATEGORIES.includes(entry.category);
}

/** 这一条是不是口径外（不进分母）。 */
export function isSkipped(entry) {
  return entry.directives.skip !== null;
}

/** 台账里的期望（`pass` / `blocked` / `differ`）。 */
export function want(entry) {
  return entry.directives.want;
}
