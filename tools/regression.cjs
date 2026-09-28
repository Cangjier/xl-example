#!/usr/bin/env node
// golden 回归：对同一批输入，比较 ts 端口产出的 XML 与 C# 侧生成的基准 XML。
//
//     node tools/regression.cjs            跑全部夹具
//     node tools/regression.cjs 01 02      只跑名字里含 "01" 或 "02" 的夹具
//
// 基准由 C# 生成（不是 ts 自己生成的）：
//     powershell -File tools/golden/build-golden.ps1
//     dotnet tools/golden/out/Golden.dll tests/fixtures/inputs/<x>.ts tests/fixtures/xml/<x>.xml
//
// 退出码：0 = 全部逐字节一致；1 = 有不一致或异常。

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INPUT_DIR = path.join(ROOT, 'tests', 'fixtures', 'inputs');
const XML_DIR = path.join(ROOT, 'tests', 'fixtures', 'xml');

const { parseToXml } = require('./parse.cjs');

/** 找出两段文本第一个不同的位置，返回可读的上下文。 */
function describeDiff(expected, actual) {
  const limit = Math.min(expected.length, actual.length);
  let index = 0;
  while (index < limit && expected[index] === actual[index]) index += 1;
  if (index === limit && expected.length === actual.length) return null;
  const from = Math.max(0, index - 60);
  const window = (text) => JSON.stringify(text.slice(from, index + 60));
  return [
    `  首个差异在第 ${index} 个字符（基准长 ${expected.length}，实际长 ${actual.length}）`,
    `  基准: …${window(expected)}`,
    `  实际: …${window(actual)}`,
  ].join('\n');
}

function main(argv) {
  if (!fs.existsSync(INPUT_DIR)) {
    process.stderr.write(`找不到夹具输入目录：${INPUT_DIR}\n`);
    return 1;
  }
  const filters = argv.filter((a) => !a.startsWith('-'));
  const inputs = fs
    .readdirSync(INPUT_DIR)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => filters.length === 0 || filters.some((f) => name.includes(f)))
    .sort();

  if (inputs.length === 0) {
    process.stderr.write('没有匹配的夹具\n');
    return 1;
  }

  let passed = 0;
  const failures = [];

  for (const name of inputs) {
    const base = name.replace(/\.ts$/, '');
    const goldenPath = path.join(XML_DIR, `${base}.xml`);
    if (!fs.existsSync(goldenPath)) {
      failures.push(`${name}: 缺少基准 ${path.relative(ROOT, goldenPath)}`);
      continue;
    }
    const expected = fs.readFileSync(goldenPath, 'utf8');
    let actual;
    try {
      actual = parseToXml(fs.readFileSync(path.join(INPUT_DIR, name), 'utf8'));
    } catch (error) {
      failures.push(`${name}: 解析抛异常\n  ${error && error.stack ? error.stack.split('\n').slice(0, 4).join('\n  ') : error}`);
      continue;
    }
    if (actual === expected) {
      passed += 1;
      process.stdout.write(`  ok    ${name}\n`);
      continue;
    }
    const diff = describeDiff(expected, actual);
    failures.push(`${name}: XML 不一致\n${diff}`);
  }

  process.stdout.write(`\n${passed}/${inputs.length} 逐字节一致\n`);
  if (failures.length > 0) {
    process.stdout.write(`\n${failures.length} 个失败：\n`);
    for (const failure of failures) process.stdout.write(`- ${failure}\n`);
    return 1;
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
