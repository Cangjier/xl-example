# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ConstString } from "../../../core/syntax/basic-tokens/string/const-string.xl.md"
import { InterpolationString } from "../../../core/syntax/basic-tokens/string/interpolation-string.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { LineTerminator } from "../../run/line-terminator.xl.md"
import { AsExpressionShape } from "../expressions/as-expression-shape.xl.md"
import { AwaitExpressionShape } from "../expressions/await-expression-shape.xl.md"
import { ArrowFunctionShape } from "../expressions/arrow-function-shape.xl.md"
import { BinaryExpressionShape } from "../expressions/binary-expression-shape.xl.md"
import { CallExpressionShape } from "../expressions/call-expression-shape.xl.md"
import { ConditionalExpressionShape } from "../expressions/conditional-expression-shape.xl.md"
import { DeleteExpressionShape } from "../expressions/delete-expression-shape.xl.md"
import { ElementAccessExpressionShape } from "../expressions/element-access-expression-shape.xl.md"
import { ArrayLiteralExpressionShape } from "../expressions/array-literal-expression-shape.xl.md"
import { NewExpressionShape } from "../expressions/new-expression-shape.xl.md"
import { NonNullExpressionShape } from "../expressions/non-null-expression-shape.xl.md"
import { ObjectLiteralExpressionShape } from "../expressions/object-literal-expression-shape.xl.md"
import { OmittedExpressionShape } from "../expressions/omitted-expression-shape.xl.md"
import { OperatorTable } from "../expressions/operator-table.xl.md"
import { ParenthesizedExpressionShape } from "../expressions/parenthesized-expression-shape.xl.md"
import { PostfixUnaryExpressionShape } from "../expressions/postfix-unary-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "../expressions/prefix-unary-expression-shape.xl.md"
import { PropertyAccessExpressionShape } from "../expressions/property-access-expression-shape.xl.md"
import { SpreadElementShape } from "../expressions/spread-element-shape.xl.md"
import { TemplateExpressionShape } from "../expressions/template-expression-shape.xl.md"
import { TemplateSpanShape } from "../expressions/template-span-shape.xl.md"
import { TypeOfExpressionShape } from "../expressions/type-of-expression-shape.xl.md"
import { VoidExpressionShape } from "../expressions/void-expression-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NoSubstitutionTemplateLiteralShape } from "../literals/no-substitution-template-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { TemplateHeadShape } from "../literals/template-head-shape.xl.md"
import { TemplateMiddleShape } from "../literals/template-middle-shape.xl.md"
import { TemplateTailShape } from "../literals/template-tail-shape.xl.md"
import { PropertyAssignmentShape } from "../members/property-assignment-shape.xl.md"
import { ShorthandPropertyAssignmentShape } from "../members/shorthand-property-assignment-shape.xl.md"
import { SpreadAssignmentShape } from "../members/spread-assignment-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { ShapeInsertUtil } from "../shape-insert-util.xl.md"
import { BlockShape } from "../statements/block-shape.xl.md"
import { StatementTokenSets } from "../statements/statement-token-sets.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectObjectMemberAssembly } from "./direct-object-member-assembly.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

表达式直建引擎：token 一关闭就建节点。两层状态（等操作数 / 等运算符）+ 二元 frame 栈的优先级旋转 +
括号嵌套引擎 + 前缀/后缀一元 + **R2 的表达式补全**（字面量与关键字、数组/对象、调用/成员/下标/new/可选链、
赋值/条件/逗号/as/非空、typeof/void/delete）与 **C1 的行终止符守卫**。
**不做 fallback**：范围外构造 `Fail`（= Decline），接不上的单元只 `Held`。

# class DirectExpressionEngine

```txt
2*3+1   -> BinaryExpressionShape(+)[ BinaryExpressionShape(*)[2,*,3], +, 1 ]
2*(3+1) -> BinaryExpressionShape(*)[2, *, ParenthesizedExpressionShape(+(3,1))]
-a*+b   -> BinaryExpressionShape(*)[ -a, *, +b ]
a**b**c -> BinaryExpressionShape(**)[a, **, BinaryExpressionShape(**)[b, **, c]]
a.b!    -> NonNullExpressionShape(PropertyAccessExpressionShape[a, b])
a ? b:c -> ConditionalExpressionShape[a, ?, b, :, c]（FrameStages 的 StageColon/StageFalse）
new a.b()-> NewExpressionShape[PropertyAccessExpressionShape[a, b]]
a⏎++b   -> 第一层在 `a` 收口（C1：换行后的 ++ 属于下一条语句，Hold 不 Fail）
```

## static field ExpectOperand:int = 1

## static field ExpectOperator:int = 2

## static field StageDone:int = 0

## static field StageOperand:int = 1

## static field StageColon:int = 2

## static field StageFalse:int = 3

## static field PostfixNone:int = 0

## static field PostfixDot:int = 1

## static field PostfixQuestionDot:int = 2

## static field CondPrecedence:int = 2

条件表达式在栈上的优先级位：低于 `??`(4) 高于赋值(0)。只活在本引擎里，**不改** `OperatorTable`。

## field Template:Template

## field Context:SyntaxContext

## field BasePos:int

## field Units:Array<Token> = []

## field Ingested:int = 0

## field PreviousEnd:int = -1

## field Frames:Array<Token> = []

## field FramePrecs:Array<int> = []

## field FrameStages:Array<int> = []

与 `Frames` 平行的阶段位（R2 唯一的契约字段语义扩展，见 R2-CONTRACT §4.2）：
`StageOperand` 等右操作数、`StageColon` 条件真分支已挂、等 `:`、`StageFalse` 等假分支、`StageDone` 可出栈。

## field FramePending:Array<bool> = []

R1 契约字段**保留**，语义 = `FrameStages[i] == StageOperand`（由 `FrameStages` 单向派生，两者一起维护）。

## field Prefixes:Array<Token> = []

## field PendingOperand:Token | null = null

## field Expect:int = 1

## field Declined:bool = false

## field Reason:string = ""

## field Inserts:int = 0

## field Root:Token | null = null

## field Held:bool = false

## field HeldAt:int = -1

## field LayerEnded:bool = false

## field PreviousUnit:Token | null = null

C1 守卫用的「上一个代码单元」（两条摄入路径都维护，见 `IngestUnit`）。

## field NewPending:Token | null = null

A3 `new`：已建但还没收口的 `NewExpressionShape`（被构造者后缀链还在长）。

## field NewArgsSeen:bool = false

A3 `new`：实参括号已消费（之后紧跟的 `(` 属于「new 之后再调用」，本轮 Decline）。

## field PostfixWait:int = 0

成员访问等待位：`PostfixDot` / `PostfixQuestionDot` 表示上一格是 `.` / `?.`，这一格是名字或实参表。

## field PostfixUnit:Token | null = null

## field PostfixPos:int = -1

## field AsPending:bool = false

## field AsUnit:Token | null = null

## field AsExpr:Token | null = null

## field AsUnits:Array<Token> = []

## field AsPositions:Array<int> = []

## field AngleDepth:int = 0

泛型实参判定的流式替代（引擎没有前瞻）：本层 `<` 打开的角括号深度。

## field PrevAngleClose:Token | null = null

刚刚把某个 `<` 合上的那个 `>` 单元。它只在 `PreviousUnit` 正好等于它时才有意义——
即「`>` 后面紧跟着一个 `(`」，TS 会把它读成泛型实参调用（`f<T>(1)`），本轮不做，必须显式 Decline。

## field ParamWait:bool = false

**R3-B2-2 箭头（§4.3.3）**：上一格是「**可能**是箭头参数表」的 `(` 括号，等这一格判是不是 `=>`。
引擎没有前瞻，所以 `(` 不能当场决定：参数表形态的括号**先挂起一格**，是 `=>` 就建箭头，
否则退回原来的 `IngestParen`（括号表达式 / 调用实参都不是这里的事）。

## field ParamBracket:Bracket | null = null

挂起中的参数表括号（`ParamWait` 为真时有效）。

## field ParamPos:int = -1

挂起中的参数表括号的 Pos（= 传进来那一格的 pos，含前导 trivia）。

## field ArrowPending:Token | null = null

**R3-B2-2**：已经建好（参数 + `=>` 都挂上）但**体还没收口**的 `ArrowFunctionShape`。
体是表达式时由一个**子引擎**吃剩下所有单元（嵌套箭头 `a => b => c` 因此是递归的），
体是 `{…}` 时当场建块。收口后 `TakeOperand(arrow)`，与普通操作数同一条通道。

## field ArrowBody:DirectExpressionEngine | null = null

箭头的**表达式体**子引擎（懒建：第一个体单元到达时才 new，`BasePos` = 那一格的 pos）。

## field AsyncPending:Token | null = null

**R5-D3-b（R5-CONTRACT §4.6-B）**：语句首的 `async` 单元。引擎没有前瞻，`async` 到底是
「async 箭头的 AsyncKeyword」还是「名叫 async 的标识符（调用 `async(a)` / 成员 `async.b`）」，
要看**下一格**：`async` + `(` ⇒ 挂起参数表等 `=>`；否则退回标识符 + 正常后缀链。
这一格只在等待下一格时非空，`IngestCode` 的第一个分支就把它消费掉。

## field AsyncPendingPos:int = -1

挂起中的 `async` 的 Pos（= 传进来那一格的 pos，含前导 trivia）。

## field AsyncParams:bool = false

挂起中的参数表括号是「`async` 之后的那个 `(`」（`ParamWait` 为真时有效）：命中 `=>` 就把
`AsyncKeywordShape` 作为 `ArrowFunction` 的**第一个**子节点（tsc 实测顺序 `[AsyncKeyword, Parameter…, =>, body]`）。

## constructor:(template:Template, context:SyntaxContext, basePos:int)=>void

