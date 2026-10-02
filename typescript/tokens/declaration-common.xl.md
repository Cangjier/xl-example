# dependencies
```xl
import { Token } from "../../core/syntax/token.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { GetSkipNextWrapSymbol, GetSkipPreviousWrapSymbol, SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Class } from "./class/class.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Decorator } from "./decorator.xl.md"
import { Enum } from "./enum/enum.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { Function } from "./function/function.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Import } from "./import.xl.md"
import { Interface } from "./interface/interface.xl.md"
import { Keyword } from "./keyword.xl.md"
import { Label } from "./label.xl.md"
import { MethodDeclaration } from "./function/method-declaration.xl.md"
import { Statement } from "./statement.xl.md"
import { String } from "./string/string.xl.md"
import { Switch } from "./switch/switch.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

声明层公用工具：`class` / `function` / `enum` / 方法声明这四条重组规则，**起点都在关键字之前的同一段东西上**——
`@Decorator`、`export` / `declare` / `default` / `abstract` / `async` / `public` / `private` / `protected` / `static` /
`readonly` / `override` / `get` / `set` / `const` 这些修饰词。这些工具放在 token 层，
落成模块级 `# method`——与 `../text-common-util.xl.md` 同一种形态。

修饰词只按**词形**判定，不看上下文：`export` 这个词出现在声明头之前就是修饰词。
真正的形状约束（后面必须跟名字、括号、花括号）由各条重组规则自己的 `Previous` 负责，
所以这里放宽一点是安全的——多认一个修饰词只会让 `Process` 的起点前移一格，不会造出不该有的节点。

类型参数段（`<T>` / `<T = unknown>` / `<T extends X = Y>`）由 `generic-type.xl.md` 收成 `GenericType`，
声明规则只要跨过那一个单元就行——两处各管一段，这里不再需要认尖括号。

**一个已经删掉的收尾口径：`DeclarationEnd`（别再把它加回来）。**
这里原先有一个 `DeclarationEnd(units, index)`：从 `index` 起把后面**连续的软换行**一起算进来，
返回这段声明的末尾。声明层的 `Class` / `Function` / `Enum` / `Interface` / `Namespace` /
`MethodDeclaration` / `Signature` / `Field` 与 `Switch` / `DoWhile` 都走它，
把声明（或语句）后面那个换行并进自己的替换范围。当时的理由是：不这么做，声明末尾那个裸 `LineWrap`
会留在父单元里，被 `StatementReorganization2` 收成一个**空的** `<Statement></Statement>`。

**那个理由今天不成立了**：语句重组的两条规则后来各补了一个早退——
`StatementReorganization2` 在「当前是最后一个单元」的分支里遇到 `children.length === 1` 直接 `splice` 掉，
`StatementReorganization3` 遇到 `children.length === 1 && IsStatementUnit(children[0])` 就什么都不做。
于是单独一个 `LineWrap` 不会再变成空 `Statement`（`tests/parse/noise.mjs` 把这条钉住：
空 `Statement` 必须是 0）。

**而吃掉那个换行的代价是丢掉了语句边界**：`LineWrap` 在本工程里不只是排版，
它还是 `SearchFrontIndexed` 往回找语句头时的那道**墙**。墙被声明规则吃进自己的范围之后：

- 引擎要等到后面某个换行、或列表末尾，才收束这条语句；
- 那时往回找语句头，`const A = class {}` 里的 `Class` **不是**边界
  （它在表达式位，`IsDeclarationPosition` 判否），于是搜索一路退到列表开头；
- 两条语句就被收进**同一个** `Statement`。

实测（`tests/parse/boundaries.mjs`，对着 TypeScript 自己的 AST 数「相邻两条语句之间的边界有没有被横跨」）：

| 口径 | 真实语料（`@types` / `typescript/lib` / `undici-types` / 产物 / 样本） | 用例语料 |
| --- | --- | --- |
| 收掉尾随换行 | 217 个文件里 **30 个**文件有边界被横跨（共 48 处） | 852 个文件里 **17 个** |
| 不收（现口径） | **0 处** | **0 处**（ASI 判据补齐之后，见 `tests/parse/known-gaps.json` 的 `_notes.asi-not-implemented`） |

