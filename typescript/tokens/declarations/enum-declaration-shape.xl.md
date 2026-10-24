# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ConstKeywordShape } from "../keywords/const-keyword-shape.xl.md"
import { DecoratorShape } from "../types/decorator-shape.xl.md"
import { EnumMemberShape } from "../members/enum-member-shape.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ComputedPropertyNameShape } from "../types/computed-property-name-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { ItemRule } from "../../../core/syntax/batch/item-list.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { EnumBodyItemHost, EnumItemRule } from "../items/enum-item-rule.xl.md"
```

# namespace cangjie

# class EnumDeclarationShape extends ShapeToken

```txt
enum E {}
enum E { A }
enum E { A, B }
enum E { A = 1, B = 2 }
enum E { A = "x" }
enum E { A = `x` }
enum E { "a" = 1 }
enum E { 1 = 1 }
declare enum E {}
const enum E { A = 1 }
declare const enum E { A = 1 }
```

`enum E { A }` 的 TS children 是 [Identifier E, EnumMember A]；EnumMember 自己是 [Identifier A]，
带初始化器时是 [Identifier A, 字面量/表达式]；成员名还可以是 StringLiteral（`"a"`）或 NumericLiteral（`1`）。
修饰词按书写顺序进 Data（`declare` / `const` 都支持，`declare const enum` 两个都在）；
`enum` / 花括号 / 逗号 / 等号都不进 Data。

枚举成员由 `EnumMemberShape`（members 家族，构造函数已就绪）就地建：
名字的 `Pos` = 枚举成员 `Pos` = 前一个单元（`{` 或 `,`）`EndIndex`，与 TS 的 `EnumMember.pos` 同口径；
初始化器用 `ExpressionBuilder.ParseAssign()` 解析，区间到初始化器终点为止（`enum E { A }` 的成员区间不含 `}` 前的空间）。

区间：从修饰符（没有就从 `enum`）的起点到 `}`；`Pos` 口径同 ClassDeclarationShape。

**提前挂载的壳**：`EnumDeclarationRule` 在认下 `enum` 关键字时就建出本形状并挂到父单元上；本形状随后吃
名字与枚举体括号。枚举体括号创建时 `OnBracketCreatedEvent` 认领它、给括号挂上 item 表引擎
（`EnumBodyItemHost` = `ItemListEngine(EnumItemRule)`），闭合时由本形状的 `OnBasicTokenClosed` 收口
（`BuildFromCode` + `BodyGuideUtil.FinishShell`）。导出 / 模块体 / 语句位置等一次性构建路径仍走 `FromUnits`。

## field EnumName:Token | null = null

## field Members:Array<Token> = []

## field BodyBracket:Bracket | null = null

`BodyBracket` 记「已经认定的枚举体括号」：`null` 表示还没认定。认定之后，**后续括号创建事件一律忽略**
（枚举体里的嵌套括号父级是枚举体，不会回到本形状）。

## constructor:(template:Template)=>void

```ts
super(template);
```

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

监听括号创建：新括号**肯定是枚举体**时，给枚举体括号挂上 item 表引擎（`EnumBodyItemHost`），
枚举体括号关闭时由本形状的 `OnBasicTokenClosed` 收口。

- 不是 `{`：不是枚举体；
- 已经认定过枚举体：忽略；
- 尖括号深度不为 0 / 前一个代码单元在「后面还能接类型」的位置：不是枚举体（枚举头没有类型参数与 heritage，
  这里仍走共享判据，`blocked` 给空表）。

**不再给括号挂 `CatalogGuide`、也不给自己装终结候选**：成员判定与收口都由 item 表引擎负责。

```ts
if (this.BodyBracket !== null) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
if (!BodyGuideUtil.IsBodyBracket(this, bracket as Bracket, [])) {
  return;
}
const body = bracket as Bracket;
this.BodyBracket = body;
body.BatchAdapter = new EnumBodyItemHost(body, EnumDeclarationShape.CreateBodyItemRules());
```

## private static field CreateBodyItemRulesCache:Array<ItemRule> | null = null

## static method CreateBodyItemRules:()=>Array<ItemRule>

枚举体 item 表的规则表：枚举成员只有一个规则 `EnumItemRule`。规则表只建一份，所有枚举体括号共用；
判定状态在各自的引擎里（`EnumBodyItemHost.Engine`），规则实例本身无状态，共用安全。

```ts
if (EnumDeclarationShape.CreateBodyItemRulesCache !== null) {
  return EnumDeclarationShape.CreateBodyItemRulesCache;
}
EnumDeclarationShape.CreateBodyItemRulesCache = [new EnumItemRule()];
return EnumDeclarationShape.CreateBodyItemRulesCache;
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

basic token 关闭的宿主侧入口（`Bracket.Close` 只问父单元；枚举体括号的父单元就是本形状）。

枚举体括号关闭时先 flush 括号上的 item 表引擎（把最后一条成员建掉），再把壳收口成完整声明；
其余 basic token（头部阶段的名字 / `declare` / `const` 等）交回 `UnitToken` 的默认实现。

```ts
if (this.BodyBracket !== null && token === this.BodyBracket) {
  return this.FinishBody(context);
}
return super.OnBasicTokenClosed(token, context);
```

## private method FinishBody:(context:SyntaxContext)=>CloseStates

枚举体括号闭合：flush 引擎 → 用壳自己的 `Data` 走 `BuildFromCode` → `FinishShell` 原地顶替。

收口用 splice 顶替而不是 `Token.Replace`，所以 `BodyBracket` 先清空，避免重复收口；
`FlushBatch` 在括号没有活动批次时是空操作，`Engine.Flush` 只补建「收口时才确定」的最后一条成员。

```ts
const body = this.BodyBracket;
if (body === null) {
  return CloseStates.Nothing;
}
const parent = this.Parent;
if (parent === null) {
  return CloseStates.Nothing;
}
this.BodyBracket = null;
if (body.BatchAdapter !== null) {
  body.FlushBatch(context);
}
const code:Array<Token> = [];
for (const unit of this.Data) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
const built = EnumDeclarationShape.BuildFromCode(this, code, this.Pos, context);
BodyGuideUtil.FinishShell(parent, this, built);
return CloseStates.Built;
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext)=>EnumDeclarationShape

收集 `start..tokenIndex` 的非 trivia 代码单元、算 `Pos`，然后转调 `BuildFromCode`（与壳收口共用同一条建造路径）。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.End;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
return EnumDeclarationShape.BuildFromCode(host, code, pos, context);
```

## static method BuildFromCode:(host:Token, code:Array<Token>, pos:int, context:SyntaxContext)=>EnumDeclarationShape

从「已经按 AST 顺序排好的非 trivia 代码单元」建枚举声明。两个入口共用：`FromUnits`（导出 / 模块体 / 语句位置等
一次性建形状）与本形状壳的收口（`FinishBody` 把壳换成完整形状）。

`pos` 是第一个代码单元前一个非 trivia 单元的 `EndIndex`（没有就是 `0`），也是装饰器的区间起点。

成员由 `CollectBodyMembers` 取：枚举体里已经由成员候选增量建出的形状按序收集，仍留 raw basic token 的路径
（一次性构建、最后一个没来得及建出的成员、恢复形）回退 `BuildMembers`。

```ts
const decoratorBase = pos;
const decorators:Array<Token> = [];
let decoratorEnd = decoratorBase;
let decoratorCount = 0;
while (decoratorCount < code.length
  && code[decoratorCount] instanceof Symbol && (code[decoratorCount] as Symbol).Is("@")) {
  const atUnit = code[decoratorCount];
  const decoratorPos = decoratorEnd;
  const expressionBase = atUnit.SourceRange.End < 0 ? decoratorPos : atUnit.SourceRange.EndIndex;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(code.slice(decoratorCount + 1), expressionBase);
  if (builder.Units.length === 0) {
    throw new Error("decorator expression is empty");
  }
  const decoratorExpression = builder.ParseExpression();
  if (builder.At === 0) {
    throw new Error("decorator expression was not read");
  }
  const consumed = builder.At;
  for (let cursor = decoratorCount + 1; cursor < decoratorCount + 1 + consumed; cursor++) {
    const cursorEnd = code[cursor].SourceRange.End;
    if (cursorEnd >= 0) {
      decoratorEnd = cursorEnd;
    }
  }
  decoratorCount += 1 + consumed;
  decorators.push(DecoratorShape.FromParts(atUnit, decoratorExpression, decoratorPos, context));
}
let index = decoratorCount;
const modifierUnits:Array<Token> = [];
while (index < code.length && code[index] instanceof Common) {
  const text = (code[index] as Common).TempToString();
  if (text === "declare" || text === "const") {
    modifierUnits.push(code[index]);
    index++;
    continue;
  }
  break;
}
if (index >= code.length) {
  throw new Error("枚举声明不完整");
}
const keyword = code[index];
index++;
if (!(keyword instanceof Common) || !(keyword as Common).Is("enum")) {
  throw new Error("枚举声明缺少 enum 关键字");
}
if (index >= code.length) {
  throw new Error("枚举声明缺少名字");
}
const nameUnit = code[index];
index++;
if (!(nameUnit instanceof Common)) {
  throw new Error("枚举声明的名字不是标识符");
}
if (index >= code.length) {
  throw new Error("枚举声明缺少枚举体");
}
const bodyUnit = code[index];
index++;
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  throw new Error("枚举声明的枚举体不是花括号");
}
if (index !== code.length) {
  throw new Error("枚举声明有多余单元");
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
name.Pos = keyword.SourceRange.End < 0 ? pos : keyword.SourceRange.EndIndex;
const members = EnumDeclarationShape.CollectBodyMembers(host, bodyUnit as Bracket, context);
const shape = new EnumDeclarationShape(host.Template);
shape.EnumName = name;
shape.Members = members;
let modifierPos = decorators.length === 0 ? pos : decoratorEnd;
for (const decorator of decorators) {
  shape.Add(decorator);
}
for (const unit of modifierUnits) {
  if ((unit as Common).Is("declare")) {
    const modifier = DeclareKeywordShape.FromBasicToken(unit as Common, context);
    modifier.Pos = modifierPos;
    shape.Add(modifier);
  } else {
    const modifier = new ConstKeywordShape(host.Template);
    modifier.SignInToken(unit);
    modifier.SignOutToken(unit);
    modifier.Pos = modifierPos;
    modifier.TryToClose(context);
    shape.Add(modifier);
  }
  modifierPos = unit.SourceRange.End < 0 ? modifierPos : unit.SourceRange.EndIndex;
}
shape.Add(name);
for (const member of members) {
  shape.Add(member);
}
if (decorators.length > 0) {
  shape.SignInToken(code[0]);
} else if (modifierUnits.length > 0) {
  shape.SignInToken(modifierUnits[0]);
} else {
  shape.SignInToken(keyword);
}
shape.SignOutToken(bodyUnit);
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

收口时取枚举体成员：已经由成员候选增量建出的形状按序收集（跳过 trivia 与残留的 `;` / `,`），
后面剩下的 raw 代码包成临时括号视图交给同一个 `BuildMembers` 逐成员建。

```ts
return BodyGuideUtil.CollectBodyMembers(host, bracket, context, EnumDeclarationShape.BuildMembers);
```

## static method BuildMembers:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>

按顶层逗号切枚举成员（括号是整块 `Bracket`，所以成员初始化器里的逗号不在本层），逐个建 `EnumMemberShape`。
尾随逗号（`enum E { A, }`）产生的空组跳过，与 TS 一致。

```ts
const members:Array<Token> = [];
let group:Array<Token> = [];
let memberPos = bracket.SourceRange.Start < 0 ? 0 : bracket.SourceRange.StartIndex + 1;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const member = EnumDeclarationShape.BuildMember(host, group, memberPos, context);
    if (member !== null) {
      members.push(member);
    }
    group = [];
    memberPos = item.SourceRange.End < 0 ? 0 : item.SourceRange.EndIndex;
    continue;
  }
  group.push(item);
}
const tail = EnumDeclarationShape.BuildMember(host, group, memberPos, context);
if (tail !== null) {
  members.push(tail);
}
return members;
```

## static method BuildMember:(host:Token, group:Array<Token>, pos:int, context:SyntaxContext)=>Token | null

`EnumItemRule.Build` 复用的**同一建造器**（不要另写一份，否则增量路径与 raw 路径的
AST 会不一致）。`group` 是成员自己的非 trivia 代码单元，`pos` 是成员 `Pos`。

```ts
if (group.length === 0) {
  return null;
}
const nameUnit = group[0];
let name:Token;
if (nameUnit instanceof Bracket && (nameUnit as Bracket).StartBracketChar === "[") {
  // 计算名 `enum E { [k] }` / `[f()] = 1`：TS 的成员名是 ComputedPropertyName（内部装表达式），
  // 与 class 成员计算名同一形态；`[` `]` 不进 children，区间覆盖整个方括号。
  const computedBracket = nameUnit as Bracket;
  const inner = new ExpressionBuilder(host.Template, context);
  let innerBase = 0;
  if (computedBracket.SourceRange.Start >= 0) {
    innerBase = computedBracket.SourceRange.StartIndex + 1;
  }
  inner.Load(computedBracket.Data, innerBase);
  if (inner.Units.length === 0) {
    throw new Error("枚举成员的计算名是空的");
  }
  const expression = inner.ParseExpression();
  if (inner.At !== inner.Units.length) {
    throw new Error("枚举成员的计算名没有读完");
  }
  const computed = new ComputedPropertyNameShape(host.Template);
  computed.Add(expression);
  computed.SignInToken(computedBracket);
  computed.SignOutToken(computedBracket);
  computed.Pos = pos;
  computed.TryToClose(context);
  name = computed;
} else if (nameUnit instanceof Common) {
  if ((nameUnit as Common).IsNumber()) {
    // `enum E { 1 = 1 }`: TS 的名字是 NumericLiteral，不是 Identifier。
    const numeric = NumericLiteralShape.FromBasicToken(nameUnit as Common, context);
    numeric.Pos = pos;
    name = numeric;
  } else {
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, context);
    identifier.Pos = pos;
    name = identifier;
  }
} else if (nameUnit instanceof String) {
  // `enum E { 'a' = 1 }`: TS 的名字是 StringLiteral。
  const stringLiteral = StringLiteralShape.FromBasicToken(nameUnit as String, context);
  stringLiteral.Pos = pos;
  name = stringLiteral;
} else {
  throw new Error("枚举成员的名字不是标识符、字符串或数字");
}
const member = new EnumMemberShape(host.Template);
member.Add(name);
let endToken:Token = nameUnit;
if (group.length > 1) {
  const equal = group[1];
  if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
    throw new Error("枚举成员缺少等号");
  }
  const valueUnits:Array<Token> = group.slice(2);
  if (valueUnits.length === 0) {
    throw new Error("枚举成员的初始化器为空");
  }
  const valuePos = equal.SourceRange.End < 0 ? 0 : equal.SourceRange.EndIndex;
  const builder = new ExpressionBuilder(host.Template, context);
  builder.Load(valueUnits, valuePos);
  const value = builder.ParseAssign();
  if (builder.At !== builder.Units.length) {
    throw new Error("枚举成员的初始化器没有读完");
  }
  member.Add(value);
  endToken = valueUnits[valueUnits.length - 1];
}
member.SignInToken(nameUnit);
member.SignOutToken(endToken);
member.Pos = pos;
member.TryToClose(context);
return member;
```
