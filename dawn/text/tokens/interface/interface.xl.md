# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { Common } from "../common.xl.md"
import { Symbol } from "../symbol.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口声明单元：由重组把 `interface` / 可选的 `export` / 接口名 / 可选的 `extends a, b, c` / `{...}` 这几段合成一个 `Interface`。原 C# 的命名空间是 `Cangjie.Dawn.Text.Tokens.Interface`，所以 C# 里引用这个类要写 `Interface.Interface`——xl 只有单层 `# namespace cangjie`（M6），子层级用目录表达，于是路径是 `dawn/text/tokens/interface/interface.xl.md`。

按 M33，展平出来的嵌套类 `Interface.Reorganization` 写在 `Interface` 之前——不过它与 `Interface` 之间没有静态初始化依赖（`Interface` 上没有引用它的静态字段），顺序在这里只是保持一致。

# class InterfaceReorganization extends Reorganization

原 C# 是嵌套类 `Interface.Reorganization`（M32 展平改名，`Root` 里引用的是 `Interface.Interface.Reorganization.Instance`）。

它永远不进 `Data`、不进 XML，所以 ts 类名与 C# 的 `Type.Name` 不一致无害（M32）。

判定「这里是不是一个接口声明」被拆成两个私有帮助方法，两条形状各有各的走法：`interface Name{...}` 与 `interface Name extends A, B{...}`。两个帮助方法都是**从 `index` 往后看**，`index` 本身指向 `interface` 那个 `Common`。

## static readonly field Instance:InterfaceReorganization = new InterfaceReorganization()

唯一的实例。原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## private method NextIsCommonFlowerBracket:(units:Array<Token<string>>, index:int)=>bool

`index` 后面是不是「一个 `Common` 名字 + 一个 `{` 括号」——即不带 `extends` 的形状。

原 C# 是 `private bool NextIsCommonFlowerBracket(List<Token<char>> units, int index)`，名字里的 FlowerBracket 就是花括号 `{}`。它只往前看两步，并且**最后才要求括号是 `{`**。

`units.Get` 与 `units.SkipNextWrapSymbol` 都是扩展方法，ts 侧写成模块级函数（M11）。

```ts
let nextIndex = SkipNextWrapSymbol(units, index);
if (!(Get(units, nextIndex) instanceof Common)) {
  return false;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return false;
}
return bracket.StartBracketChar === "{";
```

## private method NextIsCommonExtendsCommonFlowerBracket:(units:Array<Token<string>>, index:int, interfaceInstance:Interface | null)=>int

`index` 后面是不是「`Common` 名字 + `extends` + `Common` 名 + 任意多个 `, Common` + `{` 括号」——即带 `extends` 的形状。匹配成功时返回**结束下标**（那个 `{` 括号的位置）；不匹配返回 `-1`。

原 C# 是 `private bool NextIsCommonExtendsCommonFlowerBracket(List<Token<char>> units, int index, ref int endIndex, Interface? interfaceInstance = null)`：一个 `bool` 返回加一个 `ref int` 输出。按 M15，`ref` 参数改成返回值；这里已经有一个 `bool`，于是把两个输出合并成一个——**返回结束下标，`-1` 表示不匹配**。匹配成功时原 C# 的 `endIndex` 一定是有效下标（`Get` 越界会先让类型判定失败），所以 `-1` 做哨兵没有歧义。调用方按 `>= 0` 判成立。

`interfaceInstance` 是输出目标，允许 `null`：`Previous` 只是探路，传 `null`，此时既不写 `InterfaceName` / `ExtendsInterfaceNames`，也不 `Add` / `SignOutToken` 那个括号。

原 C# 里 `interfaceInstance?.InterfaceName = interfaceName.TempToString();` 是「null 条件赋值」，ts 没有这个形状，改写成显式的 `if (interfaceInstance !== null)`；`extendsInterfaceNames?.Add(...)` 则直接写成可选链 `?.push(...)`。

`InterfaceName` / `ExtendsInterfaceNames` 只在**完整匹配成功后**才写，所以探路失败不会留下半截状态。

```ts
const extendsInterfaceNames: string[] | null = interfaceInstance === null ? null : [];
let nextIndex = SkipNextWrapSymbol(units, index);
const interfaceName = Get(units, nextIndex);
if (!(interfaceName instanceof Common)) {
  return -1;
}
if (interfaceInstance !== null) {
  interfaceInstance.InterfaceName = interfaceName.TempToString();
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
const extendsCommon = Get(units, nextIndex);
if (!(extendsCommon instanceof Common) || extendsCommon.Is("extends") === false) {
  return -1;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
const firstExtendsInterfaceName = Get(units, nextIndex);
if (!(firstExtendsInterfaceName instanceof Common)) {
  return -1;
}
extendsInterfaceNames?.push(firstExtendsInterfaceName.TempToString());
nextIndex = SkipNextWrapSymbol(units, nextIndex);
let symbolUnit = Get(units, nextIndex);
while (symbolUnit instanceof Symbol && symbolUnit.Is(",")) {
  nextIndex = SkipNextWrapSymbol(units, nextIndex);
  const extendsInterfaceName = Get(units, nextIndex);
  if (!(extendsInterfaceName instanceof Common)) {
    return -1;
  }
  extendsInterfaceNames?.push(extendsInterfaceName.TempToString());
  nextIndex = SkipNextWrapSymbol(units, nextIndex);
  symbolUnit = Get(units, nextIndex);
}
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return -1;
}
const isBodyBracket = bracket.StartBracketChar === "{";
if (isBodyBracket === false) {
  return -1;
}
if (interfaceInstance !== null) {
  interfaceInstance.ExtendsInterfaceNames = extendsInterfaceNames ?? [];
  interfaceInstance.Add(bracket);
  interfaceInstance.SignOutToken(bracket);
}
return nextIndex;
```