```ts
this.Template = template;
this.Context = context;
this.BasePos = basePos;
// `Root` 是**容器**（holder）：顶层操作数、括号、二元 frame 都挂在它下面；`Finish` 返回它唯一的子节点。
this.Root = new ShapeToken(template);
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## method IngestAll:(units:Array<Token>)=>void

```ts
// 与 `StatementOperatorBody.IngestAll` 同构的增量循环：幂等（只处理 `Ingested` 之后的新单元）、
// 不改 `units` / 不改任何 raw token。Pos 口径与 `ExpressionBuilder.Load` 逐位一致：
// 首个非 trivia 单元用 `BasePos`，其后用上一个非 trivia 单元的 `EndIndex`（DESIGN §4.3 / R1）。
this.Units = units;
while (this.Ingested < units.length && !this.Declined && !this.Held && !this.LayerEnded) {
  const unit = units[this.Ingested];
  if (unit.IsTriviaToken) {
    this.Ingested += 1;
    continue;
  }
  const pos = this.PreviousEnd < 0 ? this.BasePos : this.PreviousEnd;
  if (unit.SourceRange.EndIndex >= 0) {
    this.PreviousEnd = unit.SourceRange.EndIndex;
  }
  this.IngestUnit(unit, pos);
  this.Ingested += 1;
}
```

## method IngestUnit:(unit:Token, pos:int)=>void

```ts
if (this.Declined || this.Held || this.LayerEnded) {
  return;
}
if (unit.IsTriviaToken) {
  return;
}
this.IngestCode(unit, pos);
// C1：只有**成功消费**的代码单元才成为「上一个代码单元」（Declined / Held / LayerEnded 时不动）。
if (!this.Declined && !this.Held && !this.LayerEnded) {
  this.PreviousUnit = unit;
}
```

## private method IngestCode:(unit:Token, pos:int)=>void

```ts
// 三个「非普通」入口先分流：后缀等待位、`as` 的类型缓冲、余下的等操作数 / 等运算符。
// R3-B2-2 再加两个：挂起中的箭头参数表（等 `=>`）、以及箭头体（整段尾巴交给子引擎）。
// R5-D3-b 再加一个：挂起中的 `async` 头（等下一格判「箭头」还是「标识符」）。注意它必须排在
// `ParamWait` **之后**：`async (` 已挂起参数表时，下一格 `=>` 属于参数表那一格，不是 async 头那一格。
if (this.ParamWait) {
  this.IngestAfterParams(unit, pos);
  return;
}
if (this.ArrowPending !== null) {
  this.IngestArrowPart(unit, pos);
  return;
}
if (this.AsyncPending !== null) {
  this.IngestAfterAsyncHead(unit, pos);
  return;
}
if (this.PostfixWait !== DirectExpressionEngine.PostfixNone) {
  this.IngestPostfixPart(unit, pos);
  return;
}
if (this.AsPending) {
  this.IngestAsPart(unit, pos);
  return;
}
const text = DirectTokenUtil.TextOf(unit);
if (this.Expect === DirectExpressionEngine.ExpectOperand) {
  this.IngestOperand(unit, text, pos);
  return;
}
this.IngestOperator(unit, text, pos);
```

## method IsComplete:()=>bool

```ts
// 「再调一次 Finish 会不会成功」。末尾那个 `PendingOperand` 会补进栈顶那个「等右操作数」的 frame，
// 所以它还在时不能因为 frame 未完成就报不完整。
if (this.Declined || this.Held) {
  return false;
}
if (this.ParamWait || this.ArrowPending !== null) {
  // R3-B2-2：参数表还挂着 / 箭头体还没收口 ⇒ 不完整。
  return false;
}
if (this.PostfixWait !== DirectExpressionEngine.PostfixNone || this.AsPending) {
  return false;
}
let roots = this.Root === null ? 0 : this.Root.Data.length;
if (this.PendingOperand !== null || this.NewPending !== null) {
  for (let index = 0; index < this.FrameStages.length - 1; index++) {
    if (this.FrameStages[index] !== DirectExpressionEngine.StageDone) {
      return false;
    }
  }
  if (this.Frames.length === 0) {
    return roots === 0 && this.NewPending === null;
  }
  return roots === 1;
}
for (const stage of this.FrameStages) {
  if (stage !== DirectExpressionEngine.StageDone) {
    return false;
  }
}
if (this.Prefixes.length > 0) {
  return false;
}
return roots === 1;
```

## method Finish:()=>Token | null

```ts
// 收尾：先补最后那个操作数（前缀在 FlushOperand 里包在操作数外），再收掉所有完整 frame。
// `Held` 不是失败：它只表示「后面那个单元可能不属于本层」，留给 session 判边界（DESIGN §4.6）。
// R2：`as` 的类型缓冲、`new` 的收口、后缀等待位都要在这里先结算，否则会漏掉半个节点。
if (this.Declined) {
  return null;
}
if (!this.FlushAllAs()) {
  return null;
}
// R5-D3-b：挂起到最后的 `async`（后面再没有单元）是标识符操作数 —— 先冲成操作数再照常收尾。
// 例：`async` 单独作为一个实参 / 属性值（`f(async)` / `{ a: async }`），以及 `async` 结尾的片段。
if (this.AsyncPending !== null) {
  const asyncUnit = this.AsyncPending;
  const asyncPos = this.AsyncPendingPos;
  this.AsyncPending = null;
  this.AsyncPendingPos = -1;
  this.AsyncParams = false;
  const identifier = IdentifierShape.FromBasicToken(asyncUnit as Common, this.Context);
  identifier.Pos = asyncPos;
  this.TakeOperand(identifier);
}
// R3-B2-2：挂起到最后的参数表是**普通括号**（后面没有 `=>`）；箭头体则在这里收口。
if (this.ParamWait) {
  const waitingBracket = this.ParamBracket;
  const waitingPos = this.ParamPos;
  this.ParamWait = false;
  this.ParamBracket = null;
  this.ParamPos = -1;
  if (waitingBracket === null) {
    this.Fail("箭头参数表丢失");
    return null;
  }
  this.IngestParen(waitingBracket, waitingPos);
  if (this.Declined) {
    return null;
  }
}
if (this.ArrowPending !== null) {
  if (!this.FinishArrowBody()) {
    return null;
  }
}
if (this.PostfixWait !== DirectExpressionEngine.PostfixNone) {
  this.Fail("成员访问缺少标识符");
  return null;
}
this.CloseNew();
if (this.Declined) {
  return null;
}
this.FlushOperand();
for (const stage of this.FrameStages) {
  if (stage === DirectExpressionEngine.StageOperand) {
    this.Fail("二元运算符缺少右操作数");
    return null;
  }
  if (stage === DirectExpressionEngine.StageColon) {
    this.Fail("条件表达式缺少冒号");
    return null;
  }
  if (stage === DirectExpressionEngine.StageFalse) {
    this.Fail("条件表达式缺少假分支");
    return null;
  }
}
this.CompleteAllFrames();
if (this.Frames.length !== 0 || this.Prefixes.length !== 0 || this.PendingOperand !== null) {
  this.Fail("表达式没有闭合");
  return null;
}
if (this.Root === null || this.Root.Data.length !== 1) {
  this.Fail("表达式没有唯一的根节点");
  return null;
}
return this.Root.Data[0];
```

## method Fail:(reason:string)=>void

```ts
// 显式 Decline（范围外构造 / 不完整）：只置位 + 记原因，**不抛**；strict 由 session 在 Decline 时统一处理。
if (this.Declined) {
  return;
}
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Trace("engine-decline: " + reason);
```

## private method IsRestrictedPostfix:(text:string)=>bool

```ts
// 与 `OperatorTable.IsPrefixOperator` 同源的受限后缀集合：这些都**不能跨行**当后缀
// （TS `parsePostfixExpressionOrHigher` 的 `scanner.hasPrecedingLineBreak()` 守卫，见 statement-operator-body:569）。
// 闭集**只有一份**，在 `StatementTokenSets.IsRestrictedPostfixText`（R5-C3 单一来源，R5-CONTRACT §4.8；
// 与 `StatementBoundaryUtil.IsRestrictedPostfixUnit` 共用同一张表）。R4 的 `~` / `typeof`、R5-A2 的
// `as` / `satisfies` 都在那里维护。语义仍是 Hold（不是 Fail）：边界层把语句切开后，壳里可能还带进
// 下一段的受限后缀（`let x = a⏎~b` / `let x = a⏎as b`），引擎这一侧若不 Hold 就会把它当后缀吃掉。
return StatementTokenSets.IsRestrictedPostfixText(text);
```

## private method TakeOperand:(operand:Token)=>void

```ts
this.PendingOperand = operand;
this.Expect = DirectExpressionEngine.ExpectOperator;
```

## private method SpanFromTo:(shape:ShapeToken, first:Token, endIndex:int)=>void

```ts
// 组合节点的区间口径（R1 不变）：起点 = 第一个子单元的**代码**起点、Pos = 第一个子单元的 Pos（含前导 trivia）、
// 终点 = 最后一个字符的下一个位置。
if (shape.SourceRange.StartIndex < 0 && first.SourceRange.StartIndex >= 0) {
  shape.SignIn(first.SourceRange.StartIndex);
}
if (shape.Pos < 0 && first instanceof ShapeToken) {
  const firstShape = first as ShapeToken;
  if (firstShape.Pos >= 0) {
    shape.Pos = firstShape.Pos;
  }
}
if (shape.SourceRange.EndIndex < 0 && endIndex >= 0) {
  shape.SignOut(endIndex);
}
shape.TryToClose(this.Context);
```

## private method KeywordOrLiteral:(unit:Token, text:string, pos:int)=>Token | null

```ts
// 字面量 / 关键字操作数一律走 `DirectTokenUtil.LiteralOperand`（唯一判定入口）。
return DirectTokenUtil.LiteralOperand(unit, text, pos, this.Template, this.Context);
```

## private method IngestOperand:(unit:Token, text:string, pos:int)=>void

```ts
if (unit instanceof Common) {
  const common = unit as Common;
  if (text === "new") {
    this.StartNew(unit, pos);
    return;
  }
  if (text === "typeof" || text === "void" || text === "delete") {
    this.IngestKeywordPrefix(unit, text, pos);
    return;
  }
  // R5-D3-b（R5-CONTRACT §4.6）：`await` = 一元前缀（与 typeof 同级）；`async` = 待定的箭头头。
  if (text === "await") {
    this.IngestAwaitPrefix(unit, pos);
    return;
  }
  if (text === "async") {
    // 引擎没有前瞻：`async` 到底是 AsyncKeyword 还是标识符，要看**下一格**。
    this.AsyncPending = unit;
    this.AsyncPendingPos = pos;
    return;
  }
  const literal = this.KeywordOrLiteral(unit, text, pos);
  if (literal !== null) {
    this.TakeOperand(literal);
    return;
  }
  if (DirectTokenUtil.StartsNumber(text)) {
    this.Fail("数值字面量不在本轮范围（数值后缀）: " + text);
    return;
  }
  if (DirectTokenUtil.IsIdentifierOperand(unit)) {
    const identifier = IdentifierShape.FromBasicToken(common, this.Context);
    identifier.Pos = pos;
    this.TakeOperand(identifier);
    return;
  }
  this.Fail("字面量 / 关键字不在本轮范围: " + text);
  return;
}
if (unit instanceof String) {
  if (DirectTokenUtil.IsTemplateUnit(unit, this.Template)) {
    this.ParseTemplate(unit as String, pos);
    return;
  }
  const literal = this.KeywordOrLiteral(unit, "", pos);
  if (literal === null) {
    this.Fail("字符串字面量不在本轮范围");
    return;
  }
  this.TakeOperand(literal);
  return;
}
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar === "(") {
    // R3-B2-2：参数表形态的括号先挂起一格（等 `=>`）；不是箭头就退回 IngestParen。
    // **泛型实参调用（`a<b>(c)` / `new A<T>()`）不许挂起**：R2 的口径是「在 Ingest 期就 Decline」
    // （`IngestParen` 的同一条 `PrevAngleClose` 守卫，category `expr.decline`）。挂起会把这次 Fail
    // 推迟到 `Finish`，而 session 把 `Finish` 的失败记成 `Incomplete` 而不是 `Declined`——
    // 那就是 R2-A9/A4 的口径回归（实测 `a<b>(c)` / `new A<T>()` 两条）。所以这一条守卫必须在
    // 「挂起」之前原样判一次：命中就直接走老路。
    if (this.PrevAngleClose !== null && this.PrevAngleClose === this.PreviousUnit) {
      this.IngestParen(bracket, pos);
      return;
    }
    if (this.CouldBeArrowParameters(bracket)) {
      this.ParamWait = true;
      this.ParamBracket = bracket;
      this.ParamPos = pos;
      return;
    }
    this.IngestParen(bracket, pos);
    return;
  }
  if (bracket.StartBracketChar === "[") {
    this.IngestArray(bracket, pos);
    return;
  }
  if (bracket.StartBracketChar === "{") {
    this.IngestObject(bracket, pos);
    return;
  }
  this.Fail("表达式里出现了不支持的括号: " + bracket.StartBracketChar);
  return;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  // 一元前缀：符号族的六个 + 关键字族的 typeof / void / delete（后者在上面的 Common 分支里）。
  const supported = text === "!" || text === "~" || text === "+" || text === "-"
    || text === "++" || text === "--";
  if (!supported || !OperatorTable.IsPrefixOperator(text)) {
    this.Fail("操作数位置上的符号不在本轮范围: " + (text === "" ? "符号" : text));
    return;
  }
  const prefix = new PrefixUnaryExpressionShape(this.Template);
  if (symbol.SourceRange.StartIndex >= 0) {
    prefix.SignIn(symbol.SourceRange.StartIndex);
  }
  prefix.Pos = pos;
  // 运算符 token 只做字段、不进 Data（TS 的 PrefixUnaryExpression children 只有 operand）。
  (prefix as any).OperatorToken = unit;
  this.Prefixes.push(prefix);
  this.Expect = DirectExpressionEngine.ExpectOperand;
  return;
}
this.Fail("操作数位置上的单元不在本轮范围");
```

## private method IngestKeywordPrefix:(unit:Token, text:string, pos:int)=>void

```ts
// A5：`typeof a` / `void 0` / `delete a.b` 与符号族一元前缀同构——关键字 token 不进 Data，
// 只做区间起点与字段。终点在 FlushOperand 里按操作数封。
let shape:ShapeToken;
if (text === "typeof") {
  shape = new TypeOfExpressionShape(this.Template);
} else if (text === "void") {
  shape = new VoidExpressionShape(this.Template);
} else {
  shape = new DeleteExpressionShape(this.Template);
}
if (unit.SourceRange.StartIndex >= 0) {
  shape.SignIn(unit.SourceRange.StartIndex);
}
shape.Pos = pos;
(shape as any).OperatorToken = unit;
this.Prefixes.push(shape);
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## private method IngestAwaitPrefix:(unit:Token, pos:int)=>void

