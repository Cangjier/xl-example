# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { ParameterShape } from "../types/parameter-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { StatementBuilder } from "../statements/statement-builder.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { MemberBoundary } from "../types/member-boundary.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

# class FunctionDeclarationShape extends ShapeToken

```txt
function f() {}
function f(a) {}
function f(a: A) {}
function f(a?: A) {}
function f(a: A, b: B): C { return a; }
function f(): void {}
declare function f(): void;
function f(a: A): B;
async function f() {}
async function f(a: A): B { await a; }
declare async function f(): void;
```

TS 的 children 顺序：修饰符（可选 `DeclareKeyword` / `AsyncKeyword`，按书写顺序）→ 生成器的 `AsteriskToken`（可选，`function*`）→ 名字 →
每个 `Parameter` →（可选）返回类型 →（可选）`Block` 函数体；
`function` 关键字、参数表的括号、`:`、无体声明的 `;` 之外的分隔符都不进 Data。

参数表由 `Bracket.Data` 逐组建：带类型标注的组交给 `TypeBuilder.ParseParameter()`（与函数类型同一口径），
不带类型标注的组只建 `Identifier` 叶子（`function f(a)` 的 TS Parameter 只有 Identifier 一个子节点）。
函数体交给 `StatementBuilder`：`{…}` 是整块括号单元，`BuildStatement()` 会走到 `BuildBlock()`。
无函数体的声明（`declare function f(): void;` / 重载签名 `function f(a: A): B;`）最后一块是 `;`：
Data 里没有 Block，区间到 `;` 为止（AST 的 End 含分号）。

区间：从 `declare` 或 `function` 起点到函数体 `}` / `;`；`Pos` = 前面那个非 trivia 单元 `End.Index + 1`（没有就是 `0`）。
名字 `Pos` = `function` 之后；参数 `Pos` = `(` 或 `,` 之后；返回类型 `Pos` = `:` 之后；函数体 `Pos` = `)` 或返回类型之后。

## field DeclareKeyword:Token | null = null

## field AsteriskToken:Token | null = null

## field FunctionName:Token | null = null

## field Parameters:Array<Token> = []

## field ReturnType:Token | null = null

