# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { ExpressionAtomRegistry } from "../expressions/forms/shared/expression-atom-registry.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
```

# namespace cangjie

# class TypeCatalogFactory

## static field TypeContinuation:string = ".[<|&?>"

## static field InitializerEnd:string = ";,)]}="

## static field Annotations:Array<PossibleShape> = []

## static method FirstSignificant:(units:Array<Token>, from:int)=>int

```ts
for (let at = from; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastSignificant:(units:Array<Token>)=>int

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method TextOf:(unit:Token)=>string

```ts
if (unit instanceof Common) {
  return (unit as Common).TempToString();
}
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method NextSignificantChar:(unit:Token)=>string

```ts
return TypeCatalogFactory.NextSignificantText(unit, 1);
```

## static method NextSignificantText:(unit:Token, take:int)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
let at = range.EndIndex;
let text = "";
while (at < count && text.length < take) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetValue(at) === "*" && document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
    text += "/";
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method CanEndType:(unit:Token)=>bool

```ts
const next = TypeCatalogFactory.NextSignificantChar(unit);
if (next === "") {
  return true;
}
if (TypeCatalogFactory.TypeContinuation.indexOf(next) >= 0) {
  return false;
}
return TypeCatalogFactory.NextWord(unit) !== "extends";
```

## static method NextWord:(unit:Token)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const following = document.GetValue(at + 1);
    if (following === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (following === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetValue(at) === "*" && document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
  }
  break;
}
const word:Array<string> = [];
while (at < count) {
  const ch = document.GetValue(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
    word.push(ch);
    at += 1;
    continue;
  }
  break;
}
return word.join("");
```

## static method CanEndInitializer:(unit:Token)=>bool

```ts
const pair = TypeCatalogFactory.NextSignificantText(unit, 2);
if (pair === "") {
  return true;
}
if (pair.length >= 2 && pair[0] === "=" && (pair[1] === "=" || pair[1] === ">")) {
  return false;
}
return TypeCatalogFactory.InitializerEnd.indexOf(pair[0]) >= 0;
```

## static method ParseType:(units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
const code:Array<Token> = [];
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
if (code.length === 0) {
  return null;
}
try {
  const builder = new TypeBuilder(template, context);
  builder.Load(code, basePos);
  const node = builder.ParseType();
  if (builder.At !== builder.Units.length) {
    return null;
  }
  return node;
} catch (error) {
  return null;
}
```

## static method ParseInitializer:(units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
const code:Array<Token> = [];
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
}
if (code.length === 0) {
  return null;
}
try {
  const builder = new ExpressionBuilder(template, context);
  builder.Load(code, basePos);
  const expression = builder.ParseExpression();
  if (builder.At !== builder.Units.length) {
    return null;
  }
  return expression;
} catch (error) {
  return null;
}
```

## static method ParseInitializerFrom:(units:Array<Token>, head:Token, basePos:int, template:Template, context:SyntaxContext)=>Token | null

```ts
const code:Array<Token> = [];
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  code.push(unit);
}
if (code.length === 0 || code[0] !== head) {
  return null;
}
try {
  const builder = new ExpressionBuilder(template, context);
  builder.Load(code, basePos);
  builder.At = 1;
  const expression = builder.ParseExpressionFrom(head, 0);
  if (builder.At !== builder.Units.length) {
    return null;
  }
  return expression;
} catch (error) {
  return null;
}
```

## static method AnnotationColon:(units:Array<Token>)=>int

```ts
let identifierSeen = false;
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!identifierSeen) {
    identifierSeen = true;
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "=") {
      return -1;
    }
    if (text === ":") {
      return at;
    }
  }
}
return -1;
```

## static method FirstEqual:(units:Array<Token>)=>int

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method HasTypeAssert:(units:Array<Token>)=>bool

```ts
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    const text = (unit as Common).TempToString();
    if (text === "as" || text === "satisfies") {
      return true;
    }
  }
  if (unit instanceof Bracket) {
    for (const child of (unit as Bracket).Data) {
      if (child.IsTriviaToken) {
        continue;
      }
      if (child instanceof Common) {
        const childText = (child as Common).TempToString();
        if (childText === "as" || childText === "satisfies") {
          return true;
        }
      }
    }
  }
}
return false;
```

## static method StartsTypedInitializer:(units:Array<Token>, equalAt:int)=>bool

```ts
const first = TypeCatalogFactory.FirstSignificant(units, equalAt + 1);
if (first < 0) {
  return false;
}
const head = units[first];
// [B4e:K1] **容器形状作头**：`{ a: 1 } as T` / `[1, 2] satisfies X` / `(a + b) as T` 的容器已经在
// 括号关闭格由 `ContainerClosePossibleShape.BuildByIndex` 建出，`raw[0]` 因此不再是括号。整条仍然交给
// `ParseInitializer`（同一个 `ExpressionBuilder`：`ParsePrimary` 消费容器，`ParseBinaryFrom` 建 `as`），
// 所以这里与「括号作头」走同一个答案：有断言就接管。
if (ExpressionAtomRegistry.HasContainer(head)) {
  return TypeCatalogFactory.HasTypeAssert(units);
}
// [R11:SHAPE-HEAD] 左操作数是**已经建好的表达式形状**（`f() as T!` 的 `f()`、`a.b as T` 的成员链、
// `f()! as T` 的非空断言）：形状目录在括号关闭格 / 后缀格已经把它建出来，`Data` 里 `=` 之后
// 就是「它一个非 basic 单元 + 后面的 `as` / 类型单元」。旧判据在这里落到最后的 `return false`
// （「左操作数是调用 ⇒ 不接管」），于是整条 `as` 既没人建（`AsExpression` 缺）又会把 `!` / `[`
// 那一格交给终结候选去 `throw`（`增量变量形状未支持：declaration 符号 !` / `declaration 括号`）。
// 与「容器作头」同一个答案：有 `as` / `satisfies` 就接管，由 `ParseInitializerFrom` 从那个形状继续
//（`ParseExpressionFrom` → `ParseBinaryFrom` 的 `IsTypeOperator` 分支接 `as` / `satisfies` 并调
// legacy `ParseFollowingType`；`!` 由 `TypeBuilder.ParsePostfixType` 折成 `JSDocNonNullableType`、
// 空 `[]` 折成 `ArrayType`）。读不完 / 收不住一律返回 `null`，调用方继续等（C10：不产半棵树）。
if (head instanceof ShapeToken) {
  return TypeCatalogFactory.HasTypeAssert(units);
}
if (head instanceof Common) {
  const next = TypeCatalogFactory.FirstSignificant(units, first + 1);
  if (next < 0) {
    return false;
  }
  const op = units[next];
  if (op instanceof Common) {
    const text = (op as Common).TempToString();
    if (text === "as" || text === "satisfies") {
      return true;
    }
  }
  const headText = (head as Common).TempToString();
  if (headText === "async" || headText === "function") {
    return TypeCatalogFactory.HasParameterType(units);
  }
  // 泛型调用 `f<string>()`：`<` … `>` 之后紧跟调用括号（类型实参在这里是**类型面**的一部分）。
  return TypeCatalogFactory.HasTypeArgumentCall(units);
}
if (head instanceof Bracket && (head as Bracket).StartBracketChar === "(") {
  if (TypeCatalogFactory.HasTypeAssert([head])) {
    return true;
  }
  return TypeCatalogFactory.HasParameterType([head]);
}
// [D1] 对象 / 数组字面量 + `as` / `satisfies`（`{ a: 1 } as const` / `[1, 2] satisfies number[]`）：
// 括号本身是 basic，`as` / `satisfies` 一到达 TypeMode 就能把整条 raw 原子建出。
// 不要在这里只看 `raw[1]`：字面量之后可能先有运算符 / 更多单元，`HasTypeAssert` 按整段扫。
if (head instanceof Bracket && (head as Bracket).StartBracketChar === "{") {
  return TypeCatalogFactory.HasTypeAssert(units);
}
if (head instanceof Bracket && (head as Bracket).StartBracketChar === "[") {
  return TypeCatalogFactory.HasTypeAssert(units);
}
if (head instanceof Symbol && (head as Symbol).Is("<")) {
  // 泛型箭头 `<T>(a: T) => a`：类型参数表之后紧跟参数括号，且参数里带类型注解。
  // 尖括号断言的左操作数形态（`<T>y` / `<number>y`）没有参数括号，因此不会命中这里，
  // 仍然留在 legacy 的 throw 账本里（那是 A4 的写域）。
  return TypeCatalogFactory.HasParameterType(units);
}
return false;
```

## static method HasTypeArgumentCall:(units:Array<Token>)=>bool

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (!(unit instanceof Symbol) || !(unit as Symbol).Is("<")) {
    continue;
  }
  let depth = 0;
  for (let scan = at; scan < units.length; scan++) {
    const inner = units[scan];
    if (inner.IsTriviaToken) {
      continue;
    }
    if (inner instanceof Symbol) {
      const text = (inner as Symbol).TempToString();
      if (text === "<") {
        depth += 1;
        continue;
      }
      if (text === ">") {
        depth -= 1;
        if (depth > 0) {
          continue;
        }
        const next = TypeCatalogFactory.FirstSignificant(units, scan + 1);
        if (next < 0) {
          return false;
        }
        return units[next] instanceof Bracket && (units[next] as Bracket).StartBracketChar === "(";
      }
      if (text === ">>" || text === ">>>") {
        depth -= text.length;
        if (depth > 0) {
          continue;
        }
        const next = TypeCatalogFactory.FirstSignificant(units, scan + 1);
        if (next < 0) {
          return false;
        }
        return units[next] instanceof Bracket && (units[next] as Bracket).StartBracketChar === "(";
      }
    }
  }
}
return false;
```

## static method HasParameterType:(units:Array<Token>)=>bool

```ts
for (const unit of units) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "(") {
    continue;
  }
  for (const child of (unit as Bracket).Data) {
    if (child.IsTriviaToken) {
      continue;
    }
    if (child instanceof Symbol && (child as Symbol).Is(":")) {
      return true;
    }
  }
}
return false;
```

## static method AppendFragments:(shapes:Array<PossibleShape>)=>void

```ts
// [T-CAT:REGISTER] 以下是类型形态片段，每个 form WP 一行，按 WP id 排序（只追加、不重排、不删别人的行）：
for (const shape of TypeCatalogFactory.Annotations) {
  shapes.push(shape);
}
```