```ts
// R5-D3-b（R5-CONTRACT §4.6-A）：`await` 进「前缀操作数」那一格，与 `typeof` 同级 ⇒ 优先级 = 一元前缀。
// 因此 `await g() + 1` = `BinaryExpression[AwaitExpression[Call], 1]`（= `(await g()) + 1`），
// `await a.b!` = `NonNull(Await(PropertyAccess))`，`-await a` = `Prefix(-)[Await[a]]`。
// `await` token **不进 Data**（TS 的 AwaitExpression children 只有 operand），只做 Pos / 区间起点。
// **不做上下文判定**（R5-Q5 裁决）：`function a2() { await g(); }` 的 tsc 同样建 AwaitExpression（实测
// parseDiagnostics=0、`AwaitExpression[CallExpression g]`），所以「壳存在即建」与 tsc 一致；
// 裸 `await;` 这种「后面没有操作数」的形态会在操作数位置 Fail ⇒ session Decline ⇒ 旧路径照旧建 Identifier。
const shape = new AwaitExpressionShape(this.Template);
if (unit.SourceRange.StartIndex >= 0) {
  shape.SignIn(unit.SourceRange.StartIndex);
}
shape.Pos = pos;
(shape as any).OperatorToken = unit;
this.Prefixes.push(shape);
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## private method StartNew:(unit:Token, pos:int)=>void

```ts
// A3：`new` 不是前缀节点（它包住整条被构造者后缀链），先挂一个「没收口的 NewExpression」，
// 后缀链在 PendingOperand 上照常长，收口时再把它塞成第一个子节点。
if (this.NewPending !== null) {
  this.Fail("new 之后又是 new，不在本轮范围");
  return;
}
const shape = new NewExpressionShape(this.Template);
if (unit.SourceRange.StartIndex >= 0) {
  shape.SignIn(unit.SourceRange.StartIndex);
}
shape.Pos = pos;
this.NewPending = shape;
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## private method CloseNew:()=>void

```ts
// 收口 `new X`（无实参形态）：被构造者的后缀链已经长完，整体塞进 NewExpression。
if (this.NewPending === null) {
  return;
}
const shape = this.NewPending as ShapeToken;
const operand = this.PendingOperand;
this.NewPending = null;
if (operand === null) {
  this.Fail("new 缺少被构造者");
  return;
}
this.PendingOperand = null;
shape.Add(operand);
this.SpanFromTo(shape, operand, operand.SourceRange.EndIndex);
this.TakeOperand(shape);
```

## private method CloseNewWithArgs:(bracket:Bracket, operand:Token)=>void

