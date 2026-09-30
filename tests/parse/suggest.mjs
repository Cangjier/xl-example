// 期望值覆盖率检查：找出「用例里明明有这个构造，却没在 xl:expect 里钉住它」的用例。
//
//   node tests/parse/suggest.mjs            只报告
//   node tests/parse/suggest.mjs --apply    把建议写回用例文件
//
// 它按 TypeScript 的 AST 判断用例里出现了哪些构造，再映射到 README 的标签表；
// 只做**有把握的**映射（例如只认 interface 里的成员，不认类型字面量里的成员，
// 因为类型字面量的成员节点本来就是个独立缺口）。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));

function suggestionsFor(source, name) {
  const kind = name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, kind);
  const parents = new Map();
  (function link(node) {
    ts.forEachChild(node, (child) => { parents.set(child, node); link(child); });
  })(sf);

  const found = new Set();
  const add = (...tags) => tags.forEach((t) => found.add(t));

  (function visit(node) {
    if (ts.isInterfaceDeclaration(node)) add("Interface", "InterfaceBody");
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) add("Class", "ClassBody");
    if (ts.isFunctionDeclaration(node)) add("Function", ...(node.body ? ["FunctionBody"] : []));
    if (ts.isEnumDeclaration(node)) add("Enum", "EnumBody");
    if (ts.isImportDeclaration(node)) add("Import");
    if (ts.isModuleDeclaration(node)) {
      if (node.name.kind !== ts.SyntaxKind.StringLiteral) add("Namespace", "NamespaceBody");
    }
    if (ts.isMethodDeclaration(node)) add("MethodDeclaration", ...(node.body ? ["MethodBody"] : []));
    if (ts.isGetAccessor(node) || ts.isSetAccessor(node)) add("MethodDeclaration");
    if (ts.isPropertyDeclaration(node)) add("Field");
    if (ts.isLabeledStatement(node)) add("Label");
    if (ts.isConditionalExpression(node)) add("TernaryOperator");
    if (ts.isArrowFunction(node)) add("Lamda", "LamdaParameters", "LamdaBody");
    if (ts.isNewExpression(node)) add("New", "NewType", "NewArguments");
    if (ts.isRegularExpressionLiteral(node)) add("RegexToken");
    if (ts.isAsExpression(node)) add("As");
    if (ts.isArrayLiteralExpression(node)) add("JsonArray");
    if (ts.isObjectLiteralExpression(node)) add("JsonObject");
    if (ts.isStringLiteral(node)) {
      // 只钉「值是字符串字面量」的位置：import/export 说明符与类型位不算
      const p = parents.get(node);
      if (p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p))) {
        /* skip */
      } else if (p && (ts.isLiteralTypeNode(p) || ts.isTypeAliasDeclaration(p) || ts.isPropertySignature(p))) {
        /* 类型位的字符串字面量：期望值结构未定，跳过 */
      } else {
        add("String", "ConstString");
      }
    }
    // interface 体内的成员（类型字面量里的不算）
    const isInterfaceMember = (n) => {
      let p = parents.get(n);
      while (p) {
        if (ts.isTypeLiteralNode(p)) return false;
        if (ts.isInterfaceDeclaration(p)) return true;
        if (ts.isClassDeclaration(p) || ts.isClassExpression(p)) return false;
        p = parents.get(p);
      }
      return false;
    };
    if ((ts.isPropertySignature(node) || ts.isMethodSignature(node) || ts.isIndexSignatureDeclaration(node)) && isInterfaceMember(node)) {
      add("Field");
    }
    // 单个声明符的变量声明
    if (ts.isVariableDeclaration(node)) {
      const list = parents.get(node);
      if (list && ts.isVariableDeclarationList(list) && list.declarations.length === 1) add("Let");
    }
    // 带类型实参的类型引用 → GenericType
    if (ts.isTypeReferenceNode(node) && node.typeArguments && node.typeArguments.length > 0) add("GenericType");
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.typeArguments && node.typeArguments.length > 0) add("GenericType");
    ts.forEachChild(node, visit);
  })(sf);
  return found;
}

const apply = process.argv.includes("--apply");
const cases = listCases();
let touched = 0;
for (const c of cases) {
  if (c.directives.tsInvalid) continue;
  const want = suggestionsFor(c.source, c.name);
  const conflict = [...want].filter((t) => c.directives.absent.includes(t));
  if (conflict.length) console.log(`SKIP ${c.id}：建议与 xl:absent 冲突（${conflict.join(",")}）`);
  const missing = [...want].filter((t) => !c.directives.expect.includes(t) && !c.directives.absent.includes(t));
  if (missing.length === 0) continue;
  console.log(`${c.id}`);
  console.log(`   已有: ${c.directives.expect.join(",") || "(空)"}`);
  console.log(`   建议补: ${missing.join(",")}`);
  if (!apply) continue;
  const lines = c.source.split("\n");
  const expectLine = lines.findIndex((l) => /^\/\/\s*xl:expect\b/.test(l));
  const merged = [...c.directives.expect, ...missing];
  if (expectLine >= 0) {
    lines[expectLine] = "// xl:expect " + merged.join(",");
  } else {
    let at = 0;
    while (at < lines.length && /^(\/\/\s*xl:|#!)/.test(lines[at])) at++;
    lines.splice(at, 0, "// xl:expect " + merged.join(","));
  }
  fs.writeFileSync(c.file, lines.join("\n"), "utf8");
  touched++;
}
console.log(`\n${cases.length} 条用例，${touched === 0 && !apply ? "以上为建议" : apply ? `已改写 ${touched} 条` : ""}`);
