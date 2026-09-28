# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, GetSkipNext, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { SkipNext } from "../list-extensions.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

`let` / `const` / `var` 声明：把 `let a = 1`、`let [a, b] = arr`、`let {a, b} = obj` 这类整段收成一个 `Let`，并记下被声明的字段名（前面若有 `export`，一并收进来）。

三种形态由同文件的枚举 `LetType` 区分；它只是数据标签，不参与 XML 的标签名。

按 M33，展平的嵌套类 `LetReorganization` 写在 `Let` **之前**，与同目录其它 token 一致。

# enum LetType

`Let` 声明出来的是哪一种东西。原 C# 是 `public enum LetType`，与 `Let` 写在同一个文件里。

- case Field
单个具名变量：`let a = 1`。
- case Array
数组解构：`let [a, b] = arr`。
- case Object
对象解构：`let {a, b} = obj`。

# class LetReorganization extends Reorganization

原 C# 是嵌套类 `Let.Reorganization`（M32 展平改名）。

`Previous` 认的是「一个内容是 `let` / `const` / `var` 的 `Common`，且它后面（跨过软换行）跟着一个 `Common`，或者跟着一对 `[]` / `{}` 括号」。

`Process` 把从 `let`（含它前面的 `export`）到目标单元的这一整段收成一个 `Let`，按目标单元的形态填 `FieldName`，或者填数组 / 对象两组解构名。

## static readonly field Instance:LetReorganization = new LetReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`——这里的 `Reorganization` 指的是嵌套的那个类本身，按 M19 落成静态只读字段。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是一条 `let` 声明的开头。

原 C# 是一句合取：`units.Get(index)` 是内容为 `let` / `const` / `var` 的 `Common`，并且 `units.GetSkipNext(index, item => item is WrapSymbol)` 要么是 `Common`，要么是 `Is("[", "]")` / `Is("{", "}")` 的 `Bracket`。这里把两个小括号判定合成一句 `||`，其余拆成早返回，语义相同。

```ts
const unit = Get(units, index);
if (!(unit instanceof Common)) {
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

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

把整段声明收成一个 `Let`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- `startIndex` 先取 `index`，若**跨过软换行**的上一个单元是内容为 `export` 的 `Common`，就前移到它。
- `endIndex` 由 `units.SkipNext(index)` 得到——这是 `Dawn/Text/ListExtensions.cs` 里那个跳过「软换行与注释」的一参版 `SkipNext`，ts 侧从 `../list-extensions.xl.md` 取。
- 终点单元的形态决定 `LetType`：`Common` → `Field`（记 `FieldName`）；`[]` → `Array`（记 `UnpackArrayFieldNames`）；`{}` → `Object`（记 `UnpackObjectFieldNames`）；三者都不是就抛错。
- 两组解构名都是「括号子单元里所有 `Common` 的文本」。
- 最后 `units.ReplaceAt(startIndex, count, let)` 是 4 参重载，按 M14(c) 落在 `ReplaceCountAt` 上，返回的 `startIndex` 就是新下标；被替换掉的两个单元各自 `Release()`。

原 C# 把新单元命名为局部变量 `let`，ts 里 `let` 是关键字，改叫 `letUnit`（语义不变）。

```ts
let startIndex = index;
const previous = SkipPreviousWrapSymbol(units, index);
const exportCommon = Get(units, previous);
if (exportCommon instanceof Common && exportCommon.Is("export")) {
  startIndex = previous;
}
const current = Get(units, index);
if (!(current instanceof Common)) {
  throw new Error("NullReferenceException: current");
}
const endIndex = SkipNext(units, index);
const next = Get(units, endIndex);
if (next === null) {
  throw new Error("NullReferenceException: next");
}
const letUnit = new Let(owner, template);
letUnit.SignIn(current.SourceRange.Start!);
letUnit.SignOut(next.SourceRange.End!);
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
  throw new Error("InvalidOperationException");
}
letUnit.TryToClose();
current.Release();
next.Release();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, letUnit);
```

# class Let extends IndependentToken
一条 `let` / `const` / `var` 声明。

原 C# 侧是 `public class Let : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它覆写了 `ToXmlString`，而且**三种形态的 XML 完全不同**——标签名后的属性名随 `LetType` 走，都是自闭合标签。这是验收核心，与 C# 逐字对照。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## field LetType:LetType = LetType.Field

本声明属于哪一种形态，默认 `Field`。

原 C# 是 `public LetType LetType { get; set; } = LetType.Field;`。

## field FieldName:string = ""

`Field` 形态下被声明的字段名。

原 C# 是 `public string FieldName { get; set; } = string.Empty;`。

## field UnpackArrayFieldNames:Array<string> = []

`Array` 形态下解构出来的字段名。原 C# 是 `public string[] UnpackArrayFieldNames { get; set; } = [];`。

## field UnpackObjectFieldNames:Array<string> = []

`Object` 形态下解构出来的字段名。原 C# 是 `public string[] UnpackObjectFieldNames { get; set; } = [];`。

## method ToDictionary:()=>Map<string, any>

转成字典：只记类型名与 `FieldName`——**没有** `children`，另外两组解构名也不进字典。

原 C# 覆写了基类版本，返回 `{ ["type"] = GetType().Name, ["fieldName"] = FieldName }`；`GetType().Name` 按 M17 写成 `this.constructor.name`。

```ts
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("fieldName", this.FieldName);
return result;
```

## method ToXmlString:()=>string

产出 XML：自闭合标签，属性名由 `LetType` 决定。

原 C# 是 `LetType switch { Field => $"<{GetType().Name} fieldName=\"{FieldName}\" />", Array => $"<{GetType().Name} unpackArrayFieldNames=\"{string.Join(",", UnpackArrayFieldNames)}\" />", Object => $"<{GetType().Name} unpackObjectFieldNames=\"{string.Join(",", UnpackObjectFieldNames)}\" />", _ => throw new InvalidOperationException() }`。

ts 侧落成三个 `if` 加末尾抛错，字符串拼接与 `string.Join(",")`（→ `Array.join(",")`）逐字对应。

```ts
const name = this.constructor.name;
if (this.LetType === LetType.Field) {
  return `<${name} fieldName="${this.FieldName}" />`;
}
if (this.LetType === LetType.Array) {
  return `<${name} unpackArrayFieldNames="${this.UnpackArrayFieldNames.join(",")}" />`;
}
if (this.LetType === LetType.Object) {
  return `<${name} unpackObjectFieldNames="${this.UnpackObjectFieldNames.join(",")}" />`;
}
throw new Error("InvalidOperationException");
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → 抄 `FieldName` → `TryToClose()`。注意它**只抄 `FieldName`**：`LetType` 与两组解构名都不抄（`LetType` 回到默认的 `Field`）——这是原实现的行为，照抄不补齐。

```ts
const result = new Let(this.Owner, this.Template);
result.Sign(this);
result.FieldName = this.FieldName;
result.TryToClose();
return result;
```
