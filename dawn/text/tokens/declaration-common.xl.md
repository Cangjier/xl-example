# dependencies
```xl
import { Token } from "../../../core/syntax/token.xl.md"
import { Get } from "../../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Class } from "./class/class.xl.md"
import { Common } from "./common.xl.md"
import { Decorator } from "./decorator.xl.md"
import { Enum } from "./enum/enum.xl.md"
import { For } from "./for/for.xl.md"
import { Foreach } from "./foreach/foreach.xl.md"
import { Function } from "./function/function.xl.md"
import { IfSet } from "./if/if-set.xl.md"
import { Import } from "./import.xl.md"
import { Interface } from "./interface/interface.xl.md"
import { Label } from "./label.xl.md"
import { MethodDeclaration } from "./function/method-declaration.xl.md"
import { Statement } from "./statement.xl.md"
import { Switch } from "./switch/switch.xl.md"
import { Symbol } from "./symbol.xl.md"
import { Try } from "./try/try.xl.md"
import { While } from "./while/while.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

声明层公用工具：`class` / `function` / `enum` / 方法声明这四条重组规则，**起点都在关键字之前的同一段东西上**——
`@Decorator`、`export` / `declare` / `default` / `abstract` / `async` / `public` / `private` / `protected` / `static` /
`readonly` / `override` / `get` / `set` / `const` 这些修饰词。这些工具放在 token 层，
落成模块级 `# method`——与 `../text-common-util.xl.md` 同一种形态。

修饰词只按**词形**判定，不看上下文：`export` 这个词出现在声明头之前就是修饰词。
真正的形状约束（后面必须跟名字、括号、花括号）由各条重组规则自己的 `Previous` 负责，
所以这里放宽一点是安全的——多认一个修饰词只会让 `Process` 的起点前移一格，不会造出不该有的节点。

类型参数段（`<T>` / `<T = unknown>` / `<T extends X = Y>`）由 `generic-type.xl.md` 收成 `GenericType`，
声明规则只要跨过那一个单元就行——两处各管一段，这里不再需要认尖括号。

# method IsDeclarationModifier:(item:Token | null)=>bool

这个单元是不是一个声明修饰词。

判定是「`Common` 且文本命中修饰词表」。表里收的是 TypeScript 里能出现在**声明之前**的那些词：
访问修饰符（`public` / `private` / `protected`）、成员修饰符（`static` / `readonly` / `abstract` / `override` / `declare`）、
函数修饰符（`async`）、访问器前缀（`get` / `set`）、导出修饰符（`export` / `default`）、枚举前缀（`const`）。

`constructor` 不在表里：它是方法名而不是修饰词。`in` / `out` 这类只出现在类型参数位置上的词也不在表里。

