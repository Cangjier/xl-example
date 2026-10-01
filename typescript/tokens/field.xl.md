# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { DeclarationModifiers, DeclarationStart, IsMemberBoundary, IsWordUnit, TakeDeclarationDecorators } from "./declaration-common.xl.md"
import { ClassBody } from "./class/class-body.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { IndexSignature } from "./index-signature.xl.md"
import { Parameter } from "./lamda/lamda-parameter.xl.md"
import { InterfaceBody } from "./interface/interface-body.xl.md"
import { TypeLiteralBody } from "./type-literal/type-literal-body.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Statement } from "./statement.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { Keyword } from "./keyword.xl.md"
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

成员字段：把类体 / 接口体里的一条**字段声明**收成一个 `Field`——
`private n = 1`、`readonly name: string`、`items?: T[]`、`a`（只有名字）都算，方法声明（`m() { … }`）不算。

**为什么需要它**：字段没有自己的关键字，`name: T` 与 `name = v` 在语句层看起来就像普通表达式，
所以只能在**确定处于成员位置**时收——判定读的是父单元：只有 `ClassBody` / `InterfaceBody` 里的
`Identifier` 才会被这条规则接手（`ObjectLiteral` 那种对象字面量里的 `a: 1` 不归它管）。
读父单元的做法与 `JsonObjectReorganization.IsObject(current.Parent)` 同源。

**为什么排在前面**：它必须赶在 `TypeDefine` **之前**——`TypeDefine` 从 `:` 起一路收到 `;` / `,` / 赋值符号，
而「一行一个字段」的写法（`a: A` 换行 `b: B`）里没有这些终止符，`TypeDefine` 会把后面几个字段全吞进来。
把整条成员圈进 `Field`（自己带通用重组队列）之后，`TypeDefine` 最多收完这一段。

`FieldReorganization` 写在 `Field` **之前**：后者的静态字段 `Instance` 在类定义时就 `new FieldReorganization()`，
写反了会命中暂时性死区（TDZ）。

# method BracketNameText:(unit:Token)=>string

把 `[ … ]` 里的成员名拼成文本：`Identifier` 取文本、点号补 `.`、`:` 之前的都算名字。

参数取 `Token` 而不是 `Bracket`：同一段内容在**不同时机**可能已经是 `ArrayLiteral`
（`JsonArrayReorganization` 排在成员规则之后，但类体的队列会跑不止一遍——
`[`m`]()` 这种计算成员名在 `Process` 里常常已经变成 `ArrayLiteral` 了），
这里只用 `Data`，两种单元都合适。

**为什么需要它**：`[` 开头的成员名有两种，都是 TypeScript 的常见写法——

- **索引签名**：`interface I { [key: string]: number }`——名字是 `key`，`string` 是键类型；
- **计算属性名**：`[Symbol.iterator]: number`——名字是 `Symbol.iterator`。

它们的成员名不是 `Identifier` / `String`，而是一个 `[` 括号。`Field` 的判定因此多了「括号当名字」这一支：
括号在成员位置上、后面紧跟 `:` / `?:` 就算一条成员。
不认这一支时，`[` 那段会被更晚的 `JsonArrayReorganization` 接手，产物变成 `ArrayLiteral` + `TypeDefine`，
成员整个丢掉（实测真实语料 102 处索引签名 + 计算属性名）。

这里只取到第一个 `:` 之前的部分（`key: string` 取 `key`）；
`:`、`,` 之外的符号不并进名字，免得把键类型也拼进来；
**遇到 `in` 就停**——映射类型的成员写作 `[K in keyof T]`，名字是 `K`，
不停的话会拼成 `KinT` 这种把运算符也读进名字的怪东西；
**字符串字面量按内容取**——`` [`m`] `` / `["a-b"]` 的名字分别是 `m` / `a-b`
（与 `Field` 那边认字符串名字是同一套）。

