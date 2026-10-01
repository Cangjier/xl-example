# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../core/syntax/reorganization.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, GetSkipNext, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNext } from "../list-extensions.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { ArrayLiteral } from "./json/array-literal.xl.md"
import { ObjectLiteral } from "./json/object-literal.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`let` / `const` / `var` 声明：把 `let a = 1`、`let [a, b] = arr`、`let {a, b} = obj` 这类整段收成一个 `Let`，并记下被声明的字段名（前面若有 `export`，一并收进来）。

三种形态由同文件的枚举 `LetType` 区分；它只是数据标签，不参与 XML 的标签名。

`LetReorganization` 写在 `Let` **之前**，与同目录其它 token 一致。

# enum LetType

`Let` 声明出来的是哪一种东西。它与 `Let` 写在同一个文件里。

- case Field
单个具名变量：`let a = 1`。
- case Array
数组解构：`let [a, b] = arr`。
- case Object
对象解构：`let {a, b} = obj`。

# class LetReorganization extends Reorganization

`Previous` 认的是「一个内容是 `let` / `const` / `var` 的 `Identifier`，且它后面（跨过软换行）跟着一个 `Identifier`，或者跟着一对 `[]` / `{}` 括号」。

`Process` 把从 `let`（含它前面的 `export`）到目标单元的这一整段收成一个 `Let`，按目标单元的形态填 `fieldName`，或者填数组 / 对象两组解构名。

## static readonly field Instance:LetReorganization = new LetReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一条 `let` 声明的开头。

判定是：`index` 处是内容为 `let` / `const` / `var` / **`using`** 的 `Identifier`，并且跳过软换行后的下一个单元要么是 `Identifier`，要么是 `Is("[", "]")` / `Is("{", "}")` 的 `Bracket`。这里把两个小括号判定合成一句 `||`，其余拆成早返回，语义相同。

**`using` 是显式资源管理声明**（`using res = open()`）：形态与 `const` 完全一样，
TypeScript 的 AST 里它同样是 `VariableDeclaration`（`VariableDeclarationList` 上带 `Using` 标志），
所以它该有自己的 `Let` 节点。少了这一条，`using res = open()` 整条退化成
`<Identifier>using</Identifier><Identifier>res</Identifier><SymbolToken>=</SymbolToken><Method>…`——名字与声明结构一起丢。
`await using res = open()` 里的 `await` 由 `Process` 往前收进 `modifiers`。

**父单元是 `GenericType` 时一律不成立**：类型参数列表里的 `const` 是**类型参数修饰符**
（`type X<const T> = T`），不是变量声明。少了这一条，`const T` 会被收成一个 `Let`
（`const` 被吸收、`T` 成了字段名），关键词升级也就轮不到它。

**前一个实义单元是 `as` / `satisfies` 时也不成立**：`x as const` 里的 `const` 是一个**字面量类型**
（`as const` 是惯用法），不是声明头。少了这一条，`const a = [1, 2] as const` 会在这里被切错——
`SkipNext` 找到的下一个单元是**下一行** `const o` 的 `const`，
于是 `[const(as const), 换行, const(o)]` 三个单元一起被替换成一个 `Let fieldName="const"`：
换行没了、`const o` 的头也没了，两条语句合成一条（实测 `tests/parse/cases/declarations/vars-as-const.ts`）。

```ts
const unit = Get(units, index);
if (!(unit instanceof Identifier)) {
  return false;
}
if (unit.Parent instanceof GenericType) {
  return false;
}
// **参数表收成 `TypeParameter` 之后父单元换了人**（第 66 轮）：`type X<const T> = T` 里的
// `const` 仍是**类型参数修饰符**（TS 那边是 `TypeParameter` 的修饰位），不是变量声明。
// 只挡 `GenericType` 时它照样被收成 `Let`（实测 3 处：`decl-func-generic-const-modifier` /
// `fn-const-typeparam` / `type-param-const` 三个用例当场报出来）。
if (unit.Parent !== null && unit.Parent.constructor.name === "TypeParameter") {
  return false;
}
if (!(unit.Is("let") || unit.Is("const") || unit.Is("var") || unit.Is("using"))) {
  return false;
}
const previous = Get(units, SkipPreviousWrapSymbol(units, index));
if (previous instanceof Identifier && (previous.Is("as") || previous.Is("satisfies"))) {
  return false;
}
const next = GetSkipNext(units, index, (item) => item instanceof LineWrap);
if (next instanceof Identifier) {
  return true;
}
return next instanceof Bracket && (next.Is("[", "]") || next.Is("{", "}"));
```

## private method CollectFieldNames:(unit:Token)=>Array<string>

把一个解构括号里的**所有**名字收集出来——**递归**进嵌套括号。

`let` 记的是「解构出来的字段名」，而解构是可以嵌套的：
`const [[a, b], [, c = 0]] = m` 的 `a` / `b` / `c` 都在**内层**括号里。
只看直系子单元的话，整个模式匹配不出一个 `Identifier`，
`arrayPattern` 是空串——**嵌套解构的绑定名整体丢失**（实测）。
递归之后内层的名字照旧进同一张表，与顶层同名同形。