## field Body:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, ambient?:bool)=>FunctionDeclarationShape

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 3) {
  throw new Error("函数声明不完整");
}
let cursor = 0;
let declareUnit:Token | null = null;
let hasAsync = false;
const modifierUnits:Array<Token> = [];
while (cursor < code.length) {
  const unit = code[cursor];
  if (unit instanceof Common && (unit as Common).Is("declare") && declareUnit === null) {
    declareUnit = unit;
    modifierUnits.push(unit);
    cursor++;
    continue;
  }
  if (unit instanceof Common && (unit as Common).Is("async") && !hasAsync) {
    hasAsync = true;
    modifierUnits.push(unit);
    cursor++;
    continue;
  }
  break;
}
if (code.length < cursor + 3) {
  throw new Error("函数声明不完整");
}
const keyword = code[cursor];
if (!(keyword instanceof Common) || !(keyword as Common).Is("function")) {
  throw new Error("函数声明缺少 function 关键字");
}
let asteriskUnit:Token | null = null;
let nameOffset = 1;
if (code[cursor + 1] instanceof Symbol && (code[cursor + 1] as Symbol).Is("*")) {
  asteriskUnit = code[cursor + 1];
  nameOffset = 2;
}
const nameUnit = code[cursor + nameOffset];
if (!(nameUnit instanceof Common)) {
  throw new Error("函数声明的名字不是标识符");
}
let paramIndex = cursor + nameOffset + 1;
let typeParameters:Array<Token> = [];
if (paramIndex < code.length && code[paramIndex] instanceof Symbol && (code[paramIndex] as Symbol).Is("<")) {
  // Generic function: "<...>" right after the name; TypeBuilder parses the list (same shape as
  // type alias parameters, including extends/default), and the list goes between Identifier and
  // Parameter[] in the AST children to match TS.
  const angleUnit = code[paramIndex] as Symbol;
  const angleBuilder = new TypeBuilder(host.Template, context);
  const angleStart = angleUnit.SourceRange.Start === null ? 0 : angleUnit.SourceRange.Start.Index;
  angleBuilder.Load(code.slice(paramIndex), angleStart);
  typeParameters = angleBuilder.ParseTypeParameterList();
  if (typeParameters.length === 0) {
    throw new Error("函数声明的泛型参数为空");
  }
  // `Load` 会把 `>>` / `>>>` 拆成多个只含 `>` 的虚拟单元，`angleBuilder.At` 是虚拟单元数，
  // 不能直接加到原始 code 下标上：按原 code 逐格还原「消费了几个原始单元」（`>>` 计 2、`>>>` 计 3）。
  let consumedUnits = 0;
  let mappedIndex = paramIndex;
  while (consumedUnits < angleBuilder.At && mappedIndex < code.length) {
    const mappedUnit = code[mappedIndex];
    let width = 1;
    if (mappedUnit instanceof Symbol) {
      const mappedText = (mappedUnit as Symbol).TempToString();
      if (mappedText.length > 1) {
        let allClose = true;
        for (let ci = 0; ci < mappedText.length; ci++) {
          if (mappedText[ci] !== ">") {
            allClose = false;
            break;
          }
        }
        if (allClose) {
          width = mappedText.length;
        }
      }
    }
    consumedUnits += width;
    mappedIndex++;
  }
  paramIndex = mappedIndex;
}
const paramUnit = code[paramIndex];
if (!(paramUnit instanceof Bracket) || (paramUnit as Bracket).StartBracketChar !== "(") {
  throw new Error("函数声明缺少参数表");
}
const last = code[code.length - 1];
const lastIsBrace = last instanceof Bracket && (last as Bracket).StartBracketChar === "{";
const lastIsSemicolon = last instanceof Symbol && (last as Symbol).Is(";");
// 末尾的 `{…}` 只有在「前一个单元能收住一个类型」时才是函数体；否则它是返回类型里的对象字面量
// （`declare function f(): { a: A }` 的最后一块就是类型，没有函数体）。
const bodyIsLast = lastIsBrace && TypeBuilder.IsBodyBrace(code, code.length - 1);
let tailIndex = bodyIsLast || lastIsSemicolon ? code.length - 1 : code.length;
let signOutUnit:Token = last;
let bodyUnit:Token | null = null;
if (bodyIsLast) {
  bodyUnit = last;
} else if (!lastIsBrace && !lastIsSemicolon) {
  // ambient 的无体、无分号函数（namespace 体里 `function f(): B` 换行接下一个成员）：
  // 调用方显式传 ambient=true 时才允许。
  if (!(ambient ?? false)) {
    throw new Error("函数声明缺少函数体或分号");
  }
}
let returnType:Token | null = null;
const afterParams = paramIndex + 1;
if (afterParams < tailIndex) {
  const colon = code[afterParams];
  if (!(colon instanceof Symbol) || !(colon as Symbol).Is(":")) {
    throw new Error("函数声明的返回类型缺少冒号");
  }
  const typeUnits:Array<Token> = code.slice(afterParams + 1, tailIndex);
  if (typeUnits.length === 0) {
    throw new Error("函数声明的返回类型为空");
  }
  const typePos = colon.SourceRange.End === null ? 0 : colon.SourceRange.End.Index + 1;
  const typeBuilder = new TypeBuilder(host.Template, context);
  typeBuilder.Load(typeUnits, typePos);
  // 返回类型可以是类型谓词（`x is A` / `asserts x is A` / `asserts x`）：走 ParseReturnType 分流，
  // 其余类型仍由 ParseType 读（与函数类型位置同一套口子）。
  returnType = typeBuilder.ParseReturnType();
  if (typeBuilder.At !== typeBuilder.Units.length) {
    // ambient 函数无分号、下一行还有语句时，tokenIndex 可能把下一条语句也带进来：
    // 已收类型末单元与剩余段首之间有换行 → 返回类型到此为止（截 tailIndex）。
    const consumedLast = typeBuilder.Units[typeBuilder.At - 1];
    const leftoverFirst = typeBuilder.Units[typeBuilder.At];
    if ((declareUnit !== null || (ambient ?? false)) && consumedLast !== undefined
      && MemberBoundary.HasLineBreakBetween(consumedLast, leftoverFirst)) {
      tailIndex = afterParams + 1 + typeBuilder.At;
      signOutUnit = code[tailIndex - 1];
    } else {
      throw new Error("函数声明的返回类型没有读完");
    }
  }
} else if (bodyUnit === null && declareUnit === null && (ambient ?? false) === false) {
  // A no-body declaration without "declare" needs a return type (overload signature) --
  // unless the caller says we are inside an ambient context (`declare module/namespace`, where the
  // declare is implicit and the return type may be omitted: `function f();`).
  throw new Error("function 声明没有函数体时必须带返回类型（或 declare）");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
const shape = new FunctionDeclarationShape(host.Template);
let modifierPos = pos;
for (const unit of modifierUnits) {
  if (unit instanceof Common && (unit as Common).Is("declare")) {
    const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, context);
    modifier.Pos = modifierPos;
    if (shape.DeclareKeyword === null) {
      shape.DeclareKeyword = modifier;
    }
    shape.Add(modifier);
  } else {
    const modifier = new AsyncKeywordShape(host.Template);
    if (unit.SourceRange.Start !== null) {
      modifier.SignIn(unit.SourceRange.Start);
    }
    if (unit.SourceRange.End !== null) {
      modifier.SignOut(unit.SourceRange.End);
    }
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  }
  modifierPos = unit.SourceRange.End === null ? modifierPos : unit.SourceRange.End.Index + 1;
}
if (asteriskUnit !== null) {
  const asterisk = new AsteriskTokenShape(host.Template);
  asterisk.SignInToken(asteriskUnit);
  asterisk.SignOutToken(asteriskUnit);
  asterisk.Pos = keyword.SourceRange.End === null ? pos : keyword.SourceRange.End.Index + 1;
  asterisk.TryToClose(context);
  shape.AsteriskToken = asterisk;
  shape.Add(asterisk);
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
if (asteriskUnit === null) {
  name.Pos = keyword.SourceRange.End === null ? pos : keyword.SourceRange.End.Index + 1;
} else {
  name.Pos = asteriskUnit.SourceRange.End === null ? pos : asteriskUnit.SourceRange.End.Index + 1;
}
const parameters = FunctionDeclarationShape.BuildParameters(host, paramUnit as Bracket, context);
let body:Token | null = null;
if (bodyUnit !== null) {
  const bodyPos = FunctionDeclarationShape.PreviousEnd(code[tailIndex - 1]);
  const bodyBuilder = new StatementBuilder(host.Template, context);
  bodyBuilder.Load([bodyUnit], bodyPos);
  body = bodyBuilder.BuildStatement();
  if (bodyBuilder.At !== bodyBuilder.Units.length) {
    throw new Error("函数体没有读完");
  }
}
shape.FunctionName = name;
shape.Parameters = parameters;
shape.ReturnType = returnType;
shape.Body = body;
shape.Add(name);
for (const typeParameter of typeParameters) {
  shape.Add(typeParameter);
}
for (const parameter of parameters) {
  shape.Add(parameter);
}
if (returnType !== null) {
  shape.Add(returnType);
}
if (body !== null) {
  shape.Add(body);
}
if (modifierUnits.length > 0) {
  shape.SignInToken(modifierUnits[0]);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(signOutUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## private static method PreviousEnd:(unit:Token | null)=>int

`)` 或返回类型之后那一格，也就是函数体 `Pos` 的取值。

```ts
if (unit === null || unit.SourceRange.End === null) {
  return 0;
}
return unit.SourceRange.End.Index + 1;
```

## static method TakeParameterInitializer:(host:Token, inner:TypeBuilder, parameter:ParameterShape, context:SyntaxContext)=>void

形参默认值 `= Expr`：TS 的 Parameter children 里它就是 `Initializer`。`ParseParameter` 只读到名字/可选/类型，
这里把 `=` 之后到组末（顶层 `,` 之前）的一段交给表达式构建器，并把参数的区间延到默认值末单元。

```ts
if (inner.At >= inner.Units.length || !inner.IsText(inner.Units[inner.At], "=")) {
  return;
}
const equalsUnit = inner.Units[inner.At];
let initPos = 0;
if (equalsUnit.SourceRange.End !== null) {
  initPos = equalsUnit.SourceRange.End.Index + 1;
}
inner.At++;
const initStart = inner.At;
let initEnd = initStart;
while (initEnd < inner.Units.length && !inner.IsText(inner.Units[initEnd], ",")) {
  initEnd++;
}
const initUnits:Array<Token> = [];
for (let cursor = initStart; cursor < initEnd; cursor++) {
  initUnits.push(inner.Units[cursor]);
}
if (initUnits.length === 0) {
  return;
}
const initBuilder = new ExpressionBuilder(host.Template, context);
initBuilder.Load(initUnits, initPos);
const initializer = initBuilder.ParseAssign();
if (initBuilder.At !== initBuilder.Units.length) {
  throw new Error("参数默认值没有读完");
}
parameter.Add(initializer);
if (initEnd > initStart) {
  const initTail = inner.Units[initEnd - 1].SourceRange.End;
  if (initTail !== null) {
    // 直接改字段：ParseParameter 已经 SpanNode 签过一次 End，再走 SignOutToken 会撞
    // SourceRangeEndIsSetted（core/exceptions/source-exception.xl.md:41）。
    parameter.SourceRange.End = initTail;
  }
}
inner.At = initEnd;
```

## static method BuildParameters:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

参数表按逗号切组；带 `:` / `?:` 的组交给 `TypeBuilder.ParseParameter()`，不带类型的组只建 `Identifier`。

```ts
const parameters:Array<Token> = [];
const inner = new TypeBuilder(host.Template, context);
let base = 0;
if (bracket.SourceRange.Start !== null) {
  base = bracket.SourceRange.Start.Index + 1;
}
inner.Load(bracket.Data, base);
while (inner.At < inner.Units.length) {
  if (inner.IsText(inner.Units[inner.At], ",")) {
    inner.At++;
    continue;
  }
  // Parameter decorators: consume the `@...` prefix first (TS parser accepts them on plain function
  // parameters too), then dispatch as before. Children order: Decorator(s) before name/type.
  const groupStart = inner.At;
  const decorators:Array<Token> = inner.ParseDecorators();
  const nameIndex = inner.At;
  let typed = false;
  if (nameIndex + 1 < inner.Units.length) {
    const next = inner.TextOf(inner.Units[nameIndex + 1]);
    if (next === "?:") {
      typed = true;
    } else if (next === "?") {
      // `a?` 没有类型标注（`f(a?)` / `f(a?, b?)`）也必须是 ParameterShape：TS 的 Parameter
      // 是 name + QuestionToken、Type 缺失。旧口径只在 `?` 后紧跟 `:` 时才算类型化，于是 `a?`
      // 落进下面「裸标识符」分支，`?` 无人认领 → 下一次循环拿 `?` 当名字 → 「函数参数不是标识符」。
      // 正确做法：`?` 一律交 ParseParameter（它已支持 name + QuestionToken、无 Type）。
      typed = true;
    } else if (next === ":") {
      typed = true;
    }
  }
  // A rest parameter after decorators (`@dec ...x: A[]`) is routed to ParseParameter too (it owns `...`).
  const headIsRest = nameIndex < inner.Units.length && inner.TextOf(inner.Units[nameIndex]) === "...";
  // 解构模式形参（`{ a, b }` / `[c, d]`）与「有默认值」的形参（`a = 1`）也必须进 ParseParameter：
  // 前者由 ParseParameter 直接建 Object/ArrayBindingPattern，后者由下面补 Initializer。
  const headNameUnit = nameIndex < inner.Units.length ? inner.Units[nameIndex] : null;
  const headIsPattern = headNameUnit instanceof Bracket
    && ((headNameUnit as Bracket).StartBracketChar === "{" || (headNameUnit as Bracket).StartBracketChar === "[");
  const headIsDefault = nameIndex + 1 < inner.Units.length && inner.TextOf(inner.Units[nameIndex + 1]) === "=";
  if (typed || headIsRest || headIsPattern || headIsDefault) {
    const parameter = inner.ParseParameter() as ParameterShape;
    if (decorators.length > 0) {
      for (let i = decorators.length - 1; i >= 0; i--) {
        decorators[i].Parent = parameter;
        parameter.Data.unshift(decorators[i]);
      }
      const firstDecorator = decorators[0];
      if (firstDecorator.SourceRange.Start !== null) {
        parameter.SourceRange.Start = firstDecorator.SourceRange.Start;
      }
      parameter.Pos = (firstDecorator as ShapeToken).Pos;
    }
    FunctionDeclarationShape.TakeParameterInitializer(host, inner, parameter, context);
    if (headIsPattern && parameter.ParameterName !== null) {
      // 解构模式形参的 Pos 要含前导 trivia（`f(/*c*/ [c])` 的 `[` 从注释前算起）。
      // 有装饰器时 `groupStart` 停在第一个 `@`，前导 trivia 要接到**最后一个装饰器**之后
      // （`f(@a { x }: T)` 的 `{` pos = 装饰器 a 的 End+1），所以用名字下标 `nameIndex` 回看一格。
      let groupPos = 0;
      if (nameIndex > 0) {
        const previousUnit = inner.Units[nameIndex - 1];
        if (previousUnit.SourceRange.End !== null) {
          groupPos = previousUnit.SourceRange.End.Index + 1;
        }
      } else if (bracket.SourceRange.Start !== null) {
        groupPos = bracket.SourceRange.Start.Index + 1;
      }
      (parameter.ParameterName as ShapeToken).Pos = groupPos;
    }
    parameters.push(parameter);
    continue;
  }
  const nameUnit = inner.Units[nameIndex];
  if (!(nameUnit instanceof Common)) {
    throw new Error("函数参数不是标识符");
  }
  inner.At++;
  const parameter = new ParameterShape(host.Template);
  for (const decorator of decorators) {
    parameter.Add(decorator);
  }
  const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
  name.Pos = inner.Positions[nameIndex];
  parameter.ParameterName = name;
  parameter.Add(name);
  parameter.SignInToken(nameUnit);
  parameter.SignOutToken(nameUnit);
  parameter.Pos = inner.Positions[nameIndex];
  if (decorators.length > 0) {
    const firstDecorator = decorators[0];
    if (firstDecorator.SourceRange.Start !== null) {
      parameter.SourceRange.Start = firstDecorator.SourceRange.Start;
    }
    parameter.Pos = (firstDecorator as ShapeToken).Pos;
  }
  parameter.TryToClose(context);
  parameters.push(parameter);
}
return parameters;
```
