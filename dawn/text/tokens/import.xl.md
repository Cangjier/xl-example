# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
import { ConstString } from "./string/const-string.xl.md"
import { String } from "./string/string.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

导入语句：把 `import { … } from "…"` 整段收成一个 `Import` 单元。

原 C# 侧是 `public class Import : IndependentToken<char>`。`Import` 与 `String.String` 的 `From` 来源是 `TtsScriptEngine` 加载依赖文件的入口——`textContext.Root.Data.Where(item => item is Import)` 就从这里取。

按 M33，展平的嵌套类 `Import.Reorganization` 写在 `Import` 之前。

# class ImportReorganization extends Reorganization

原 C# 是嵌套类 `Import.Reorganization`（M32 展平改名）。

`Previous` 认的是「一个内容恰好等于 `import` 的 `Common`」——不是一个关键字 token，而是普通字符块。

## static readonly field Instance:ImportReorganization = new ImportReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段。

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是 `import` 这个词。

```ts
const current = Get(units, index);
return current instanceof Common && current.TempToString() === "import";
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

从 `import` 开始往后收集单元，直到遇到 `;` 或软换行，收成一个 `Import`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- 遇到 `;`（`Symbol.Is(";")`）或 `WrapSymbol` 就停，结束下标记成 `i - 1`（**不含**这个终止符）。
- `from` 的取法有两路：先找内容为 `from` 的 `Common`，取它**之后**那段里的第一个 `String`；找不到 `from` 就退回到整段里的第一个 `String`。
- 从 `String` 的子单元里取第一个 `ConstString`，把它的文本当作 `From`。原 C# 用 `First(...)`，序列里没有匹配项就抛异常，ts 侧显式补上同样的抛错（不能用 `find` 的 `undefined` 蒙混过去）。
- 最后 `ReplaceAt(index, endIndex - index + 1, result)` 批量替换，返回的 `index` 成为新下标。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("NullReferenceException: current");
}
const items: Token<string>[] = [];
let endIndex = index;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("NullReferenceException: item");
  }
  if ((item instanceof Symbol && item.Is(";")) || item instanceof WrapSymbol) {
    endIndex = i - 1;
    break;
  }
  items.push(item);
}
const result = new Import(owner, template);
result.Parent = current.Parent;
const fromIndex = items.findIndex((item) => item instanceof Common && item.Is("from"));
if (fromIndex !== -1) {
  const fromUnits = items.slice(fromIndex + 1, items.length);
  const stringUnit = fromUnits.find((item) => item instanceof String);
  if (stringUnit instanceof String) {
    const constString = stringUnit.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("Sequence contains no matching element");
    }
    result.From = constString.TempToString();
  }
} else {
  const firstString = items.find((item) => item instanceof String);
  if (firstString instanceof String) {
    const constString = firstString.Data.find((item) => item instanceof ConstString);
    if (constString === undefined) {
      throw new Error("Sequence contains no matching element");
    }
    result.From = constString.TempToString();
  }
}
result.AddRange(items);
result.SignIn(current.SourceRange.Start!);
result.SignOut(items[items.length - 1].SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, index, endIndex - index + 1, result);
```

# class Import extends IndependentToken

导入语句。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## field From:string | null = null

被导入的路径。

原 C# 是 `public string? From { get; set; } = null;`。`TtsScriptEngine` 用它去加载依赖文件；为空表示这条导入没有可解析的目标。

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；批量 `Add` 按 M14(c) 写成 `AddRange`。

```ts
const result = new Import(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
