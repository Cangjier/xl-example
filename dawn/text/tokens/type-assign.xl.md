# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CommonUtil } from "../../../core/common-util.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Get, ReplaceCountAt, SearchBack, TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IsDeclarationBoundary, IsDeclarationModifier, IsStatementKeyword } from "./declaration-common.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Common } from "./common.xl.md"
import { GenericType } from "./generic-type.xl.md"
import { Symbol } from "./symbol.xl.md"
import { WrapSymbol } from "./wrap-symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

类型赋值：把 `type X = …;` 这一整段收成一个 `TypeAssign` 单元，段内的单元原样装进它的 `Data`（它自己不再产出 XML 属性，`ToXmlString` 走基类）。

`TypeAssignReorganization` 写在 `TypeAssign` **之前**，与同目录其它 token 一致。

# class TypeAssignReorganization extends Reorganization

`Previous` 认的是「`type` + 名字 + `=` 三个实义单元依次相邻（跨过软换行）」这一串。

`Process` 从 `type`（含它前面的 `export`）一直收到 `;` 为止——**没有** `;` 时就收到列表末尾。

## static readonly field Instance:TypeAssignReorganization = new TypeAssignReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个类型赋值的开头。

取两个「跨过软换行的下一个单元」下标，判定是一句合取：当前是内容为 `type` 的 `Common`、第一个下一个是 `Common`、第二个下一个是内容为 `=` 的 `Symbol`。这里拆成早返回，语义相同。

**名字与 `=` 之间允许一段类型参数**（`type Box<T> = …` / `type A<T extends X = Y> = …`）：
不放这一条，泛型别名整条形不成——名字之后跟的是 `GenericType`，判定在「第二个下一个是 `=`」处就断了，
产物里只剩 `<Keyword>type</Keyword>` 加一串散单元（实测 `@types` 里有 112 个泛型别名）。

```ts
const current = Get(units, index);
const nextIndex1 = SkipNextWrapSymbol(units, index);
if (!(current instanceof Common) || !current.Is("type")) {
  return false;
}
if (!(Get(units, nextIndex1) instanceof Common)) {
  return false;
}
let nextIndex2 = SkipNextWrapSymbol(units, nextIndex1);
if (Get(units, nextIndex2) instanceof GenericType) {
  nextIndex2 = SkipNextWrapSymbol(units, nextIndex2);
}
const nextSymbol = Get(units, nextIndex2);
return nextSymbol instanceof Symbol && nextSymbol.Is("=");
```

## private method AliasEnd:(units:Array<Token>, index:int)=>int

别名右端的结尾下标。

两条终止，先到先算：

- `;` —— 显式结尾；
- **软换行 + 下一行的开头是一条声明**——这是 TypeScript 里「一行一个别名」的常见排版，
  不加这一条，`type A = number` 换行 `type B = string` 会被并成**同一个** `TypeAssign`
  （原来的写法是「找不到 `;` 就一路收到列表末尾」，正好踩这个坑）。

**下一行的开头有两种形态**，都要认：

- 还是一个**词**（`type` / `export` / `interface` / `let` …）→ `IsStatementKeyword`；
- 已经**成形的声明单元**（`Interface` / `Class` / `Function` / `Statement` …）→ `IsDeclarationBoundary`。

第二条是必须的：本规则排在 `Interface` / `Class` 等规则**之后**，
轮到它扫描时，后面那条声明往往已经被收成节点了。只认词的话，
`declare namespace N {` 里「对象型别名 → interface → 函数型别名」这一串会把
**interface 与后面那条别名一起吞进第一个别名的右端**
（实测：命名空间体里三条声明只剩第一条成形，这是 `TypeAssign` 差额的来源之一）。
`IsDeclarationBoundary` 正是为这种「列表里已经没有裸 `Common`」的情形写的（见 `declaration-common.xl.md`）。

**只看「换行后是不是声明开头」而不是「遇到换行就停」**：类型表达式经常折行
（`type X =` 换行 `| A` 换行 `| B`），见到换行就停会把联合类型截断。