典型受害者是 `@types/node` 里成片的 `declare module "x" { … }` 换行 `declare module "node:x" { … }`：
两条环境模块声明被收进一个 `Statement`。

所以现在的口径是：**声明/语句的范围就到它自己的最后一个单元为止，尾随软换行留在父单元里**，
由语句重组去消费它。各规则的 `endIndex` 直接取自己那个体括号（或返回类型末位、或那个 `;`）的下标。

# method IsDeclarationModifier:(item:Token | null)=>bool

这个单元是不是一个声明修饰词。

判定是「`Identifier` 且文本命中修饰词表」。表里收的是 TypeScript 里能出现在**声明之前**的那些词：
访问修饰符（`public` / `private` / `protected`）、成员修饰符（`static` / `readonly` / `abstract` / `override` / `declare` / `accessor`）、
函数修饰符（`async`）、访问器前缀（`get` / `set`）、导出修饰符（`export` / `default`）、枚举前缀（`const`）。

`accessor` 是 TypeScript 4.9 的**自动访问器**修饰符（`class A { accessor x = 1 }`）。
它必须在这张表里，否则成员起点的判定看不到它：`accessor` 会先被当成裸名字，
整个成员退化成 `<Statement><Identifier>accessor</Identifier><Field …/></Statement>`——
成员被多包了一层 `Statement`，结构就错了（实测）。
`static accessor x` / `abstract accessor x` 同理，前一个修饰词一起吃掉即可。

`constructor` 不在表里：它是方法名而不是修饰词。`in` / `out` 这类只出现在类型参数位置上的词也不在表里。

```ts
if (!(item instanceof Identifier)) {
  return false;
}
return item.IsAny([
  "export",
  "declare",
  "default",
  "abstract",
  "accessor",
  "async",
  "public",
  "private",
  "protected",
  "static",
  "readonly",
  "override",
  "get",
  "set",
  "const",
]);
```

# method DeclarationStart:(units:Array<Token>, index:int)=>int

从关键字（`class` / `function` / `enum` / 方法名）所在的下标出发，**向前**吃掉连续的修饰词与装饰器，
返回这段声明的起点下标；前面没有可吃的东西时返回 `index` 本身。

「连续的」是跨过软换行判定的：`SkipPreviousWrapSymbol` 会跳过 `LineWrap`，
所以 `export\nclass A {}` 与 `export class A {}` 得到同一个起点。

循环在每个位置上只做一次「前一个实义单元是不是修饰词或 `Decorator`」的判定，
命中就前移一位继续，不命中就停——与 `Interface.Reorganization` 里那条「只看前一位是不是 `export`」的写法同源，
只是把一位扩成一段。

```ts
let start = index;
while (true) {
  const previousIndex = SkipPreviousWrapSymbol(units, start);
  if (previousIndex < 0) {
    break;
  }
  const previous = Get(units, previousIndex);
  if (previous instanceof Decorator || IsDeclarationModifier(previous)) {
    start = previousIndex;
    continue;
  }
  break;
}
return start;
```

# method DeclarationModifiers:(units:Array<Token>, start:int, index:int)=>Array<string>

取 `[start, index)` 之间的**修饰词文本**，按源码顺序排列；装饰器与软换行都不进这个列表。

调用方用 `join(",")` 把它拼成产物上的 `modifiers` 属性——空串表示没有修饰词。
`Decorator` 单元另有归宿：各条规则的 `Process` 会把它当作新单元的子单元搬进去（见 `TakeDeclarationDecorators`）。

```ts
const result: string[] = [];
for (let i = start; i < index; i++) {
  const item = Get(units, i);
  if (IsDeclarationModifier(item)) {
    result.push((item as Identifier).TempToString());
  }
}
return result;
```

# method TakeDeclarationDecorators:(units:Array<Token>, start:int, index:int)=>Array<Decorator>

取 `[start, index)` 之间的 `Decorator` 单元，按源码顺序排列。

它们与修饰词不同：修饰词被折进 `modifiers` 属性（文本进了产物属性），装饰器则要作为子单元继续活在树里，
否则 `@Component({...})` 里的那段 Json 会从 XML 里整个消失。

