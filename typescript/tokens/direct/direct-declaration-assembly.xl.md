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
import { DirectStatementAssembly } from "./direct-statement-assembly.xl.md"
import { DirectTokenUtil } from "./direct-token-util.xl.md"
```

# namespace cangjie

`VariableDeclarationList` 的**直建**版（R4-CONTRACT §4.3）：只做「Identifier 名字 + 可选初始化器」子集，
给 `for` 头部的声明列表（`for (let i = 0; …)` / `for (const k in o)` / `for (const v of xs)`）用。

**A6（必须遵守）**：本类**不调** `StatementBuilder`、不调 `TypeBuilder`、不调 `ExpressionBuilder`，
只抄 `StatementBuilder.BuildVariableDeclarationList`（`statement-builder.xl.md:1610-1767`）的
Pos / 区间 / 子节点顺序；初始化器走 `DirectStatementAssembly.ExpressionOf`（= `DirectExpressionEngine`）。

范围外一律返回 `null` 并把原因写进 `LastReason` / `LastCategory`（调用方 `Decline`，不抛）：

```txt
for (let i: number = 0; ;)   -> stmt.type     （类型注解 / 确定赋值断言 `!`）
for (let {a} = b; ;)         -> stmt.binding  （解构绑定 / 名字不是标识符）
for (let i = <范围外表达式>) -> stmt.expr
for (using …)                -> stmt.head     （`using` 声明本轮不接）
```

# class DirectDeclarationAssembly

## static field LastReason:string = ""

最近一次 `ListFrom` 失败的原因（调用方拼进 `Decline` 文案）。

## static field LastCategory:string = ""

最近一次 `ListFrom` 失败的 category（`stmt.head` / `stmt.binding` / `stmt.type` / `stmt.expr` / `stmt.shape`）。
调用方直接用它当 `Decline` 的 category —— 分类判据只写在这一处，session 里不再重写第二份。

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
  // 确定赋值断言 `let x!: T` 与类型注解 `let x: T`：都是 VariableDeclaration 的额外子节点
  // （`ExclamationToken` / `Type`），本轮不做 ⇒ stmt.type。
  if (at < endExclusive) {
    const afterName = DirectStatementAssembly.TextOf(units[codeAt[at]]);
    if (afterName === ":" || afterName === "!") {
      DirectDeclarationAssembly.LastReason = "声明的类型注解 / 确定赋值断言属范围外";
      DirectDeclarationAssembly.LastCategory = "stmt.type";
      return null;
    }
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
