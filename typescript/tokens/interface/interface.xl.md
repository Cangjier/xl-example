# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { Bracket } from "../bracket.xl.md"
import { InterfaceBody } from "./interface-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

接口声明单元：由重组把 `interface` / 可选的 `export` / 接口名 / 可选的一截类型参数 / 可选的 `extends a, b, c` / `{...}` 这几段合成一个 `Interface`。xl 只有单层 `# namespace cangjie`，子层级用目录表达，于是路径是 `typescript/tokens/interface/interface.xl.md`。

它和 `Class` 是一对：名字与 `extends` 名单进属性、类型参数与接口体留作子单元。
**有两处要点**在下面各节里写明：类型参数段要认得出来（`interface User<T> { … }` 整条都要能收），
三个声明字段也要渲染进产物（否则产物里看不到接口名）。

`InterfaceReorganization` 写在 `Interface` 之前——不过它与 `Interface` 之间没有静态初始化依赖（`Interface` 上没有引用它的静态字段），顺序在这里只是保持一致。

# class InterfaceReorganization extends Reorganization

它永远不进 `Data`、不进 XML，所以类名与产物的标签名不一致也无害。

判定「这里是不是一个接口声明」被拆成两个私有帮助方法，两条形状各有各的走法：`interface Name{...}` 与 `interface Name extends A, B{...}`。两个帮助方法都是**从 `index` 往后看**，`index` 本身指向 `interface` 那个 `Identifier`。

## static readonly field Instance:InterfaceReorganization = new InterfaceReorganization()

唯一的实例，注册进通用重组队列时用。

## private method TakeTypeParameters:(units:Array<Token>, index:int, interfaceInstance:Interface | null)=>int

`index` 处如果是一段类型参数（`GenericType`），把它收进 `interfaceInstance`（非空时）
并返回**它之后**的下标（跳过软换行）；`index` 处不是类型参数时原样返回 `index`。

带默认值的写法（`<T = unknown>`、`<T extends X = Y>`）也由 `GenericType` 收好了，这里不必再分情况。

搬进 `Interface` 是必须的：这些单元落在 `ReplaceCountAt` 要替换的区间里，不搬就从 XML 里消失了。

```ts
const current = Get(units, index);
if (!(current instanceof GenericType)) {
  return index;
}
if (interfaceInstance !== null) {
  interfaceInstance.Add(current);
}
return SkipNextWrapSymbol(units, index);
```

## private method NextIsCommonFlowerBracket:(units:Array<Token>, index:int)=>bool

`index` 后面是不是「一个 `Identifier` 名字 + 一个 `{` 括号」——即不带 `extends` 的形状。

名字里的 FlowerBracket 就是花括号 `{}`。它只往前看两步，并且**最后才要求括号是 `{`**。

**这里多允许一段类型参数**（走 `TakeTypeParameters`，探路时不写实例）：`interface User<T> { … }` 里
名字与花括号之间夹着类型参数段；没有它，带类型参数的接口一律认不出来
（`User<T>` 会被当成 `Identifier`，花括号就跟不上了）。

`units.Get` 与 `units.SkipNextWrapSymbol` 都是扩展方法，ts 侧写成模块级函数。

```ts
let nextIndex = SkipNextWrapSymbol(units, index);
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return false;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
nextIndex = this.TakeTypeParameters(units, nextIndex, null);
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return false;
}
return bracket.startBracket === "{";
```

## private method SkipExtendsName:(units:Array<Token>, index:int)=>int

跳过 `extends` 名单里的一项**实体名**：一个 `Identifier`，后面可以跟任意多个 `.` + `Identifier`（`A.B.C`）。返回名字之后的下标（跳过软换行）；`index` 处不是 `Identifier` 时返回 `-1`。

**为什么要认点号**：`interface I extends a.b.Base` 是合法的 TypeScript，实体名是一个限定名而不是单个词。原来只认一个 `Identifier`，`a.b.Base` 就匹配不上，整条接口声明反而消失。

