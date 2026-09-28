#!/usr/bin/env node
// ts 端口的解析入口：源码字符串 → XML。
//
// 与 tools/golden/Program.cs 一步一步对应（那是 C# 侧的同一个入口）：
//
//     Owner owner = new();
//     TextDocument document = new(owner, script);
//     TextContext textContext = new(owner, InitialTemplate());
//     textContext.Process(document);
//     string xml = textContext.Root.ToString();
//
// 用法：
//     node tools/parse.cjs <输入文件> [输出文件]
//
// 不给输出文件就写标准输出。一律 UTF-8 无 BOM。

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BUILD = path.join(__dirname, '..', 'build');

function load(relPath) {
  return require(path.join(BUILD, relPath));
}

const { Owner } = load('owners/owner.js');
const { TextDocument } = load('dawn/text/text-document.js');
const { TextContext } = load('dawn/text/text-context.js');
const { Template } = load('core/syntax/templates/template.js');
const { StringGuideBranch } = load('dawn/text/tokens/string/string-guide.js');

// 复刻 cangjie-typesharp/TSScriptEngine.InitialTemplate：
// 给字符串引导符号加上反引号与单引号，并禁掉下划线当符号。
// ts 端与 C# 端必须用同一套模板配置，否则 XML 不可能逐字节一致。
function initialTemplate() {
  const template = new Template();
  template.BranchTemplate.AddModifyItem(StringGuideBranch, (branch) => {
    branch.AddStringChar('`');
    branch.AddStringChar("'");
  });
  template.SymbolTemplate.Ban(['_']);
  return template;
}

function parseToXml(script) {
  const owner = new Owner();
  const document = new TextDocument(owner, script);
  const textContext = new TextContext(owner, initialTemplate());
  textContext.Process(document);
  return textContext.Root.ToString();
}

function main(argv) {
  if (argv.length < 1) {
    process.stderr.write('usage: node tools/parse.cjs <inputFile> [outputFile]\n');
    return 2;
  }
  const inputPath = argv[0];
  const script = fs.readFileSync(inputPath, 'utf8');
  const xml = parseToXml(script);
  if (argv.length >= 2) {
    fs.mkdirSync(path.dirname(path.resolve(argv[1])), { recursive: true });
    fs.writeFileSync(argv[1], xml, 'utf8');
  } else {
    process.stdout.write(xml);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { parseToXml, initialTemplate };
