# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Keyword } from "../keyword.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { ObjectLiteral } from "../json/object-literal.xl.md"
import { LineAnnotation } from "../line-annotation.xl.md"
import { AreaAnnotation } from "../area-annotation.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { TypeLiteralBody } from "./type-literal-body.xl.md"
import { MappedType } from "./mapped-type.xl.md"
import { Statement } from "../statement.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型字面量：把**类型位**的 `{ … }` 收成一个 `TypeLiteral`（里面是一段 `TypeLiteralBody`）。

**它必须排在 `JsonObjectReorganization` 之前**：重组是**按规则轮询**的（每条规则扫一遍所有下标），
`ObjectLiteral` 排在前面时会把类型位的 `{ … }` 先收成对象字面量，成员从此只能平铺成 `Identifier` / `SymbolToken`。
类型位的判定没用「看括号前面是不是 `:` / `=`」这一条就完事——那样会把三元表达式的分支
（`cond ? {} : {}` 的第二个括号）也判成类型位，所以 `:` 还要再确认「同一层没有 `?`」。

`TypeLiteralReorganization` 写在 `TypeLiteral` **之前**。

# class TypeLiteralReorganization extends Reorganization

## static readonly field Instance:TypeLiteralReorganization = new TypeLiteralReorganization()

唯一的实例，注册进通用重组队列时用。

## private method HasTernaryQuestion:(units:Array<Token>, index:int)=>bool

`index` 处的 `:` 是不是**三元表达式的那个冒号**（往前找到第一个符号，是 `?` 就是）。

往前扫时跳过软换行、注释与整段括号（括号单元是原子的，它的内容不参与本层判定）；
遇到第一个**符号**就下结论：是 `?` 就说明这个 `:` 属于三元表达式，否则不是。

`cond ? {} : {}` 的第二个 `{}` 前面正是这种 `:`：不排除的话它会被当成类型字面量，
把对象字面量错收成 `Field` 成员。

