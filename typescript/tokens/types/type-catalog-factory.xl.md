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

类型上下文的**唯一装配点**（WP-A5，Phase A 的类型面）。

本文件承担三件事：

1. **类型解析的唯一入口**：`ParseType` / `ParseInitializer` 复用 legacy 的 `TypeBuilder` / `ExpressionBuilder`
   （与 `StatementBuilder` / `ExpressionBuilder` 在 atomic 路径里用的是同一批建造器、同一套 `Positions`
   口径）。所以增量路径建出来的类型节点 / 表达式节点与 legacy EOF 树**逐节点同源**（类名、层级、`Pos` 都一致），
   不需要为每种形态重写一遍 Pos 算术。
2. **增量时机判定**：`CanEndType` / `CanEndInitializer` 回答「这一格之后，类型 / 初始化器还能不能继续长」——
   只有回答「不能」时调用方才落地形状，从而把「建树时刻」从 EOF 提前到**最后一个类型/表达式单元关闭的那一拍**。
3. **注册区（给 B4b / A5 续任）**：`AppendFragments` 末尾的 `// [T-CAT:REGISTER]` 是将来「候选式类型目录」
   （`types/forms/<形态>-shape-possible.xl.md`）的追加点。本 WP 的落地形态**走 `ParseType` 路线**（按形态
   复用 `TypeBuilder`），所以注册区当前为空；候选式目录与它**可以并存**：候选在 `TypeBuilder` 能吃下之前
   先建出子形状，吃不下时本工厂的 `ParseType` 仍能在 EOF 兜住（C6 的 fallback）。

## static field TypeContinuation:string = ".[<|&?>"

类型之后仍可能继续长的首字符：成员（`.`）、数组（`[`）、泛型实参（`<`）、联合（`|`）、交叉（`&`）、
可选（`?`）、闭合分层（`>`）。这些字符出现时类型**还没长完**，不能提前落地。

## static field InitializerEnd:string = ";,)]}="

初始化器之后仍可能继续长的判定用「结束字符集」：遇到这些字符（或输入结束）时表达式已经完整。
空串表示输入结束（`NextSignificantChar` 返回 `""`）。

## static field Annotations:Array<PossibleShape> = []

`// [T-CAT:REGISTER]`：候选式类型片段的注册区（每个 form 文件一行 `XxxPossibleShape.AppendTo(TypeCatalogFactory.Annotations); // [B4b-*]`，
按 WP id 排序、只追加、不重排）。本 WP 不注册任何候选（见文件头第 3 点），注册区保留为 B4b-i/ii 的接线点。

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

返回 `unit` 之后第一个非空白 / 非注释字符；输入结束返回 `""`。

