# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { TokenField } from "../../core/syntax/token-field.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, HasDeclarationLineBreak, IsDeclarationModifier, IsLineBreakTrivia, IsMemberBoundary, IsWordUnit, ModifierFollowsDeclaration, TakeDeclarationDecorators } from "./declaration-common.xl.md"
import { ClassBody } from "./class/class-body.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { IndexSignature } from "./index-signature.xl.md"
import { Parameter } from "./lamda/lamda-parameter.xl.md"
import { InterfaceBody } from "./interface/interface-body.xl.md"
import { TypeLiteralBody } from "./type-literal/type-literal-body.xl.md"
import { HasLineBreakBetween, IsAnnotationUnit, SkipNextAnnotation, SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
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
读父单元的做法与 `JsonObjectCloseRule.IsObject(current.Parent)` 同源。

**为什么排在前面**：它必须赶在 `TypeDefine` **之前**——`TypeDefine` 从 `:` 起一路收到 `;` / `,` / 赋值符号，
而「一行一个字段」的写法（`a: A` 换行 `b: B`）里没有这些终止符，`TypeDefine` 会把后面几个字段全吞进来。
把整条成员圈进 `Field`（自己带通用规则队列）之后，`TypeDefine` 最多收完这一段。

`FieldCloseRule` 写在 `Field` **之前**：后者的静态字段 `Instance` 在类定义时就 `new FieldCloseRule()`，
写反了会命中暂时性死区（TDZ）。

# method BracketNameText:(unit:Token)=>string

把 `[ … ]` 里的成员名拼成文本：`Identifier` 取文本、点号补 `.`、`:` 之前的都算名字。

参数取 `Token` 而不是 `Bracket`：同一段内容在**不同时机**可能已经是 `ArrayLiteral`
（`JsonArrayCloseRule` 排在成员规则之后，但类体的队列会跑不止一遍——
`[`m`]()` 这种计算成员名在 `Process` 里常常已经变成 `ArrayLiteral` 了），
这里只用 `Data`，两种单元都合适。

**为什么需要它**：`[` 开头的成员名有两种，都是 TypeScript 的常见写法——

- **索引签名**：`interface I { [key: string]: number }`——名字是 `key`，`string` 是键类型；
- **计算属性名**：`[Symbol.iterator]: number`——名字是 `Symbol.iterator`。

它们的成员名不是 `Identifier` / `String`，而是一个 `[` 括号。`Field` 的判定因此多了「括号当名字」这一支：
括号在成员位置上、后面紧跟 `:` / `?:` 就算一条成员。
不认这一支时，`[` 那段会被更晚的 `JsonArrayCloseRule` 接手，产物变成 `ArrayLiteral` + `TypeDefine`，
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

# class FieldCloseRule extends CloseRule

## static readonly field Instance:FieldCloseRule = new FieldCloseRule()

唯一的实例，注册进通用规则队列时用。

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
第二行乃至整张成员表都被吞进第一个字段。
所以先问 `./declaration-common.xl.md` 的 `IsMemberBoundary`——
它同时看「下一行像不像新成员」与「前一个是不是续行符号」（`>` 不在续行符号之列），
判出边界就停。

**换行前面那几条注释不算「成员的末尾」**（第 819 轮）：`a = 1//c` 换行 `;` 里，换行前面
紧挨着的是那条 `LineAnnotation`——`IsMemberBoundary` 往回取到的「换行前那一格」就是它，
既不是续行符号、也不是名字；而它往后看到的是**下一行**的词 ⇒ 常被判成「下一个成员开始了」。
于是成员在注释那里收尾，真正的尾巴（`1`、那个 `;`）被留在外面成了**下一条成员**
（实测 `gap-sweep-linecomment-clsmod-01` 与 `-03`：`PropertyDeclaration` 漂成 `[10,23)` / `[10,38)`，
各自多出一个把 `readonly` / `1` 当名字的字段与一个 `SemicolonClassElement`）。

所以这一趟要**记住最后一个非注释单元**（`tail`），边界落在换行上时返回**它**——
`IsAnnotationUnit` 只说注释、**不含软换行**：软换行**是**成员边界本身，不能一起跨。
`public static //c` 换行 `readonly a = 1;` 于是收成一条成员：头是 `public static`，
注释与换行留在它自己的 `Data` 里（`modifiers` 之外的那部分照旧不动），区间到那个 `;` 为止。

**判不出时不要退回「前一个是不是符号」那条粗判据**（第 61 轮改）：
前导 `|` 的多行联合里，换行前一个是**标识符**
（`importModuleDynamically?:` 换行 `| A` 换行 `| B` 换行 `| undefined`），粗判据当场判成
「这一行写完了」，成员在 `| A` 之后被切断——剩下那半截落进 `<Statement>`，
`| B | undefined` 还被折成一个**值位**的 `BinaryOperator op="|"`（实测 `@types/node/vm.d.ts` 三处）。
改成问 `Statement.IsLineBreakBoundary`（就是那条 ASI 判据）：换行后面是 `|` / `&` 这类
**要左操作数**的运算符时它判「不是边界」；函数类型那个形状它照样判「是边界」，行为不变。

```ts
let i = index + 1;
let tail = index;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    return i;
  }
  if (item instanceof LineWrap) {
    // **换行后面只有一条注释或一个 `;` 的不算边界**（第 820 轮）：`a: number` 换行 `;`
    // 里，换行之后紧跟的是那个 `;`（TypeScript 两边都合法：一行一条成员、`;` 另起一行）。
    // `IsMemberBoundary` 会跳过换行看到 `;`、再跳过 `number` 看到 `;` ⇒ 判成「新成员开始了」，
    // 于是成员在换行前收尾、那个 `;` 被留在外面（实测 `gap-sweep-newline-clsmod-02` 与
    // `gap-sweep-newline-iface-01`：`PropertyDeclaration` / `PropertySignature` 各自漂一格）。
    // `;` 收不收进这一条成员由下面那一格自己决定（扫到它就地收尾，区间仍到它为止）。
    const afterWrap = Get(units, SkipNextTrivia(units, i));
    if (afterWrap instanceof SymbolToken && afterWrap.Is(";")) {
      i = i + 1;
      continue;
    }
    // **行注释后面那个换行不算成员边界**（第 819 轮）：`public static //c` 换行
    // `readonly a = 1;` 里，换行是那条行注释的一部分（TypeScript 的 trailing trivia
    // 把 `//` 到行尾**连同那个换行**一起收走），所以 `static` 与 `readonly` 之间
    // **没有换行**。不挡它的话 `IsMemberBoundary` 会看到下一行的 `readonly a =`
    // ⇒ 判成「下一个成员开始了」，成员在 `static` 那里断掉
    //（实测 `gap-sweep-linecomment-clsmod-01`：`PropertyDeclaration` 漂成 `[10,23)`）。
    // 块注释后面那个换行**照旧**是边界（`a /* c */` 换行 `b` 是两条成员）——
    // 所以判据只看行注释，不是 `IsAnnotationUnit` 那张整表。
    //
    // **第 844 轮收窄到「名字后面已经扫到东西」那一半**（`tail !== index`）：
    // 这一条原来是给「名字被认错成 `static`」那个 bug 兜底的，而那一根已经在
    // `Previous` 的 `ModifierFollowsDeclaration` 那里判掉了。留着它管「只有名字」那一半
    // 会把 `private //c` 换行 `m() { }` 里 `private` 那条成员整个吞掉——
    // TS 那边它是**一条只有名字的字段**，换行就是它的边界
    //（实测 `gap-sweep-linecomment-clsmod-04`）。
    const beforeWrap = Get(units, i - 1);
    if (beforeWrap !== null && beforeWrap.constructor.name === "LineAnnotation" && tail !== index) {
      i = i + 1;
      continue;
    }
    // **名字后面换行、下一行以 `(` 开头是方法签名**（第 827 轮）：`interface I { m` 换行
    // `(): void; }` 里那个换行**不是**成员边界——形参表写在名字的下一行是日常排法。
    // 判据两条：这一条成员**目前只写了名字**（`tail` 还停在 `index` 上，一个类型 / 值都没扫到），
    // 且换行后紧跟一个 `(` 括号。
    //
    // **少了它会怎样**：`IsMemberBoundary` 那一句对 `(` 判否（它不是名字），可
    // `Statement.IsLineBreakBoundary` 随后答「是边界」⇒ 成员在名字那里收尾 ⇒
    // 前半截成了一条没有类型的 `Field`、后半截落成 `Signature`（实测
    // `gap-sweep-newline-iface-02` 与 `gap-sweep-linecomment-iface-03` 两条）。
    //
    // **为什么 `tail === index` 这一条不能少**：`a = f` 换行 `(1)` 里换行后面**也**是 `(`，
    // 而那时已经扫过 `=` 与 `f`（`tail` 不在名字上）⇒ 不归这一格管。
    const afterNameWrap = Get(units, SkipNextTrivia(units, i));
    if (tail === index && afterNameWrap instanceof Bracket && afterNameWrap.startBracket === "(") {
      i = i + 1;
      continue;
    }
    if (IsMemberBoundary(units, i)) {
      return tail;
    }
    if (Statement.IsLineBreakBoundary(units, i)) {
      return tail;
    }
  }
  // **注释里面那个换行也是一条边界**（第 844 轮）：TS 的 ASI 问的是「下一个 token 前面有没有换行」
  // （`canParseSemicolon` 读 `hasPrecedingLineBreak`），而换行落在**块注释里面**时
  // 上面那条 `item instanceof LineWrap` 根本轮不到——`public /*x` 换行 `*/ m() {}` 里
  // 成员于是从 `public` 一路吞到注释后面（实测产物 `PropertyDeclaration [10,31)` 而 TS 是 `[10,16)`）。
  //
  // **只在「这一条成员目前只写了名字」时收**（`tail === index`，与上面那条 `afterNameWrap` 同一档）：
  // 换行在注释里、而注释前面已经扫过类型 / 初始化式时（`a: /*c` 换行 `*/ number;`）TS 那边
  // 那一格是**类型的一部分**，不是成员边界。
  // **下一格是延续符号或 `(` 时也不收**：`a /*c` 换行 `*/ = 1` / `m /*c` 换行 `*/ (): void` 都还是一条成员。
  if (tail === index && item instanceof LineWrap === false && IsLineBreakTrivia(item)) {
    const afterComment = Get(units, SkipNextTrivia(units, i));
    const continues =
      (afterComment instanceof Bracket && afterComment.startBracket === "(") ||
      (afterComment instanceof SymbolToken && afterComment.IsAny([":", "?:", "=", ";", ",", "!", "?"]));
    if (continues === false) {
      return tail;
    }
  }
  if (this.IsDeclarationTailEnd(item, Get(units, i + 1))) {
    return i;
  }
  if (!IsAnnotationUnit(item)) {
    tail = i;
  }
  i = i + 1;
}
return tail;
```

## private method IsDeclarationTailEnd:(item:Token | null, next:Token | null)=>bool

`item` 是一个**已经成形、且会把结尾分号一起吃掉**的声明节点，
而 `next` 又像是**下一个成员的起点**——这时当前字段到此为止。

**为什么需要这一条**（实测抓出来的）：`public static readonly A: T = new R(1);` 里
`R(1)` 会被 `MethodDeclarationCloseRule` 收成方法声明，而它按约定
**连同结尾的 `;` 一起收走**。于是字段 A 的 `MemberEnd` 往后扫时：

- 看不到 `;`（已经进了方法声明）；

一路扫到**字段 B 的 `;`** 才停 —— B（乃至后面每一个成员）都被吞进 A。
`New` 那条规则也没能成形（`new R(1)` 的 `R(1)` 先被当成方法声明的名字），
所以产物里连 `<New>` 都没有。

判据用**类名白名单**（这里是「会吃掉尾部分号」的那些声明节点），
与 `../text-common-util.xl.md` 的 `IsStatementList` 同一个理由：向上 import 这些类会绕出循环依赖。

**后面那个词还得不是「续接词」**：`A: T = f(1) as B` 里 `f(1)` 是方法节点、后面跟着 `as`
（已经是 `Keyword` 了）——按「后面像成员起点」会把它当成下一个成员、把这条字段**劈成两半**。
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
`A: T = { … };` 这类字段**被劈成两半**（每一半都能凑出一个 `Field`，于是多出节点）。
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
// **映射类型也是成员体**（第 934 轮）：TS 的 `parseMappedType` 在值类型之后照样
// `parseTypeMembers()` —— `{ [K in keyof U]:U` 换行 `[K] }` 里那个 `[K]` 是一条
// `PropertySignature`（名字是 `ComputedPropertyName`）。`MappedType` 自己挂的就是成员队列
// （见 `type-literal/mapped-type.xl.md` 的构造器），所以这里必须把它放进白名单。
const inMappedType = parent !== null && parent.constructor.name === "MappedType";
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody) && !(parent instanceof TypeLiteralBody) && inMappedType === false) {
  return false;
}
// **映射类型里只有「值类型之后」才是成员**（第 934 轮）：同一个 `MappedType` 里，
// 键那一格（`[K in T]`）与键之后的成员形状一模一样，分开它们只能看**位置**——
// 两条判据各挡一档：
//
// 1. **前面得先有值类型那一段**（`:` 或已经成形的 `TypeDefine`）：键那一格前面只有
//    `readonly` / `+` / `-` 修饰词，所以它过不了这一条；
// 2. **本格得在换行或 `;` 之后**：同一行写在值类型后面的方括号是**下标访问**
//    （`{ [K in T]: U[K] }`，TypeScript 的 `parsePostfixTypeOrHigher` 只在同一行上吃 `[`），
//    不是成员。少了这一条，`U[K]` 里那个 `[K]` 会被收成一条成员、下标访问整片丢掉。
//
// **换行要按原始字符问**（`HasLineBreakBetween`）：值类型那一段被 `TypeDefine` 收走之后
// 列表里的 `LineWrap` 就没了（第 934 轮实测），按单元表问第二趟会答「没有」。
if (inMappedType) {
  const parentData = (parent as Token).Data;
  const at = parentData.indexOf(current);
  let sawValueType = false;
  for (let i = 0; i < at; i++) {
    const item = Get(parentData, i);
    // **`?:` 是**一个**单元**（第 934 轮实测）：`{ -readonly [K in keyof U]-?:U` 换行 `[K] }`
    // 里那个可选标记与冒号被词法并成一个 `SymbolToken("?:")` ⇒ 只认 `:` 时这一格判否、
    // 成员不成形（实测 `mappedmods-n13`：缺 `PropertySignature` / `ComputedPropertyName` / `Identifier`）。
    // 与 `class-member.xl.md` 的 `ExitOrPre` 那一句「`?:` 要拆回字符还」是同一个词法事实。
    if (item instanceof SymbolToken && (item.Is(":") || item.Is("?:"))) {
      sawValueType = true;
    }
    if (item !== null && item.constructor.name === "TypeDefine") {
      sawValueType = true;
    }
  }
  const previousAt = SkipPreviousTrivia(parentData, at);
  const previousUnit = Get(parentData, previousAt);
  const previousEnd = previousUnit === null ? null : previousUnit.SourceRange.End;
  const currentStart = current.SourceRange.Start;
  const afterBreak = previousEnd !== null && currentStart !== null && HasLineBreakBetween(previousEnd, currentStart);
  const afterSemicolon = previousUnit instanceof SymbolToken && previousUnit.Is(";");
  if (sawValueType === false || (afterBreak === false && afterSemicolon === false)) {
    return false;
  }
}
// **能当修饰词用的词不是名字**（第 844 轮）：`public static` 换行 `readonly a = 1;` 里
// `static` 后面虽然是一个换行，可它在 TS 那边仍旧是**修饰词**——`static` 不看同一行，
// 而它后面那一格 `readonly` 是字面属性名（`ModifierFollowsDeclaration`）。
// 不挡这一下的话 `static` 会被当成「只有名字的字段」（下面那条 `immediate instanceof LineWrap`
// 的分支），成员在 `static` 那里收尾、`readonly a = 1;` 另起一条
//（实测 `gap-sweep-newline-clsmod-01`：漂移 1 + 多出来 3）。
// 行注释那一版（`public static //c` 换行 `readonly a = 1;`）原来靠下面那个 `spaced`
// 特例挡着，现在同一条判据一起管——`private //c` 换行 `m() { }` 那边 TS 认的是
// **属性名**（`private` 不看同一行不成立：它后面那一格 `m` 在新的一行上），
// 那一格因此照旧是名字（实测 `gap-sweep-linecomment-clsmod-04`）。
if (ModifierFollowsDeclaration(units, index, SkipNextTrivia(units, index))) {
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
// **名字与延续符号之间的注释要跳过去**（第 631 轮）：`a /* deprecated */ = 1;` 里
// 紧跟名字的是那条 `AreaAnnotation`，按原来那一句它既不是软换行也不是符号 ⇒ 判否 ⇒
// 整条成员散成 `<Identifier>a</Identifier><AreaAnnotation/><SymbolToken>=</SymbolToken>`
// （判据 `cm-member-question`：缺 `PropertyDeclaration` + 多出 `EqualsToken` /
// `SemicolonClassElement`）。软换行**不能**一起跳（`a` 换行是「只有名字的字段」）。
const nextReal = SkipNextAnnotation(units, nameIndex);
const immediate = Get(units, nextReal);
if (immediate === null) {
  // 名字后面什么都没有：只有名字的字段。
  return true;
}
if (immediate instanceof LineWrap) {
  // **下一个实义单元是索引签名的 `[` ⇒ 这一格是修饰词、不是名字**（第 910 轮）：
  // `readonly` 换行 `[k:string]:number` 里 TS 那边是一条 `IndexSignature`
  // （`readonly` 是它的修饰词），而上面那一条「换行 = 只有名字的字段」会先把
  // `readonly` 收成一条字段 —— 之后 `[` 再走这一趟时，`readonly` 那一格已经变成
  // 一个成形的 `Field` 单元、`ModifierFollowsDeclaration` 再也拿不到它
  //（实测：判据写在下面 `[` 那一支上**不响**）。
  // 所以判据要落在**换行第一次被当作名字延续**的那一格上：这一格是修饰词、
  // 而换行后面那个 `[` 真是索引签名的形状（`IsIndexSignatureName`，与 `Process`
  // 分流用的是同一个方法）⇒ 判否 ⇒ `readonly` 留给 `DeclarationStart` 收进修饰词。
  //
  // **必须带「真是索引签名」这一条**：`readonly` 换行 `[Symbol.iterator](): T` 里
  // `readonly` 是**属性名**（TS 那边是 `PropertyDeclaration`，计算名那种写法）。
  //
  // **不能借 `ModifierFollowsDeclaration` 来判「这一格是不是修饰词」**（实测踩过）：
  // 它对 `readonly` 这一类要求**同一行**，而这一格要收的排版**正是**「修饰词与 `[`
  // 之间隔着一个换行」⇒ 一问就否、判据一次都不响。这里问的是「这个词**是不是**一个声明
  // 修饰词」（`IsDeclarationModifier`，与 `DeclarationStart` 收修饰词用的是同一个词表）。
  const nextUnit = Get(units, SkipNextTrivia(units, nextReal));
  // **第 910 轮那一支在这里撤掉了**（第 912 轮）：它判的是「`readonly` 是下一个 `[` 索引签名的
  // **修饰词**、不是名字」——而 TS 的读法**相反**：修饰词与 `[` 之间隔着一个换行时，
  // `readonly` 是**一条只有名字的字段**（`PropertySignature`），`[k:string]:number` 另起一条
  // `IndexSignature`（实测 `ts.createSourceFile`：`interface I { readonly` 换行
  // ` [k:string]:number }` 给 `PropertySignature` + `IndexSignature` 两条，
  // 同一行写才是带 `ReadonlyKeyword` 的一条 `IndexSignature`）。
  // 撤掉之后 `readonly` 照下面那一句就是「只有名字的字段」，而那个 `[` 能不能另起一条成员
  // 由成员边界那一格说了算（`declaration-common.xl.md` 的 `IsMemberBoundary`：
  // 换行前面是声明修饰词时，`[` 起的是下一条成员，第 912 轮补的例外）。
  // **下一行以 `(` 开头 ⇒ 这一格是方法名、不是字段名**（第 910 轮）：`abstract override m`
  // 换行 `():void;` 里 TS 那边是**一条** `MethodDeclaration`（成员体里的 ASI 不管换行，
  // 「名字 + `(`」永远读成方法），而这一格原来因为「换行 = 只有名字的字段」先把
  // `m`（连同 `abstract override`）收成 `Field` ⇒ 后面那个 `()` 谁也认不下、
  // 被 `SignatureCloseRule` 抢成一条无名 `CallSignature`
  //（实测 `gap-r907-abstract-method-params-newline`：多 `PropertyDeclaration` + `CallSignature`）。
  //
  // **实测三种写法 TS 都是方法**（`ts.createSourceFile`）：
  // `class A { x` 换行 `(y) => y }` ⇒ `MethodDeclaration(x, Parameter(y), Block)`；
  // `class A { m` 换行 `(): void; }` ⇒ `MethodDeclaration`；
  // `class A { x` 换行 `(1); }` ⇒ `MethodDeclaration(x, Parameter)`。
  // 也就是说**这一格没有反例**：成员体里一个名字后面跟着 `(`，不可能是「字段 + 括号表达式」。
  if (nextUnit instanceof Bracket && nextUnit.startBracket === "(") {
    return false;
  }
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
// **注释里面那个换行也是换行**（第 844 轮）：TS 的 ASI 问的是「下一个 token 前面有没有换行」
// （`canParseSemicolon` 读 `hasPrecedingLineBreak`），而块注释**里面**的换行一样置位。
// `public /*x` 换行 `*/ m() {}` 里那个换行就在注释里，`m` 前面因此算换行 ⇒
// `public` 是一条**只有名字的字段**（TS 那边是 `PropertyDeclaration` + `MethodDeclaration`）。
// 只在 `immediate instanceof LineWrap` 上判会漏掉它：那时 `public` 谁也认不下、
// 最后被 `KeywordCloseRule` 升级成一个散 `<Keyword>public</Keyword>`，
// 投影出来是多一个 `PublicKeyword`（实测这条探针：缺 2 多 1）。
// **放在延续符号之后**：`a /*c` 换行 `d*/ = 1` 里 `=` 照旧是初始化式，不当成新成员。
if (HasDeclarationLineBreak(units, nameIndex, nextReal)) {
  return true;
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

- 索引签名 `[k: string]: T` ⇒ 头两个是 `k` 与 `:`；
- 计算成员名 `[Symbol.iterator]: T` / `["m"]: T` ⇒ 头两个是 `Symbol` 与 `.`（或字符串）；
- 计算成员名里的条件表达式 `[cond ? a : b]: T` ⇒ 头两个是 `cond` 与 `?`
  （只看「里面有没有 `:`」会把它误判成索引签名）。

**两种来路都要认**：`FieldCloseRule` 排在 `JsonArrayCloseRule` **前面**，
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
// **注释与软换行同一条口径**（第 900 轮）：原来这两跳只跳 `LineWrap`，
// 于是 `[k /*c*/ : string]` 的第二个实义单元读出来是那条**注释** ⇒ 判据给否 ⇒
// 整条被收成 `Field`（产物一侧多出 `PropertySignature` + `ComputedPropertyName`，
// 少的正是 `IndexSignature` / `Parameter` / `StringKeyword` 三格）。
// 括号里面的软换行本来就没有语义（成员边界在括号外面），注释更没有，
// 所以两跳一律走 `SkipNextTrivia`——与 `type-operator` / `method-declaration` 那几处同一改法。
let cursor = SkipNextTrivia(unit.Data, -1);
const first = Get(unit.Data, cursor);
// **空括号也是索引签名**（第 934 轮片段普查量出的「空方括号在成员位」那一族）：
// `type X = { a: A` 换行 `[] };` 在 TS 那边是一条**没有形参的** `IndexSignature`
//（`parseIndexSignatureDeclaration` 先吃 `[`、再吃（空的）形参表、再一个 `]`）——
// 成员位里那对空方括号**只有**这一种读法（计算名不可能是空的）。
// 少了这一条：空括号走 `Field` ⇒ 产物多出 `PropertySignature` + `ComputedPropertyName`
//（实测 `e-a` / `e-b` / `e-c` / `e-d` 四条：各缺 `IndexSignature`、多 2）。
if (first === null) {
  return true;
}
if (!(first instanceof Identifier)) {
  return false;
}
cursor = SkipNextTrivia(unit.Data, cursor);
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
  它们在 `Field` 自己的规则队列里继续成形（`TypeDefine` / `Lamda` / `Method` 都会跑）。
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
  // **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来。
  result.ModifierSpans = DeclarationModifierSpans(units, startIndex, index).join(",");
  // **名字的位置当场记进字段**（见 `NameAt` / `NameStart`）：只认**有自己区间**的两种名字——
  // 普通标识符与字符串字面量。计算名的区间由投影那边按方括号自己分派，
  // 索引签名不是字段名。
  // **字符串名的整段（含引号）进 `NameAt`**，文本区间（引号里那一段）由它推出来：
  // 投影读到的仍旧是一对下标，而`"a-b"` 这种名字**不再回原文 `indexOf` 猜**
  // （带转义时 `indexOf` 根本找不到）。
  // 私有名的区间从 `#` 那一格算起（`fieldName` 记的是 `#x` 整个名字）。
  const plainName = name instanceof Identifier;
  const stringName = name instanceof String;
  if (plainName || stringName) {
    // **文本区间**：字符串名去掉首尾两个引号；私有名从 `#` 那一格算起
    //（`fieldName` 记的是 `#x` 整个名字）；其余形态就是名字那一格自己。
    result.NameStart = stringName
      ? name.SourceRange.Start!.Index + 1
      : isPrivateName ? current.SourceRange.Start!.Index : name.SourceRange.Start!.Index;
    result.NameEnd = stringName
      ? name.SourceRange.End!.Index - 1
      : name.SourceRange.End!.Index;
    // **名字那一格**（见 `NameAt`）：**私有名不给这一格**——`#x` 是**两格**（`#` 与名字本体），
    // 没有哪一格单独说得清 `fieldName` 记的那串 `#x`；它的区间由上面那一对说了算。
    if (!isPrivateName) {
      result.NameAt.Set(name.SourceRange.Start!.Index, name.SourceRange);
    }
  }
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (result instanceof IndexSignature) {
  // 索引签名没有属性位：修饰词（`readonly`）与装饰器都作为**子单元**进来，
  // 由它自己的队列把关键词升级成 `Keyword`。
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
    // `IndexSignature` 里也没有 `[` `]` 节点，只有参数与类型。
    // 名字第二趟可能已经是 `ArrayLiteral`（见 `IsIndexSignatureName`），
    // 两种都按「把内容搬进来」处理。
    //
    // **参数那一截再收成一个 `Parameter`**（第 66 轮第六批）：TS 那边
    // `IndexSignature` 的第一个子节点就是 `Parameter`（`[key: string]: T` 里的 `key: string`）。
    // 此刻括号内容还是裸单元（`key` / `:` / `string`），整段就是那一个形参——
    // 由一个 `Parameter` 收下，类型标注在它自己的队列里凑成 `TypeDefine`。
    const parameter = new Parameter(template);
    const contents: Token[] = [];
    for (const item of name.Data) {
      if (!(item instanceof LineWrap)) {
        contents.push(item);
      }
    }
    // **空括号不造形参**（第 934 轮）：TS 那边 `{ [] }` 的 `IndexSignature` 就是
    // 「一个形参都没有」（没有 `parameters` 那一格）。造一个零宽 `Parameter` 会让
    // 产物多出一个节点、而且它签不出区间（`SignIn` 有、`SignOut` 没有）。
    if (contents.length > 0) {
      parameter.SignIn(name.SourceRange.Start!);
      parameter.SignOut(contents[contents.length - 1].SourceRange.End!);
      result.AddAndCloseLast(parameter);
      for (const item of contents) {
        parameter.AddAndCloseLast(item);
      }
      parameter.TryToClose();
    }
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

## method PrintAst:(ctx:any, v:any)=>any

成员字段 → `PropertySignature` / `PropertyDeclaration`
（**从 `ts-ast.xl.md` 的 `projectField` 整块搬来**，第 195 轮）。

**接口 / 类型字面量里的成员是 `PropertySignature`**，类里才是 `PropertyDeclaration`——
同一个产物标签 `Field`，两种上下文两种 kind（声明文件里前者是绝大多数），判据是 `ctx.signature`。

**名字走共用判据**（`ctx.MemberNameOf`，与 `structuralProps` 同一份）：引号名是 `StringLiteral`、
数字名是 `NumericLiteral`、计算名是 `ComputedPropertyName`。

三处实测口径：

- **可选标记 `?`**：有类型标注时它被**吞进了 `TypeDefine` 的区间**（`TypeDefine[17,25]` = `?: string`），
  所以按「类型段第一个字符是不是 `?`」切；没有类型标注时（`a?;`）它是**平级的 `SymbolToken`**；
- **初始化式是 `=` 右边整段**、不是一格（第 158 轮）：`class C { [KEY] = 1` 换行 `["s" + "t"] = 2 }`
  里 TS 把初值折成 `BinaryExpression`；收尾的 `;` 不属于初值；
- **明确赋值断言 `x!: number`**（第 156 轮）：`!` 是 `exclamationToken`，产物把它记成平级的
  `SymbolToken("!")`。

**字段上的装饰器也是修饰词**（`@Input() name: string`，第 95 轮）：本方法不走
`structuralProps`，所以这一处要单独收并按位置与其它修饰词一起排序。

```ts
  const kids = ctx.Kids(v);
  const eqIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=",
  );
  const typeNode = kids.find((k: any) => k.get("type") === "TypeDefine");
  const named = ctx.MemberNameOf(v);
  const props: any = {};
  if (named.name !== undefined) {
    props.name = named.name;
  }
  if (typeNode !== undefined) {
    const typeStart = ctx.StartOf(typeNode);
    if (ctx.source[typeStart] === "?") {
      props.questionToken = { kind: "QuestionToken", text: "?", pos: typeStart, end: typeStart + 1 };
    } else {
      // **可选标记与冒号之间夹着注释时，`?` 是 `TypeDefine` 的兄弟**（第 855 轮）：
      // `refs?/* c */: readonly (A | B)[]` 的词法形状是 `refs` `?` 注释 `:`
      // ——两格各自是符号（注释挡住了词法把它们并成一个 `?:`），于是 `TypeDefine`
      // 从**注释**那一格起（它的 `SourceRange` 盖住了注释，`[224,…)`），
      // 上面那条「类型段第一个字符是不是 `?`」当场落空 ⇒ 整个 `questionToken` 丢失
      // （实测 `PropertySignature` 字段名对不上：产物 `[name,type]` vs TS `[name,questionToken,type]`）。
      //
      // 判据与上面那一支**同一个来源**（都是「那个 `?` 在哪」），只是这里要去兄弟里找它：
      // 找的是**平级的 `SymbolToken("?")`**，取它自己的区间——不再拿 `TypeDefine` 的起点硬算。
      const question = kids.find(
        (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "?",
      );
      if (question !== undefined) props.questionToken = ctx.Project(question);
    }
    props.type = ctx.Project(typeNode);
  } else {
    const question = kids.find(
      (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "?",
    );
    if (question !== undefined) props.questionToken = ctx.Project(question);
  }
  const initKids = kids
    .slice(eqIndex + 1)
    .filter((k: any) => !(k.get("type") === "SymbolToken" && ctx.TextOf(k) === ";"));
  if (eqIndex >= 0 && initKids.length > 0) props.initializer = ctx.Expression(initKids);
  const bang = kids.find((k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "!");
  if (bang !== undefined) props.exclamationToken = ctx.Project(bang);
  ctx.AddModifiers(v, props);
  const fieldDecorators = kids.filter((k: any) => k.get("type") === "Decorator");
  if (fieldDecorators.length > 0) {
    const projected = fieldDecorators
      .map((d: any) => ctx.Project(d))
      .filter((d: any) => d !== undefined);
    const merged = [...projected, ...(Array.isArray(props.modifiers) ? props.modifiers : [])];
    merged.sort((a: any, b: any) => (a.pos ?? 0) - (b.pos ?? 0));
    props.modifiers = merged;
  }
  const kind = ctx.signature ? "PropertySignature" : "PropertyDeclaration";
  // **坐标在前**（第 199 轮）：搬家前这里是 `{ kind, pos: v.start, end: … , ...props }`，
  // 两种 kind 在 samples 夹具里都是这个键序，`samples` 逐字节比得出来。
  return ctx.NodeHead(kind, props, v);
```

## constructor:(template:Template)=>void

创建时把本类型的收尾规则挂上来（模板里没有专门给 `Field` 注册就用通用队列）。

这一句是必要的：`: T` 要在它自己的队列里凑成 `TypeDefine`，`= (a) => b` 要在它自己的队列里凑成 `Lamda`——
搬进来的单元所在的那一轮重组已经过去了（见 `./declaration-common.xl.md` 的说明）。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field fieldName:string = ""

字段名。

## field NameStart:int = -1

名字在源码里的起点（闭区间下标）；名字那一格不是普通标识符（计算名 / 索引签名）时是 `-1`。

**字符串名也在内**（第 645 轮）：`"a-b" = 2` 的 `nameStart` / `nameEnd` 是**引号里那一段**
（`a-b` 的两个下标）——投影拿到这两个下标之后，`source[nameStart-1]` 正是那个开引号，
于是 `StringLiteral` 那一格照旧由它推出来，而**不必再回原文 `indexOf("a-b")` 猜**
（名字里带转义时 `indexOf` 根本找不到）。
**整段名字（含引号）在 `NameAt` 那一格里**，两样挨着、不会漂。

**私有名 `#x` 从 `#` 算起**——`fieldName` 记的是 `#x` 整个名字，投影合出来的也是
一个 `PrivateIdentifier`，所以区间必须盖住那个 `#`。

**为什么让 token 记着**（「token 出字段、投影直读」）：投影手里只有 `fieldName` 这个字符串，
位置要回原文 `indexOf` 猜，而猜错的方式不止一种（同名字母在修饰词里、在名字前面的类型里）。
`FieldCloseRule.Process` 那一刻手里就是名字那一格（`name.SourceRange`），记下来给投影直读
（见 `print-ast-common.xl.md` 的 `synthName`）。

## field NameEnd:int = -1

名字的终点（闭区间下标），与 `NameStart` 同进退。私有名同样是 `x` 的末尾，
字符串名是**闭引号前面那一格**。

## field NameAt:TokenField<number> = new TokenField<number>(-1)

**名字那一格自己的整段区间**（字符串名含那对引号）。

与 `NameStart` / `NameEnd` 的分工：那两格是**名字文本**的区间（字符串名不含引号），
这一格是**那个单元**的区间——投影要「这名字是怎么写出来的」（是不是引号名）时读它，
中间不需要任何推断。这就是「token 出字段、投影直读」的那条线。

只认**有自己区间**的两种名字（普通标识符 / 字符串字面量）：计算名与索引签名各自成形，
不走这一格。**私有名 `#x` 也不走**——它是**两格**（`#` 与名字本体），
没有哪一格单独说得清 `fieldName` 里那串 `#x`；那种形态的区间由 `NameStart` / `NameEnd` 说
（`NameStart` 从 `#` 算起）。

## field modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare` / `accessor`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道——
而成员的装饰器名里正带着同一个词（`@exported private d = 1`）。

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
// **名字的位置**（见 `NameStart` / `NameEnd`）：投影直读，不再回原文 `indexOf` 猜。
result.set("nameStart", this.NameStart);
result.set("nameEnd", this.NameEnd);
// **名字那一格的整段区间**（见 `NameAt`）：字符串名的引号也在里面——
// 投影要问「这个名字是怎么写出来的」时直读它（与 `bodyBraceRange` 同一形状：闭区间、`"起,止"`）。
if (this.NameAt.IsSet) {
  result.set("nameAt", this.NameAt.File());
  const nameRange = this.NameAt.Range;
  if (nameRange !== null && nameRange.Start !== null && nameRange.End !== null) {
    result.set("nameRange", nameRange.Start.Index + "," + nameRange.End.Index);
  }
}
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.ModifierSpans);
}
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

四个声明字段都要抄。

```ts
const result = new Field(this.Template);
result.Sign(this);
result.fieldName = this.fieldName;
result.NameStart = this.NameStart;
result.NameEnd = this.NameEnd;
result.NameAt = this.NameAt;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
