// 可行性原型 B 的对拍工具：增量表达式解析 vs 基线 ExpressionBuilder。
//
//   node tests/feas-operator/harness.mjs            # 默认用例
//   node tests/feas-operator/harness.mjs --verbose
//
// 口径：同一段源码 → 同一个真实 basic token 流（FeasRawTokenHost 收集）→
//   基线：new ExpressionBuilder(template, context).Load(units, 0).ParseExpression()
//   原型：new FeasOperatorParser(template, context).Load(units, 0).ParseExpression()
// 两者产出的形状树用 ToAstLine() 逐字节比较（标签名 = 运行时类名，所以类名 / 子节点顺序 / 嵌套关系全在比较范围内）。
//
// 原型不接主解析路径：这里只是独立入口，主路径行为不变（validate / AST 门读数与基线一致）。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const { SyntaxContext } = require(path.join(root, "build/ts/core/syntax/syntax-context.js"));
const { TextDocument } = require(path.join(root, "build/ts/typescript/run/text-document.js"));
const { TypescriptTemplate } = require(path.join(root, "build/ts/typescript/run/typescript-template.js"));
const { ExpressionBuilder } = require(path.join(root, "build/ts/typescript/tokens/expressions/expression-builder.js"));
const { FeasRawTokenHost } = require(path.join(root, "build/ts/typescript/tokens/expressions/feas-raw-token-host.js"));
const { FeasOperatorParser } = require(path.join(root, "build/ts/typescript/tokens/expressions/feas-operator-parser.js"));

const DEFAULT_CASES = [
  "1*2+3",
  "a+b*c",
  "a-b-c",
  "a*(b+c)",
  "-a+b",
  "a+b*c-d/e",
];

const verbose = process.argv.includes("--verbose");

/**
 * 用真实 basic token 收一段表达式源码。
 * 最后一个 basic token 没有「下一个 token」来触发关闭，这里补签出并关闭（等价 EOF 收尾）。
 */
function tokenize(text) {
  const template = TypescriptTemplate.Create();
  const host = new FeasRawTokenHost(template);
  const context = new SyntaxContext(host, 128);
  context.Process(new TextDocument(text, "case.ts"));
  const count = context.Index;
  let guard = 0;
  while (host.MountedUnit !== null && guard++ < 32) {
    const mounted = host.MountedUnit;
    if (mounted.SourceRange.End < 0) {
      mounted.SignOut(count);
    }
    if (!mounted.Closed) {
      mounted.TryToClose(context);
    }
    if (host.MountedUnit === mounted) {
      host.MountedUnit = null;
    } else {
      break;
    }
  }
  return { template, context, units: host.Data };
}

function baselineAstLine(text) {
  const { template, context, units } = tokenize(text);
  const builder = new ExpressionBuilder(template, context);
  builder.Load(units, 0);
  return builder.ParseExpression().ToAstLine(0);
}

function prototypeAstLine(text) {
  const { template, context, units } = tokenize(text);
  const parser = new FeasOperatorParser(template, context);
  parser.Load(units, 0);
  return parser.ParseExpression().ToAstLine(0);
}

function firstDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) {
      const from = Math.max(0, index - 60);
      return `第 ${index} 个字符起不同：\n  基线: ...${left.slice(from, index + 120)}\n  原型: ...${right.slice(from, index + 120)}`;
    }
  }
  if (left.length !== right.length) {
    return `长度不同：基线 ${left.length} / 原型 ${right.length}`;
  }
  return null;
}

function main() {
  let passed = 0;
  let failed = 0;
  for (const source of DEFAULT_CASES) {
    let problem = null;
    let baseline = null;
    let prototype = null;
    try {
      baseline = baselineAstLine(source);
    } catch (error) {
      problem = `基线异常：${error.message}`;
    }
    if (problem === null) {
      try {
        prototype = prototypeAstLine(source);
      } catch (error) {
        problem = `原型异常：${error.message}`;
      }
    }
    if (problem === null) {
      problem = firstDifference(baseline, prototype);
    }
    if (problem === null) {
      passed++;
      if (verbose) {
        console.log(`PASS  ${JSON.stringify(source)}`);
      }
    } else {
      failed++;
      console.log(`FAIL  ${JSON.stringify(source)}`);
      console.log(`      ${problem}`);
    }
  }
  console.log(`[feas-operator] cases=${DEFAULT_CASES.length} pass=${passed} fail=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
