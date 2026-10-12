// CatalogGuide / PossibleShape 的端到端演示：
// 宿主（UnitToken 子类）攒 basic 单元 → basic token 关闭时逐层上溯找「实现了 IComputePossibleShapes 且
// CatalogGuide 非空」的宿主 → 宿主把向导叫起来 → **当且仅当只剩一个候选**就建成形状、顶替宿主；
// 一个候选都不剩抛错。「接受」不短路（它和「不确定」在判定上同义）。
//
//   node samples/catalog.mjs
//
// ⚠️ 跑不起来：旧语言层 dawn/（ParsePipeline / Root / TextDocument）已删除，下面的 import 会 MODULE_NOT_FOUND。
//
// 向导**不继承任何东西、不在树里**：攒下来的子单元与字符处理都归宿主，向导只在判定时被传进宿主。
// 所以：
//   - 宿主要有 BasicBranchQueue（收字符的是它），并把自己的 CatalogGuide 指到向导上；
//   - 触发只有一条路径——basic token 关闭 → 逐层上溯找宿主 → 宿主把向导叫起来；
//   - `PossibleShape.Build(host, catalog)` 要**返回建好的那个单元**，向导接着拿它跑 `BuildShapes`；
//   - 形状顶替的是**宿主**，不是向导（向导不在树里）。

import { CatalogGuide } from "../build/ts/core/syntax/catalog-guide.js";
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

/** 把建好的形状接进树里：按向导覆盖的范围签入签出、接管向导攒下的子单元、顶替向导；返回建好的单元。 */
/** 把建好的形状接进树里：按**宿主**覆盖的范围签入签出、接管宿主攒下的子单元、顶替宿主；返回建好的单元。 */
function install(host, built) {
  const parent = host.Parent;
  const start = host.SourceRange.Start;
  const end = host.SourceRange.End ?? host.LastSource;
  if (start !== null) {
    built.SignIn(start);
  }
  host.MoveDataTo(built);
  if (end !== null) {
    built.SignOut(end);
  }
  host.Replace(built);
  if (parent !== null && parent.MountedUnit === built) {
    parent.MountedUnit = null;
  }
  return built;
}

class LetterShape extends PossibleShape {
  Compute(units) {
    return classify(units, /^[A-Za-z]+$/);
  }
  Build(host, catalog) {
    return install(host, new LetterShapeToken(catalog.Template));
  }
}

class DigitShape extends PossibleShape {
  Compute(units) {
    return classify(units, /^[0-9]+$/);
  }
  Build(host, catalog) {
    return install(host, new DigitShapeToken(catalog.Template));
  }
}

/** 两个单元就「接受」。按本版判据，接受不短路——它只在「只剩我一个候选」时才被建。 */
class TwoUnitShape extends PossibleShape {
  Compute(units) {
    return units.length >= 2 ? ShapeStates.Accept : ShapeStates.Uncertain;
  }
  Build(host, catalog) {
    return install(host, new TwoUnitShapeToken(catalog.Template));
  }
}

/** 永远「不确定」，用来把候选数压在 2。 */
class AnyUnitShape extends PossibleShape {
  Compute() {
    return ShapeStates.Uncertain;
  }
  Build(host, catalog) {
    return install(host, new AnyUnitShapeToken(catalog.Template));
  }
}

class LetterShapeToken extends ShapeIndependentToken {}
class DigitShapeToken extends ShapeIndependentToken {}
class TwoUnitShapeToken extends ShapeIndependentToken {}
class AnyUnitShapeToken extends ShapeIndependentToken {}

/** 跑一遍输入。（⚠️ `Root` 来自已删除的 dawn/；这里只把新接线写清楚。） */
function run(source, shapes) {
  const template = new Template().Initialize(ParsePipeline.Install);
  const document = new TextDocument(source);
  const root = new Root(template);
  const context = new SyntaxContext(root);
  const guide = new CatalogGuide(template, shapes);
  // 向导不在树里：收字符与攒子单元都是**宿主**的事，所以两样都要接在宿主上。
  root.ProcessQueue = Template.BasicBranchQueue();
  root.CatalogGuide = guide;
  root.SignIn(document.At(0));
  context.Process(document);
  return root.ToString();
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
    name: "多个候选到收尾都判不出来 → 子单元留在宿主名下（向导不在树里）",
    source: "(a)b",
    shapes: [new TwoUnitShape(), new AnyUnitShape()],
    // ⚠️ 向导不再进树，产物里不会再有 <CatalogGuide> 这层壳。这条 expected 要等 dawn/ 回来、
    // 真跑一次之后重新基线化。
    expected:
      '<Root><Statement><Bracket StartBracketChar="(" EndBracketChar=")"><Common>a</Common></Bracket><Common>b</Common></Statement></Root>',
  },
  {
    name: "队列接不了的字符 → 落到宿主 Default 上抛错",
    source: "+",
    shapes: [new LetterShape(), new DigitShape()],
    // ⚠️ 兜底现在是**宿主**（Root）的 Default，不再是向导自己的抽象桩；具体消息等能跑时再定。
    error: "未知字符",
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