## method Previous:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>bool

`index` 处是不是一个接口声明的起点。

原 C# 是 `public override bool Previous(IOwner owner, Template<char> template, List<Token<char>> units, int index)`：`index` 处是 `interface` 关键字，并且后面满足两种形状之一。原 C# 里那个只用来接 `ref endIndex` 的局部变量在 ts 侧没有对应物，直接不写。

`||` 的短路顺序照抄：先试不带 `extends` 的形状，不成立才去试带 `extends` 的。

```ts
const current = Get(units, index);
if (
  current instanceof Common &&
  current.Is("interface") &&
  (this.NextIsCommonFlowerBracket(units, index) ||
    this.NextIsCommonExtendsCommonFlowerBracket(units, index, null) >= 0)
) {
  return true;
}
return false;
```

## method Process:(owner:IOwner, template:Template<string>, units:Array<Token<string>>, index:int)=>int

把一个接口声明折成一个 `Interface`，**返回新的下标**。

原 C# 是 `public override void Process(IOwner owner, Template<char> template, List<Token<char>> units, ref int index)`。按 M15，`ref int index` 改成返回值：原 C# 最后一句 `index = units.ReplaceAt(startIndex, endIndex - startIndex + 1, interfaceInstance);` 把「被替换区间的起点」写回了 `ref index`，而带 `count` 的 `ReplaceAt` 重载按 M14(c) 在 ts 侧叫 `ReplaceCountAt`，它本身就返回那个下标，所以直接 `return ReplaceCountAt(...)`。

原 C# 的第二条分支是个**只有注释的空 `else if`**——带 `extends` 的形状在帮助方法里就已经把 `InterfaceName` / `ExtendsInterfaceNames` / 括号都写进 `interfaceInstance` 了，分支体无事可做。ts 侧不能留空块（M30），所以把「取回结束下标」这一步挪到分支体里。

签入用的是 `SignIn(Common)` 重载（“用另一个单元的起点签入”），按 M14(c) 在 ts 侧叫 `SignInToken`；签出同理是 `SignOutToken`。

三种格式错误都抛同一个异常文本 `interface 语句不满足格式要求：interface Name{...}`，与原 C# 逐字一致。

```ts
let startIndex = index;
let endIndex = index;
const previousIndex = SkipPreviousWrapSymbol(units, index);
const interfaceInstance = new Interface(owner, template);
const previous = Get(units, previousIndex);
if (previous instanceof Common && previous.Is("export")) {
  startIndex = previousIndex;
  interfaceInstance.IsExport = true;
  interfaceInstance.SignInToken(previous);
} else {
  const current = Get(units, index);
  if (!(current instanceof Common)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  interfaceInstance.SignInToken(current);
}
if (this.NextIsCommonFlowerBracket(units, index)) {
  endIndex = SkipNextWrapSymbol(units, index);
  const nameUnit = Get(units, endIndex);
  if (!(nameUnit instanceof Common)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  interfaceInstance.InterfaceName = nameUnit.TempToString();
  endIndex = SkipNextWrapSymbol(units, endIndex);
  const body = Get(units, endIndex);
  if (!(body instanceof Bracket)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  interfaceInstance.Add(body);
  interfaceInstance.SignOutToken(body);
} else {
  const extendsEndIndex = this.NextIsCommonExtendsCommonFlowerBracket(units, index, interfaceInstance);
  if (extendsEndIndex < 0) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  endIndex = extendsEndIndex;
}
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, interfaceInstance);
```

# class Interface extends IndependentToken

接口声明。

原 C# 侧是 `public class Interface : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

**类名必须与 C# 完全一致**（M17）：`constructor.name` 就是它的 XML 标签名。

## constructor:(owner:IOwner, template:Template<string>)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## method Clone:()=>Token<string>

克隆自身。

原 C# 的顺序是：`Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；`Add` 传的是一批克隆出来的子单元，所以 ts 侧用 `AddRange`（M14(c)：C# 的 `Add<T>(IEnumerable<T>)` 重载改名 `AddRange`）。

**注意原 C# 的 `Clone` 不复制** `IsExport` / `InterfaceName` / `ExtendsInterfaceNames` 三个字段——克隆体三个字段都是初值。看着像漏写，但这是原实现的行为，照抄。

```ts
const result = new Interface(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## field IsExport:bool = false

带不带 `export`。原 C# 是 `public bool IsExport { get; set; } = false;`，在 `Process` 里看到前一个单元是 `export` 时置为 `true`。

## field InterfaceName:string = ""

接口名。原 C# 是 `public string InterfaceName { get; set; } = string.Empty;`。

## field ExtendsInterfaceNames:Array<string> = []

`extends` 后面的接口名列表。原 C# 是 `public string[] ExtendsInterfaceNames { get; set; } = Array.Empty<string>();`。

## property Body:Bracket

接口体：子单元里第一个 `Bracket`。

原 C# 是 `public Bracket Body { get => (Bracket)Data.First(item => item is Bracket); }`——`First(谓词)` 找不到会抛异常，所以 ts 侧也要在扫完仍没找到时抛错，不能退化成 `undefined`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof Bracket) {
    return item;
  }
}
throw new Error("Sequence contains no matching element");
```
