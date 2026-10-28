import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const USAGE = `用法: node typescript/tools/ts-ast-line.mjs <file.ts> [options]

把 ts.createSourceFile 的 SourceFile 打印成类似 shape ToAstLine 的树。
固定使用 ts.forEachChild 的语义 AST，省略 EndOfFileToken。

选项:
  --out <file>   写入文件，而不是 stdout
  --help         显示本帮助
`;

function kindName(node) {
  return ts.SyntaxKind[node.kind] ?? String(node.kind);
}

function escape(value) {
  let result = "";
  for (const ch of value) {
    switch (ch) {
      case "\\":
        result += "\\\\";
        break;
      case '"':
        result += '\\"';
        break;
      case "\r":
        result += "\\r";
        break;
      case "\n":
        result += "\\n";
        break;
      case "\t":
        result += "\\t";
        break;
      default:
        result += ch;
        break;
    }
  }
  return result;
}

function hasText(node) {
  if (node.kind === ts.SyntaxKind.EndOfFileToken) {
    return false;
  }
  if (ts.isTokenKind(node.kind)) {
    return true;
  }
  return ts.isIdentifier(node)
    || ts.isPrivateIdentifier(node)
    || ts.isNumericLiteral(node)
    || ts.isStringLiteral(node)
    || ts.isBigIntLiteral(node)
    || ts.isRegularExpressionLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node);
}

function label(node, sourceFile) {
  const parts = [kindName(node)];
  parts.push(`pos=${node.pos}`);
  parts.push(`src=[${node.getStart(sourceFile)},${node.getEnd()})`);
  if (hasText(node)) {
    parts.push(`text="${escape(node.getText(sourceFile))}"`);
  }
  return parts.join("  ");
}

function childrenOf(node) {
  const result = [];
  ts.forEachChild(node, (child) => {
    result.push(child);
  });
  return result.filter((child) => child.kind !== ts.SyntaxKind.EndOfFileToken);
}

function render(node, sourceFile, depth) {
  const pad = " ".repeat(depth * 3);
  const cut = (depth + 1) * 3;
  const lines = [pad + label(node, sourceFile)];
  const children = childrenOf(node);
  for (let i = 0; i < children.length; i++) {
    const last = i === children.length - 1;
    const block = render(children[i], sourceFile, depth + 1).split("\n");
    lines.push(pad + (last ? "└─ " : "├─ ") + block[0].slice(cut));
    for (let j = 1; j < block.length; j++) {
      lines.push(pad + (last ? "   " : "│  ") + block[j].slice(cut));
    }
  }
  return lines.join("\n");
}

export function toAstLine(sourceFile) {
  if (!ts.isSourceFile(sourceFile)) {
    throw new TypeError("toAstLine 需要 ts.SourceFile");
  }
  return render(sourceFile, sourceFile, 0);
}

export function parseToAstLine(source, fileName = "source.ts") {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  return toAstLine(sourceFile);
}

export function writeAstLineFile(inputPath, outputPath) {
  const source = readFileSync(inputPath, "utf8");
  const text = parseToAstLine(source, inputPath);
  writeFileSync(outputPath, text + "\n", "utf8");
  return outputPath;
}

function main(argv) {
  let input = "";
  let output = "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(USAGE);
      return 0;
    }
    if (arg === "--out") {
      if (i + 1 >= argv.length) {
        process.stderr.write("--out 需要文件路径\n");
        return 2;
      }
      output = argv[++i];
      continue;
    }
    if (arg.startsWith("-")) {
      process.stderr.write(`未知参数: ${arg}\n\n${USAGE}`);
      return 2;
    }
    if (input.length > 0) {
      process.stderr.write(`只接受一个输入文件: ${arg}\n`);
      return 2;
    }
    input = arg;
  }
  if (input.length === 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  const source = readFileSync(input, "utf8");
  const text = parseToAstLine(source, input);
  if (output.length > 0) {
    writeFileSync(output, text + "\n", "utf8");
  } else {
    process.stdout.write(text + "\n");
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
