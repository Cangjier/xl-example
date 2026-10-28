# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ClassDeclarationShape } from "../declarations/class-declaration-shape.xl.md"
import { BigIntLiteralShape } from "../literals/big-int-literal-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { AsyncKeywordShape } from "../keywords/async-keyword-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { MethodDeclarationShape } from "../types/method-declaration-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

# class DirectObjectMemberAssembly

```txt
({ m(a) { return a; } })        -> MethodDeclaration[Identifier m, Parameter a, Block[ReturnStatement]]
({ get x() { return 1; } })     -> GetAccessor[Identifier x, Block[ReturnStatement]]
({ set x(v) { t = v; } })       -> SetAccessor[Identifier x, Parameter v, Block[ExpressionStatement]]
({ m() {} })                    -> MethodDeclaration[Identifier m, Block]（空体不加计数）
({ async m() {} })              -> MethodDeclaration[AsyncKeyword, Identifier m, Block]（R5-D3-d）
({ *m() { yield 1; } })         -> MethodDeclaration[AsteriskToken, Identifier m, Block]（R5-D3-d）
({ m(a: number) {} })           -> MethodDeclaration[Identifier m, Parameter(a, NumberKeyword), Block]（R5-D3-e）
({ m(...a) {} })                -> MethodDeclaration[Identifier m, Parameter(DotDotDotToken, a), Block]（R5-D3-e）
({ async *m() {} })             -> null（expr.member，async 生成器方法本轮不做）
({ m(a = 1) {} })               -> null（expr.member，默认值会拉 ExpressionBuilder）
```

## static field LastReason:string = ""

## static method MemberFrom:(data:Array<Token>, from:int, to:int, nameIndex:int, accessorKind:string, memberPos:int, basePos:int, template:Template, context:SyntaxContext, prefixes:Array<int>)=>Token | null

