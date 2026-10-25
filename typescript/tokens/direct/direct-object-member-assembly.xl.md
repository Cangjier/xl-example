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
import { GetAccessorShape } from "../types/get-accessor-shape.xl.md"
import { MethodDeclarationShape } from "../types/method-declaration-shape.xl.md"
import { SetAccessorShape } from "../types/set-accessor-shape.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

对象字面量成员（方法 / get / set）的直建装配（R4-CONTRACT §4.6）。**只此一份**：
`direct-expression-engine` 的成员循环把「名字之后是 `(`」的片段交给这里，本类负责
名字 / 参数表 / 区间 / Pos / 子节点顺序；方法体**复用** `DirectStatementAssembly.BlockFrom`
（体内语句各自有自己的壳，本类绝不代建），参数表复用 `ClassDeclarationShape.BuildParameters`
（与 `ExpressionBuilder.ParseObjectLiteral` 的成员分支同一个静态助手，A6 安全：纯 Identifier 参数不碰
`ExpressionBuilder` / `StatementBuilder`）。

`async` / 生成器成员、计算属性名、默认参数、返回类型、类型参数、无体签名都在这里返回 `null`，
由调用方记 `expr.member`（R4-CONTRACT §4.7）。

# class DirectObjectMemberAssembly

```txt
({ m(a) { return a; } })        -> MethodDeclaration[Identifier m, Parameter a, Block[ReturnStatement]]
({ get x() { return 1; } })     -> GetAccessor[Identifier x, Block[ReturnStatement]]
({ set x(v) { t = v; } })       -> SetAccessor[Identifier x, Parameter v, Block[ExpressionStatement]]
({ m() {} })                    -> MethodDeclaration[Identifier m, Block]（空体不加计数）
({ async m() {} })              -> null（expr.member）
({ *m() { yield 1; } })         -> null（expr.member）
({ m(a = 1) {} })               -> null（expr.member）
```

## static field LastReason:string = ""

最近一次成员装配失败的原因（调用方拼进 Decline 原因 / NoteDecline 用）。

## static method MemberFrom:(data:Array<Token>, from:int, to:int, nameIndex:int, accessorKind:string, memberPos:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// `data` = 对象字面量的 `Data`，`from..to` = 按顶层逗号切出的成员片段（`to` 不含逗号），
// `nameIndex` = 成员名（或 `get`/`set` 关键词）在 `data` 里的下标，`accessorKind` = "" / "get" / "set"。
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
// 参数表只接受纯 Identifier（默认值 / rest / 类型注解 / 解构 / 装饰器都拒）：这是 A6 的守卫，
// `BuildParameters` 遇到默认值会走 `ExpressionBuilder`（R3-R3 同款风险）。
const parameterCount = DirectObjectMemberAssembly.IdentifierParameterCount(parametersBracket);
if (parameterCount < 0) {
  DirectObjectMemberAssembly.LastReason = "对象成员的参数不在本轮范围（默认值/rest/类型注解/解构）";
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
// AST 子节点顺序照 `ExpressionBuilder.ParseObjectLiteral` 的成员分支：名字 → 参数… → 体。
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

## static method IdentifierParameterCount:(bracket:Bracket)=>int

```ts
// 纯 Identifier 参数表的计数（`()` → 0 / `(a)` → 1 / `(a, b)` → 2 / `(a,)` → 1）；
// 出现任何别的单元（`=` / `...` / `:` / `?` / `{` / `[` / `@`）→ -1。
// 与 `FunctionDeclarationDirectSession.ParametersAreIdentifiers` 同一条判据（那边只回答 bool）。
let expectName = true;
let seen = 0;
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    if (!expectName) {
      return -1;
    }
    if ((unit as Common).CanStartNumber()) {
      return -1;
    }
    expectName = false;
    seen = seen + 1;
    continue;
  }
  if (unit instanceof Symbol) {
    if (!(unit as Symbol).Is(",")) {
      return -1;
    }
    if (expectName) {
      return -1;
    }
    expectName = true;
    continue;
  }
  return -1;
}
return seen;
```