```ts
let nextIndex = index;
if (!(Get(units, nextIndex) instanceof Identifier)) {
  return -1;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
while (true) {
  const dot = Get(units, nextIndex);
  if (!(dot instanceof SymbolToken) || dot.Is(".") === false) {
    return nextIndex;
  }
  const nameIndex = SkipNextWrapSymbol(units, nextIndex);
  if (!(Get(units, nameIndex) instanceof Identifier)) {
    return nextIndex;
  }
  nextIndex = SkipNextWrapSymbol(units, nameIndex);
}
```

## private method ExtendsNameText:(units:Array<Token>, start:int, end:int)=>string

把 `[start, end)` 这段单元拼成实体名的文本：`Identifier` 取它的文本，`SymbolToken` 里的点号补一个 `.`。

**为什么不能只取第一个 `Identifier` 的文本**：限定名由多个 `Identifier` 和一个 `SymbolToken(".")` 组成，只取第一个会把 `a.b.Base` 记成 `a`——`extends` 是给人看的产物属性，记错比不记更糟。

```ts
let text = "";
let index = start;
while (index < end) {
  const item = Get(units, index);
  if (item instanceof Identifier) {
    text += item.TempToString();
  } else if (item instanceof SymbolToken && item.Is(".")) {
    text += ".";
  }
  index++;
}
return text;
```

## private method TakeExtendsTypeArguments:(units:Array<Token>, index:int, interfaceInstance:Interface | null)=>int

`extends` 名单里某一项后面的类型实参段（`Base<T>` 的 `<T>`）：`index` 处是 `GenericType` 就把它搬进 `interfaceInstance`（非空时）并返回它之后的下标；不是就原样返回 `index`。

**必须搬进 `Interface`**，理由与 `TakeTypeParameters` 完全相同：这些单元落在 `ReplaceCountAt` 要替换的区间里，不搬就从产物里消失了。

```ts
const current = Get(units, index);
if (!(current instanceof GenericType)) {
  return index;
}
if (interfaceInstance !== null) {
  interfaceInstance.Add(current);
}
return SkipNextWrapSymbol(units, index);
```

## private method NextIsCommonExtendsCommonFlowerBracket:(units:Array<Token>, index:int, interfaceInstance:Interface | null)=>int

`index` 后面是不是「`Identifier` 名字 + `extends` + 实体名（可带类型实参，可带点号）+ 任意多个 `, 实体名` + `{` 括号」——即带 `extends` 的形状。匹配成功时返回**结束下标**（那个 `{` 括号的位置）；不匹配返回 `-1`。

返回值是一个下标：匹配成功时是那个 `{` 括号的位置，不匹配返回 `-1`。原来分开的 `bool` 结果与结束下标
合并成这一个返回值——**返回结束下标，`-1` 表示不匹配**。匹配成功时下标一定有效（`Get` 越界会先让类型判定失败），所以 `-1` 做哨兵没有歧义。调用方按 `>= 0` 判成立。

`interfaceInstance` 是输出目标，允许 `null`：`Previous` 只是探路，传 `null`，此时既不写 `name` / `extends`，也不 `Add` / `SignOutToken` 那个括号。

`interfaceInstance` 为 `null` 时（`Previous` 探路）不写任何字段，赋值都包在显式的 `if (interfaceInstance !== null)` 里；`extendsInterfaceNames` 上则直接用可选链 `?.push(...)`。

`name` / `extends` 只在**完整匹配成功后**才写，所以探路失败不会留下半截状态。

**这里同样多允许一段类型参数**（理由与 `NextIsCommonFlowerBracket` 相同，这里由 `TakeTypeParameters` 连检查带搬）：`interface User<T> extends Base`
里名字与 `extends` 之间夹着类型参数段，探路时要跨过去，`Process` 里还要把它搬进 `Interface`——
不搬的话 `<T>` 的字符会从 XML 里消失（`MethodReorganization` 处理泛型方法时踩过同一个坑）。