只收集 `Identifier`：符号、嵌套括号本身不进表（括号靠递归展开）。

**三种容器都要认**：`Bracket`、`ArrayLiteral`、`ObjectLiteral`。
内层数组在值位被 `JsonArrayReorganization` 收成了 `ArrayLiteral`（它不是 `Bracket` 的子类），
内层对象同理是 `ObjectLiteral`——只认 `Bracket` 的话 `const [[a, b], [, c = 0]] = m`
递归一层就断了，名字还是空串（实测）。

```ts
const result: string[] = [];
for (const item of unit.Data) {
  if (item instanceof Identifier) {
    result.push(item.TempToString());
  } else if (item instanceof Bracket || item instanceof ArrayLiteral || item instanceof ObjectLiteral) {
    result.push(...this.CollectFieldNames(item));
  }
}
return result;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段声明收成一个 `Let`，**返回新的下标**。

要点：

- `startIndex` 先取 `index`，再**往前把修饰词一路收进来**：
  跨过软换行的上一个单元是内容为 `export` / `declare` / `default` 的 `Identifier` 就前移，
  收完为止（`export declare const x` 的两个词都要收到）。
  **`const` / `let` / `var` 自己也算修饰词**（放进 `modifiers` 的第一位之后）——
  不记的话 `export const a = 1` 与 `const a = 1` 的产物完全一样，修饰信息整体丢失。
- `endIndex` 由 `SkipNext(units, index)` 得到——这是 `../list-extensions.xl.md` 里跳过「软换行与注释」的那个版本。
- 终点单元的形态决定 `LetType`：`Identifier` → `Field`（记 `fieldName`）；`[]` → `Array`（记 `arrayPattern`）；`{}` → `Object`（记 `objectPattern`）；三者都不是就抛错。
- 两组解构名都是「括号子单元里所有 `Identifier` 的文本」，**递归**进嵌套括号（见 `CollectFieldNames`）。
- 最后批量替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），返回的 `startIndex` 就是新下标；被替换掉的两个单元不再显式释放，交给 GC。
- **`Parent` 要自己抄**（第 66 轮补）：`ReplaceCountAt` 只做 `splice`、不设 `Parent`（`Token.Add` 才设），
  不抄的话这个 `Let` 的 `Parent` 永远是 `null`。它与 `keyword.xl.md` 里那处是同一类漏抄：
  平时没人读、看不出来，等新规则开始问「我的父亲是哪一类容器」时才会咬人
  （`Keyword` 那处就是这么把 `keyof typeof h` 的外层 `keyof` 挡掉的）。抄的是被替换单元的 `Parent`，
  所以「还没挂上去」这个信号原样保留。

新单元的局部变量叫 `letUnit`：`let` 在 ts 里是关键字，不能当变量名。

```ts
let startIndex = index;
const current = Get(units, index);
if (!(current instanceof Identifier)) {
  throw new Error("current 为空");
}
const modifiers: string[] = [];
let cursor = index;
while (true) {
  const previousIndex = SkipPreviousWrapSymbol(units, cursor);
  const previousUnit = Get(units, previousIndex);
  if (
    previousUnit instanceof Identifier &&
    (previousUnit.Is("export") || previousUnit.Is("declare") || previousUnit.Is("default"))
  ) {
    modifiers.unshift(previousUnit.TempToString());
    startIndex = previousIndex;
    cursor = previousIndex;
    continue;
  }
  // `await using res = open()`：`await` 是显式资源管理声明的一部分，
  // 收进 modifiers 才不会留成一个悬空的关键词。
  if (previousUnit instanceof Identifier && previousUnit.Is("await") && current.Is("using")) {
    modifiers.unshift(previousUnit.TempToString());
    startIndex = previousIndex;
    cursor = previousIndex;
    continue;
  }
  break;
}
modifiers.push(current.TempToString());
const endIndex = SkipNext(units, index);
const next = Get(units, endIndex);
if (next === null) {
  throw new Error("next 为空");
}
const letUnit = new Let(template);
letUnit.Parent = Get(units, startIndex)!.Parent;
letUnit.SignIn(Get(units, startIndex)!.SourceRange.Start!);
letUnit.SignOut(next.SourceRange.End!);
letUnit.modifiers = modifiers.join(",");
if (next instanceof Identifier) {
  letUnit.fieldName = next.TempToString();
  letUnit.LetType = LetType.Field;
} else if (next instanceof Bracket) {
  if (next.Is("[", "]")) {
    letUnit.arrayPattern = this.CollectFieldNames(next);
    letUnit.LetType = LetType.Array;
  } else if (next.Is("{", "}")) {
    letUnit.objectPattern = this.CollectFieldNames(next);
    letUnit.LetType = LetType.Object;
  }
  // **模式搬进节点**（第 66 轮第八批）：属性的两组名字只是给**人**读的补全，
  // 原来模式括号整段留在替换区间里、随 `ReplaceCountAt` 消失——产物里
  // `const { a, b: c, d = 1 } = obj` 只剩一个自闭合的 `<Let objectPattern="a,b,c,d,1" />`，
  // 花括号、冒号、`=`、以及「这是三个绑定元素」这件事全都没了（TS 那边是
  // `ObjectBindingPattern` 里三个 `BindingElement`）。
  // 现在把括号搬进来，`binding-element.xl.md` 在它自己的队列里把元素收成节点 ✓。
  letUnit.AddAndCloseLast(next);
} else {
  throw new Error("形态不成立");
}
letUnit.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, letUnit);
```

# class Let extends IndependentToken
一条 `let` / `const` / `var` 声明。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`，而且**三种形态的 XML 完全不同**——标签名后的属性名随 `LetType` 走，都是自闭合标签。

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**。