```ts
const shape = this.NewPending as ShapeToken;
this.NewPending = null;
this.NewArgsSeen = true;
const args = this.ParseArguments(bracket);
if (args === null) {
  return;
}
this.PendingOperand = null;
shape.Add(operand);
for (const arg of args) {
  shape.Add(arg);
}
this.SpanFromTo(shape, operand, bracket.SourceRange.EndIndex);
// 标记：这个 NewExpression 已经吃过实参表，紧跟的 `(` 属于「new 之后再调用」（本轮 Decline）。
(shape as any).DirectNewWithArgs = true;
this.TakeOperand(shape);
```

## private method IngestParen:(bracket:Bracket, pos:int)=>void

```ts
// 括号 = 嵌套引擎（DESIGN §4.3）：`bracket.Data` 里没有两侧括号本身，内层用 `(` 之后的位置作 BasePos。
if (this.PrevAngleClose !== null && this.PrevAngleClose === this.PreviousUnit) {
  this.Fail("泛型实参调用不在本轮范围");
  return;
}
const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
const inner = new DirectExpressionEngine(this.Template, this.Context, base);
inner.IngestAll(bracket.Data);
if (inner.Declined) {
  this.Fail("括号内表达式：" + inner.Reason);
  return;
}
if (inner.Held) {
  this.Fail("括号内表达式没有读完");
  return;
}
// R2（§3.3.4）：内层在 `;` / 非法分隔符处提前收口 = 括号内容非法，不能当成「只建了前一半」。
if (inner.LayerEnded) {
  this.Fail("括号内表达式提前收口");
  return;
}
const value = inner.Finish();
if (value === null) {
  this.Fail("括号内表达式不完整: " + inner.Reason);
  return;
}
// 括号节点区间含两侧括号（Pos 仍按 unitPos，含 `(` 前的 trivia）。
const paren = new ParenthesizedExpressionShape(this.Template);
paren.Add(value);
if (bracket.SourceRange.StartIndex >= 0) {
  paren.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  paren.SignOut(bracket.SourceRange.EndIndex);
}
paren.Pos = pos;
paren.TryToClose(this.Context);
this.TakeOperand(paren);
```

## private method IngestArray:(bracket:Bracket, pos:int)=>void

```ts
// A2：数组字面量。空槽（`[1, , 3]`）是零宽 OmittedExpression，口径照抄
// `ExpressionBuilder.ParseArrayLiteral`：槽位起点是「上一个逗号之后那一格」。
const data = bracket.Data;
const reference = bracket.SourceRange.StartIndex;
let slotStart = reference >= 0 ? reference + 1 : 0;
let expectValue = true;
let at = 0;
const shape = new ArrayLiteralExpressionShape(this.Template);
while (at < data.length) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    at += 1;
    continue;
  }
  const text = DirectTokenUtil.TextOf(unit);
  if (text === ",") {
    if (expectValue && reference >= 0 && slotStart > 0) {
      const omitted = new OmittedExpressionShape(this.Template);
      // 区间取 [slotStart-1, slotStart)，`Pos` 仍是 slotStart（= TS 的 pos == end）。
      omitted.SourceRange.Start = slotStart - 1;
      omitted.SourceRange.End = slotStart;
      omitted.Pos = slotStart;
      omitted.TryToClose(this.Context);
      shape.Add(omitted);
    }
    expectValue = true;
    if (unit.SourceRange.EndIndex >= 0) {
      slotStart = unit.SourceRange.EndIndex;
    }
    at += 1;
    continue;
  }
  let end = at;
  while (end < data.length) {
    const scan = data[end];
    if (!scan.IsTriviaToken && DirectTokenUtil.TextOf(scan) === ",") {
      break;
    }
    end += 1;
  }
  if (text === "...") {
    const spreadBase = unit.SourceRange.EndIndex >= 0 ? unit.SourceRange.EndIndex : slotStart;
    const inner = this.BuildSlice(data.slice(at + 1, end), spreadBase, "数组展开元素");
    if (inner === null) {
      return;
    }
    const spread = new SpreadElementShape(this.Template);
    spread.Add(inner);
    if (unit.SourceRange.StartIndex >= 0) {
      spread.SignIn(unit.SourceRange.StartIndex);
    }
    if (inner.SourceRange.EndIndex >= 0) {
      spread.SignOut(inner.SourceRange.EndIndex);
    }
    spread.Pos = slotStart;
    spread.TryToClose(this.Context);
    shape.Add(spread);
  } else {
    const value = this.BuildSlice(data.slice(at, end), slotStart, "数组元素");
    if (value === null) {
      return;
    }
    shape.Add(value);
  }
  expectValue = false;
  at = end;
}
if (reference >= 0) {
  shape.SignIn(reference);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
}
shape.Pos = pos;
shape.TryToClose(this.Context);
this.TakeOperand(shape);
```

## private method IngestObject:(bracket:Bracket, pos:int)=>void

```ts
// A2：对象字面量。成员按**顶层逗号**切段（括号 / 计算属性名里的逗号在各自的 Bracket 里，不会串层）。
const data = bracket.Data;
const reference = bracket.SourceRange.StartIndex;
// 成员的 `Positions` base = 对象 `{` 之后第一个字符（= legacy `Load(bracket.Data, StartIndex+1)`）；
// 成员方法体里的 `BlockFrom` 也读同一张表。
const memberBase = reference >= 0 ? reference + 1 : 0;
let slotStart = reference >= 0 ? reference + 1 : 0;
let at = 0;
const shape = new ObjectLiteralExpressionShape(this.Template);
while (at < data.length) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    at += 1;
    continue;
  }
  if (DirectTokenUtil.TextOf(unit) === ",") {
    if (unit.SourceRange.EndIndex >= 0) {
      slotStart = unit.SourceRange.EndIndex;
    }
    at += 1;
    continue;
  }
  let end = at;
  while (end < data.length) {
    const scan = data[end];
    if (!scan.IsTriviaToken && DirectTokenUtil.TextOf(scan) === ",") {
      break;
    }
    end += 1;
  }
  if (!this.BuildObjectMember(shape, data, at, end, slotStart, memberBase)) {
    return;
  }
  at = end;
}
if (reference >= 0) {
  shape.SignIn(reference);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
}
shape.Pos = pos;
shape.TryToClose(this.Context);
this.TakeOperand(shape);
```

## private method BuildObjectMember:(shape:ShapeToken, data:Array<Token>, from:int, to:int, memberPos:int, memberBase:int)=>bool

```ts
const first = data[from];
const firstText = DirectTokenUtil.TextOf(first);
const at = first.SourceRange.StartIndex >= 0 ? first.SourceRange.StartIndex : 0;
if (firstText === "...") {
  const spreadBase = first.SourceRange.EndIndex >= 0 ? first.SourceRange.EndIndex : at;
  const expression = this.BuildSlice(data.slice(from + 1, to), spreadBase, "对象展开属性");
  if (expression === null) {
    return false;
  }
  const spread = SpreadAssignmentShape.FromExpression(first, expression, this.Context);
  spread.Pos = memberPos;
  shape.Add(spread);
  return true;
}
// R5-D3-d（R5-CONTRACT §4.7）：方法前缀 `async` / `*`。
//   async m ( ) { }   -> MethodDeclaration[AsyncKeyword, Identifier m, Block]
//   * m ( ) { }       -> MethodDeclaration[AsteriskToken, Identifier m, Block]
//   async * m ( ) { } -> 不做（async 生成器方法的 children 是 [AsyncKeyword, AsteriskToken, …]）⇒ expr.member
//   async ( ) { }     -> 名字就是 `async`（`(` 紧跟在后面），不带前缀
//   async : 1 / async -> 属性 / 简写属性，不带前缀（R2 的 PropertyAssignment 分支一个字节不变）
const prefixes:Array<number> = [];
if (firstText === "*") {
  prefixes.push(from);
} else if (firstText === "async") {
  let afterAsync = from + 1;
  while (afterAsync < to && data[afterAsync].IsTriviaToken) {
    afterAsync += 1;
  }
  if (afterAsync < to) {
    if (DirectTokenUtil.TextOf(data[afterAsync]) === "*") {
      this.MemberFail("async 生成器方法不在本轮范围");
      return false;
    }
    const candidate = data[afterAsync];
    if (candidate instanceof Common || candidate instanceof String) {
      prefixes.push(from);
    }
  }
}
let nameIndex = from;
if (prefixes.length > 0) {
  nameIndex = prefixes[prefixes.length - 1] + 1;
  while (nameIndex < to && data[nameIndex].IsTriviaToken) {
    nameIndex += 1;
  }
  if (nameIndex >= to) {
    this.MemberFail("对象成员缺少名字");
    return false;
  }
}
let cursor = nameIndex + 1;
while (cursor < to && data[cursor].IsTriviaToken) {
  cursor += 1;
}
// R4-B4-c：访问器 `get x(…)` / `set x(…)` —— `get`/`set` 之后是名字、名字之后是 `(` 才是访问器；
// `{ get: 1 }` / `{ get }` 仍走属性 / 简写老路（R2 的 PropertyAssignment 分支不许回归）。
let accessorKind = "";
if ((firstText === "get" || firstText === "set") && cursor < to) {
  const candidate = data[cursor];
  let afterName = cursor + 1;
  while (afterName < to && data[afterName].IsTriviaToken) {
    afterName += 1;
  }
  const candidateIsName = candidate instanceof Common || candidate instanceof String;
  const afterIsParen = afterName < to && data[afterName] instanceof Bracket
    && (data[afterName] as Bracket).StartBracketChar === "(";
  if (candidateIsName && afterIsParen) {
    accessorKind = firstText;
    nameIndex = cursor;
    cursor = afterName;
  }
}
const nextUnit:Token | null = cursor < to ? data[cursor] : null;
// R4-B4-c：名字之后是 `(` ⇒ 方法 / get / set。装配只此一处（`DirectObjectMemberAssembly`）：
// 名字 / 参数表 / 区间 / Pos 由它复刻 `ExpressionBuilder.ParseObjectLiteral` 的成员分支；
// 方法体由它用 `DirectStatementAssembly.BlockFrom` 收口，本引擎**不代建**（A6）。
if (nextUnit !== null && nextUnit instanceof Bracket && (nextUnit as Bracket).StartBracketChar === "(") {
  const member = DirectObjectMemberAssembly.MemberFrom(data, from, to, nameIndex, accessorKind,
    memberPos, memberBase, this.Template, this.Context, prefixes);
  if (member === null) {
    this.MemberFail(DirectObjectMemberAssembly.LastReason);
    return false;
  }
  shape.Add(member);
  return true;
}
if (prefixes.length > 0) {
  // 前缀之后不是 `(`（`({ *m: 1 })` / `({ async m })` 这类非法或非方法形态）：显式 Decline，不静默建。
  this.MemberFail("对象成员的前缀之后不是方法");
  return false;
}
const name = this.BuildPropertyName(first, memberPos);
if (name === null) {
  return false;
}
if (nextUnit === null) {
  // `{a}`：简写属性，只有一个名字子节点。
  const shorthand = ShorthandPropertyAssignmentShape.FromParts(name, null, this.Context);
  shorthand.Pos = memberPos;
  shape.Add(shorthand);
  return true;
}
const nextText = DirectTokenUtil.TextOf(nextUnit);
if (nextText === ":") {
  const valueBase = nextUnit.SourceRange.EndIndex >= 0 ? nextUnit.SourceRange.EndIndex : memberPos;
  const value = this.BuildSlice(data.slice(cursor + 1, to), valueBase, "对象属性值");
  if (value === null) {
    return false;
  }
  const property = PropertyAssignmentShape.FromParts(name, value, this.Context);
  property.Pos = memberPos;
  shape.Add(property);
  return true;
}
if (nextText === "=") {
  const initBase = nextUnit.SourceRange.EndIndex >= 0 ? nextUnit.SourceRange.EndIndex : memberPos;
  const initializer = this.BuildSlice(data.slice(cursor + 1, to), initBase, "对象属性默认值");
  if (initializer === null) {
    return false;
  }
  const shorthand = ShorthandPropertyAssignmentShape.FromParts(name, initializer, this.Context);
  shorthand.Pos = memberPos;
  // `{ a = 1 }` 的 `=` 是 ShorthandPropertyAssignment 的第二个子节点（不是 PropertyAssignment）。
  shorthand.Data.splice(1, 0, DirectTokenUtil.OperatorToken(nextUnit, name.SourceRange.EndIndex, this.Template, this.Context));
  shape.Add(shorthand);
  return true;
}
if (nextText === "<") {
  this.MemberFail("对象方法的类型参数不在本轮范围");
  return false;
}
this.Fail("对象字面量的成员不在本轮范围: " + (nextText === "" ? "成员" : nextText));
return false;
```

## private method MemberFail:(reason:string)=>void

```ts
// R4-B4-c（contract §4.7）：`expr.member` 在引擎这一层记一条分类。`direct-expression-session` 是
// 只读文件，它只会把 Fail 记成 `expr.decline`；`NoteDecline` 只写分类表、不碰 `Declined`，
// 所以「分类命中 expr.member」与「计数仍由 session 的 Decline 加」两件事互不干扰（A9 只要求命中）。
DirectBuildMetrics.NoteDecline(reason, "expr.member");
this.Fail(reason);
```

## private method BuildPropertyName:(unit:Token, pos:int)=>Token | null

```ts
// 对象成员名：计算属性名 / 字符串字面量 / 数字 / BigInt / 标识符（含关键字名）。
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar !== "[") {
    this.Fail("对象字面量缺少属性名");
    return null;
  }
  const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
  const inner = this.BuildSlice(bracket.Data, base, "计算属性名");
  if (inner === null) {
    return null;
  }
  const shape = new ComputedPropertyNameShape(this.Template);
  shape.Add(inner);
  if (bracket.SourceRange.StartIndex >= 0) {
    shape.SignIn(bracket.SourceRange.StartIndex);
  }
  if (bracket.SourceRange.EndIndex >= 0) {
    shape.SignOut(bracket.SourceRange.EndIndex);
  }
  shape.Pos = pos;
  shape.TryToClose(this.Context);
  return shape;
}
if (unit instanceof String) {
  if (DirectTokenUtil.IsTemplateUnit(unit, this.Template)) {
    this.Fail("对象字面量的属性名不支持模板串");
    return null;
  }
  const shape = StringLiteralShape.FromBasicToken(unit as String, this.Context);
  shape.Pos = pos;
  return shape;
}
if (unit instanceof Common) {
  const common = unit as Common;
  const text = common.TempToString();
  if (DirectTokenUtil.StartsNumber(text)) {
    if (common.IsBigInt()) {
      const bigInt = BigIntLiteralShape.FromBasicToken(common, this.Context);
      bigInt.Pos = pos;
      return bigInt;
    }
    const numeric = NumericLiteralShape.FromBasicToken(common, this.Context);
    numeric.Pos = pos;
    return numeric;
  }
  const identifier = IdentifierShape.FromBasicToken(common, this.Context);
  identifier.Pos = pos;
  return identifier;
}
this.Fail("对象字面量的属性名不在本轮范围");
return null;
```

## private method BuildSlice:(units:Array<Token>, basePos:int, what:string)=>Token | null

```ts
// 把一段**子单元**当成一个完整表达式来建：新开一层引擎，`IngestAll` 吃完，再核对「有没有提前收口」。
// 这是 R2 所有「值位」的统一入口（实参、数组元素、对象成员值、下标、模板插值、计算属性名），
// 也是 A6 口径的关键：这一层永远不 new `ExpressionBuilder`。
if (units.length === 0) {
  this.Fail(what + "是空的");
  return null;
}
const inner = new DirectExpressionEngine(this.Template, this.Context, basePos);
inner.IngestAll(units);
if (inner.Declined) {
  this.Fail(what + "：" + inner.Reason);
  return null;
}
if (inner.Held) {
  this.Fail(what + "没有读完");
  return null;
}
if (inner.LayerEnded) {
  this.Fail(what + "提前收口");
  return null;
}
const value = inner.Finish();
if (value === null) {
  this.Fail(what + "不完整: " + inner.Reason);
  return null;
}
return value;
```

## private method ParseArguments:(bracket:Bracket)=>Array<Token> | null

```ts
// A3：调用实参。`(` `)` 不进 Data、`,` 不进 Data；实参逐个交给嵌套引擎（`f(1,2)` 是两个子节点）。
// 调用参数 spread（`f(...a)`）本轮不做，必须显式 Decline（与数组里的 spread 相反）。
const args:Array<Token> = [];
const data = bracket.Data;
let slot = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
let at = 0;
while (at < data.length) {
  const unit = data[at];
  if (unit.IsTriviaToken) {
    at += 1;
    continue;
  }
  if (DirectTokenUtil.TextOf(unit) === ",") {
    this.Fail("调用实参里出现空位");
    return null;
  }
  let end = at;
  while (end < data.length) {
    const scan = data[end];
    if (!scan.IsTriviaToken && DirectTokenUtil.TextOf(scan) === ",") {
      break;
    }
    end += 1;
  }
  if (DirectTokenUtil.TextOf(unit) === "...") {
    this.Fail("调用参数 spread 不在本轮范围");
    return null;
  }
  const value = this.BuildSlice(data.slice(at, end), slot, "调用实参");
  if (value === null) {
    return null;
  }
  args.push(value);
  let next = end;
  while (next < data.length && data[next].IsTriviaToken) {
    next += 1;
  }
  if (next < data.length && data[next].SourceRange.EndIndex >= 0) {
    slot = data[next].SourceRange.EndIndex;
  }
  at = end + 1;
}
return args;
```

## private method ParseTemplate:(token:String, pos:int)=>void

```ts
// A1：模板串。无插值 → NoSubstitutionTemplateLiteral；有插值 → TemplateExpression[TemplateHead, TemplateSpan…]，
// 插值内部**用嵌套 DirectExpressionEngine**（A6：不许 new ExpressionBuilder）。
const texts:Array<string> = [];
const interps:Array<Token> = [];
let current = "";
for (const part of token.Data) {
  if (part instanceof ConstString) {
    current += (part as ConstString).TempToString();
    continue;
  }
  if (part instanceof InterpolationString) {
    texts.push(current);
    current = "";
    interps.push(part);
  }
}
texts.push(current);
if (interps.length === 0) {
  const literal = NoSubstitutionTemplateLiteralShape.FromBasicToken(token, this.Context);
  literal.Pos = pos;
  this.TakeOperand(literal);
  return;
}
const expression = new TemplateExpressionShape(this.Template);
const head = new TemplateHeadShape(this.Template);
head.Text = texts[0];
if (token.SourceRange.StartIndex >= 0) {
  head.SignIn(token.SourceRange.StartIndex);
}
if (interps[0].SourceRange.StartIndex >= 0) {
  head.SignOut(interps[0].SourceRange.StartIndex + 1);
}
head.Pos = pos;
head.TryToClose(this.Context);
expression.Add(head);
for (let index = 0; index < interps.length; index++) {
  const interp = interps[index];
  const base = interp.SourceRange.StartIndex >= 0 ? interp.SourceRange.StartIndex + 1 : 0;
  const value = this.BuildSlice(interp.Data, base, "模板插值");
  if (value === null) {
    return;
  }
  // 尾段 / 中段的 Pos 是 `}` 这个 token 的 pos（含表达式后面的 trivia）：取「表达式最后一个字符的下一个位置」。
  let tailPos = 0;
  if (value.SourceRange.EndIndex >= 0) {
    tailPos = value.SourceRange.EndIndex;
  } else if (interp.SourceRange.EndIndex >= 0) {
    tailPos = interp.SourceRange.EndIndex - 1;
  }
  let tail:ShapeToken;
  if (index + 1 < interps.length) {
    const middle = new TemplateMiddleShape(this.Template);
    middle.Text = texts[index + 1];
    middle.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      middle.SignIn(interp.SourceRange.EndIndex - 1);
    }
    const nextInterp = interps[index + 1];
    if (nextInterp.SourceRange.StartIndex >= 0) {
      middle.SignOut(nextInterp.SourceRange.StartIndex + 1);
    }
    middle.TryToClose(this.Context);
    tail = middle;
  } else {
    const lastTail = new TemplateTailShape(this.Template);
    lastTail.Text = texts[index + 1];
    lastTail.Pos = tailPos;
    if (interp.SourceRange.EndIndex >= 0) {
      lastTail.SignIn(interp.SourceRange.EndIndex - 1);
    }
    if (token.SourceRange.EndIndex >= 0) {
      lastTail.SignOut(token.SourceRange.EndIndex);
    }
    lastTail.TryToClose(this.Context);
    tail = lastTail;
  }
  const span = new TemplateSpanShape(this.Template);
  span.Add(value);
  span.Add(tail);
  if (interp.SourceRange.StartIndex >= 0) {
    span.SignIn(interp.SourceRange.StartIndex + 1);
    span.Pos = interp.SourceRange.StartIndex + 1;
  }
  if (tail.SourceRange.EndIndex >= 0) {
    span.SignOut(tail.SourceRange.EndIndex);
  }
  span.TryToClose(this.Context);
  expression.Add(span);
}
if (token.SourceRange.StartIndex >= 0) {
  expression.SignIn(token.SourceRange.StartIndex);
}
if (token.SourceRange.EndIndex >= 0) {
  expression.SignOut(token.SourceRange.EndIndex);
}
expression.Pos = pos;
expression.TryToClose(this.Context);
this.TakeOperand(expression);
```

## private method IngestOperator:(unit:Token, text:string, pos:int)=>void

```ts
// C1（§3.3.2）：换行之后的 `++` / `--` / `!` 属于**下一条语句**，本层表达式到此为止（Hold 不是 Fail）。
// 这是 A4 非空断言的前置条件：没有它，`a⏎!b` 会复刻 `a⏎++b` 的错树。
if (this.IsRestrictedPostfix(text) && this.PreviousUnit !== null
  && LineTerminator.HasBetween(this.PreviousUnit.SourceRange, unit.SourceRange)) {
  this.Hold();
  return;
}
if (unit instanceof Symbol) {
  // R3-B2-2：`=>` 是**箭头**的运算符，不是二元 / 赋值运算符（`OperatorTable` 里没有它）。
  // 裸参数形态（`a => …`）在这一格才认出来；括号参数表形态在 ParamWait 里已经处理掉了。
  if (text === "=>") {
    this.StartArrow(unit, pos);
    return;
  }
  if (text === ".") {
    this.StartMemberAccess(unit, pos);
    return;
  }
  if (text === "?.") {
    this.StartQuestionDot(unit, pos);
    return;
  }
  if (text === "!") {
    this.IngestNonNull(unit, pos);
    return;
  }
  if (text === "++" || text === "--") {
    this.CloseNew();
    if (this.Declined) {
      return;
    }
    this.IngestPostfix(unit, pos);
    return;
  }
  if (text === "?") {
    this.StartConditional(unit, pos);
    return;
  }
  if (text === ":") {
    this.IngestColon(unit, pos);
    return;
  }
  if (text === "," || OperatorTable.IsAssignmentOperator(text) || OperatorTable.IsBinaryOperator(text)) {
    this.CloseNew();
    if (this.Declined) {
      return;
    }
    this.IngestBinary(unit, text, pos);
    return;
  }
  // 本层结束符：`FlushOperand + CompleteAllFrames`，干净收口（不 Held 不 Fail；`;` 由 session 处理）。
  if (text === ";" || text === ")" || text === "]" || text === "}") {
    this.CloseNew();
    if (this.Declined) {
      return;
    }
    this.EndLayer();
    return;
  }
  this.Fail("表达式运算符不在本轮范围: " + (text === "" ? "符号" : text));
  return;
}
if (unit instanceof Common) {
  if (text === "as") {
    this.StartAs(unit, pos);
    return;
  }
  if (text === "satisfies") {
    this.Fail("类型断言不在本轮范围: " + text);
    return;
  }
  if (OperatorTable.IsBinaryOperator(text)) {
    // `instanceof` / `in` 是 Common 形态的二元运算符（与 ExpressionBuilder.BinaryOperatorText 同判据）。
    this.CloseNew();
    if (this.Declined) {
      return;
    }
    this.IngestBinary(unit, text, pos);
    return;
  }
  this.CloseNew();
  if (this.Declined) {
    return;
  }
  // 接不上的单元**不是** Fail：它可能是下一条语句的首单元 / ASI leftover（DESIGN §4.6）。
  this.Hold();
  return;
}
if (unit instanceof Bracket) {
  this.IngestBracketSuffix(unit as Bracket, pos);
  return;
}
this.CloseNew();
if (this.Declined) {
  return;
}
this.Hold();
```

## private method StartMemberAccess:(unit:Token, pos:int)=>void

```ts
// `.` 不进 Data，但要等下一格的名字（等不到就 Decline，绝不默默少建一层）。
if (this.PendingOperand === null) {
  this.Fail("成员访问缺少操作数");
  return;
}
this.PostfixWait = DirectExpressionEngine.PostfixDot;
this.PostfixUnit = unit;
this.PostfixPos = pos;
```

## private method StartQuestionDot:(unit:Token, pos:int)=>void

```ts
// `?.` 是**子节点**（QuestionDotToken），但它是哪一种后缀要看下一格：名字 / `(` / `[`。
if (this.PendingOperand === null) {
  this.Fail("可选链缺少操作数");
  return;
}
this.PostfixWait = DirectExpressionEngine.PostfixQuestionDot;
this.PostfixUnit = unit;
this.PostfixPos = pos;
```

## private method IngestPostfixPart:(unit:Token, pos:int)=>void

```ts
const operand = this.PendingOperand;
const wait = this.PostfixWait;
const opUnit = this.PostfixUnit;
const opPos = this.PostfixPos;
this.PostfixWait = DirectExpressionEngine.PostfixNone;
this.PostfixUnit = null;
if (operand === null) {
  this.Fail("后缀缺少操作数");
  return;
}
if (wait === DirectExpressionEngine.PostfixDot) {
  if (!(unit instanceof Common)) {
    this.Fail("成员访问 . 之后缺少标识符");
    return;
  }
  const name = IdentifierShape.FromBasicToken(unit as Common, this.Context);
  name.Pos = pos;
  const access = new PropertyAccessExpressionShape(this.Template);
  access.Add(operand);
  access.Add(name);
  this.SpanFromTo(access, operand, name.SourceRange.EndIndex);
  this.TakeOperand(access);
  return;
}
if (opUnit === null) {
  this.Fail("可选链缺少 ?.");
  return;
}
const dot = DirectTokenUtil.OperatorToken(opUnit, opPos, this.Template, this.Context);
if (unit instanceof Bracket) {
  const bracket = unit as Bracket;
  if (bracket.StartBracketChar === "(") {
    const args = this.ParseArguments(bracket);
    if (args === null) {
      return;
    }
    const call = new CallExpressionShape(this.Template);
    call.Add(operand);
    call.Add(dot);
    for (const arg of args) {
      call.Add(arg);
    }
    this.SpanFromTo(call, operand, bracket.SourceRange.EndIndex);
    this.TakeOperand(call);
    return;
  }
  if (bracket.StartBracketChar === "[") {
    const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
    const inner = this.BuildSlice(bracket.Data, base, "可选链下标");
    if (inner === null) {
      return;
    }
    const access = new ElementAccessExpressionShape(this.Template);
    access.Add(operand);
    access.Add(dot);
    access.Add(inner);
    this.SpanFromTo(access, operand, bracket.SourceRange.EndIndex);
    this.TakeOperand(access);
    return;
  }
}
if (unit instanceof Common) {
  const name = IdentifierShape.FromBasicToken(unit as Common, this.Context);
  name.Pos = pos;
  const access = new PropertyAccessExpressionShape(this.Template);
  access.Add(operand);
  access.Add(dot);
  access.Add(name);
  this.SpanFromTo(access, operand, name.SourceRange.EndIndex);
  this.TakeOperand(access);
  return;
}
this.Fail("可选链 ?. 之后不是成员名 / 下标 / 实参");
```

## private method IngestBracketSuffix:(bracket:Bracket, pos:int)=>void

```ts
// 操作数后面的 `(` / `[` 是调用 / 下标 / new 的实参表；`{` 是块，不在本轮。
const operand = this.PendingOperand;
if (operand === null) {
  this.Fail("调用 / 下标缺少操作数");
  return;
}
if (bracket.StartBracketChar === "(") {
  if (this.NewPending !== null && !this.NewArgsSeen) {
    this.CloseNewWithArgs(bracket, operand);
    return;
  }
  if ((operand as any).DirectNewWithArgs === true) {
    this.Fail("new 表达式之后的调用不在本轮范围");
    return;
  }
  const args = this.ParseArguments(bracket);
  if (args === null) {
    return;
  }
  const call = new CallExpressionShape(this.Template);
  call.Add(operand);
  for (const arg of args) {
    call.Add(arg);
  }
  this.SpanFromTo(call, operand, bracket.SourceRange.EndIndex);
  this.TakeOperand(call);
  return;
}
if (bracket.StartBracketChar === "[") {
  const base = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
  const inner = this.BuildSlice(bracket.Data, base, "下标");
  if (inner === null) {
    return;
  }
  const access = new ElementAccessExpressionShape(this.Template);
  access.Add(operand);
  access.Add(inner);
  this.SpanFromTo(access, operand, bracket.SourceRange.EndIndex);
  this.TakeOperand(access);
  return;
}
this.Fail("操作数后面的括号不在本轮范围: " + bracket.StartBracketChar);
```

## private method IngestNonNull:(unit:Token, pos:int)=>void

```ts
// A4：非空断言。`!` 不进 Data（TS 的 NonNullExpression children 只有 expression），只做终点。
const operand = this.PendingOperand;
if (operand === null) {
  this.Fail("非空断言缺少操作数");
  return;
}
const shape = new NonNullExpressionShape(this.Template);
shape.Add(operand);
this.PendingOperand = null;
this.SpanFromTo(shape, operand, unit.SourceRange.EndIndex);
this.TakeOperand(shape);
```

## private method IngestBinary:(unit:Token, text:string, pos:int)=>void

```ts
this.FlushOperand();
this.PushOperator(unit, text, this.PrecedenceOf(text), this.IsRightAssocOf(text), pos);
```

## private method PrecedenceOf:(text:string)=>int

```ts
// R2 §4.2：赋值 = 0、逗号 = -1，其余走 OperatorTable。helper 在引擎里，**不改** OperatorTable。
if (OperatorTable.IsAssignmentOperator(text)) {
  return OperatorTable.AssignmentPrecedence;
}
if (text === ",") {
  return OperatorTable.CommaPrecedence;
}
return OperatorTable.Precedence(text);
```

## private method IsRightAssocOf:(text:string)=>bool

```ts
// `**` 右结合（OperatorTable 已有）；赋值也右结合（`a = b = c` = `a = (b = c)`）。
return OperatorTable.IsRightAssociative(text) || OperatorTable.IsAssignmentOperator(text);
```

## private method PushOperator:(unit:Token, text:string, precedence:int, rightAssoc:bool, pos:int)=>void

```ts
// 1) 收掉栈上所有「优先级更高（或同级左结合）」的**已完成** frame。
while (this.Frames.length > 0 && this.FrameStages[this.FrameStages.length - 1] === DirectExpressionEngine.StageDone) {
  const topPrecedence = this.FramePrecs[this.FramePrecs.length - 1];
  if (topPrecedence > precedence || (topPrecedence === precedence && !rightAssoc)) {
    this.CompleteTop();
    continue;
  }
  break;
}
// 泛型实参 vs 比较链（A3 的显式反例）：TS 只在「`< … >` 紧跟 `(`」时把 `<` 读成类型实参表的开头。
// 引擎是流式的、没有前瞻，所以用两个**只看本层**的事实代替前瞻：`<` 打开的角括号深度、
// 以及「刚刚被 `>` 合上的是哪一个单元」。`(` 出现在操作数位且 `PreviousUnit` 正是那个 `>` 时，
// 它就是泛型实参调用 / 实例化表达式 → 显式 Decline；**绝不静默建成比较链**。
if (text === "<") {
  this.AngleDepth += 1;
} else if (text === ">") {
  if (this.AngleDepth > 0) {
    this.AngleDepth -= 1;
    this.PrevAngleClose = unit;
  }
} else if (text.length > 0 && text[0] === ">" && this.AngleDepth > 0) {
  // `>>` / `>>>` / `>=`：嵌套泛型实参的收尾（`f<A<B>>(1)`）与类型实参拆分不在本轮。
  this.Fail("嵌套泛型实参 / 类型实参拆分不在本轮范围: " + text);
  return;
}
// 2) 逗号不进条件表达式的分支：TS 的 `?` 两侧是 AssignmentExpression，`a ? b, c : d` 是语法错误。
//    完整的条件 frame（`a ? b : c, d`）会先被上面的循环收掉，所以这里只看「真分支已挂、等冒号」的那种。
if (text === "," && this.Frames.length > 0) {
  const topFrame = this.Frames[this.Frames.length - 1];
  if (topFrame instanceof ConditionalExpressionShape
    && this.FrameStages[this.FrameStages.length - 1] === DirectExpressionEngine.StageColon) {
    this.Fail("条件表达式分支里的逗号不在本轮范围");
    return;
  }
}
// 3) 把新运算符节点插到「当前容器最后一个子节点」与其父级之间。
const parent = this.Top();
if (parent === null || parent.Data.length === 0) {
  this.Fail("二元运算符缺少左操作数: " + text);
  return;
}
if (this.Frames.length > 0) {
  const stage = this.FrameStages[this.FrameStages.length - 1];
  // StageColon = 条件表达式的真分支已挂：新运算符插进**真分支**里（`a ? b + c : d`）。
  // StageOperand / StageFalse = 还在等操作数（最后一个子节点是运算符 / 冒号），插进去一定是错树。
  if (stage === DirectExpressionEngine.StageOperand || stage === DirectExpressionEngine.StageFalse) {
    this.Fail("运算符前面缺少完整的左操作数: " + text);
    return;
  }
}
const child = parent.Data[parent.Data.length - 1];
const shape = new BinaryExpressionShape(this.Template);
ShapeInsertUtil.InsertBetween(parent, child, shape);
shape.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));
this.Inserts += 1;
this.Frames.push(shape);
this.FramePrecs.push(precedence);
this.FrameStages.push(DirectExpressionEngine.StageOperand);
this.FramePending.push(true);
this.Expect = DirectExpressionEngine.ExpectOperand;
DirectBuildMetrics.Trace("insert(" + text + ") prec" + precedence + " owner=" + (parent === this.Root ? "Holder" : parent.constructor.name));
```

## private method StartConditional:(unit:Token, pos:int)=>void

```ts
// A4：条件表达式。`?` 先收掉更高优先级的完整 frame，再把 ConditionalExpressionShape 插到
// 「当前最后一个子节点」的位置；真分支挂上后进入 StageColon，等 `:`。
this.FlushOperand();
while (this.Frames.length > 0
  && this.FrameStages[this.FrameStages.length - 1] === DirectExpressionEngine.StageDone
  && this.FramePrecs[this.FramePrecs.length - 1] > DirectExpressionEngine.CondPrecedence) {
  this.CompleteTop();
}
const parent = this.Top();
if (parent === null || parent.Data.length === 0) {
  this.Fail("条件表达式缺少条件");
  return;
}
if (this.Frames.length > 0) {
  const stage = this.FrameStages[this.FrameStages.length - 1];
  if (stage === DirectExpressionEngine.StageOperand || stage === DirectExpressionEngine.StageFalse) {
    this.Fail("条件表达式前面缺少完整的条件");
    return;
  }
}
const child = parent.Data[parent.Data.length - 1];
const shape = new ConditionalExpressionShape(this.Template);
ShapeInsertUtil.InsertBetween(parent, child, shape);
shape.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));
this.Inserts += 1;
this.Frames.push(shape);
this.FramePrecs.push(DirectExpressionEngine.CondPrecedence);
this.FrameStages.push(DirectExpressionEngine.StageOperand);
this.FramePending.push(true);
this.Expect = DirectExpressionEngine.ExpectOperand;
DirectBuildMetrics.Trace("insert(?) cond");
```

## private method IngestColon:(unit:Token, pos:int)=>void

```ts
// `:` 只属于最近那个「真分支已挂、等冒号」的条件 frame；它上面的 frame 必须都已经完成。
this.FlushOperand();
let target = -1;
for (let index = this.Frames.length - 1; index >= 0; index--) {
  if (this.FrameStages[index] === DirectExpressionEngine.StageColon) {
    target = index;
    break;
  }
}
if (target < 0) {
  this.Fail("条件表达式缺少 ?");
  return;
}
while (this.Frames.length - 1 > target) {
  this.CompleteTop();
}
const frame = this.Frames[this.Frames.length - 1];
frame.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));
this.FrameStages[this.FrameStages.length - 1] = DirectExpressionEngine.StageFalse;
this.FramePending[this.FramePending.length - 1] = true;
this.Expect = DirectExpressionEngine.ExpectOperand;
DirectBuildMetrics.Trace("insert(:) condfalse");
```

## private method StartAs:(unit:Token, pos:int)=>void

```ts
// A4：`as`。左操作数是「当前最后一个已定稿的子节点」；右操作数是**类型**（TypeBuilder 只读复用），
// 但类型要等后续单元才能读，所以先插好 AsExpression 并进入缓冲态，收口时再 `FlushAs`。
this.FlushOperand();
while (this.Frames.length > 0
  && this.FrameStages[this.FrameStages.length - 1] === DirectExpressionEngine.StageDone
  && this.FramePrecs[this.FramePrecs.length - 1] > OperatorTable.AsPrecedence) {
  this.CompleteTop();
}
const parent = this.Top();
if (parent === null || parent.Data.length === 0) {
  this.Fail("as 缺少左操作数");
  return;
}
if (this.Frames.length > 0) {
  const stage = this.FrameStages[this.FrameStages.length - 1];
  if (stage === DirectExpressionEngine.StageOperand || stage === DirectExpressionEngine.StageFalse) {
    this.Fail("as 前面缺少完整的左操作数");
    return;
  }
}
const child = parent.Data[parent.Data.length - 1];
const shape = new AsExpressionShape(this.Template);
ShapeInsertUtil.InsertBetween(parent, child, shape);
this.Inserts += 1;
this.AsExpr = shape;
this.AsUnit = unit;
this.AsUnits = [];
this.AsPositions = [];
this.AsPending = true;
this.Expect = DirectExpressionEngine.ExpectOperator;
DirectBuildMetrics.Trace("insert(as)");
```

## private method IngestAsPart:(unit:Token, pos:int)=>void

```ts
// `as` 的类型缓冲：类型是「一串单元」，遇到本层终止符才回头解析（类型语法由 TypeBuilder 负责）。
const text = DirectTokenUtil.TextOf(unit);
if (text === ";" || text === "," || text === ")" || text === "]" || text === "}") {
  if (!this.FlushAllAs()) {
    return;
  }
  this.IngestCode(unit, pos);
  return;
}
this.AsUnits.push(unit);
this.AsPositions.push(pos);
```

## private method FlushAllAs:()=>bool

```ts
// `as` 可以连着写（`x as unknown as T`）：FlushAs 把类型读走之后，剩下的单元里可能又来一个 `as`，
// 所以必须**一直冲干净**，不能只冲一次（否则内层 AsExpression 永远拿不到类型）。
while (this.AsPending) {
  if (!this.FlushAs()) {
    return false;
  }
}
return true;
```

## private method FlushAs:()=>bool

```ts
// 把缓冲下来的单元交给 `TypeBuilder`（只读复用：不经过 ExpressionBuilder，A6 不受影响）。
const shape = this.AsExpr;
const asUnit = this.AsUnit;
const units = this.AsUnits;
const positions = this.AsPositions;
this.AsPending = false;
this.AsExpr = null;
this.AsUnit = null;
this.AsUnits = [];
this.AsPositions = [];
if (shape === null) {
  this.Fail("as 缺少左操作数");
  return false;
}
if (units.length === 0) {
  this.Fail("as 后缺少类型");
  return false;
}
let basePos = 0;
if (asUnit !== null && asUnit.SourceRange.EndIndex >= 0) {
  basePos = asUnit.SourceRange.EndIndex;
}
const builder = new TypeBuilder(this.Template, this.Context);
builder.Load(units, basePos);
let type:Token | null = null;
try {
  type = builder.ParseType();
} catch (error) {
  type = null;
}
if (type === null) {
  this.Fail("as 后的类型无法解析");
  return false;
}
const consumed = builder.OriginalConsumed();
if (consumed <= 0 || consumed > units.length) {
  this.Fail("as 后的类型没有读完");
  return false;
}
shape.Add(type);
if (type.SourceRange.EndIndex >= 0) {
  shape.SignOut(type.SourceRange.EndIndex);
}
shape.TryToClose(this.Context);
// 类型只读走了一部分（`a as T + b`）：剩下的单元仍属于这个表达式，按原顺序继续摄入，
// 于是它自然接成 `(a as T) + b`（TS 里 as 的优先级 = 关系运算符，`a + b as T` = `(a + b) as T`）。
if (consumed < units.length) {
  this.Expect = DirectExpressionEngine.ExpectOperator;
  const rest = units.slice(consumed);
  const restPositions = positions.slice(consumed);
  for (let index = 0; index < rest.length; index++) {
    this.IngestUnit(rest[index], restPositions[index]);
  }
}
return true;
```

## private method IngestPostfix:(unit:Token, pos:int)=>void

```ts
const operand = this.PendingOperand;
if (operand === null) {
  this.Fail("后缀运算符缺少操作数: " + DirectTokenUtil.TextOf(unit));
  return;
}
// 后缀比前缀绑得紧：这里只替换 `PendingOperand`（`-a++` = `-(a++)`），前缀留到 FlushOperand 再包。
const shape = new PostfixUnaryExpressionShape(this.Template);
shape.Add(operand);
this.PendingOperand = null;
if (operand instanceof ShapeToken) {
  shape.Pos = (operand as ShapeToken).Pos;
}
if (operand.SourceRange.StartIndex >= 0) {
  shape.SignIn(operand.SourceRange.StartIndex);
}
if (unit.SourceRange.EndIndex >= 0) {
  shape.SignOut(unit.SourceRange.EndIndex);
}
// 运算符 token 只做字段、不进 Data（TS 的 PostfixUnaryExpression children 只有 operand）。
(shape as any).OperatorToken = unit;
shape.TryToClose(this.Context);
this.TakeOperand(shape);
```

## private method EndLayer:()=>void

```ts
if (this.AsPending) {
  if (!this.FlushAllAs()) {
    return;
  }
}
this.FlushOperand();
this.CompleteAllFrames();
this.LayerEnded = true;
```

## private method Hold:()=>void

```ts
this.Held = true;
this.HeldAt = this.Ingested;
```

## private method FlushOperand:()=>void

```ts
const pending = this.PendingOperand;
if (pending === null) {
  return;
}
this.PendingOperand = null;
let operand = pending;
// 前缀在操作数外：`-a` 是 Prefix(-)[a]；多个前缀按「后进先内」包（`--!a` = --(!a)）。
while (this.Prefixes.length > 0) {
  const prefix = this.Prefixes.pop()!;
  prefix.Add(operand);
  if (operand.SourceRange.EndIndex >= 0) {
    prefix.SignOut(operand.SourceRange.EndIndex);
  }
  prefix.TryToClose(this.Context);
  operand = prefix;
}
this.AttachOperand(operand);
```

## private method AttachOperand:(operand:Token)=>void

```ts
if (this.Frames.length > 0) {
  const stage = this.FrameStages[this.FrameStages.length - 1];
  if (stage === DirectExpressionEngine.StageColon) {
    this.Fail("条件表达式缺少冒号");
    return;
  }
  if (stage === DirectExpressionEngine.StageOperand || stage === DirectExpressionEngine.StageFalse) {
    const frame = this.Frames[this.Frames.length - 1];
    frame.Add(operand);
    // 条件表达式：真分支挂上 → 等 `:`；假分支挂上 → 完整。
    if (stage === DirectExpressionEngine.StageOperand && frame instanceof ConditionalExpressionShape) {
      this.FrameStages[this.FrameStages.length - 1] = DirectExpressionEngine.StageColon;
    } else {
      this.FrameStages[this.FrameStages.length - 1] = DirectExpressionEngine.StageDone;
    }
    this.FramePending[this.FramePending.length - 1] = false;
    // end **不在这里封**：右操作数若是更高优先级/右结合的子树（`a+b*c` 的 `*`、`a**b**c` 的内层 `**`），
    // 它外层 frame 的终点必须取「最终最后一个子节点的终点」；在 CompleteTop 出栈时统一封一次。
    return;
  }
}
const top = this.Top();
if (top === null) {
  this.Fail("表达式没有容器");
  return;
}
top.Add(operand);
```

## private method Top:()=>Token | null

```ts
if (this.Frames.length > 0) {
  return this.Frames[this.Frames.length - 1];
}
return this.Root;
```

## private method CompleteTop:()=>void

```ts
// 出栈前封终点 + 关闭：终点取「最后一个子节点的 EndIndex」——它此刻已经定稿。
// 这比「右操作数挂上就封」晚一步，正是 `a+b*c` / `a**b**c` 外层节点 end 正确的唯一做法。
const frame = this.Frames[this.Frames.length - 1];
if (frame.SourceRange.EndIndex < 0 && frame.Data.length > 0) {
  const last = frame.Data[frame.Data.length - 1];
  if (last.SourceRange.EndIndex >= 0) {
    frame.SignOut(last.SourceRange.EndIndex);
  }
}
if (frame.SourceRange.EndIndex >= 0) {
  frame.TryToClose(this.Context);
}
this.Frames.pop();
this.FramePrecs.pop();
this.FrameStages.pop();
this.FramePending.pop();
```

## private method CompleteAllFrames:()=>void

```ts
while (this.Frames.length > 0) {
  this.CompleteTop();
}
```

## private method CouldBeArrowParameters:(bracket:Bracket)=>bool

```ts
// R3-B2-2（R3-CONTRACT §4.3.3）：回答「这个 `(` 有没有可能是箭头的**参数表**」——
// 只认 `()` / `(a)` / `(a, b)` / `(a,)` 这种「空或纯 Identifier 逗号列表」。
// 是 ⇒ 调用方挂起一格等 `=>`（引擎没有前瞻，`(` 那一格无法决断）；
// 否 ⇒ 当场走原来的 `IngestParen`，**一个字节的行为都不变**（`(a = 1)` / `(a: T)` 因此走老路）。
// 判据与 `FunctionDeclarationShape.BuildParameters` 的「裸标识符」分支同一张表：
// `Common` 且 `!CanStartNumber()`（`f(1)` 不是标识符参数）。trivia 跳过。
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    if ((unit as Common).CanStartNumber()) {
      return false;
    }
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    continue;
  }
  return false;
}
return true;
```

## private method IngestAfterAsyncHead:(unit:Token, pos:int)=>void

```ts
// R5-D3-b（R5-CONTRACT §4.6-B）：上一格是语句首的 `async`，这一格决定它是什么。
//   `async` + `(`（纯 Identifier 参数表） ⇒ 挂起参数表等 `=>`（`async (a) => …`）；
//   其余（`async(a)` 调用 / `async.b` 成员 / `async` 后的任何后缀） ⇒ 回退成 Identifier `async`
//   + 正常后缀链 —— 这正是「不许静默错建」的回退口：认不出箭头就一个字节都不改。
const asyncUnit = this.AsyncPending;
const asyncPos = this.AsyncPendingPos;
if (asyncUnit === null) {
  this.Fail("async 头丢失");
  return;
}
const isParen = unit instanceof Bracket && (unit as Bracket).StartBracketChar === "(";
if (isParen && this.CouldBeArrowParameters(unit as Bracket)) {
  // 参数表挂起：`async` 单元**留在** `AsyncPending` 里，等 `=>` 那一格才知道它是不是 AsyncKeyword；
  // 不是箭头时由 `IngestAfterParams` 走「标识符 + 调用后缀」的回退。
  this.ParamWait = true;
  this.AsyncParams = true;
  this.ParamBracket = unit as Bracket;
  this.ParamPos = pos;
  return;
}
this.AsyncPending = null;
this.AsyncPendingPos = -1;
// 回退：`async` 是标识符操作数。先把它交给操作数位置，再把这一格按常规重新分派。
const identifier = IdentifierShape.FromBasicToken(asyncUnit as Common, this.Context);
identifier.Pos = asyncPos;
this.TakeOperand(identifier);
if (this.Declined || this.Held || this.LayerEnded) {
  return;
}
if (isParen) {
  // `async(a)`：`(` 是调用的实参表（不是括号表达式）。
  this.IngestBracketSuffix(unit as Bracket, pos);
  return;
}
this.IngestCode(unit, pos);
```

## private method IngestAfterParams:(unit:Token, pos:int)=>void

```ts
// 挂起的那一格到了：`=>` ⇒ 建箭头；否则这个括号只是**普通括号表达式**（`async (a)` 则是调用），
// 先按老口径建出 `ParenthesizedExpressionShape`，再把当前这一格按常规重新分派。
// R5-D3-b：`AsyncParams` 为真时，`async` 单元还挂在 `AsyncPending` 里 —— 命中 `=>` 就是 AsyncKeyword，
// 否则先回退成 Identifier 操作数（+ 调用后缀），与「认不出箭头就一个字节都不改」同一条口径。
const bracket = this.ParamBracket;
const bracketPos = this.ParamPos;
const asyncParams = this.AsyncParams;
const asyncUnit = asyncParams ? this.AsyncPending : null;
const asyncPos = this.AsyncPendingPos;
this.ParamWait = false;
this.AsyncParams = false;
this.ParamBracket = null;
this.ParamPos = -1;
this.AsyncPending = null;
this.AsyncPendingPos = -1;
if (bracket === null) {
  this.Fail("箭头参数表丢失");
  return;
}
if (DirectTokenUtil.TextOf(unit) === "=>") {
  this.StartArrowFromParams(bracket, bracketPos, unit, pos, asyncUnit, asyncPos);
  return;
}
if (asyncUnit !== null) {
  // `async(a)` / `async (a)`：`async` 是标识符，`(` 是**调用实参表**（不是括号表达式）。
  const identifier = IdentifierShape.FromBasicToken(asyncUnit as Common, this.Context);
  identifier.Pos = asyncPos;
  this.TakeOperand(identifier);
  if (this.Declined || this.Held || this.LayerEnded) {
    return;
  }
  this.IngestBracketSuffix(bracket, bracketPos);
  if (this.Declined || this.Held || this.LayerEnded) {
    return;
  }
  if (this.ArrowPending !== null) {
    this.IngestArrowPart(unit, pos);
    return;
  }
  this.IngestCode(unit, pos);
  return;
}
this.IngestParen(bracket, bracketPos);
if (this.Declined || this.Held || this.LayerEnded) {
  return;
}
if (this.ArrowPending !== null) {
  this.IngestArrowPart(unit, pos);
  return;
}
// 重入时 `PreviousUnit` 仍是那个括号（`IngestUnit` 在返回后才更新），C1 的行终止符守卫照旧成立。
this.IngestCode(unit, pos);
```

## private method StartArrowFromParams:(bracket:Bracket, bracketPos:int, arrowUnit:Token, arrowPos:int, asyncUnit:Token | null, asyncPos:int)=>void

```ts
// `(a) => a` / `(a, b) => …` / `() => …` / R5 的 `async (a) => …`：参数表已经挂在手上
// （`CouldBeArrowParameters` 保证是纯 Identifier 列表），这里直接建 `ParameterShape`，**不跑内层引擎**——
// 内层引擎会把 `a` 建成一个裸 Identifier，那样每个参数都得多包一层，而且 `()` 空表在引擎里根本不合法。
// Pos 口径 = `ExpressionBuilder.Load(bracket.Data, bracket.StartIndex + 1)` 的 Positions：
// 第一格是 `(` 之后第一个字符，其后每格是前一个**代码**单元的 EndIndex。
// **R5-D3-b**：`asyncUnit !== null` 时先挂 `AsyncKeywordShape`（TS 实测 children 顺序
// `[AsyncKeyword, Parameter…, EqualsGreaterThanToken, body]`，`AsyncKeyword.Pos` = `async` 那一格的 pos，
// `ArrowFunction.Pos` 也随之 = `async` 的 pos，区间从 `async` 起）。
const arrow = new ArrowFunctionShape(this.Template);
if (asyncUnit !== null) {
  const asyncKeyword = new AsyncKeywordShape(this.Template);
  asyncKeyword.SignInToken(asyncUnit);
  asyncKeyword.SignOutToken(asyncUnit);
  asyncKeyword.Pos = asyncPos;
  asyncKeyword.TryToClose(this.Context);
  arrow.Add(asyncKeyword);
  if (asyncUnit.SourceRange.StartIndex >= 0) {
    arrow.SignIn(asyncUnit.SourceRange.StartIndex);
  }
  arrow.Pos = asyncPos;
} else {
  if (bracket.SourceRange.StartIndex >= 0) {
    arrow.SignIn(bracket.SourceRange.StartIndex);
  }
  arrow.Pos = bracketPos;
}
let parameterPos = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
for (const inner of bracket.Data) {
  if (inner.IsTriviaToken) {
    continue;
  }
  if (inner instanceof Common) {
    const identifier = IdentifierShape.FromBasicToken(inner as Common, this.Context);
    identifier.Pos = parameterPos;
    const parameter = new ParameterShape(this.Template);
    parameter.Add(identifier);
    if (inner.SourceRange.StartIndex >= 0) {
      parameter.SignIn(inner.SourceRange.StartIndex);
    }
    if (inner.SourceRange.EndIndex >= 0) {
      parameter.SignOut(inner.SourceRange.EndIndex);
    }
    parameter.Pos = parameterPos;
    parameter.TryToClose(this.Context);
    arrow.Add(parameter);
  }
  if (inner.SourceRange.EndIndex >= 0) {
    parameterPos = inner.SourceRange.EndIndex;
  }
}
this.StartArrowBody(arrow, arrowUnit, arrowPos);
```

## private method StartArrow:(unit:Token, pos:int)=>void

```ts
// 裸参数形态（`a => a + 1`）：`=>` 到达时 `PendingOperand` 就是那个参数标识符。
// 别的形态（调用 `async(a) => …` / 赋值 `(a = 1) => …` / 条件 `(a ? b : c) => …`）一律 Decline：
// 箭头参数表里没有这些东西，认了就是静默错建（`async (a) => a` 靠这一条落进 `expr.decline`）。
const operand = this.PendingOperand;
if (operand === null) {
  this.Fail("箭头缺少参数");
  return;
}
if (!(operand instanceof IdentifierShape)) {
  this.Fail("箭头函数的参数只支持标识符: " + operand.constructor.name);
  return;
}
const parameter = new ParameterShape(this.Template);
parameter.Add(operand);
if (operand.SourceRange.StartIndex >= 0) {
  parameter.SignIn(operand.SourceRange.StartIndex);
}
if (operand.SourceRange.EndIndex >= 0) {
  parameter.SignOut(operand.SourceRange.EndIndex);
}
// 与 `ExpressionBuilder.ParsePostfixSuffix` 的裸参数箭头同口：Parameter 的 Pos = 标识符自己的 Pos
// （它已经含前导 trivia），区间就是标识符本身。
parameter.Pos = (operand as ShapeToken).Pos;
parameter.TryToClose(this.Context);
const arrow = new ArrowFunctionShape(this.Template);
if (operand.SourceRange.StartIndex >= 0) {
  arrow.SignIn(operand.SourceRange.StartIndex);
}
arrow.Pos = (operand as ShapeToken).Pos;
this.PendingOperand = null;
arrow.Add(parameter);
this.StartArrowBody(arrow, unit, pos);
```

## private method StartArrowBody:(arrow:ShapeToken, unit:Token, pos:int)=>void

```ts
// `=>` 这个运算符是**子节点**（`EqualsGreaterThanTokenShape`），唯一工厂是 `DirectTokenUtil`。
// 体还没到：先挂进 `ArrowPending`，之后每一格都走 `IngestArrowPart`。
arrow.Add(DirectTokenUtil.OperatorToken(unit, pos, this.Template, this.Context));
this.ArrowPending = arrow;
this.ArrowBody = null;
this.Expect = DirectExpressionEngine.ExpectOperand;
```

## private method IngestArrowPart:(unit:Token, pos:int)=>void

```ts
// 箭头体：`{…}` 是块体（当场建、区间 = 括号自己）；其余全部喂给**体子引擎**，
// 因此 `a => b => c` 是递归的（子引擎自己会在 `=>` 上走同一段代码），
// `a => a + 1` 的 `+` / 优先级 / 括号也全部由子引擎按同一套规则建。
if (this.ArrowPending === null) {
  return;
}
// R5：**箭头体 = AssignmentExpression**，顶层逗号属于外层（tsc 实测
// `async () => await a, async (b) => await b` = `BinaryExpression(,)[Arrow, Arrow]`）。
// 子引擎会把 `,` 当二元逗号吞进体里，因此这一格必须先收口箭头，再把逗号当**本层**的运算符。
if (this.ArrowBody !== null && DirectTokenUtil.TextOf(unit) === ",") {
  if (!this.FinishArrowBody()) {
    return;
  }
  if (this.Declined || this.Held || this.LayerEnded) {
    return;
  }
  this.IngestBinary(unit, ",", pos);
  return;
}
if (this.ArrowBody === null) {
  if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{") {
    const block = this.BuildArrowBlock(unit as Bracket, pos);
    if (block === null) {
      return;                        // Fail 已置位
    }
    this.CompleteArrow(block);
    return;
  }
  this.ArrowBody = new DirectExpressionEngine(this.Template, this.Context, pos);
}
const bodyEngine = this.ArrowBody as DirectExpressionEngine;
bodyEngine.IngestUnit(unit, pos);
if (bodyEngine.Declined) {
  this.Fail("箭头体范围外: " + bodyEngine.Reason);
  return;
}
// 结束符（`;` / `)` / `]` / `}`）让子引擎干净收口（`LayerEnded`），箭头也在这一格收口；
// `Held` 同理——体到此为止，剩下的不属于本层。
if (bodyEngine.LayerEnded || bodyEngine.Held) {
  this.CloseArrowLayer();
}
```

## private method CloseArrowLayer:()=>void

```ts
// 体已经喂到结束符：收口箭头，并让**本层**也就此结束（与 `;` 走同一条 `EndLayer`）。
if (!this.FinishArrowBody()) {
  return;
}
this.EndLayer();
```

## private method FinishArrowBody:()=>bool

```ts
// 把体子引擎收口成节点，再 `TakeOperand(arrow)`——之后箭头就是一个普通操作数，
// `Finish` / `EndLayer` / 二元 frame 都不需要知道它的存在。
const bodyEngine = this.ArrowBody;
if (bodyEngine === null) {
  this.Fail("箭头缺少函数体");
  return false;
}
if (bodyEngine.Held) {
  this.Fail("箭头体提前收口: " + bodyEngine.Reason);
  return false;
}
const body = bodyEngine.Finish();
if (body === null) {
  this.Fail("箭头体不完整: " + bodyEngine.Reason);
  return false;
}
this.CompleteArrow(body);
return true;
```

## private method CompleteArrow:(body:Token)=>void

```ts
const arrow = this.ArrowPending;
this.ArrowPending = null;
this.ArrowBody = null;
if (arrow === null) {
  return;
}
const shape = arrow as ShapeToken;
shape.Add(body);
// 终点 = 体最后一个字符之后（`SpanNode(arrow, start, At - 1)` 同口）；起点/Pos 在建箭头时已经封好。
if (body.SourceRange.EndIndex >= 0) {
  shape.SignOut(body.SourceRange.EndIndex);
}
shape.TryToClose(this.Context);
this.TakeOperand(shape);
```

## private method BuildArrowBlock:(bracket:Bracket, pos:int)=>Token | null

```ts
// 箭头块体：`() => {}` / `() => { return 1; }`。**口径与 `DirectStatementAssembly.BlockFrom` 完全一致**
// （那边是 canonical 实现）：体内已收口的语句按原顺序进 Data、区间 = 括号自己的 `{`…`}`、
// Pos = 传进来那一格（= `=>` 的 EndIndex），并复刻 `CollectBodyStatements` 的「块内第一条语句 Pos 纠正」。
// **为什么在这里复刻一份**：`direct-statement-assembly` 已经 import 本引擎（assembly → engine），
// 反向 import 就是循环依赖（XLD-MD-GUIDE §3：依赖只许「新 → 旧」、不许成环）。两处口径必须同步，
// R4 建议把 `BuiltChildren` 抽到一个不依赖引擎的叶子模块，这里就能直接调用。
const shape = new BlockShape(this.Template);
let rawBase = bracket.SourceRange.StartIndex >= 0 ? bracket.SourceRange.StartIndex + 1 : 0;
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken || unit.IsBasicToken) {
    continue;
  }
  // 未收口的语句壳（`StatementShape` 有 `Kind`，其它形状没有）：与 `BuiltChildren` 同一条判据。
  if (typeof (unit as any).Kind === "number") {
    this.Fail("箭头块体内还有未收口的语句");
    return null;
  }
  const child = unit as ShapeToken;
  if (shape.Data.length === 0 && child.Pos < rawBase) {
    child.Pos = rawBase;
  }
  shape.Add(child);
  if (child.SourceRange.EndIndex >= 0) {
    rawBase = child.SourceRange.EndIndex;
  }
}
if (bracket.SourceRange.StartIndex >= 0) {
  shape.SignIn(bracket.SourceRange.StartIndex);
}
if (bracket.SourceRange.EndIndex >= 0) {
  shape.SignOut(bracket.SourceRange.EndIndex);
}
shape.Pos = pos;
shape.TryToClose(this.Context);
return shape;
```