```ts
const extendsInterfaceNames: string[] | null = interfaceInstance === null ? null : [];
let nextIndex = SkipNextWrapSymbol(units, index);
const interfaceName = Get(units, nextIndex);
if (!(interfaceName instanceof Identifier)) {
  return -1;
}
if (interfaceInstance !== null) {
  interfaceInstance.name = interfaceName.TempToString();
  // 名字单元**暂存**，`Process` 末尾再放进 `Data`（见 `NameUnit` 字段的说明）。
  interfaceInstance.NameUnit = interfaceName;
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
nextIndex = this.TakeTypeParameters(units, nextIndex, interfaceInstance);
const extendsCommon = Get(units, nextIndex);
if (!(extendsCommon instanceof Identifier) || extendsCommon.Is("extends") === false) {
  return -1;
}
// **继承段的单元要留下来**（第 66 轮第七批）：`extends` 那个词、每个实体名、逗号，
// 都作为子单元搬进 `Interface`——`heritage-clause.xl.md` 会按 TypeScript 的形状把它们
// 收成 `<HeritageClause>` + `<ExpressionWithTypeArguments>`。
// 原来只把**类型实参**（`Base<T>` 的 `<T>`）搬进来、名字与逗号丢掉：产物里
// `interface K extends L<M>, N {}` 只剩一个孤零零的 `GenericType`，
// `extends` 名单只活在 `extends="L,N"` 属性里——TS 那边它是有节点的。
// 搬进去不会重复：整个过程最后用 `ReplaceCountAt` 把整段换成 `Interface`，
// 外层那些单元随替换一起消失 ✓。
if (interfaceInstance !== null) {
  interfaceInstance.AddAndCloseLast(extendsCommon);
}
nextIndex = SkipNextWrapSymbol(units, nextIndex);
let nameStart = nextIndex;
let nameEnd = this.SkipExtendsName(units, nameStart);
if (nameEnd < 0) {
  return -1;
}
if (interfaceInstance !== null) {
  this.MoveNameUnits(units, nameStart, nameEnd, interfaceInstance);
}
extendsInterfaceNames?.push(this.ExtendsNameText(units, nameStart, nameEnd));
nextIndex = this.TakeExtendsTypeArguments(units, nameEnd, interfaceInstance);
let symbolUnit = Get(units, nextIndex);
while (symbolUnit instanceof SymbolToken && symbolUnit.Is(",")) {
  if (interfaceInstance !== null) {
    interfaceInstance.AddAndCloseLast(symbolUnit);
  }
  nameStart = SkipNextWrapSymbol(units, nextIndex);
  nameEnd = this.SkipExtendsName(units, nameStart);
  if (nameEnd < 0) {
    return -1;
  }
  if (interfaceInstance !== null) {
    this.MoveNameUnits(units, nameStart, nameEnd, interfaceInstance);
  }
  extendsInterfaceNames?.push(this.ExtendsNameText(units, nameStart, nameEnd));
  nextIndex = this.TakeExtendsTypeArguments(units, nameEnd, interfaceInstance);
  symbolUnit = Get(units, nextIndex);
}
const bracket = Get(units, nextIndex);
if (!(bracket instanceof Bracket)) {
  return -1;
}
const isBodyBracket = bracket.startBracket === "{";
if (isBodyBracket === false) {
  return -1;
}
if (interfaceInstance !== null) {
  interfaceInstance.extends = extendsInterfaceNames ?? [];
  const interfaceBody = interfaceInstance.CreateBody();
  bracket.MoveDataTo(interfaceBody);
  interfaceBody.Sign(bracket);
  interfaceBody.TryToClose();
  interfaceInstance.SignOutToken(interfaceBody);
}
return nextIndex;
```

## private method MoveNameUnits:(units:Array<Token>, start:int, end:int, interfaceInstance:Interface)=>void

把 `[start, end)` 这些单元（一个实体名的全部部分：`A` / `.` / `B` ……，软换行跳过）
搬进接口声明。

与 `TakeExtendsTypeArguments` 的分工：那个负责**类型实参段**（`Base<T>` 的 `<T>`），
这个负责**名字本身**。两段都由 `heritage-clause.xl.md` 在接口自己的队列里收成
`ExpressionWithTypeArguments` ✓。

