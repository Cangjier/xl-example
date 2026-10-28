# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { VariableDeclarationListShape } from "../declarations/variable-declaration-list-shape.xl.md"
import { VariableDeclarationShape } from "../declarations/variable-declaration-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { AngleJudge } from "../types/angle-judge.xl.md"
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
import { DirectTypeAssembly } from "./direct-type-assembly.xl.md"
```

# namespace cangjie

```txt
for (let i: number = 0; ;)   -> 直建（R5-D1-c 尽力项：类型注解与变量声明同口）
for (let x!: T = 0; ;)       -> stmt.type     （确定赋值断言 `!` 仍不做）
for (let {a} = b; ;)         -> stmt.binding  （解构绑定 / 名字不是标识符）
for (let i = <范围外表达式>) -> stmt.expr
for (using …)                -> stmt.head     （`using` 声明本轮不接）
```

# class DirectDeclarationAssembly

## static field LastReason:string = ""

## static field LastCategory:string = ""

## static method IsDeclarationKeyword:(unit:Token)=>bool

```ts
// 与 `StatementBuilder.IsVariableKeyword` 同一张表的**可直建子集**（statement-builder.xl.md:150-158）：
// `let` / `const` / `var`。`using` 头本轮不接（R4-CONTRACT §1.1 B3-g 的「不做」列）⇒ 返回 false，
// 由调用方 Decline(`stmt.head`) 而不是 `stmt.binding`。
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
return text === "let" || text === "const" || text === "var";
```

## static method IsIdentifierName:(unit:Token)=>bool

```ts
// 只认 `Common` 里的普通标识符：数字 / BigInt / 关键字字面量 / 运算符位都不算。
// 判据**复用** `DirectTokenUtil.IsIdentifierOperand`（R2 的唯一一份操作数白名单），不写第二份表。
return DirectTokenUtil.IsIdentifierOperand(unit);
```

## static method IdentifierBinding:(unit:Token, pos:int, context:SyntaxContext)=>Token | null

```ts
// `IdentifierShape.FromBasicToken` + `Pos`（= legacy `Positions[nameIndex]`），与
// `BuildVariableDeclarationList:1633-1636` 的 Identifier 分支同口。非标识符返回 null。
if (!DirectDeclarationAssembly.IsIdentifierName(unit)) {
  return null;
}
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = pos;
return identifier;
```

## static method ListFrom:(units:Array<Token>, codeAt:Array<int>, keywordIndex:int, endExclusive:int, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
// 逐条对齐 `BuildVariableDeclarationList(keywordIndex, endExclusive)`（statement-builder.xl.md:1610-1767），
// **只保留 Identifier 子集**：ExclamationToken / Type / BindingPattern / 初始化器的 `class<T,>` 特例都不做。
//   Data 顺序 = 声明顺序；每个 declaration 的 Data = `[name, initializer?]`；
//   declaration 区间 = `[name.Start, lastUnitOfDeclaration.End]`、`Pos = Positions[nameIndex]`；
//   list 区间 = `[keyword.Start, lastDeclaration.End]`、`Pos = Positions[keywordIndex]`。
// `codeAt` 是 `units` 的代码单元下标表（跳过 trivia），与调用方的 `innerCodeAt` 同口径；
// `basePos` 是该片段自己的 Pos 起点（`for` 头 = `(` 之后第一个字符），与 `Load` 的第 0 格同值。
DirectDeclarationAssembly.LastReason = "";
DirectDeclarationAssembly.LastCategory = "";
const keyword = units[codeAt[keywordIndex]];
if (!DirectDeclarationAssembly.IsDeclarationKeyword(keyword)) {
  DirectDeclarationAssembly.LastReason = "for 头部的声明关键字不在本轮范围: "
    + DirectStatementAssembly.TextOf(keyword);
  DirectDeclarationAssembly.LastCategory = "stmt.head";
  return null;
}
const list = new VariableDeclarationListShape(template);
let at = keywordIndex + 1;
let lastIndex = keywordIndex;
while (at < endExclusive) {
  const nameIndex = at;
  const nameUnit = units[codeAt[nameIndex]];
  if (nameUnit instanceof Bracket) {
    // `for (let {a} = b; ;)` / `for (let [a] = b; ;)`：解构绑定属范围外（stmt.binding）。
    DirectDeclarationAssembly.LastReason = "解构绑定属范围外";
    DirectDeclarationAssembly.LastCategory = "stmt.binding";
    return null;
  }
  const namePos = DirectStatementAssembly.PositionAt(units, codeAt, nameIndex, basePos);
  const name = DirectDeclarationAssembly.IdentifierBinding(nameUnit, namePos, context);
  if (name === null) {
    DirectDeclarationAssembly.LastReason = "声明名不是标识符: " + DirectStatementAssembly.TextOf(nameUnit);
    DirectDeclarationAssembly.LastCategory = "stmt.binding";
    return null;
  }
  const declaration = new VariableDeclarationShape(template);
  declaration.Add(name);
  let declarationLast = nameIndex;
  at = at + 1;
  // 确定赋值断言 `let x!: T` 仍属范围外（ExclamationToken 子节点本轮不做）⇒ stmt.type。
  if (at < endExclusive && DirectStatementAssembly.TextOf(units[codeAt[at]]) === "!") {
    DirectDeclarationAssembly.LastReason = "声明的确定赋值断言属范围外";
    DirectDeclarationAssembly.LastCategory = "stmt.type";
    return null;
  }
  // `let x: T`：类型注解是 VariableDeclaration 的子节点，位置在名字之后、初始化器之前。
  // 扫描口径逐字照抄 legacy（尖括号深度 0 的 `=` / `,` 才是类型结束；括号是原子单元）。
  if (at < endExclusive && DirectStatementAssembly.TextOf(units[codeAt[at]]) === ":") {
    const colonUnit = units[codeAt[at]];
    const typeFirst = at + 1;
    let typeEnd = typeFirst;
    let typeDepth = 0;
    while (typeEnd < endExclusive) {
      const typeUnit = units[codeAt[typeEnd]];
      if (typeDepth === 0) {
        const typeText = DirectStatementAssembly.TextOf(typeUnit);
        if (typeText === "=" || typeText === ",") {
          break;
        }
      }
      typeDepth = AngleJudge.ScanDepth(typeUnit, typeDepth);
      if (typeDepth < 0) {
        typeDepth = 0;
      }
      typeEnd = typeEnd + 1;
    }
    if (typeEnd <= typeFirst) {
      DirectDeclarationAssembly.LastReason = "声明的类型注解为空";
      DirectDeclarationAssembly.LastCategory = "stmt.type";
      return null;
    }
    const typeUnits:Array<Token> = [];
    for (let cursor = typeFirst; cursor < typeEnd; cursor++) {
      typeUnits.push(units[codeAt[cursor]]);
    }
    const typePos = colonUnit.SourceRange.EndIndex >= 0 ? colonUnit.SourceRange.EndIndex : namePos;
    const typeNode = DirectTypeAssembly.TypeOf(typeUnits, typePos, template, context);
    if (typeNode === null) {
      DirectDeclarationAssembly.LastReason = "声明的类型注解无法直建: " + DirectTypeAssembly.LastReason;
      DirectDeclarationAssembly.LastCategory = "stmt.type";
      return null;
    }
    declaration.Add(typeNode);
    declarationLast = typeEnd - 1;
    at = typeEnd;
  }
  if (at < endExclusive && DirectStatementAssembly.TextOf(units[codeAt[at]]) === "=") {
    const initializerFirst = at + 1;
    let initializerEnd = initializerFirst;
    // 初始化器吃到自己这条声明结束：顶层 `,` 之前（`in` / `of` / `;` 由调用方卡在 endExclusive 上）。
    // 括号是原子单元，所以 `f(a, b)` 的 `,` 进不到这一层（与 legacy 的 `BuildExpressionRange` 同口径）。
    while (initializerEnd < endExclusive
      && DirectStatementAssembly.TextOf(units[codeAt[initializerEnd]]) !== ",") {
      initializerEnd = initializerEnd + 1;
    }
    if (initializerEnd <= initializerFirst) {
      DirectDeclarationAssembly.LastReason = "变量声明缺少初始化表达式";
      DirectDeclarationAssembly.LastCategory = "stmt.shape";
      return null;
    }
    const initializer = DirectStatementAssembly.ExpressionOf(units, codeAt, initializerFirst,
      initializerEnd, basePos, template, context);
    if (initializer === null) {
      DirectDeclarationAssembly.LastReason = "初始化表达式范围外: "
        + DirectStatementAssembly.LastReason;
      DirectDeclarationAssembly.LastCategory = "stmt.expr";
      return null;
    }
    declaration.Add(initializer);
    declarationLast = initializerEnd - 1;
    at = initializerEnd;
  }
  DirectStatementAssembly.Span(declaration, units[codeAt[nameIndex]], units[codeAt[declarationLast]],
    namePos, context);
  list.Add(declaration);
  lastIndex = declarationLast;
  if (at < endExclusive) {
    if (DirectStatementAssembly.TextOf(units[codeAt[at]]) !== ",") {
      DirectDeclarationAssembly.LastReason = "变量声明里有无法识别的单元: "
        + DirectStatementAssembly.TextOf(units[codeAt[at]]);
      DirectDeclarationAssembly.LastCategory = "stmt.shape";
      return null;
    }
    at = at + 1;
  }
}
if (list.Data.length === 0) {
  DirectDeclarationAssembly.LastReason = "声明列表为空";
  DirectDeclarationAssembly.LastCategory = "stmt.shape";
  return null;
}
list.Pos = DirectStatementAssembly.PositionAt(units, codeAt, keywordIndex, basePos);
DirectStatementAssembly.Span(list, units[codeAt[keywordIndex]], units[codeAt[lastIndex]],
  list.Pos, context);
return list;
```
