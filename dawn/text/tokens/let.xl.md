# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipNext, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNext } from "../list-extensions.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

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

`Previous` 认的是「一个内容是 `let` / `const` / `var` 的 `Common`，且它后面（跨过软换行）跟着一个 `Common`，或者跟着一对 `[]` / `{}` 括号」。

`Process` 把从 `let`（含它前面的 `export`）到目标单元的这一整段收成一个 `Let`，按目标单元的形态填 `FieldName`，或者填数组 / 对象两组解构名。

## static readonly field Instance:LetReorganization = new LetReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一条 `let` 声明的开头。

判定是：`index` 处是内容为 `let` / `const` / `var` 的 `Common`，并且跳过软换行后的下一个单元要么是 `Common`，要么是 `Is("[", "]")` / `Is("{", "}")` 的 `Bracket`。这里把两个小括号判定合成一句 `||`，其余拆成早返回，语义相同。

**父单元是 `GenericType` 时一律不成立**：类型参数列表里的 `const` 是**类型参数修饰符**
（`type X<const T> = T`），不是变量声明。少了这一条，`const T` 会被收成一个 `Let`
（`const` 被吸收、`T` 成了字段名），关键词升级也就轮不到它。

```ts
const unit = Get(units, index);
if (!(unit instanceof Common)) {
  return false;
}
if (unit.Parent instanceof GenericType) {
  return false;
}
if (!(unit.Is("let") || unit.Is("const") || unit.Is("var"))) {
  return false;
}
const next = GetSkipNext(units, index, (item) => item instanceof WrapSymbol);
if (next instanceof Common) {
  return true;
}
return next instanceof Bracket && (next.Is("[", "]") || next.Is("{", "}"));
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段声明收成一个 `Let`，**返回新的下标**。

要点：

- `startIndex` 先取 `index`，再**往前把修饰词一路收进来**：
  跨过软换行的上一个单元是内容为 `export` / `declare` / `default` 的 `Common` 就前移，
  收完为止（`export declare const x` 的两个词都要收到）。
  **`const` / `let` / `var` 自己也算修饰词**（放进 `Modifiers` 的第一位之后）——
  不记的话 `export const a = 1` 与 `const a = 1` 的产物完全一样，修饰信息整体丢失。
- `endIndex` 由 `SkipNext(units, index)` 得到——这是 `../list-extensions.xl.md` 里跳过「软换行与注释」的那个版本。
- 终点单元的形态决定 `LetType`：`Common` → `Field`（记 `FieldName`）；`[]` → `Array`（记 `UnpackArrayFieldNames`）；`{}` → `Object`（记 `UnpackObjectFieldNames`）；三者都不是就抛错。
- 两组解构名都是「括号子单元里所有 `Common` 的文本」。
- 最后批量替换用四参数的 `ReplaceCountAt`（三个参数的版本才叫 `ReplaceAt`），返回的 `startIndex` 就是新下标；被替换掉的两个单元不再显式释放，交给 GC。

新单元的局部变量叫 `letUnit`：`let` 在 ts 里是关键字，不能当变量名。

```ts
let startIndex = index;
const current = Get(units, index);
if (!(current instanceof Common)) {
  throw new Error("current 为空");
}
const modifiers: string[] = [];
let cursor = index;
while (true) {
  const previousIndex = SkipPreviousWrapSymbol(units, cursor);
  const previousUnit = Get(units, previousIndex);
  if (
    previousUnit instanceof Common &&
    (previousUnit.Is("export") || previousUnit.Is("declare") || previousUnit.Is("default"))
  ) {
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
letUnit.SignIn(current.SourceRange.Start!);
letUnit.SignOut(next.SourceRange.End!);
letUnit.Modifiers = modifiers.join(",");
if (next instanceof Common) {
  letUnit.FieldName = next.TempToString();
  letUnit.LetType = LetType.Field;
} else if (next instanceof Bracket) {
  if (next.Is("[", "]")) {
    letUnit.UnpackArrayFieldNames = next.Data.filter((item) => item instanceof Common).map((item) => (item as Common).TempToString());
    letUnit.LetType = LetType.Array;
  } else if (next.Is("{", "}")) {
    letUnit.UnpackObjectFieldNames = next.Data.filter((item) => item instanceof Common).map((item) => (item as Common).TempToString());
    letUnit.LetType = LetType.Object;
  }
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

转调基类构造器。

```ts
super(template);
```

## field LetType:LetType = LetType.Field

本声明属于哪一种形态，默认 `Field`。

## field FieldName:string = ""

`Field` 形态下被声明的字段名。

## field UnpackArrayFieldNames:Array<string> = []

`Array` 形态下解构出来的字段名。

## field UnpackObjectFieldNames:Array<string> = []

`Object` 形态下解构出来的字段名。

## field Modifiers:string = ""

修饰词串，逗号分隔、按源码顺序（`export` / `declare` / `default` 之外还包括 `const` / `let` / `var` 自己）。

同样是因为本单元是**重组规则建出来的**：它把整段声明折成一个节点之后，
外层那一趟不会再回来收这些词，不在这里记下就彻底丢了。

## method ToXmlString:()=>string

产出 XML：自闭合标签，属性名由 `LetType` 决定，另带 `Modifiers`。

三种形态各拼一个自闭合标签：属性名分别是 `fieldName` / `unpackArrayFieldNames` / `unpackObjectFieldNames`，标签名都是运行时类型名；三种形态都带上 `Modifiers`（`export declare const` 这样的修饰词串）。

`Modifiers` 是**信息补全**：不记的话 `export const a = 1` 与 `const a = 1` 的产物一模一样（见 `known-gaps.json` 的 `_notes.variable-modifiers`）。

三个 `if` 加末尾抛错，属性值用 `Array.join(",")` 拼出来。

```ts
const name = this.constructor.name;
if (this.LetType === LetType.Field) {
  return `<${name} fieldName="${this.FieldName}" Modifiers="${this.Modifiers}" />`;
}
if (this.LetType === LetType.Array) {
  return `<${name} unpackArrayFieldNames="${this.UnpackArrayFieldNames.join(",")}" Modifiers="${this.Modifiers}" />`;
}
if (this.LetType === LetType.Object) {
  return `<${name} unpackObjectFieldNames="${this.UnpackObjectFieldNames.join(",")}" Modifiers="${this.Modifiers}" />`;
}
throw new Error("形态不成立");
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄 `FieldName` 与 `Modifiers` → `TryToClose()`。注意它**只抄 `FieldName` 与 `Modifiers`**：`LetType` 与两组解构名都不抄（`LetType` 回到默认的 `Field`）——这是既定行为，保持一致。

```ts
const result = new Let(this.Template);
result.Sign(this);
result.FieldName = this.FieldName;
result.Modifiers = this.Modifiers;
result.TryToClose();
return result;
```