```ts
for (let i = start; i < end; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    interfaceInstance.AddAndCloseLast(item);
  }
}
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个接口声明的起点。

`index` 处是 `interface` 关键字，并且后面满足两种形状之一。

`||` 的短路顺序：先试不带 `extends` 的形状，不成立才去试带 `extends` 的。

```ts
const current = Get(units, index);
if (
  current instanceof Identifier &&
  current.Is("interface") &&
  (this.NextIsCommonFlowerBracket(units, index) ||
    this.NextIsCommonExtendsCommonFlowerBracket(units, index, null) >= 0)
) {
  return true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把一个接口声明折成一个 `Interface`，**返回新的下标**。

四个参数的 `ReplaceAt` 重载叫 `ReplaceCountAt`（三参数版仍叫 `ReplaceAt`），它本身就返回「被替换区间的起点」，所以 `Process` 直接 `return ReplaceCountAt(...)`。

第二条分支只做一件事：取回结束下标——带 `extends` 的形状在帮助方法里就已经把 `name` / `extends` / 括号都写进 `interfaceInstance` 了，分支体本来无事可做，而空块在 xl 里不成立，所以把这一步写进分支体。

签入用的是「用另一个单元的起点签入」的重载，在 ts 里叫 `SignInToken`；签出同理是 `SignOutToken`。

三种格式错误都抛同一个异常文本 `interface 语句不满足格式要求：interface Name{...}`。

**替换范围到接口体的 `}` 为止，尾随软换行留在父单元里**：它本身就是语句边界，收进范围会让
`SearchFrontIndexed` 找不到语句头，后面那条语句被并进同一个 `Statement`
（见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。

```ts
let startIndex = index;
let endIndex = index;
const previousIndex = SkipPreviousWrapSymbol(units, index);
const interfaceInstance = new Interface(template);
const previous = Get(units, previousIndex);
if (previous instanceof Identifier && previous.Is("export")) {
  startIndex = previousIndex;
  interfaceInstance.export = true;
  interfaceInstance.SignInToken(previous);
} else {
  const current = Get(units, index);
  if (!(current instanceof Identifier)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  interfaceInstance.SignInToken(current);
}
if (this.NextIsCommonFlowerBracket(units, index)) {
  endIndex = SkipNextWrapSymbol(units, index);
  const nameUnit = Get(units, endIndex);
  if (!(nameUnit instanceof Identifier)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  interfaceInstance.name = nameUnit.TempToString();
  // 名字单元**暂存**，`Process` 末尾统一放进 `Data`（见 `NameUnit` 字段的说明）。
  // 这一条**必须两条路径都写**：带 `extends` 的形状走 `ScanHead`，不带 `extends` 的走这里——
  // 只补一处的话 `interface I {}` 与 `interface J<T> extends K {}` 会一个有一个没有（踩过）。
  interfaceInstance.NameUnit = nameUnit;
  endIndex = SkipNextWrapSymbol(units, endIndex);
  endIndex = this.TakeTypeParameters(units, endIndex, interfaceInstance);
  const body = Get(units, endIndex);
  if (!(body instanceof Bracket)) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  const interfaceBody = interfaceInstance.CreateBody();
  body.MoveDataTo(interfaceBody);
  interfaceBody.Sign(body);
  interfaceBody.TryToClose();
  interfaceInstance.SignOutToken(interfaceBody);
} else {
  const extendsEndIndex = this.NextIsCommonExtendsCommonFlowerBracket(units, index, interfaceInstance);
  if (extendsEndIndex < 0) {
    throw new Error("interface 语句不满足格式要求：interface Name{...}");
  }
  endIndex = extendsEndIndex;
}
const declarationEnd = endIndex;
// **必须收尾一次**（第 66 轮第七批）：`Interface` 的构造器挂了通用队列，但 `Process`
// 到这里之前一直没调用 `TryToClose` —— 队列从来没跑过。后果有两个实测症状：
// ①`extends` 那个词永远升不成 `Keyword`（构造器注释里写的意图没生效）；
// ②`heritage-clause.xl.md` 收不出 `<HeritageClause>`（接口的继承段一直没有节点）。
interfaceInstance.TryToClose();
// **名字单元在这时放进树**（见 `NameUnit` 字段的说明）：`TryToClose()` 之后本单元的重组
// 已经跑完，`Data` 不会再被自己扫描，也就不会被「`Identifier` + `Bracket`」那类规则误吃。
// 位置放在最前面，与 TS 的 `InterfaceDeclaration.name` 一致。
if (interfaceInstance.NameUnit !== null && interfaceInstance.NameUnit instanceof Identifier) {
  interfaceInstance.NameUnit.Parent = interfaceInstance;
  interfaceInstance.Data.unshift(interfaceInstance.NameUnit);
}
return ReplaceCountAt(units, startIndex, declarationEnd - startIndex + 1, interfaceInstance);
```

# class Interface extends IndependentToken

接口声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

## constructor:(template:Template)=>void

以模板创建，并把本类型的重组规则挂上来（模板里没有专门给 `Interface` 注册就用通用队列）。

这一句是必要的，理由与 `Class` 的构造器相同：
`extends` 段是 `Process` 搬进来的，没有自己的队列，那个词就升不成 `Keyword`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 搬入全部克隆出来的子单元 → `TryToClose()`；`Add` 传的是一批子单元，所以这里用 `AddRange`。

**注意 `Clone` 不复制** `export` / `name` / `extends` 三个字段——克隆体三个字段都是初值。

```ts
const result = new Interface(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```

## field export:bool = false

带不带 `export`。在 `Process` 里看到前一个单元是 `export` 时置为 `true`。

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` / `extends` / `export` 三个属性。

`Interface` 覆写了 `ToXmlString`，把三个声明字段渲染进产物——
基类版本只拼子单元，`name` / `extends` / `export`
三个字段一个都进不了产物：`interface User extends Base { … }` 的产物里既看不到 `User` 也看不到 `Base`。
字段明明已经读出来了却不渲染，对「解析完整的 TypeScript」是个漏洞，所以这里补上渲染。

属性的拼法与 `Class` 对仗（`extends` 用 `join(",")`，与 `Let` 的两组解构名同款），
布尔属性由模板插值直接落成 `true` / `false`。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}" extends="${this.extends.join(",")}" export="${this.export}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `extends` / `export` 三个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的三个属性同名、值同源：`extends` 是 `Array<string>`，
这里按 `join(",")` 拼成字符串（与 XML 属性那处一致）；`export` 是 `bool`，
JSON 里写真布尔 `true` / `false`——XML 属性是插值出来的文本，JSON 没有这层包装，正是两个出口该有的差别。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
result.set("extends", this.extends.join(","));
result.set("export", this.export);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## field name:string = ""

接口名。

## field NameUnit:Token | null = null

接口名那个**单元本身**（带自己的 `SourceRange`），重组时暂存、`Process` 末尾再放进 `Data`。

**为什么要绕一道**：名字后面跟的是 `<` / `extends` / `{`，本来直接加进去也没事，
但本仓库已经踩过一次「加名字触发了重组队列」（`Function`：名字后面紧跟 `(`，
被「`Identifier` + `Bracket(paren)` ⇒ `Method`」那条规则吃成调用表达式）。
这里统一用**同一套稳的做法**：`TryToClose()` 之后再 `Data.unshift`——
那时本单元自己的重组已经跑完，`Data` 不会再被自己扫描一遍。
（`Class` 是直接 `AddAndCloseLast` 的，它靠的是「类名后面不是 `(`」这个巧合；
`Function` 已经改成稳的做法，这里跟着走。）

## field extends:Array<string> = []

`extends` 后面的接口名列表。

## method CreateBody:()=>InterfaceBody

新建接口体段并挂到自己名下，返回新单元。

接口体单独成段是必须的：`{ }` 括号自己**没有**重组队列（见 `../bracket.xl.md` 的 `Use`），
成员要成形就得由这一段在构造时挂上语句队列（见 `./interface-body.xl.md`）。

```ts
return this.Add(new InterfaceBody(this.Template));
```

## property Body:InterfaceBody

接口体：子单元里第一个 `InterfaceBody`。

扫完仍没找到时抛错，不能退化成 `undefined`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof InterfaceBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```