```ts
if (!(item instanceof Common)) {
  return false;
}
return item.IsAny([
  "export",
  "declare",
  "default",
  "abstract",
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

「连续的」是跨过软换行判定的：`SkipPreviousWrapSymbol` 会跳过 `WrapSymbol`，
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

调用方用 `join(",")` 把它拼成产物上的 `Modifiers` 属性——空串表示没有修饰词。
`Decorator` 单元另有归宿：各条规则的 `Process` 会把它当作新单元的子单元搬进去（见 `TakeDeclarationDecorators`）。

```ts
const result: string[] = [];
for (let i = start; i < index; i++) {
  const item = Get(units, i);
  if (IsDeclarationModifier(item)) {
    result.push((item as Common).TempToString());
  }
}
return result;
```

# method TakeDeclarationDecorators:(units:Array<Token>, start:int, index:int)=>Array<Decorator>

取 `[start, index)` 之间的 `Decorator` 单元，按源码顺序排列。

它们与修饰词不同：修饰词被折进 `Modifiers` 属性（文本进了产物属性），装饰器则要作为子单元继续活在树里，
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

判据只看前一个实义单元是不是 `:` / `|` / `&` 三个符号之一：`function f(): { a: number } { … }` 里
第一个 `{` 跟在 `:` 后面，是返回类型；`function f(): A | { a: number } { … }` 里跟在 `|` 后面，
也是返回类型的一部分；而 `function f(): number { … }` 里 `number` 之后那个 `{` 前面不是符号，是函数体。

`{` 跟在别的单元后面就是体——`function f() { … }` 里那个 `{` 前面是参数括号，正是这一档。
两个 `{` 相邻的写法（`: { … } { … }`）也分得开：第二个 `{` 前面是第一个括号单元，不是符号。

```ts
const current = Get(units, index);
if (!(current instanceof Bracket) || current.StartBracketChar !== "{") {
  return false;
}
const previous = GetSkipPreviousWrapSymbol(units, index);
if (!(previous instanceof Symbol)) {
  return false;
}
return previous.Is(":") || previous.Is("|") || previous.Is("&");
```

# method IsStatementKeyword:(item:Token | null)=>bool

这个单元是不是「一条新语句的开头」用的关键字 `Common`。

用来给声明尾部的扫描划一条终点线：`declare function f(): void` 后面紧跟的 `let y = 1`
属于下一条语句，不能被当成返回类型的一部分收进去。

表里**只收不可能出现在类型位置上的词**。这一点是刻意的：`typeof` / `keyof` / `infer` / `readonly` /
`unique` / `new` / `true` / `false` / `null` 都是类型里的常客（`function f(): readonly string[]`、
`new () => T`、`typeof x`），把它们算作终点线会把合法返回类型截断。

`type` / `namespace` / `module` 三个词也是**声明**开头而不是类型内容（`type X = …`），必须收——
漏掉 `type` 的后果实测过：`declare function f(): string | undefined` 后面紧跟的
`type Handler = …` 会被整段吞进返回类型里。

```ts
if (!(item instanceof Common)) {
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

# method IsDeclarationBoundary:(item:Token | null)=>bool

这个单元是不是「一条已经成形的语句 / 声明」——它不可能属于返回类型，扫描到它就该收工。

扫描到这一步时，列表里可能已经没有裸 `Common` 了：**排在声明规则之前的规则已经把一部分结构收走了**。
实测到的坑：`declare function f(): string | undefined` 后面紧跟一条 `class Worker { … }`，
`ClassReorganization` 排在 `FunctionReorganization`（以及本文件的所有调用点）**之前**，
所以扫描跑到那里时看到的是一个 `Class` 单元、不是 `Common`——只按词表判定的话它会一路吞下去，
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
  item instanceof Statement
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

```ts
const item = Get(units, index);
if (item instanceof Bracket && item.StartBracketChar === "{") {
  return !IsTypeLiteralBracket(units, index);
}
if (item instanceof Symbol && (item.Is(";") || item.Is("="))) {
  return true;
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
    if (item instanceof Bracket && item.StartBracketChar === "{" && !IsTypeLiteralBracket(units, i)) {
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
  if (!(item instanceof WrapSymbol)) {
    tailEnd = i;
  }
  i = i + 1;
}
return tailEnd;
```

# method DeclarationEnd:(units:Array<Token>, index:int)=>int

从 `index` 起把后面**连续的软换行**一起算进来，返回这一段声明的末尾下标。

这是 `For` / `IfSet` / `While` 共用的收尾口径：那几条规则用它把「语句后面那个换行」并进自己的范围
（`endIndex = currentIndex - 1`，而 `currentIndex` 是跳过软换行之后的位置）。
不这么做的话，声明末尾那个裸换行会留在父单元里，被 `StatementReorganization2` 收成一个**空的** `Statement`——
`Root` 下就会多出 `<Statement></Statement>` 这种噪声节点。

声明层这几条规则一律走这里，不去动 `Import` 那条既有路径——
它没有这一步，`import …` 结尾的文件会多一个空 `Statement`。

```ts
let end = index;
while (true) {
  const next = Get(units, end + 1);
  if (next instanceof WrapSymbol) {
    end = end + 1;
    continue;
  }
  break;
}
return end;
```