与既有 `StatementScanner.NextChar` / `ImportEqualsDeclarationPossibleShape.NextChar` 同一口径（跳空白 + 两种注释），
只是这里要跨行看（`as T` ⏎ `;` 的换行不算「还能继续」）。

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
    return "/";
  }
  return ch;
}
return "";
```

## static method CanEndType:(unit:Token)=>bool

类型是否已经可以落地：后面不能再接类型延拓字符。

```ts
const next = TypeCatalogFactory.NextSignificantChar(unit);
if (next === "") {
  return true;
}
return TypeCatalogFactory.TypeContinuation.indexOf(next) < 0;
```

## static method CanEndInitializer:(unit:Token)=>bool

初始化器是否已经可以落地：后面要么输入结束、要么是语句/声明分隔符。

```ts
const next = TypeCatalogFactory.NextSignificantChar(unit);
if (next === "") {
  return true;
}
return TypeCatalogFactory.InitializerEnd.indexOf(next) >= 0;
```

## static method ParseType:(units:Array<Token>, basePos:int, template:Template, context:SyntaxContext)=>Token | null

把一段 type 单元解析成 legacy 同源的类型节点；**不完整 / 形态不支持**时返回 `null`（调用方继续等下一格）。

`units` 里允许带 trivia（`Load` 会跳过）；`basePos` 是第一个类型单元之前的位置（C1：`:` / `as` 的 `EndIndex`），
与 legacy `StatementBuilder` 的 `this.Positions[typeFirst]` 同口径。

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

把一段初始化器 raw 单元解析成 legacy 同源的表达式节点（与 `VariableDeclarationShape.FinishIncremental` 的
降级分支同一个建造器、同一个 `basePos`）；不完整 / 不支持时返回 `null`。

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

[R11:SHAPE-HEAD] 把「**左操作数已经建好**」的初始化器整条建出来：`units` 的第一个非 trivia 单元就是
`head`（形状目录建出的表达式形状），从它之后继续（`ExpressionBuilder.ParseExpressionFrom`）。

与 `ParseInitializer` 同一套建造器、同一套 `Positions` 口径，唯一差别是起点：
`ParsePrimary` 只认登记过的容器 / 原子，任意形状进不去，于是这里直接把 `At` 推到 `head` 之后，
由 `ParseBinaryFrom` 的 `IsTypeOperator` 分支接 `as` / `satisfies`、`ParseFollowingType` 接类型。

**自证**（与 `ParseInitializer` 同一条）：`head` 不是第一个单元、或 `At` 没走到末尾 ⇒ 返回 `null`，
调用方继续等下一格。绝不返回「只吃了一半源码」的节点（C10）。

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

在 `VariableDeclarationShape.Data` 里找**类型注解的 `:`**（`=` 之前的第一个顶层 `:`）；没有返回 `-1`。

只在「`:` 出现在 `=` 之前」时成立：初始化器里的三元 `? :`、对象字面量里的 `:` 都在 `=` 之后，
因此不会把表达式里的冒号当成注解。

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

第一个顶层 `=` 的下标（`-1` = 还没有）。

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

这段单元里（含括号内的递归两层）有没有 `as` / `satisfies` 关键字。

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

初始化器是否属于本 WP 接管的「带类型」形态。返回值同时是「能否提前落地」的判据：

- 左操作数是**普通标识符**：`raw[0]` 是 Common、`raw[1]` 是 `as`/`satisfies`；
- 左操作数是**括号化表达式**：`raw[0]` 是 `(` 括号，且括号里递归出现 `as`/`satisfies`（`(y as T)`）；
- 左操作数是**对象 / 数组字面量**：`raw[0]` 是 `{...}` / `[...]` 括号，且这段单元里出现 `as`/`satisfies`
  （`{ a: 1 } satisfies T` / `[1, 2] satisfies number[]`）——[D1] 加这一档：这两类字面量在 `as`/`satisfies`
  之前只是 **basic 括号**，`TryBuildTypedInitializer` 的「`=` 之后全是 basic」前提成立，所以整条可以原子建出；
- **带类型参数的函数/箭头表达式**（`(a: number) => a` / `async (a: number) => a` /
  `function (a: number) {}` / `<T>(a: T) => a`）：参数括号里出现「名字 `:`」——判据是
  `HasParameterType`。同一族里**没有**类型注解的形态（`() => a` / `(a, b) => a` / `function () {}`）
  不满足本判据，仍留给 A4 的表达式形态（不改变它们的账本分类）。

左操作数是调用 / 普通算术等其它形态**不接管**（A2/A3/A4 的写域）——**例外是 `[R11:SHAPE-HEAD]`**：
左操作数已经被形状目录建成了**形状对象**（`f() as T!` 的 `f()`）时按「容器作头」同一答案接管。

```ts
const first = TypeCatalogFactory.FirstSignificant(units, equalAt + 1);
if (first < 0) {
  return false;
}
const head = units[first];
// [B4e:K1] **容器形状作头**：`{ a: 1 } as T` / `[1, 2] satisfies X` / `(a + b) as T` 的容器已经在
// 括号关闭格由 `ContainerShapeCloseHook` 建出，`raw[0]` 因此不再是括号。整条仍然交给
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

这段单元里是否有「类型实参调用」形态：`<` … 配对的 `>` 之后**紧跟**调用括号 `(`。

用于把 `f<string>()` 与关系表达式 `a < b` 区分开：后者没有配对的 `>` + `(`，判据不成立。

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

这段单元里的「参数括号」是否带 `:` 类型注解（只看括号的**顶层**单元，嵌套括号由它自己的层负责）。

用于区分「参数带类型的函数/箭头表达式」（本 WP 接管）与「参数不带类型的同族形态」（A4 接管）。

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
