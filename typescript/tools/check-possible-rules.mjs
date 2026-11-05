// possible/end 静态守护：检查"预读"是否又回到了 possible/end 的代码里。
//
// 规则（docs/IMPORTANCE.md 第 69 条 / 诊断码 D030）:
//   possible/end 的判定只能基于 basic token（已建好的词法/文法 token），
//   不允许再回头读原文——即不允许出现 CurrentDocument / Document / GetRaw / GetValue，
//   也不允许出现那对读原文的预读助手 IsWordAhead / IsElseAhead。
//
// 扫描范围:
//   默认扫全仓 *.xl.md 中"possible/end 代码"所在的文件，按文件名匹配:
//     *possible-shape*.xl.md  *end-possible*.xl.md  catalog-guide.xl.md  possible-shape.xl.md
//   排除: node_modules / dist / build / .xl / tmp / .coder / .git
//
// 用法:
//   node typescript/tools/check-possible-rules.mjs                 # 默认全仓
//   node typescript/tools/check-possible-rules.mjs <file|dir> ...  # 覆盖扫描范围
//     - 显式给文件: 无论文件名是否匹配上面的模式都检查（自测用）
//     - 显式给目录: 递归，仍按上面的文件名模式筛选
//
// 退出码: 0 = 无违规, 1 = 有违规（打印 文件:行号:内容）, 2 = 参数/路径错误
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

// 这些目录不属于源码范围（构建产物、缓存、临时目录）。
const EXCLUDE_DIRS = new Set(["node_modules", "dist", "build", ".xl", "tmp", ".coder", ".git"]);

// 文件名模式：glob -> 正则（只用到 * 和 .，不引入第三方包）。
const NAME_PATTERNS = [
  "*possible-shape*.xl.md",
  "*end-possible*.xl.md",
  "catalog-guide.xl.md",
  "possible-shape.xl.md",
].map((glob) => {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
});

// 禁止出现的标识
const BANNED = [
  "CurrentDocument", // 拿到原文文档 = 预读原文
  "GetRaw", // 读原文片段
  "GetValue", // 逐字符读原文
  "Document", // 上述几类的共同前缀（也兜住 TextDocument 之类）
  "IsWordAhead", // 已删除的读原文预读助手
  "IsElseAhead", // 已删除的读原文预读助手
];

const rel = (full) => path.relative(ROOT, full).split(path.sep).join("/");

const matchesName = (name) => NAME_PATTERNS.some((re) => re.test(name));

// 收集要扫描的文件。
// explicitFile: 显式指定的文件不做文件名过滤（自测时可能是个随便命名的 .xl.md）。
function collect(target, explicitFile, out) {
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    console.error(`[rules:check] 路径不存在: ${target}`);
    process.exit(2);
  }
  if (stat.isFile()) {
    if (explicitFile || matchesName(path.basename(target))) {
      out.push(target);
    }
    return;
  }
  if (!stat.isDirectory()) {
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) {
        continue;
      }
      collect(full, false, out);
      continue;
    }
    if (entry.isFile() && matchesName(entry.name)) {
      out.push(full);
    }
  }
}

const args = process.argv.slice(2);
const files = [];
if (args.length === 0) {
  collect(ROOT, false, files);
} else {
  for (const arg of args) {
    const full = path.resolve(process.cwd(), arg);
    // 显式文件 -> 不过滤；显式目录 -> 递归并过滤。
    const isFile = (() => {
      try {
        return fs.statSync(full).isFile();
      } catch {
        return false;
      }
    })();
    collect(full, isFile, files);
  }
}

const violations = [];
for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    console.error(`[rules:check] 读不了 ${rel(file)}: ${error.message}`);
    continue;
  }
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hits = BANNED.filter((word) => line.includes(word));
    if (hits.length > 0) {
      violations.push({ file: rel(file), line: i + 1, text: line.trim(), hits });
    }
  }
}

for (const v of violations) {
  console.log(`${v.file}:${v.line}: ${v.text}`);
  console.log(`    ^ 命中: ${v.hits.join(", ")}`);
}

const fileCount = files.length;
console.log(
  violations.length === 0
    ? `[rules:check] ${fileCount} file(s) scanned, 0 violation(s)`
    : `[rules:check] ${fileCount} file(s) scanned, ${violations.length} violation(s)`,
);
process.exit(violations.length === 0 ? 0 : 1);
