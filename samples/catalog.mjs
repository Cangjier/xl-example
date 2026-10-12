// CatalogGuideToken / PossibleShape 的端到端演示：
// 向导攒 basic 单元 → basic token 关闭时向上通知 → **当且仅当只剩一个候选**就建成形状；
// 一个候选都不剩抛错。「接受」不短路（它和「不确定」在判定上同义）。
//
//   node samples/catalog.mjs
//
// 通用队列里**没有**装目录的入口分支（向导挂在哪里是语言层的决定），所以这里把向导直接挂在
// 根单元上：整个输入都先落到向导名下。
//
// 向导不覆写 `Process` / `Default`（与 `UnitToken` 一致），所以：
//   - 触发只有一条路径——子单元关闭 → 逐层上溯 → `NotifyClosed`；
//   - 末尾能触发，是因为向导自己的 `Close` 会把最后一个子单元也关掉（与 `Root` 同款）；
//   - 跳转队列接不了的字符落到 `Token.Default` 的抽象桩上，当场抛错。

import { CatalogGuideToken } from "../build/ts/core/syntax/catalog-guide-token.js";
import { Common } from "../build/ts/core/syntax/basic-tokens/common.js";
import { PossibleShape } from "../build/ts/core/syntax/possible-shape.js";
import { ShapeStates } from "../build/ts/core/syntax/shape-states.js";
import { ShapeIndependentToken } from "../build/ts/core/syntax/shape-independent-token.js";
import { SyntaxContext } from "../build/ts/core/syntax/syntax-context.js";
import { Template } from "../build/ts/core/syntax/templates/template.js";
import { ParsePipeline } from "../build/ts/dawn/text/parse-pipeline.js";
import { Root } from "../build/ts/dawn/text/tokens/root.js";
import { TextDocument } from "../build/ts/dawn/text/text-document.js";

/** 只认「一个 Common」的输入，返回它的文本；其余形状返回 null。 */
function singleText(units) {
  if (units.length !== 1) {
    return null;
  }
  const only = units[0];
  if (!(only instanceof Common)) {
    return null;
  }
  return only.Temp.join("");
}

/** 已攒下的单元是不是「一整块纯字母（或纯数字）」。 */
function classify(units, pattern) {
  const text = singleText(units);
  if (text === null) {
    return units.length === 0 ? ShapeStates.Uncertain : ShapeStates.Reject;
  }
  return pattern.test(text) ? ShapeStates.Uncertain : ShapeStates.Reject;
}

class LetterShape extends PossibleShape {
  Compute(units) {
    return classify(units, /^[A-Za-z]+$/);
  }
  Build(catalog) {
    return new LetterShapeToken(catalog.Template);
  }
}

class DigitShape extends PossibleShape {
  Compute(units) {
    return classify(units, /^[0-9]+$/);
  }
  Build(catalog) {
    return new DigitShapeToken(catalog.Template);
  }
}

/** 两个单元就「接受」。按本版判据，接受不短路——它只在「只剩我一个候选」时才被建。 */
class TwoUnitShape extends PossibleShape {
  Compute(units) {
    return units.length >= 2 ? ShapeStates.Accept : ShapeStates.Uncertain;
  }
  Build(catalog) {
    return new TwoUnitShapeToken(catalog.Template);
  }
}

/** 永远「不确定」，用来把候选数压在 2。 */
class AnyUnitShape extends PossibleShape {
  Compute() {
    return ShapeStates.Uncertain;
  }
  Build(catalog) {
    return new AnyUnitShapeToken(catalog.Template);
  }
}

class LetterShapeToken extends ShapeIndependentToken {}
class DigitShapeToken extends ShapeIndependentToken {}
class TwoUnitShapeToken extends ShapeIndependentToken {}
class AnyUnitShapeToken extends ShapeIndependentToken {}

/** 跑一遍输入。 */
function run(source, shapes) {
  const template = new Template().Initialize(ParsePipeline.Install);
  const document = new TextDocument(source);
  const context = new SyntaxContext(new Root(template));
  const guide = new CatalogGuideToken(template, shapes);
  context.Root.AddToMounted(guide);
  guide.SignIn(document.At(0));
  context.Process(document);
  return context.Root.ToString();
}

/** 把异常链上的消息连起来（`Token.Process` 会把内层异常包成 `SyntaxException`）。 */
function errorText(error) {
  const parts = [];
  let current = error;
  for (let depth = 0; depth < 12 && current !== null && current !== undefined; depth++) {
    parts.push(String(current.Message ?? current.message ?? current));
    current = current.InnerException;
  }
  return parts.join(" | ");
}

const cases = [
  {
    name: "只剩一个候选（字母）→ 末尾建成形状",
    source: "abc",
    shapes: [new LetterShape(), new DigitShape()],
    expected:
      "<Root><Statement><LetterShapeToken><Common>abc</Common></LetterShapeToken></Statement></Root>",
  },
  {
    name: "只剩一个候选（数字）→ 末尾建成形状",
    source: "12",
    shapes: [new LetterShape(), new DigitShape()],
    expected:
      "<Root><Statement><DigitShapeToken><Common>12</Common></DigitShapeToken></Statement></Root>",
  },
  {
    name: "basic token 关闭时只剩一个候选 → 当场建成形状",
    source: "(a)b",
    shapes: [new TwoUnitShape()],
    expected:
      '<Root><Statement><TwoUnitShapeToken><Bracket StartBracketChar="(" EndBracketChar=")"><Common>a</Common></Bracket></TwoUnitShapeToken><Common>b</Common></Statement></Root>',
  },
  {
    name: "一个候选都不剩 → 抛错",
    source: "abc",
    shapes: [new DigitShape()],
    error: "没有候选形状可以构成",
  },
  {
    name: "空目录 → 抛错（0 个候选同样是收不了场）",
    source: "abc",
    shapes: [],
    error: "没有候选形状可以构成",
  },
  {
    name: "多个候选到收尾都判不出来 → 向导留在树上",
    source: "(a)b",
    shapes: [new TwoUnitShape(), new AnyUnitShape()],
    expected:
      '<Root><Statement><CatalogGuideToken><Bracket StartBracketChar="(" EndBracketChar=")"><Common>a</Common></Bracket><Common>b</Common></CatalogGuideToken></Statement></Root>',
  },
  {
    name: "队列接不了的字符 → 落到 Token.Default 的抽象桩上抛错",
    source: "+",
    shapes: [new LetterShape(), new DigitShape()],
    error: "abstract member: Default",
  },
];

let failed = 0;
for (const item of cases) {
  let actual = null;
  let thrown = null;
  try {
    actual = run(item.source, item.shapes);
  } catch (error) {
    thrown = errorText(error);
  }

  let problem = null;
  if (item.error !== undefined) {
    if (thrown === null) {
      problem = `应当抛错（${JSON.stringify(item.error)}），实际产物：${actual}`;
    } else if (!thrown.includes(item.error)) {
      problem = `抛错内容不含 ${JSON.stringify(item.error)}：${thrown}`;
    }
  } else if (thrown !== null) {
    problem = `不该抛错：${thrown}`;
  } else if (actual !== item.expected) {
    problem = `产物不符：\n           expected: ${item.expected}\n           actual:   ${actual}`;
  }

  if (problem === null) {
    console.log(`ok       ${item.name}`);
    continue;
  }
  failed++;
  console.log(`DIFF     ${item.name}`);
  console.log(`         source: ${JSON.stringify(item.source)}`);
  console.log(`         ${problem}`);
}

process.exitCode = failed === 0 ? 0 : 1;