一路没遇到终止就返回列表末尾。

```ts
let i = index;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof Symbol && item.Is(";")) {
    return i;
  }
  if (item instanceof WrapSymbol) {
    const next = Get(units, SkipNextWrapSymbol(units, i));
    if (next === null || IsStatementKeyword(next) || IsDeclarationBoundary(next)) {
      return i - 1 >= index ? i - 1 : i;
    }
  }
  i = i + 1;
}
return units.length - 1;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段类型赋值收成一个 `TypeAssign`，**返回新的下标**。

要点：

- `startIndex` 先取 `index`，若**跨过软换行**的上一个单元是 `export` / `declare` 之类的修饰词，就前移到它；
  修饰词折进 `Modifiers` 属性。
- 别名进 `AliasName` 属性；`type` 这个词与名字本身**不再作为子单元**（与 `Class` / `Interface` 的处理一致：
  关键字与名字都进属性，子单元里只剩类型参数、`=` 与右端）。
- `endIndex` 由 `AliasEnd` 给出（`;` 或「换行 + 下一条声明」），不再一路收到列表末尾。
- 段内单元用 `TakeRange(units, startIndex, count)` 取（**取出不移除**），随后由 `ReplaceCountAt` 一次性替换掉原区间。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const nameIndex = SkipNextWrapSymbol(units, index);
const name = Get(units, nameIndex);
if (!(name instanceof Common)) {
  throw new Error("type 语句不满足格式要求：type Name = ...");
}
let startIndex = index;
const previousIndex = SkipPreviousWrapSymbol(units, index);
const previous = Get(units, previousIndex);
const modifiers: string[] = [];
if (previousIndex !== -1 && IsDeclarationModifier(previous)) {
  startIndex = previousIndex;
  modifiers.push((previous as Common).TempToString());
}
const endIndex = this.AliasEnd(units, index);
const result = new TypeAssign(template);
result.Parent = current.Parent;
result.AliasName = name.TempToString();
result.Modifiers = modifiers.join(",");
for (let i = index; i <= endIndex; i++) {
  const item = Get(units, i);
  if (i === index || i === nameIndex) {
    continue;
  }
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class TypeAssign extends IndependentToken
一条类型赋值（`type X = …;`）整段。

单元值类型是单字符的 `string`。

## constructor:(template:Template)=>void

转调基类构造器，**并且把自己的重组队列装上**。

理由与 `type-define.xl.md` 的同名构造器相同：本单元是重组规则建出来的，
`KeywordReorganization` 排在通用队列最后、轮不到它里面的词——
`type X = keyof T` 的 `keyof`、`type X = typeof y` 的 `typeof` 于是停在 `Common` 上。
装的是**类型队列**（只有 `KeywordReorganization` 一条，见 `../parse-pipeline.xl.md` 的
`InitialKeywordReorganizationQueue`），不是通用队列：通用队列里的 `TernaryOperatorReorganization`
会把条件类型 `T extends U ? A : B` 收成表达式三元。

```ts
super(template);
ParsePipeline.InitialKeywordReorganizationQueue(this);
```

## field AliasName:string = ""

别名（`type` 后面那个名字）。

## field Modifiers:string = ""

别名前面的修饰词（`export` / `declare`），按源码顺序用 `,` 连接；没有时是空串。

## method ToXmlString:()=>string

产出 XML：开标签上带 `AliasName` 与 `Modifiers` 两个属性，内容是类型参数、`=` 与右端的 XML。

与 `Field` / `Interface` 同一口径：名字进属性、不进子单元，属性值过一遍 `CommonUtil.XmlDecode`。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} AliasName="${CommonUtil.XmlDecode(this.AliasName)}" Modifiers="${CommonUtil.XmlDecode(this.Modifiers)}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

三个声明字段都要抄。

```ts
const result = new TypeAssign(this.Template);
result.Sign(this);
result.AliasName = this.AliasName;
result.Modifiers = this.Modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