**但 `?` 还要再看一眼它前面有没有 `extends`**：有就是**条件类型**
（`typeof globalThis extends { … } ? T` 换行 `: { prototype: …; readonly X: 1; … }`），
它两个分支都是**类型**——那个 `:` 后面正是类型字面量。
少了这一条，条件类型的假分支整段收不成 `TypeLiteral`，
里面几十个成员一起丢（实测 `@types/node/web-globals/domexception.d.ts` 的
`var DOMException: … ? T : { … }` 一处就丢 28 个，crypto / typescript 等文件里同类形状更多）。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof LineWrap || item instanceof Bracket) {
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is("?") === false) {
      return false;
    }
    return this.HasExtendsMarker(units, i) === false;
  }
}
return false;
```

## private method HasExtendsMarker:(units:Array<Token>, index:int)=>bool

`index`（一个 `?`）**往前**有没有条件类型的标志 `extends`。

条件类型写作 `T extends U ? A : B`，两个分支都是**类型**；
判出这个标志，`?` 后面的 `{` 与 `:` 后面的 `{` 就都能按类型字面量收。

`?` 与 `extends` 之间可以隔着换行与括号（`{ … }` 这样的约束体是**原子**的括号单元），
遇到别的符号（`;` / `=` / 语句边界）就停。

```ts
for (let k = index - 1; k >= 0; k--) {
  const before = Get(units, k);
  if (before instanceof LineWrap || before instanceof Bracket) {
    continue;
  }
  if (before instanceof LineAnnotation || before instanceof AreaAnnotation) {
    continue;
  }
  if (before instanceof Identifier) {
    if (before.Is("extends")) {
      return true;
    }
    continue;
  }
  if (before instanceof SymbolToken) {
    return false;
  }
}
return false;
```

## private method IsTypePosition:(units:Array<Token>, index:int)=>bool

`index` 处的 `{` 是不是处在**类型位**。

**关于括号上的 `Context` 字段（方案 A，已铺好但暂未启用）**：`Bracket.Context` 是**开括号那一刻**
算好的（见 `../text-common-util.xl.md` 的 `DecideBracketContext`），与重组时序无关 ✓。
本方法**曾经**改成「先读 `Context`、只有它是 `""` 时才落到下面这段老走法」，
测试立刻报出 5 条用例失败 + **2 个语料文件解析失败** ✗ —— 根因是：

> 词法阶段是**平列表**，它分不出「`outer: { … }` 这种**标签的冒号**」与「`x: { … }` 这种**类型标注的冒号**」
> —— 那正是**后来的规则**（`LabelReorganization` 在 `TypeLiteralReorganization` 之前跑）才带来的区分，
> 老走法能对，是因为它跑的时候冒号已经被 `Label` 收走了。

所以启用它之前，`DecideBracketContext` 还得把这个区分补上（判据在**宿主**的形态上：
宿主是参数括号 → 类型标注 ✓；宿主是语句列表且冒号前是一个裸露的名字 → 标签 ✗）。
在那之前这段老走法继续当家。

两条入口：

1. 父单元是 `GenericType`——泛型实参段里的 `{ }` 一定是类型（`Array<{ a: 1 }>`）；
2. 括号里的**第一个** `{ }`——本层看不到左边，递归问括号自己那一格（见代码里的注释）；
3. 否则从 `{` 往前找最近的边界：
   - `?` → **条件类型真分支**的起点：往后看有没有 `extends` 标志（`HasExtendsMarker`），
     有就说明这是 `T extends U ? { … } : …` 里的那个类型字面量
     （`util.d.ts` 的 `type PreciseTokenForOptions<…> = O["type"] extends "string" ? { … }` 就是它，
     两处真分支一共 12 个成员）；
     `?:` 必须一起认：**可选**参数 / 可选属性的类型标注就是它
     （`toBase64(options?: { alphabet?: string })` 里的 `{ … }`，只认 `:` 时那个类型字面量收不成、
     里面 6 个成员一起丢 —— `lib.esnext.typedarrays.d.ts` 就是这么丢的）；
   - **已经跨过 `=` 之后再遇到 `:` 就是值位**：`const options: CliOptions = { Input: "" }` 里
     那个 `{` 往前扫会先跨过 `=`、再撞上变量标注的 `:`——题面看它像「冒号后面的类型」，
     其实 `=` 之后的那个花括号是**值**（对象字面量）✗。
     不加这一条，对象字面量会被收成 `TypeLiteral`，它的成员接着被 `FieldReorganization`
     当成字段收走（实测 `dist/ts/cjcli.ts`：一个 `CliOptions` 类型别名 5 个成员，
     外加一处 `const options: CliOptions = { … }` 的 4 个成员，产物里 **9 个 `Field`** ✗，
     差分账上 `Field` 多出的 20 个正是这种形状）；
   - **`import` / `export` 后面的 `type` 不算类型位**：`import type { A } from "m"` 里那个 `{`
     往前扫会撞到 `type`（在关键字表里）→ 被当成类型字面量 ✗，于是导入列表被收成
     `TypeLiteral`，里面每个名字还成了一个 `Field` ✗（实测产物：`<Import><Identifier>type</Identifier>
     <TypeLiteral><TypeLiteralBody><Field fieldName="A" />`）——**AST 那边一个属性都没有**，
     这正是差分账上 `Field` 长期「多出来」的一个来源。
     **判据要两条齐全**：`type` 前面是 `import` / `export`，**而且 `type` 后面紧跟一个 `{` 括号**。
     只看前一条会把 `export type CliOptions = { … }` 也挡掉 ✗（测试跑出来 `cjcli.ts`
     的 5 个 `Field` 全丢、5 条 type-only 用例报 `缺 TypeLiteral`）——那种写法里 `type` 后面是
     **别名**，花括号在 `=` 之后，属于正常的类型字面量 ✓；
   - `=>` → **箭头**：先记下「正在跨箭头」，等把它的形参表也跨过去之后，再按形参表**左边**是什么下结论
     （见下一条）；
   - `|` / `&` → 类型位（联合 / 交叉类型的一项）；
   - `=` → 记下「跨过赋值」继续往前：再遇到 `type` 就是类型位（`type X = { … }`），
     遇到 `let` / `var` / `const` 则是值位（`const x = { … }`）；
   - 类型位关键字（`as` / `satisfies` / `extends` / `readonly` / `keyof` / `typeof` / `infer` / `new` …）→ 类型位；
   - 括号 → 值位（实参、下标、语句边界都不保证期望类型）；
   - 一路找到头没有边界 → 值位（保守：宁可保持 `ObjectLiteral` 的既有行为）。

**`=>` 后面的 `{` 不能一律当类型位**（实测缺口）：`=>` 有两种含义——**函数类型**的返回类型
（`let f: (a: A) => { b: string }`，这里的 `{` 是类型）与**箭头函数**的体
（`const f = (a) => { return a }`，这里的 `{` 是**块**）。
原来一见 `=>` 就返回 true，于是**箭头函数的块体被收成类型字面量**：
`const f = (a) => { return a }` 的产物是 `<LamdaBody><Statement><TypeLiteral><TypeLiteralBody>
<Statement><Keyword>return</Keyword><Field name="a" /></Statement>…`——`return a` 这条语句
退化成一个 `Field`，`g(a)` 这样的调用还退化成 `MethodDeclaration`。
八把尺子一把都看不见（节点计数、名字、括号归属、语句边界全都还对，只是**语义换了**），
是「产物标签 ↔ TS AST 构造」的对齐探针抓到的。

判据不能停在 `=>` 上，要继续跨过**形参表**（它与 `=>` 之间还可能夹着返回类型标注 `: T`），
按形参表左边那一个实义单元决定：

- 左边是 `:` → **函数类型**（`let f: (a: A) => { … }`）⇒ 类型位；
- 左边是 `=`（或再往左的 `type X =` 之类）→ 走本方法既有的「跨过赋值」那一套：
  落到 `type` 就是类型别名，落到 `let` / `var` / `const` 就是值位（箭头函数）；
- 左边是别的（`(` / `,` / `return` / 列表开头…）→ 值位（箭头函数）。

跨箭头期间遇到的那个 `:` 是**箭头函数自己的返回类型标注**（`const f = (a): T => { … }`），
一律跳过、继续往左（`(a: A): T => B` 不是合法的函数类型写法，所以这一条不会误伤类型位）。
`const f = (a): { x: number } => ({ x: 1 })` 里 `=>` 左边那个 `{ x: number }` 于是被当成形参表跨过去，
再往左撞上 `:` 就判成类型位——判对了（它是**返回类型**），而 `=>` 右边那个表达式体
由上面那条「括号紧跟 `=>` ⇒ 值位」挡住 ✓。

判定与 `../generic-type.xl.md` 的 `IsTypePosition` 同源（那边判的是 `<` 处在类型位还是表达式位）；
这里独立实现一份，因为两边看的是不同字符、也允许不同的保守程度。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
if (current.Parent instanceof GenericType) {
  return true;
}
// **父单元已经是 ObjectLiteral 时一定是对象字面量**（实测补的）：
// `JsonObjectReorganization` 排在 `TypeLiteralReorganization` 之前，外层对象先成形，
// 内层那个 `{` 于是已经是 `ObjectLiteral` 的子单元——`const o = { a: { b: 1 } }` 里
// 内层往前扫会撞上 `a:` 的冒号，按类型位判就变成 `TypeLiteral`（实测产物确实如此，
// 内层 `b` 还成了一个 `Field`）。对象字面量的冒号是**键分隔符**，不是类型标注。
if (current.Parent instanceof ObjectLiteral) {
  return false;
}
// **括号里的第一个 `{`**：本层回扫什么也看不到（左边的单元在**括号外面**），
// 于是 `type T = ({ a: 1 } | { b: 2 })` 里第一个 `{` 被判成值位、第二个靠 `|` 判对——
// 同一个联合类型里出现 `ObjectLiteral` + `TypeLiteral` 混排（实测：
// `typescript.d.ts` 的 `ImportSpecifier & ({ readonly isTypeOnly: true } | { … })`、
// `util.d.ts` 的 `{ [LongOption in keyof T["options"]]: … }`）。
// 括号自己那一格问的是**外层列表**（括号是外公列表里的一项），所以递归问一次它：
// `type T = ({ … })` 回扫 → `=` → `T` → `type` ⇒ 类型位 ✓；
// `f({ … })` 回扫 → `Method` ⇒ 值位 ✓；`({ a, b }) => x` 回扫 → 列表开头 ⇒ 值位 ✓；
// `(a) => ({ x: 1 })` 的括号紧跟 `=>`（箭头函数的体）⇒ 值位 ✓。
if (index === 0 && current.Parent instanceof Bracket && current.Parent.startBracket === "(") {
  const owner = current.Parent.Parent;
  if (owner !== null) {
    const at = owner.Data.indexOf(current.Parent);
    if (at > 0) {
      const beforeBracket = Get(owner.Data, SkipPreviousWrapSymbol(owner.Data, at));
      // 括号紧跟 `=>` ⇒ 它是**箭头函数的体**（值位），不要拿外层那一格去判类型。
      // 少了这一条，`const f = (a): { x: number } => ({ x: 1 })` 的表达式体会被收成 `TypeLiteral`
      // （用例 `expr-arrow-return-object-type` 钉住：体必须仍是 `ObjectLiteral`）。
      if (!(beforeBracket instanceof SymbolToken && beforeBracket.Is("=>"))) {
        return this.IsTypePosition(owner.Data, at);
      }
    }
  }
  return false;
}
let crossedAssignment = false;
let crossingArrow = false;
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof LineWrap) {
    // **语句边界就是终点**（第 67 轮修）：`type H = number` 换行 `try { } catch { }` 里，
    // `try` 后面那个 `{` 往回扫时会**跨过换行、跨过 `try`**，一路撞上 `type` ⇒ 被判成类型位，
    // 于是 `try` 的语句体被收成一个 `TypeLiteral`；`TryReorganization` 拿到它当场抛
    // 「next is not Bracket」，**整份文件解析失败**（三片段组合探针抓到的形状）。
    //
    // 判据复用 ASI 那一条（`Statement.IsLineBreakBoundary`），不另写近似：
    // 换行前是 `=` / `:` / `|` / `&` / `=>` 这些「还要操作数」的形状时它给「不是边界」，
    // 多行类型的排版（`type T =` 换行 `{ … }`、联合成员换行）照旧成立。
    if (Statement.IsLineBreakBoundary(units, i)) {
      return false;
    }
    continue;
  }
  if (item instanceof GenericType) {
    continue;
  }
  if (item instanceof LineAnnotation || item instanceof AreaAnnotation) {
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === ":" || text === "?:") {
      if (crossingArrow) {
        continue;
      }
      if (crossedAssignment) {
        return false;
      }
      return this.HasTernaryQuestion(units, i) === false;
    }
    if (text === "?") {
      return this.HasExtendsMarker(units, i);
    }
    if (text === "|" || text === "&") {
      return true;
    }
    if (text === "=>") {
      crossingArrow = true;
      continue;
    }
    if (text === "=" && crossedAssignment === false) {
      crossedAssignment = true;
      continue;
    }
    return false;
  }
  if (item instanceof Bracket) {
    if (crossingArrow) {
      crossingArrow = false;
      continue;
    }
    return false;
  }
  if (item instanceof Identifier) {
    const text = item.TempToString();
    if (text === "type") {
      const beforeType = Get(units, SkipPreviousWrapSymbol(units, i));
      const afterType = Get(units, SkipNextWrapSymbol(units, i));
      if (
        beforeType instanceof Identifier &&
        (beforeType.Is("import") || beforeType.Is("export")) &&
        afterType instanceof Bracket &&
        afterType.startBracket === "{"
      ) {
        return false;
      }
    }
    if (
      text === "type" ||
      text === "as" ||
      text === "satisfies" ||
      text === "extends" ||
      text === "implements" ||
      text === "readonly" ||
      text === "keyof" ||
      text === "typeof" ||
      text === "infer" ||
      text === "new" ||
      text === "declare" ||
      text === "asserts" ||
      text === "is"
    ) {
      return true;
    }
    if (text === "let" || text === "var" || text === "const") {
      return crossedAssignment === false;
    }
    continue;
  }
  return false;
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型字面量的开头。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
if (current.Parent instanceof TypeLiteralBody) {
  return false;
}
return this.IsTypePosition(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个类型字面量收成一个 `TypeLiteral`，**返回新的下标**。

括号的内容整体搬给 `TypeLiteralBody`，括号本身不再留在树里；搬完要 `TryToClose()` 一次，
让体内那一轮成员重组跑起来（这一步与 `Interface.Process` 处理接口体完全一致）。

**内容是映射类型时改收 `MappedType`**（见 `./mapped-type.xl.md`）：判定 `IsMappedTypeBrace`——
第一个实义单元是 `[` 括号、且那个括号里有顶层的 `in`。区别只在产出的节点与「内容放哪」：
映射类型只有一个成员，直接装在节点身上（不再套一层 `TypeLiteralBody`）。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket)) {
  throw new Error("类型字面量不满足格式要求：{ ... }");
}
if (this.IsMappedTypeBrace(current)) {
  const mapped = new MappedType(template);
  mapped.Parent = current.Parent;
  mapped.SignIn(current.SourceRange.Start!);
  mapped.SignOut(current.SourceRange.End!);
  current.MoveDataTo(mapped);
  mapped.TryToClose();
  return ReplaceCountAt(units, index, 1, mapped);
}
const result = new TypeLiteral(template);
result.Parent = current.Parent;
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
const body = result.CreateBody();
current.MoveDataTo(body);
body.Sign(current);
body.TryToClose();
result.TryToClose();
return ReplaceCountAt(units, index, 1, result);
```

## private method IsMappedTypeBrace:(bracket:Bracket)=>bool

这对花括号的内容是不是**映射类型**的成员（`{ [K in T]: X }`）。

判据：第一个实义单元是 `[` 括号，**而且那个括号里有 `in` 标记**（`HasInMarker`）。
`{ [key: string]: number }`（索引签名）没有 `in`，仍然走 `TypeLiteral` ✓。

括号**前面**的 `readonly` / `+` / `-` 修饰词要跳过：`{ readonly [K in T]: X }`、
`{ -readonly [K in T]-?: X }` 都是映射类型（少了这一跳，带修饰词的映射类型整片认不出来）。

```ts
for (const item of bracket.Data) {
  if (item instanceof LineWrap) {
    continue;
  }
  if (item instanceof Identifier && item.Is("readonly")) {
    // `{ readonly [K in T]: X }`：`readonly` 在括号**前面**
    continue;
  }
  if (item instanceof SymbolToken && (item.Is("+") || item.Is("-"))) {
    // `{ -readonly [K in T]: X }` / `{ +readonly … }` 的修饰前缀
    continue;
  }
  if (!(item instanceof Bracket) || item.startBracket !== "[") {
    return false;
  }
  return this.HasInMarker(item);
}
return false;
```

## private method HasInMarker:(unit:Token)=>bool

`[K in T]` 里那个 `in` 在不在这个单元（及其容器子单元）里。

**三种形态都要认**（实测逐一看过）：

- `Identifier`：`[K in T]` 刚收上来、关键词还没升级时；
- `Keyword`：括号内容已经跑过一趟、`in` 升成关键词之后
  （`{ [K in keyof U]: U[K] }` 就是这一形态——`in` 后面跟着 `keyof`，没被折成二元运算）；
- `BinaryOperator`：`in` **被折成了二元运算**时（`{ [K in T]: X }` 的 `[K in T]` 是这一形态）。
  它用**类名**判定，本文件 import 它只为看一眼子单元，不值得绕出更深的环
  （与 `statement.xl.md` 里 `Let` 那条同一个理由）。

**还要往容器里递归看一眼**：`type-union.xl.md` 的联合规则已经把 `in` 排除出操作数，
但历史产物里它可能还被更外层的节点包着（`UnionType` / `BinaryOperator` / `ArrayLiteral`），
所以子单元不是叶子时继续往里找——映射类型的判定不能因为包了一层就失效。

```ts
for (const item of unit.Data) {
  if (item instanceof LineWrap) {
    continue;
  }
  if (item instanceof Identifier && item.Is("in")) {
    return true;
  }
  if (item instanceof Keyword && item.Value === "in") {
    return true;
  }
  if (item.Data.length > 0 && this.HasInMarker(item)) {
    return true;
  }
}
return false;
```

# class TypeLiteral extends IndependentToken

类型字面量。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的重组规则挂上来（模板里没有专门给 `TypeLiteral` 注册就用通用队列）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method CreateBody:()=>TypeLiteralBody

新建类型字面量体并挂到自己名下，返回新单元。

```ts
return this.Add(new TypeLiteralBody(this.Template));
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypeLiteral(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