**为什么 `Let` 也需要队列**（第 66 轮第八批）：解构模式现在作为子单元留在 `Let` 里
（见 `Process`），模式里的元素要在**它自己的那一趟**里被 `binding-element.xl.md` 收成
`<BindingElement>` —— 原来 `Let` 没有队列，`TryToClose` 跑的是空队列，
模式元素永远收不出来（实测：`const { a, b: c } = x` 的产物里模式是一串散单元）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field LetType:LetType = LetType.Field

本声明属于哪一种形态，默认 `Field`。

## field fieldName:string = ""

`Field` 形态下被声明的字段名。

## field arrayPattern:Array<string> = []

`Array` 形态下解构出来的字段名。

## field objectPattern:Array<string> = []

`Object` 形态下解构出来的字段名。

## field modifiers:string = ""

修饰词串，逗号分隔、按源码顺序（`export` / `declare` / `default` 之外还包括 `const` / `let` / `var` 自己）。

同样是因为本单元是**重组规则建出来的**：它把整段声明折成一个节点之后，
外层那一趟不会再回来收这些词，不在这里记下就彻底丢了。

## method ToXmlString:()=>string

产出 XML：自闭合标签，属性名由 `LetType` 决定，另带 `modifiers`。

三种形态各拼一个自闭合标签：属性名分别是 `fieldName` / `arrayPattern` / `objectPattern`，标签名都是运行时类型名；三种形态都带上 `modifiers`（`export declare const` 这样的修饰词串）。

`modifiers` 是**信息补全**：不记的话 `export const a = 1` 与 `const a = 1` 的产物一模一样（见 `known-gaps.json` 的 `_notes.variable-modifiers`）。

三个 `if` 加末尾抛错，属性值用 `Array.join(",")` 拼出来。

```ts
const name = this.constructor.name;
if (this.LetType === LetType.Field) {
  return `<${name} fieldName="${this.fieldName}" modifiers="${this.modifiers}" />`;
}
// **解构模式带子单元**（第 66 轮第八批）：模式括号与里面的单元现在留在树上
// （`binding-element.xl.md` 会把每个元素收成 `<BindingElement>`），所以这两种形态
// 不再是自闭合标签——属性照旧，后面接子单元的 XML。属性里那两组名字是**信息补全**
// （给人读的递归收集结果），节点里的结构才是权威。
const children = this.Data.map((item) => item.ToXmlString()).join("");
if (this.LetType === LetType.Array) {
  return `<${name} arrayPattern="${this.arrayPattern.join(",")}" modifiers="${this.modifiers}">${children}</${name}>`;
}
if (this.LetType === LetType.Object) {
  return `<${name} objectPattern="${this.objectPattern.join(",")}" modifiers="${this.modifiers}">${children}</${name}>`;
}
throw new Error("形态不成立");
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + 由 `LetType` 决定的那个属性键 + `modifiers`，解构形态另带子单元。

**分支与 XML 那处是同一套判据**：同一个 `if` 链、同样的三个属性名、`Array<string>` 同样用
`","` 拼；末尾的 `throw new Error("形态不成立")` 也照抄一份。两份拼串各自独立，
所以「哪些形态成立」这件事必须在两处都说同一句话——漏掉一条分支不会报错，
只会让 JSON 那边少一个键（`cases:astjson` 就是钉这一条的尺子）。

`children` 按基类同一条规则：`Data` 非空才写。`Field` 形态**没有**子单元，
所以它出来的 JSON 只有 `type` / `fieldName` / `modifiers` 三个键——与自闭合标签同一件事。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
if (this.LetType === LetType.Field) {
  result.set("fieldName", this.fieldName);
  result.set("modifiers", this.modifiers);
  return result;
}
if (this.LetType === LetType.Array) {
  result.set("arrayPattern", this.arrayPattern.join(","));
  result.set("modifiers", this.modifiers);
} else if (this.LetType === LetType.Object) {
  result.set("objectPattern", this.objectPattern.join(","));
  result.set("modifiers", this.modifiers);
} else {
  throw new Error("形态不成立");
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

顺序是 `Sign(this)` → 抄 `fieldName` 与 `modifiers` → `TryToClose()`。注意它**只抄 `fieldName` 与 `modifiers`**：`LetType` 与两组解构名都不抄（`LetType` 回到默认的 `Field`）——这是既定行为，保持一致。

```ts
const result = new Let(this.Template);
result.Sign(this);
result.fieldName = this.fieldName;
result.modifiers = this.modifiers;
result.TryToClose();
return result;
```