```ts
let text = "";
const data = unit.Data;
const colonIndex = data.findIndex((item) => item instanceof SymbolToken && item.Is(":"));
const inIndex = data.findIndex((item) => IsWordUnit(item, "in"));
const end = colonIndex === -1 ? data.length : colonIndex;
const limit = inIndex !== -1 && inIndex < end ? inIndex : end;
for (let i = 0; i < limit; i++) {
  const item = data[i];
  if (item instanceof Identifier) {
    text += item.TempToString();
  } else if (item instanceof String) {
    for (const inner of item.Data) {
      if (inner instanceof ConstString) {
        text += inner.TempToString();
      }
    }
  } else if (item instanceof SymbolToken && item.Is(".")) {
    text += ".";
  }
}
return text;
```

# class FieldReorganization extends Reorganization

## static readonly field Instance:FieldReorganization = new FieldReorganization()

唯一的实例，注册进通用重组队列时用。

## private method MemberEnd:(units:Array<Token>, index:int)=>int

从字段名往后找这条成员的终点，返回终点下标（**含**它）。三条终止：

- `;` 或 `,` 符号——显式终止符（`a = 1;` / 接口体里的 `a: A,`）；
- 软换行——TypeScript 的字段一行一条，换行就是成员边界；
- 走到列表末尾。

换行那条要再看一眼：**换行前一个实义单元是 `;` / `,` 以外的符号时不算边界**——
`level:` 换行 `number` 是「类型标注折了行」，`a = b +` 换行 `c` 是「表达式没写完」，
这时继续往后扫。不然 `:` 会成为一个悬空的成员（`Field` 自己的队列里 `TypeDefine` 收不到任何内容）。

**那条「前一个是符号就续行」太粗**：函数类型的成员以 `>` 收尾
（`a: () => Promise<B>` 换行 `b: () => Promise<C>`），`>` 是符号、于是被当成「没写完」，
第二行乃至整张成员表都被吞进第一个字段 ✗。
所以先问 `./declaration-common.xl.md` 的 `IsMemberBoundary`——
它同时看「下一行像不像新成员」与「前一个是不是续行符号」（`>` 不在续行符号之列），
判出边界就停。

**判不出时不要退回「前一个是不是符号」那条粗判据**（第 61 轮改）：
前导 `|` 的多行联合里，换行前一个是**标识符**
（`importModuleDynamically?:` 换行 `| A` 换行 `| B` 换行 `| undefined`），粗判据当场判成
「这一行写完了」，成员在 `| A` 之后被切断 ✗——剩下那半截落进 `<Statement>`，
`| B | undefined` 还被折成一个**值位**的 `BinaryOperator op="|"`（实测 `@types/node/vm.d.ts` 三处）。
改成问 `Statement.IsLineBreakBoundary`（就是那条 ASI 判据）：换行后面是 `|` / `&` 这类
**要左操作数**的运算符时它判「不是边界」✓；函数类型那个形状它照样判「是边界」✓，行为不变。

```ts
let i = index + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    return i;
  }
  if (item instanceof LineWrap) {
    if (IsMemberBoundary(units, i)) {
      return i - 1;
    }
    if (Statement.IsLineBreakBoundary(units, i)) {
      return i - 1;
    }
  }
  if (this.IsDeclarationTailEnd(item, Get(units, i + 1))) {
    return i;
  }
  i = i + 1;
}
return units.length - 1;
```

## private method IsDeclarationTailEnd:(item:Token | null, next:Token | null)=>bool

`item` 是一个**已经成形、且会把结尾分号一起吃掉**的声明节点，
而 `next` 又像是**下一个成员的起点**——这时当前字段到此为止。

**为什么需要这一条**（实测抓出来的）：`public static readonly A: T = new R(1);` 里
`R(1)` 会被 `MethodDeclarationReorganization` 收成方法声明，而它按约定
**连同结尾的 `;` 一起收走**。于是字段 A 的 `MemberEnd` 往后扫时：

- 看不到 `;`（已经进了方法声明）；

一路扫到**字段 B 的 `;`** 才停 ✗ —— B（乃至后面每一个成员）都被吞进 A。
`New` 那条规则也没能成形（`new R(1)` 的 `R(1)` 先被当成方法声明的名字），
所以产物里连 `<New>` 都没有。