```ts
// `data` = 对象字面量的 `Data`，`from..to` = 按顶层逗号切出的成员片段（`to` 不含逗号），
// `nameIndex` = 成员名（或 `get`/`set` 关键词）在 `data` 里的下标，`accessorKind` = "" / "get" / "set"，
// `prefixes` = 方法前缀（R5-D3-d：`async` / `*`）在 `data` 里的下标，**按出现顺序**（空数组 = 无前缀）。
// `basePos` = 对象 `{` 之后第一个字符（= `ExpressionBuilder.Load(bracket.Data, StartIndex+1)` 的 base），
// 与 `DirectStatementAssembly.PositionAt` 的口径一起复刻 legacy 的 `Positions` 表。
DirectObjectMemberAssembly.LastReason = "";
const codeAt:Array<number> = DirectStatementAssembly.CodeAt(data);
const nameCodeIndex = codeAt.indexOf(nameIndex);
if (nameCodeIndex < 0) {
  DirectObjectMemberAssembly.LastReason = "对象成员的名字不在代码单元表里";
  return null;
}
const namePos = DirectStatementAssembly.PositionAt(data, codeAt, nameCodeIndex, basePos);
const name = DirectObjectMemberAssembly.BuildName(data[nameIndex], namePos, template, context);
if (name === null) {
  return null;
}
// 参数表：名字之后那一个代码单元必须是 `(` 括号。
let cursor = nameIndex + 1;
while (cursor < to && data[cursor].IsTriviaToken) {
  cursor += 1;
}
if (cursor >= to) {
  DirectObjectMemberAssembly.LastReason = "对象成员缺少参数表";
  return null;
}
const parameterUnit = data[cursor];
if (!(parameterUnit instanceof Bracket) || (parameterUnit as Bracket).StartBracketChar !== "(") {
  DirectObjectMemberAssembly.LastReason = "对象成员缺少参数表";
  return null;
}
const parametersBracket = parameterUnit as Bracket;
// 体：参数表之后那一个代码单元必须是 `{`（返回类型 / 类型参数 / 可选标记 / 无体签名都不做）。
let bodyIndex = cursor + 1;
while (bodyIndex < to && data[bodyIndex].IsTriviaToken) {
  bodyIndex += 1;
}
if (bodyIndex >= to) {
  DirectObjectMemberAssembly.LastReason = "对象成员缺少函数体";
  return null;
}
const bodyUnit = data[bodyIndex];
if (!(bodyUnit instanceof Bracket) || (bodyUnit as Bracket).StartBracketChar !== "{") {
  DirectObjectMemberAssembly.LastReason = "对象成员形态不在本轮范围（返回类型/类型参数/无体签名）";
  return null;
}
// 体必须是成员片段的最后一段：`m() {} x` 这种形态不静默吃成方法。
let afterBody = bodyIndex + 1;
while (afterBody < to && data[afterBody].IsTriviaToken) {
  afterBody += 1;
}
if (afterBody < to) {
  DirectObjectMemberAssembly.LastReason = "对象成员在函数体之后还有单元";
  return null;
}
// 参数表：R5-D3-e 的门 = 纯 Identifier / 带类型注解 / 可选标记 / rest（**默认值仍然拒**）。
// 这是 A6 的守卫：`BuildParameters` 遇到默认值会走 `TakeParameterInitializer` → `new ExpressionBuilder`。
const parameterCount = DirectObjectMemberAssembly.ClassifyParameters(parametersBracket);
if (parameterCount < 0) {
  DirectObjectMemberAssembly.LastReason
    = "对象成员的参数不在本轮范围（默认值/解构/装饰器/其它）或类型区无法判定";
  return null;
}
if (accessorKind === "get" && parameterCount !== 0) {
  DirectObjectMemberAssembly.LastReason = "get 访问器必须没有参数";
  return null;
}
if (accessorKind === "set" && parameterCount !== 1) {
  DirectObjectMemberAssembly.LastReason = "set 访问器必须恰好一个参数";
  return null;
}
const parameters = ClassDeclarationShape.BuildParameters(data[from] as Token, parametersBracket, context);
// 体走 `BlockFrom`（= 收集体内已收口语句 + 块区间 / Pos / 第一条语句 Pos 纠正），与函数体 / 箭头体
// 同一条通道；体内语句未收口时返回 null（调用方 Decline，绝不代建）。
const block = DirectStatementAssembly.BlockFrom(bodyUnit as Bracket, template, data, codeAt, basePos, context);
if (block === null) {
  DirectObjectMemberAssembly.LastReason = "对象成员体内还有未收口的语句";
  return null;
}
let member:ShapeToken;
if (accessorKind === "get") {
  member = new GetAccessorShape(template);
} else if (accessorKind === "set") {
  member = new SetAccessorShape(template);
} else {
  member = new MethodDeclarationShape(template);
}
// AST 子节点顺序照 `ExpressionBuilder.ParseObjectLiteral` 的成员分支：前缀 → 名字 → 参数… → 体。
// R5-D3-d：`AsyncKeyword` / `AsteriskToken` 在名字之前（tsc 实测 `MethodDeclaration[AsyncKeyword,
// Identifier m, Block]` / `[AsteriskToken, Identifier m, Block]`），两者的 `Pos` 都 = 成员片段的
// `Positions` 起点（= `memberPos`），区间 = 前缀 token 自己（`async` 3..8 / `*` 3..4）。
for (const prefixIndex of prefixes) {
  const prefixText = DirectStatementAssembly.TextOf(data[prefixIndex]);
  if (prefixText === "async") {
    const asyncKeyword = new AsyncKeywordShape(template);
    asyncKeyword.SignInToken(data[prefixIndex]);
    asyncKeyword.SignOutToken(data[prefixIndex]);
    asyncKeyword.Pos = memberPos;
    asyncKeyword.TryToClose(context);
    member.Add(asyncKeyword);
    continue;
  }
  if (prefixText === "*") {
    const asterisk = new AsteriskTokenShape(template);
    asterisk.SignInToken(data[prefixIndex]);
    asterisk.SignOutToken(data[prefixIndex]);
    asterisk.Pos = memberPos;
    asterisk.TryToClose(context);
    member.Add(asterisk);
    continue;
  }
  DirectObjectMemberAssembly.LastReason = "对象成员的前缀不在本轮范围: " + prefixText;
  return null;
}
member.Add(name);
for (const parameter of parameters) {
  member.Add(parameter);
}
member.Add(block);
// 区间 / Pos 照 legacy：SignIn = 成员首代码单元（`get`/`set` 也算），SignOut = 体的 `}`，
// Pos = `inner.Positions[memberIndex]`（= 传入的 memberPos，含成员前的 trivia）。
member.SignInToken(data[from]);
member.SignOutToken(bodyUnit);
member.Pos = memberPos;
member.TryToClose(context);
return member;
```

## static method BuildName:(unit:Token, pos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 成员名的形状：字符串字面量 / 数值 / BigInt / 标识符（含关键字名）。与
// `ExpressionBuilder.ParsePropertyName` 同一组判据；计算属性名（`[`）与方法形态不匹配，
// 由调用方在更早的 `(` 判定外处理。
if (unit instanceof String) {
  if (DirectTokenUtil.IsTemplateUnit(unit, template)) {
    DirectObjectMemberAssembly.LastReason = "对象成员的属性名不支持模板串";
    return null;
  }
  const shape = StringLiteralShape.FromBasicToken(unit as String, context);
  shape.Pos = pos;
  return shape;
}
if (unit instanceof Common) {
  const common = unit as Common;
  const text = common.TempToString();
  if (DirectTokenUtil.StartsNumber(text)) {
    if (common.IsBigInt()) {
      const bigInt = BigIntLiteralShape.FromBasicToken(common, context);
      bigInt.Pos = pos;
      return bigInt;
    }
    const numeric = NumericLiteralShape.FromBasicToken(common, context);
    numeric.Pos = pos;
    return numeric;
  }
  const identifier = IdentifierShape.FromBasicToken(common, context);
  identifier.Pos = pos;
  return identifier;
}
DirectObjectMemberAssembly.LastReason = "对象成员的属性名不在本轮范围";
return null;
```

## static method ClassifyParameters:(bracket:Bracket)=>int

```ts
// 参数表的语法判据（R5-D3-e）。返回值 = 参数个数（>= 0 表示可以交给 `BuildParameters`），
// -1 = 不做（调用方 `expr.member`）。允许的三类，全部**只碰 `TypeBuilder`**（A6 安全）：
//   ① 纯 Identifier：`()` / `(a)` / `(a, b)` / `(a,)`（与 R4 的 `IdentifierParameterCount` 逐位相同）；
//   ② 带类型注解 / 可选标记：`(a: number)` / `(a?: T)`（`TypeBuilder.ParseParameter`）；
//   ③ rest：`(...a)` / `(...a: A[])`（`ParseParameter` 已经会建 `DotDotDotToken`）。
// **必须拒**的三类（都是 A6 / 静默错建的风险）：
//   `=` 默认值 —— `BuildParameters` 的 `TakeParameterInitializer` 会 `new ExpressionBuilder`；
//   `@` 参数装饰器 —— 同样拉 `ExpressionBuilder.ParseDecorators`；
//   名字位不是标识符（解构 `{a}` / `[a]` / 字符串 / 括号）—— 参数名形态，本类不建。
// 类型区里遇到顶层逗号就回到「等名字」：泛型实参里的逗号（`a: Map<K, V>`）因此会落进「名字区」并在
// `>` 处判死 ⇒ 显式 Decline（不是静默错建）。这一条是**已知缺口**，R6 可换成 `TypeBuilder` 的角括号深度。
let count = 0;
let mode = 0;                 // 0 = 等名字（或 `...`），1 = 名字之后，2 = 类型区
let at = 0;
const units:Array<Token> = [];
for (const unit of bracket.Data) {
  if (!unit.IsTriviaToken) {
    units.push(unit);
  }
}
while (at < units.length) {
  const unit = units[at];
  const text = DirectStatementAssembly.TextOf(unit);
  if (text === "=") {
    return -1;
  }
  if (text === "@") {
    return -1;
  }
  if (mode === 0) {
    if (unit instanceof Symbol && (unit as Symbol).Is("...")) {
      at += 1;
      continue;
    }
    if (unit instanceof Common) {
      if ((unit as Common).CanStartNumber()) {
        return -1;
      }
      count += 1;
      mode = 1;
      at += 1;
      continue;
    }
    return -1;
  }
  if (text === ",") {
    mode = 0;
    at += 1;
    continue;
  }
  if (mode === 1) {
    if (text === "?" || text === "?:") {
      at += 1;
      continue;
    }
    if (text === ":") {
      mode = 2;
      at += 1;
      continue;
    }
    return -1;
  }
  at += 1;
}
return count;
```