```ts
const result: Decorator[] = [];
for (let i = start; i < index; i++) {
  const item = Get(units, i);
  if (item instanceof Decorator) {
    result.push(item);
  }
}
return result;
```

# method IsTypeLiteralBracket:(units:Array<Token>, index:int)=>bool

`index` 处那个 `{` 括号是**类型字面量**而不是函数体/方法体。

判据只看前一个**实义单元**是不是 `:` / `|` / `&` / `=>` 之一：`function f(): { a: number } { … }` 里
第一个 `{` 跟在 `:` 后面，是返回类型；`function f(): A | { a: number } { … }` 里跟在 `|` 后面，
也是返回类型的一部分；而 `function f(): number { … }` 里 `number` 之后那个 `{` 前面不是符号，是函数体。

**`=>` 也要认**（实测补的）：**函数类型的返回类型字面量**写作 `(opts: X) => { a: number }`，
那个 `{` 前面正是 `=>`。不认它时返回类型整段退化成 `<Bracket>`，`TypeLiteral` 一个都不出
（实测 `type A = (opts: X) => { a: number, b: string }` 的产物里就是裸括号；
`undici-types/mock-interceptor.d.ts` 的 `MockReplyOptionsCallback` 与
`@types/node/http2.d.ts` 里成片的 `listener: () => {}` 都是这一形状）。