判据用**类名白名单**（这里是「会吃掉尾部分号」的那些声明节点），
与 `../text-common-util.xl.md` 的 `IsStatementList` 同一个理由：向上 import 这些类会绕出循环依赖。

**后面那个词还得不是「续接词」**：`A: T = f(1) as B` 里 `f(1)` 是方法节点、后面跟着 `as`
（已经是 `Keyword` 了）——按「后面像成员起点」会把它当成下一个成员、把这条字段**劈成两半** ✗。
所以**只要后面是 `Keyword` 就不算边界**（`as` / `satisfies` / `instanceof` / `in` / `of` / `typeof`
这些词之后类型或表达式都还在继续），`Identifier` 里再点名排除同族的几个词。
（这条是**加完第一版之后差分引擎报出 −20 个 Field 多出来**才定位到的：
`undici-types/cache.d.ts` −3、`websocket.d.ts` −4、`dist/ts/cjcli.ts` −4 …… 全是这个形状。）

```ts
if (item === null || next === null) {
  return false;
}
if (!(next instanceof Identifier || next instanceof Keyword)) {
  return false;
}
if (next instanceof Keyword) {
  return false;
}
if (next instanceof Identifier) {
  const text = next.TempToString();
  if (text === "as" || text === "satisfies" || text === "instanceof" || text === "in" || text === "of") {
    return false;
  }
}
const name = item.constructor.name;
return (
  name === "MethodDeclaration" ||
  name === "Class" ||
  name === "Function" ||
  name === "Enum" ||
  name === "Interface" ||
  name === "Namespace"
);
```

**白名单只收「会吃掉结尾分号」的那一族**：
第一版把 `Method` / `New` / `Lamda` / `ObjectLiteral` / `ArrayLiteral` 也放了进去，
结果差分引擎报出**多出 20 个 `Field`**（`undici-types/websocket.d.ts` −4、`dist/ts/cjcli.ts` −4 …）——
那些节点**不会**吃掉尾部分号，`;` 本来就在列表里看得见，把它们也算边界只会让
`A: T = { … };` 这类字段**被劈成两半**（每一半都能凑出一个 `Field`，于是多出节点）✗。
收窄到 `MethodDeclaration` 一族之后两个问题一起解决：该停的停、不该劈的不劈。

## private method IsNameUnit:(unit:Token | null)=>bool

这个单元能不能当成员名：`Identifier`（普通标识符）**或 `String`（字符串字面量名字）**。

字符串名字在 TypeScript 里很常见——`lib.dom.d.ts` 的事件表与标签名表整张都是这种形状：
`interface GlobalEventHandlersEventMap {` 换行 `"abort": UIEvent;` 换行 `"animationcancel": AnimationEvent;` 换行 `}`。

只认 `Identifier` 时，这些接口的成员**一个都收不到**（实测 `lib.dom.d.ts` 里 6496 个接口属性有 569 个是这么丢的，
`HTMLElementTagNameMap` 一个接口就丢 112 个）。

```ts
return unit instanceof Identifier || unit instanceof String;
```

## private method NameText:(unit:Token)=>string

取成员名的文本：`Identifier` 直接取 `TempToString()`；`String` 取它第一个 `ConstString` 子单元的文本
（字符串字面量的引号与转义都已经在那一层解掉了）；`[` 括号取里面拼出来的名字（见下一条）。

