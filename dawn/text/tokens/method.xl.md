# dependencies
```xl
import { IOwner } from "../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
import { GetSkipPreviousWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法调用单元：由重组把「方法名 + `(...)` 括号单元」合成一个 `Method`，括号里的内容原样搬进来当自己的子单元。它的 XML 是 `<Method MethodName="名字">…</Method>`。

方法名 + 括号能合并，靠的是 `MethodReorganization`：它只在「前一个单元是个能当方法名的 `Common`」且「当前单元是 `(` 开头的 `Bracket`」时成立。

按 M33，展平出来的嵌套类 `Method.Reorganization` 写在 `Method` 之前。

# class MethodReorganization extends Reorganization

原 C# 是嵌套类 `Method.Reorganization`（M32 展平改名，`Root` 里引用的是 `Method.Reorganization.Instance`）。

它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害（M32）。

## static readonly field Instance:MethodReorganization = new MethodReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是「方法名 + `(`」这个形状。

原 C# 是一整句模式匹配：`units.GetSkipPreviousWrapSymbol(index) is Common common && template.MethodNameTemplate.IsMethodName(common.TempToString()) && units.Get(index) is Bracket bracket && bracket.StartBracketChar == '('`。这里的 `Get` 与 `GetSkipPreviousWrapSymbol` 都是扩展方法，ts 侧写成模块级函数（M11）。

注意判定顺序：**先看前一个单元是不是合法方法名，再看当前单元是不是括号**——`template.MethodNameTemplate` 会挡掉 `if` / `for` 这类关键字，避免把控制流误判成方法。

```ts
const previous = GetSkipPreviousWrapSymbol(units, index);
const current = Get(units, index);
return previous instanceof Common && template.MethodNameTemplate.IsMethodName(previous.TempToString()) && current instanceof Bracket && current.StartBracketChar === "(";
```

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

把「`index` 处的括号单元」和「它前一个方法名单元」合并成一个 `Method`，**返回新的下标**。

原 C# 是 `void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`：它把 `nameIndex` 起的 `index - nameIndex + 1` 个单元替换成一个 `Method`，`ReplaceAt` 的返回值（其实就是 `nameIndex`）写回 `ref index`。按 M15，`ref` 参数改成返回值；`ReplaceAt(self, index, count, newValue)` 这个带 `count` 的重载按 M14(c) 在 ts 侧叫 `ReplaceCountAt`。

原 C# 的范围抄法是 `nameUnit.SourceRange.Start!.Value` 与 `bracketUnit.SourceRange.End!.Value`——这里的 `.Value` 是**可空结构体的 `.Value`**（`SourceRange.Start` 是 `Source<char>?`），取出来的是 `Source` 本身，所以 ts 侧直接写 `Start!` / `End!`。

最后两行的 `nameUnit.Release()` / `bracketUnit.Release()` 是真有副作用的释放（清空被替换掉的两个单元的子单元表），照抄。

```ts
const bracketUnit = Get(units, index)! as Bracket;
const nameIndex = SkipPreviousWrapSymbol(units, index);
const nameUnit = Get(units, nameIndex)! as Common;
const method = new Method(nameUnit.Owner, nameUnit.Template);
method.SignIn(nameUnit.SourceRange.Start!);
method.SignOut(bracketUnit.SourceRange.End!);
method.MethodName = nameUnit.TempToString();
for (const item of bracketUnit.Data) {
  method.AddAndCloseLast(item);
}
method.TryToClose();
index = ReplaceCountAt(units, nameIndex, index - nameIndex + 1, method);
nameUnit.Release();
bracketUnit.Release();
return index;
```

# class Method extends IndependentToken

方法调用。

原 C# 侧是 `public class Method : IndependentToken<char>`，构造器里把 `ReorganizationTemplate` 的规则取出来当自己的 `ReorganizationQueue`。按 M31，`char` 在规范里写 `string`。

它由重组造出来、自己不消费字符，因此 `Process` 沿用 `IndependentToken` 的空实现。

## field MethodName:string = ""

方法名。原 C# 是 `public string MethodName { get; set; } = string.Empty;`。

## constructor:(owner:IOwner, template:Template)=>void

以负责人与模板创建，并把本类型的重组队列取出来。

原 C# 是 `public Method(IOwner owner, Template<char> template) : base(owner, template)`，体里只有 `ReorganizationQueue = template.ReorganizationTemplate.Get(GetType());`——`GetType()` 按 M17 写成 `this.constructor`。

```ts
super(owner, template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method ComputeArgumentsCount:()=>int

算参数个数：数子单元里的 `,` 符号，再加一。

原 C# 是 `public int ComputeArgumentsCount()`，空参数表（`Data` 为空）直接给 `0`；否则符号个数加一。注意它数的是**任何位置**的 `,`，包括嵌套括号里的——照抄。

```ts
if (this.Data.length === 0) {
  return 0;
}
let count = 0;
for (const item of this.Data) {
  if (item instanceof Symbol && item.Is(",")) {
    count++;
  }
}
return count + 1;
```

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，**开标签上带 `MethodName` 属性**，内容是子单元的 XML 串接。

原 C# 是 `$"<{name} MethodName=\"{MethodName}\">{temp.Join("")}</{name}>"`——用 `GetType().Name` 取标签名（按 M17 换成 `this.constructor.name`），`temp.Join("")` 是 `ListExtension` 的扩展方法，ts 数组原生 `join`（M11）。

这一处直接决定最终 XML，与 C# 逐字对照。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} MethodName="${this.MethodName}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

转成字典：`type` 是运行时类型名，加 `methodName`，再放 `children`。

原 C# 是 `public override Dictionary<string, object> ToDictionary()`，三处与基类不同：`methodName` 是新键；`children` **总是**存在（哪怕是空数组，基类是 `Data.Count != 0` 才放）；`children` 里的每一项是 `item.ToDictionary()` 而不是 `ToList()` 的项，所以**不带** `range` 键。

```ts
const children: any[] = [];
for (const item of this.Data) {
  children.push(item.ToDictionary());
}
const result = new Map<string, any>();
result.set("type", this.constructor.name);
result.set("methodName", this.MethodName);
result.set("children", children);
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是：`Sign(this)` → 抄 `MethodName` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`。`Add` 传的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载改名 `AddRange`）。

```ts
const result = new Method(this.Owner, this.Template);
result.Sign(this);
result.MethodName = this.MethodName;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