`{` 跟在别的单元后面就是体——`function f() { … }` 里那个 `{` 前面是参数括号，正是这一档。
两个 `{` 相邻的写法（`: { … } { … }`）也分得开：第二个 `{` 前面是第一个括号单元，不是符号。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.startBracket !== "{") {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
if (!(previous instanceof SymbolToken)) {
  return false;
}
return previous.Is(":") || previous.Is("|") || previous.Is("&") || previous.Is("=>");
```

# method IsStatementKeyword:(item:Token | null)=>bool

这个单元是不是「一条新语句的开头」用的关键字 `Identifier`。

用来给声明尾部的扫描划一条终点线：`declare function f(): void` 后面紧跟的 `let y = 1`
属于下一条语句，不能被当成返回类型的一部分收进去。

表里**只收不可能出现在类型位置上的词**。这一点是刻意的：`typeof` / `keyof` / `infer` / `readonly` /
`unique` / `new` / `true` / `false` / `null` 都是类型里的常客（`function f(): readonly string[]`、
`new () => T`、`typeof x`），把它们算作终点线会把合法返回类型截断。

`type` / `namespace` / `module` 三个词也是**声明**开头而不是类型内容（`type X = …`），必须收——
漏掉 `type` 的后果实测过：`declare function f(): string | undefined` 后面紧跟的
`type Handler = …` 会被整段吞进返回类型里。

```ts
if (!(item instanceof Identifier)) {
  return false;
}
return item.IsAny([
  "type",
  "namespace",
  "module",
  "let",
  "const",
  "var",
  "function",
  "class",
  "interface",
  "enum",
  "if",
  "else",
  "for",
  "foreach",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "return",
  "throw",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "with",
  "debugger",
  "import",
  "export",
  "declare",
  "abstract",
  "static",
  "public",
  "private",
  "protected",
  "async",
  "await",
  "yield",
]);
```

# method IsMemberBoundary:(units:Array<Token>, index:int)=>bool

`index` 处的换行是不是**两个成员之间的那道边界**。

TypeScript 允许成员之间只靠换行分隔（不写 `;`）：
`declare class C {` 换行 `readonly blob: () => Promise<Blob>` 换行 `readonly bytes: () => Promise<Uint8Array>` 换行 `}`。
类型的扫描（`TypeDefine` 收集类型文本）必须在这里停下，否则**第一段会把后面整张成员表吞掉**。

两条都成立才算边界：

- **换行后面看起来像新成员**：跳过换行后的第一个实义单元是 `Identifier` / `String` / `[` 括号，
  而且**再往后跨过名字与修饰词**（`readonly` / `public` / `static` …）紧跟 `:` / `?:` / `(` / `=` / `;` 之一；
- **换行前面不是续行符号**：`|` / `&` / `,` / `=>` / `->` / `=` / `:` / `(` / `[` / `<` / `.` / `?`
  之后换行说明这一行的类型还没写完（`a: A |` 换行 `B` 这种折行排版），不算边界。

```ts
const afterIndex = SkipNextWrapSymbol(units, index);
const after = Get(units, afterIndex);
if (after === null) {
  return false;
}
// **以 `[` 开头的一行不会是新成员**（第 158 轮）：ASI **永远不在 `[` 前面断句**——
// `class C { [KEY] = 1` 换行 `["s" + "t"] = 2 }` 在 TypeScript 里是**一条**字段声明
// （初值成了 `1["s" + "t"] = 2`）。原来这里把 `[` 也算进 `isNameLike`，
// 于是成员在那一行被切断（实测 `decl-class-computed-member.ts`：缺 `BinaryExpression` /
// `ElementAccessExpression` / `EqualsToken`，多一条 `PropertyDeclaration`）。
if (after instanceof Bracket && after.startBracket === "[") {
  return false;
}
const isNameLike =
  after instanceof Identifier ||
  after instanceof String ||
  (after instanceof Bracket && after.startBracket === "[");
if (isNameLike === false) {
  return false;
}
const follower = Get(units, SkipNextWrapSymbol(units, afterIndex));
if (
  !(follower instanceof SymbolToken) ||
  !(follower.Is(":") || follower.Is("?:") || follower.Is("(") || follower.Is("=") || follower.Is(";"))
) {
  let probe = afterIndex;
  let hops = 0;
  while (hops < 4) {
    const probeUnit = Get(units, probe);
    if (probeUnit instanceof Identifier || probeUnit instanceof String) {
      probe = SkipNextWrapSymbol(units, probe);
      hops = hops + 1;
      continue;
    }
    // **计算名的那对方括号要当成名字本身跨过去**（实测补的）：
    // `readonly [Symbol.iterator]: () => Y` 里，`[Symbol.iterator]` 是一个括号、
    // 后面紧跟的才是 `:`。不跨它的话循环停在这个括号上，
    // `afterNames` 拿到 `[` → 判不出边界 → **整条成员被上一个字段吞进 `TypeDefine`**
    // （实测 `interface I { readonly entries: () => X<string>` 换行
    //  `readonly [Symbol.iterator]: () => Y` 只出 1 个 `Field`）。
    //
    // **判据是「括号里有没有内容」，不是 `Context`**（实测踩过）：
    // 计算名 `[Symbol.iterator]` 的 `Context` 在这里是 `type`
    // （`readonly` 这类修饰词把它推到了类型位），与数组后缀 `X<string>[]` 的
    // `Context` **完全一样**，拿 `Context` 判会漏。而两者在**内容**上一定不同：
    // 数组后缀是**空的** `[]`，计算名里一定装着东西。
    if (probeUnit instanceof Bracket && probeUnit.startBracket === "[" && probeUnit.Data.length > 0) {
      probe = SkipNextWrapSymbol(units, probe);
      hops = hops + 1;
      continue;
    }
    break;
  }
  const afterNames = Get(units, probe);
  if (
    !(afterNames instanceof SymbolToken) ||
    !(afterNames.Is(":") || afterNames.Is("?:") || afterNames.Is("(") || afterNames.Is("=") || afterNames.Is(";"))
  ) {
    return false;
  }
}const before = GetSkipPreviousWrapSymbol(units, index);
if (before instanceof SymbolToken) {
  const text = before.TempToString();
  if (
    text === "|" ||
    text === "&" ||
    text === "," ||
    text === "=>" ||
    text === "->" ||
    text === "=" ||
    text === ":" ||
    text === "?:" ||
    text === "(" ||
    text === "[" ||
    text === "<" ||
    text === "." ||
    text === "?"
  ) {
    return false;
  }
}
return true;
```

# method IsWordUnit:(unit:Token | null, word:string)=>bool

`unit` 是不是**文本等于 `word` 的词**——`Identifier` 与 `Keyword` 都算。

**为什么需要它**：`KeywordReorganization` 会把命中的词从 `Identifier` 升级成 `Keyword`，
而 `Keyword` 与 `Identifier` **没有继承关系**（两条分支各造各的单元）。于是「找一个词」的判定
必须两种都认，否则某处一旦先跑过升级，后面按 `Identifier` 找词的规则就再也找不到它
（`in` / `of` 正是这么被坑过：见 `../parse-pipeline.xl.md` 的 `KeyWords`）。

文本取法两边不同：`Identifier` 用 `TempToString()`，`Keyword` 用它的 `Value` 字段。

```ts
if (unit instanceof Identifier) {
  return unit.TempToString() === word;
}
if (unit instanceof Keyword) {
  return unit.Value === word;
}
return false;
```

# method IsDeclarationBoundary:(item:Token | null)=>bool

这个单元是不是「一条已经成形的语句 / 声明」——它不可能属于返回类型，扫描到它就该收工。

扫描到这一步时，列表里可能已经没有裸 `Identifier` 了：**排在声明规则之前的规则已经把一部分结构收走了**。
实测到的坑：`declare function f(): string | undefined` 后面紧跟一条 `class Worker { … }`，
`ClassReorganization` 排在 `FunctionReorganization`（以及本文件的所有调用点）**之前**，
所以扫描跑到那里时看到的是一个 `Class` 单元、不是 `Identifier`——只按词表判定的话它会一路吞下去，
把整个类装进返回类型里。

这里与 `class.xl.md` / `function.xl.md` / `enum.xl.md` / `interface.xl.md` / `switch.xl.md` / `label.xl.md`
是**双向依赖**（它们都 import 本文件），所以只好绕成一个环。环本身是安全的：本文件只在方法体里用这些类，
模块求值阶段一次都不碰它们。

```ts
if (item === null) {
  return false;
}
return (
  item instanceof Class ||
  item instanceof Function ||
  item instanceof Enum ||
  item instanceof Interface ||
  item instanceof MethodDeclaration ||
  item instanceof Switch ||
  item instanceof Label ||
  item instanceof IfSet ||
  item instanceof For ||
  item instanceof Foreach ||
  item instanceof While ||
  item instanceof Try ||
  item instanceof Import ||
  item instanceof Statement ||
  // **`export { … }` / `export type { … }` 也是声明边界**（第 136 轮）。
  // `ExportReorganization` 排在本文件的调用点**之前**，所以轮到别名右端 / 返回类型扫描时，
  // 下一行那条 `export …` 已经是一个 `Export` **单元**、不是裸词——
  // `IsStatementKeyword` 抓不到它，于是 `type B = number` 换行 `export type { B }` 里的
  // 两条导出被一起吞进 `TypeAliasDeclaration` 的右端（实测 `ty-export-type.ts`：
  // `TypeAliasDeclaration` 漂移 1 + 两条 `ExportDeclaration` 与它们的
  // `NamedExports` / `ExportSpecifier` 共 9 个节点全丢）。
  //
  // 这里按**类名**判而不是 `instanceof`：`export.xl.md` 已经 import 本文件，
  // 再来一条反向 import 只会多绕一圈环（上面那几条是同款取舍，见本方法的说明）。
  item.constructor.name === "Export"
);
```

# method IsTypeQueryImport:(units:Array<Token>, index:int)=>bool

`index` 处的 `import` 是不是**类型位的 `import(...)` 查询**，而不是一条导入声明。

两者词形一样，区别只在后面跟什么：导入声明后面是名字 / `{` / `*` / 字符串，
类型查询后面一定紧跟 `(`（`import('./m').A` / `typeof import('./m')`）。

**为什么必须区分**：`Import` 在 `IsStatementKeyword` 的终止词表里（它确实是声明开头），
于是 `declare function f(): import('m').A;` 的返回类型在 `import` 上被截断，
只剩一个光秃秃的 `:` 进了 `ReturnType`；`TypeDefine` 收不到任何内容，
反手去取 `items[-1].SourceRange` 抛裸 `TypeError`（实测）。

```ts
if (!IsWordUnit(Get(units, index), "import")) {
  return false;
}
const next = GetSkipNextWrapSymbol(units, index);
return next instanceof Bracket && next.startBracket === "(";
```

# method IsAbstractTypeModifier:(units:Array<Token>, index:int)=>bool

`index` 处的 `abstract` 是不是**构造签名类型的一部分**（`abstract new (…) => T`），而不是下一条声明的修饰词。

`abstract` 同时在两处合法：下一条声明的开头（`declare function f(): void` 换行 `abstract class A {}`）
与抽象构造签名类型（`type X = abstract new () => A`）。
区分看**前一个实义单元**：类型续接符（`:` / `?:` / `|` / `&` / `(` / `,` / `<` / `=>`）之后
它一定在类型里；普通类型名之后它是新声明的修饰词。

少了这一条时 `declare function f(): abstract new (a: number) => A;` 会与 `import(...)` 一样被截断，
最后同样以裸 `TypeError` 收场。

```ts
if (!IsWordUnit(Get(units, index), "abstract")) {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
if (!(previous instanceof SymbolToken)) {
  return false;
}
return (
  previous.Is(":") ||
  previous.Is("?:") ||
  previous.Is("|") ||
  previous.Is("&") ||
  previous.Is("(") ||
  previous.Is(",") ||
  previous.Is("<") ||
  previous.Is("=>")
);
```

# method IsDeclarationTailStop:(units:Array<Token>, index:int)=>bool

声明的返回类型扫到 `index` 处该不该停。

四条停下的理由（都被 `ScanDeclarationBody` 与 `ScanDeclarationTailEnd` 共用，两边必须一致）：

- `{` 括号，且 `IsTypeLiteralBracket` 说它不是类型字面量——那就是**体**；
- `;` 或赋值符号——声明到此为止（环境声明 / 初始化）；
- `IsStatementKeyword`——下一条语句的关键字，如 `declare function f(): void` 后面的 `let`；
- `IsDeclarationBoundary`——已经成形的语句单元，如后面紧跟的那条 `class`。
类型字面量的 `{` **不算停**：`function f(): { a: number } { … }` 里它是一个类型。

**两个「长得像声明开头、其实是类型」的例外**要单独让路（都在上面）：

- `import(...)` 类型查询（`import('./m').A`）；
- `abstract new (…) => T` 构造签名类型。

```ts
const item = Get(units, index);
if (item instanceof Bracket && item.startBracket === "{") {
  return !IsTypeLiteralBracket(units, index);
}
if (item instanceof SymbolToken && (item.Is(";") || item.Is("="))) {
  return true;
}
if (IsTypeQueryImport(units, index) || IsAbstractTypeModifier(units, index)) {
  return false;
}
return IsStatementKeyword(item) || IsDeclarationBoundary(item);
```

# method ScanDeclarationBody:(units:Array<Token>, parametersIndex:int)=>int

从参数表括号往后扫，返回**函数体 / 方法体**那个 `{` 括号的下标；没有体（环境声明）时返回 `-1`。

`Function` 与 `MethodDeclaration` 共用它。判定只有一条：一直走到 `IsDeclarationTailStop` 说停，
停在一个非类型字面量的 `{` 上就是体，停在别处就说明这条声明没有体。

**返回类型分行写是常见排版**（`lib.es5.d.ts` 里 `receiveMessageOnPort` 的返回类型就是一个跨三行的联合类型），
所以扫描要跨过软换行——拦住它的不是换行，而是上面那四条终止条件。

```ts
let i = parametersIndex + 1;
while (i < units.length) {
  if (IsDeclarationTailStop(units, i)) {
    const item = Get(units, i);
    if (item instanceof Bracket && item.startBracket === "{" && !IsTypeLiteralBracket(units, i)) {
      return i;
    }
    return -1;
  }
  i = i + 1;
}
return -1;
```

# method ScanDeclarationTailEnd:(units:Array<Token>, parametersIndex:int)=>int

从参数表括号往后扫，返回**返回类型段最后一个单元**的下标；没有返回类型时返回 `-1`。

它扫到与 `ScanDeclarationBody` 同一个终止点为止，随手记下最后一个非软换行的单元：
那个下标就是返回类型的末尾（软换行不进返回类型，它只是排版）。

两个函数分开写而不是返回一个「结果对象」：签名里只用 `int` 与 `-1` 这类中立类型，
不必为了一个复合返回值引入只对某个目标语言成立的写法。

```ts
let tailEnd = -1;
let i = parametersIndex + 1;
while (i < units.length) {
  if (IsDeclarationTailStop(units, i)) {
    break;
  }
  const item = Get(units, i);
  if (!(item instanceof LineWrap)) {
    tailEnd = i;
  }
  i = i + 1;
}
return tailEnd;
```