```ts
if (unit instanceof Identifier) {
  return unit.TempToString();
}
if (unit instanceof String) {
  for (const item of unit.Data) {
    if (item instanceof ConstString) {
      return item.TempToString();
    }
  }
}
if (unit instanceof Bracket) {
  return BracketNameText(unit);
}
return "";
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个字段的**名字**。

三条都成立才算：

1. 它是 `Identifier` 或 `String`（字符串字面量名字）**或 `[` 括号**（索引签名 / 计算属性名），
   而且处在成员位置——父单元是 `ClassBody` / `InterfaceBody` / `TypeLiteralBody`；
2. **它前面不是「半个表达式」**：前一个实义单元不能是 `;` / `,` 以外的符号——
   `m(): void` 里 `void` 前面是 `:`，`handle = (a) => a` 里右边的 `a` 前面是 `=>`，`a: A | B` 里 `B` 前面是 `|`，
   它们都不是成员名。前一个单元是上一个成员节点（`Field` / `MethodDeclaration` / …）、修饰词、`Decorator`
   或者没有（成员体开头）时都成立；
3. 它后面紧挨着的东西是「成员该有的延续」：`:` / `?:` / `=` / `;` / `,` 符号，或者**软换行**（只有名字的字段）、
   或者它是列表末尾（成员到区块结尾）。

**私有名 `#x` 是「两个单元一个名字」**：`#` 是符号、`x` 是 `Identifier`。
所以这里多一支——`index` 处的 `#` 成立时把游标推到下一个实义单元，
后面所有判定（延续符号、成员名文本）都按那个单元来，`#` 本身留在 `fieldName` 里（名字就是 `#x`）。
不认这一支时 `#x = 1` 会散成 `<SymbolToken>#</SymbolToken><Identifier>x</Identifier><SymbolToken>=</SymbolToken>…`，成员节点全丢。

第 3 条同时把「修饰词被当成名字」挡掉了：`private n = 1` 里 `private` 后面紧跟的是 `n`（`Identifier`），
不是延续符号，所以 `private` 不会被认成字段名，而 `n` 会——`DeclarationStart` 再往前把 `private` 收进 `modifiers`。

**`[` 开头的计算名 / 索引签名**：它允许的延续符号与普通名字**同一套**（`:` / `?:` / `=` / `;` / `,` / 软换行），
不能只认 `:` 与 `?:`。原来只认那两个，`class C { [KEY] = 1 }` 就被判否，整条成员散成
`<ArrayLiteral>KEY</ArrayLiteral><SymbolToken>=</SymbolToken><Identifier>1</Identifier>`（实测：字段类真缺里就有这一条）。
索引签名 `[k: string]: T` 走的是 `:` 那一支，计算名初始化式 `[KEY] = v` 走的是 `=` 那一支，
两边共用下面这段就都成立。

**`!` 是明确赋值断言**（`class C { x!: number }`）：TypeScript 里它只是属性上的一个 `exclamationToken`，
成员本身仍是字段。`!` 不在原来的延续符号集合里，于是 `x!: number` 被判否、
整条成员散成 `<Identifier>x</Identifier><SymbolToken>!</SymbolToken><TypeDefine>…`（实测同样是字段真缺的一条）。
把 `!` 加进集合；`Process` 那边不用特别处理——`MemberEnd` 会把 `!` 与类型标注一起圈进这条成员。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const parent = current.Parent;
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody) && !(parent instanceof TypeLiteralBody)) {
  return false;
}
let nameIndex = index;
const isPrivateName = current instanceof SymbolToken && current.Is("#");
if (isPrivateName) {
  nameIndex = SkipNextWrapSymbol(units, index);
}
const name = Get(units, nameIndex);
const isBracketName = name instanceof Bracket && name.startBracket === "[";
if (isBracketName === false && isPrivateName === false && !this.IsNameUnit(name)) {
  return false;
}
if (isPrivateName && !this.IsNameUnit(name)) {
  return false;
}
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
if (previous instanceof SymbolToken && !(previous.Is(";") || previous.Is(","))) {
  return false;
}
const immediate = Get(units, nameIndex + 1);
if (immediate === null || immediate instanceof LineWrap) {
  return true;
}
if (immediate instanceof SymbolToken) {
  return (
    immediate.Is(":") ||
    immediate.Is("?:") ||
    immediate.Is("=") ||
    immediate.Is(";") ||
    immediate.Is(",") ||
    immediate.Is("!") ||
    immediate.Is("?")
  );
}
return false;
```

**单独的 `?` 也要认**（实测补的）：TypeScript 允许「可选但**没有类型标注**」的成员，
`private compilerHost?;` / `a?;` / `readonly a?;` 都是合法写法——
这里的 `?` 后面直接是 `;`，**不会被合并成 `?:` 符号**，于是落不进上面那一串，
整条成员散成 `<Statement><Keyword>private</Keyword><Identifier>compilerHost</Identifier><SymbolToken>?</SymbolToken></Statement>`。
`typescript.d.ts` 里这种写法不少（`suppressDiagnosticEvents?: boolean` 之外的
`private compilerHost?;` / `private pendingOpenFileProjectUpdates?;` / `noGetErrOnBackgroundUpdate?: boolean`
一族，共 6 处字段差额全来自它）。

## private method IsIndexSignatureName:(unit:Token | null)=>bool

这个名字括号是不是**索引签名**的形状（`[k: string]`）。

判据两条：内容是 `[` 括号；里面**头两个实义单元**是「标识符 + `:`」。

**为什么这样够**（实测三种同形写法）：

- 索引签名 `[k: string]: T` ⇒ 头两个是 `k` 与 `:` ✓；
- 计算成员名 `[Symbol.iterator]: T` / `["m"]: T` ⇒ 头两个是 `Symbol` 与 `.`（或字符串）✗；
- 计算成员名里的条件表达式 `[cond ? a : b]: T` ⇒ 头两个是 `cond` 与 `?` ✗
  （只看「里面有没有 `:`」会把它误判成索引签名）。

**两种来路都要认**：`FieldReorganization` 排在 `JsonArrayReorganization` **前面**，
第一趟看到的是 `[` 括号；第二趟再看时它可能已经被收成 `ArrayLiteral` 了
（实测索引签名走的正是第二趟）。只看 `Bracket` 时判据给否、整条仍被收成字段。

```ts
const isBracket = unit instanceof Bracket && unit.startBracket === "[";
if (isBracket === false && (unit === null || unit.constructor.name !== "ArrayLiteral")) {
  return false;
}
if (unit === null) {
  return false;
}
let cursor = 0;
while (cursor < unit.Data.length && Get(unit.Data, cursor) instanceof LineWrap) {
  cursor = cursor + 1;
}
const first = Get(unit.Data, cursor);
if (!(first instanceof Identifier)) {
  return false;
}
cursor = cursor + 1;
while (cursor < unit.Data.length && Get(unit.Data, cursor) instanceof LineWrap) {
  cursor = cursor + 1;
}
const second = Get(unit.Data, cursor);
if (second instanceof SymbolToken && second.Is(":")) {
  return true;
}
// **冒号可能已经被收进 `TypeDefine`**（与元组具名元素同一情形：类型定义规则在第二趟
// 已经跑过，`k: string` 变成了「`k` + `TypeDefine(string)`」）。只认裸冒号时
// 索引签名仍然被收成字段（实测）。
return second !== null && second.constructor.name === "TypeDefine";
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整条字段声明收成一个 `Field`，**返回新的下标**。

- 起点由 `DeclarationStart` 往前吃掉一串修饰词与装饰器；修饰词折进 `modifiers`（`join(",")`），
  装饰器作为子单元搬进 `Field`。
- 名字进 `fieldName` 属性，不再作为子单元（与 `MethodDeclaration` 一致）；私有名 `#x` 的 `#` 留在名字里
  （`fieldName="#x"`），同时作为子单元留在节点里。
- 名字之后到成员终点之间的单元**原样**搬进 `Field`：`: T`、`?: T`、`= 初始值` 都不丢，
  它们在 `Field` 自己的重组队列里继续成形（`TypeDefine` / `Lamda` / `Method` 都会跑）。
- 终点取成员的最后一个单元（初始化式末位，或那个 `;`）。
  **尾随软换行不进范围**——它留在父单元里充当成员边界
  （见 `./declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
let nameIndex = index;
const isPrivateName = current instanceof SymbolToken && current.Is("#");
if (isPrivateName) {
  nameIndex = SkipNextWrapSymbol(units, index);
}
const memberIndex = this.MemberEnd(units, nameIndex);
const endIndex = memberIndex;
const name = Get(units, nameIndex)!;
// **索引签名分流**（第 66 轮第五批）：`[k: string]: T` 在 TS 那边是 `IndexSignature`
// （内容是 `Parameter` 与值类型），不是字段。形状与字段在成员表里一样，所以只能在这里分流。
const isIndexSignature = this.IsIndexSignatureName(name);
const result = isIndexSignature ? new IndexSignature(template) : new Field(template);
result.Parent = current.Parent;
if (result instanceof Field) {
  result.fieldName = isPrivateName ? "#" + this.NameText(name) : this.NameText(name);
  result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (result instanceof IndexSignature) {
  // 索引签名没有属性位：修饰词（`readonly`）与装饰器都作为**子单元**进来，
  // 由它自己的队列把关键词升级成 `Keyword` ✓。
  for (let i = startIndex; i < index; i++) {
    const item = Get(units, i);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
} else {
  for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
    result.AddAndCloseLast(item);
  }
  if (isPrivateName) {
    result.AddAndCloseLast(current);
  }
}
if (name instanceof Bracket || isIndexSignature) {
  if (isIndexSignature) {
    // **方括号消费掉**（与 `ArrayType` / `TupleType` 同一口径）：TS 那边
    // `IndexSignature` 里也没有 `[` `]` 节点，只有参数与类型 ✓。
    // 名字第二趟可能已经是 `ArrayLiteral`（见 `IsIndexSignatureName`），
    // 两种都按「把内容搬进来」处理 ✓。
    //
    // **参数那一截再收成一个 `Parameter`**（第 66 轮第六批）：TS 那边
    // `IndexSignature` 的第一个子节点就是 `Parameter`（`[key: string]: T` 里的 `key: string`）。
    // 此刻括号内容还是裸单元（`key` / `:` / `string`），整段就是那一个形参 ✓——
    // 由一个 `Parameter` 收下，类型标注在它自己的队列里凑成 `TypeDefine` ✓。
    const parameter = new Parameter(template);
    parameter.SignIn(name.SourceRange.Start!);
    const contents: Token[] = [];
    for (const item of name.Data) {
      if (!(item instanceof LineWrap)) {
        contents.push(item);
      }
    }
    if (contents.length > 0) {
      parameter.SignOut(contents[contents.length - 1].SourceRange.End!);
    }
    result.AddAndCloseLast(parameter);
    for (const item of contents) {
      parameter.AddAndCloseLast(item);
    }
    parameter.TryToClose();
  } else {
    result.AddAndCloseLast(name);
  }
}
for (let i = nameIndex + 1; i <= memberIndex; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    continue;
  }
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class Field extends IndependentToken

成员字段。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<Field>` 的标签。

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `Field` 注册就用通用队列）。

这一句是必要的：`: T` 要在它自己的队列里凑成 `TypeDefine`，`= (a) => b` 要在它自己的队列里凑成 `Lamda`——
搬进来的单元所在的那一轮重组已经过去了（见 `./declaration-common.xl.md` 的说明）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field fieldName:string = ""

字段名。

## field modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare` / `accessor`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## method ToXmlString:()=>string

产出 XML：开标签上带 `fieldName` 与 `modifiers` 两个属性，内容是「类型标注 + 初始值」的 XML。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.fieldName}" modifiers="${this.modifiers}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 AST JSON 节点：类型名 + 字段名 + 修饰词 + 「类型标注 / 初始值」。

两个键与 XML 属性**同名同源**：`name` 取 `this.fieldName`、`modifiers` 取 `this.modifiers`
（键叫 `name` 而不是字段名 `fieldName`——它跟的是 XML 属性的叫法，两个出口读起来才一致）。
`Data` 里搬进来的子单元进 `children`；为空时不写这个键。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.fieldName);
result.set("modifiers", this.modifiers);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

两个声明字段都要抄。

```ts
const result = new Field(this.Template);
result.Sign(this);
result.fieldName = this.fieldName;
result.modifiers = this.modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
