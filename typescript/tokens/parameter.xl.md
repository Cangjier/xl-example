# dependencies
```xl
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { Parameter } from "./lamda/lamda-parameter.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { IsTriviaUnit } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**形参**：函数 / 方法 / 签名 / 构造签名 / 函数类型的**形参表**里，每个逗号分隔的形参收成一个 `Parameter`。

TypeScript 那边形参一律是 `Parameter` 节点（名字 + 可选的 `?` + 类型 + 默认值），
**不分函数 / 方法 / 箭头**。本工程原来只有**箭头函数**那一支有节点
（`lamda.xl.md` 在造 `Lamda` 时把形参收进 `LamdaParameters`），其余几处
（`function f(a) {}` / `m(a) {}` / `(a) => b` 的**类型**写法 / 调用签名 `(a): void` /
构造签名 `new (a: A): I`）形参就是括号里的散单元——当时那把对齐尺子里 `Parameter` 因此缺
**31904 处**（全语料最大的一块）。

**规则锚在括号上**（不是锚在括号里）：这一层扫到的单元就是那个 `(` 括号本身，
`Process` 改的是**括号自己的 `Data`**（把内容切成一个个 `Parameter`），外层列表不动，
所以返回原来的下标。这一点与元组成员 / 枚举成员那两条（改容器内容）同款。

**只认形参表的五种宿主**（`current.Parent` 的类名）：

- `FunctionType`（`(a: A) => B` 里的形参表）；
- `Signature`（`(a: A): B` 调用签名 / 构造签名）；
- `MethodDeclaration`（`m(a) {}`）；
- `Function`（`function f(a) {}`）；
- **`NewType`，但只在它是「构造签名」时**（`new (a: A): I`）。

实测两种 `new` 的形状（这是判据的来源）：

    new(str: string): Buffer          →  <New><NewType><Bracket>(str: string)</Bracket></NewType><NewArguments/></New>
    new Foo(1, 2)                     →  <New><NewType><Identifier>Foo</Identifier></NewType><NewArguments>1, 2</NewArguments>

构造签名的 `NewType` 里装的是**形参括号**，值位 `new` 的 `NewType` 里装的是**被调者名字**——
所以「`NewType` 的第一个实义子单元是括号、**而且括号里有顶层冒号**」才是构造签名
（第二条是必须的：`new (getCtor())()` / `new (class {})()` 把被调者括起来时，
`NewType` 里同样是一个括号，只按「第一个是括号」判会把它们的实参误当成形参）。

**箭头函数不在这里收**：`lamda.xl.md` 在造 `Lamda` 时已经把形参收进 `LamdaParameters` 了
（宿主是 `LamdaParameters`，不在上面几个里 不会重复收）。
**值位 `new` 的实参表也不在这里收**（它在 `NewArguments` 里 不在名单里）。

# class ParameterCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:ParameterCloseRule = new ParameterCloseRule()

唯一的实例。

## private method IsConstructSignature:(bracket:Bracket, owner:Token)=>bool

这个 `NewType` 是不是**构造签名**的：括号是它第一个实义子单元，**而且括号里有顶层冒号**。

**「第一个实义子单元」按 trivia 口径判**（第 873 轮）：判据自己写的就是「**实义**」，
原来只跳 `LineWrap` ⇒ `new /*c*/ (a: number): X` 里第一个单元是那条 `AreaAnnotation`
⇒ 答否 ⇒ 括号里的形参一个都收不成 `Parameter`（实测缺 `Parameter`，
形状与「括号里没有形参表」一模一样，而 outer 的 `ConstructSignature` 是对的）。
与 `IsBindingPatternBrace` / `IsObjectLiteralBrace` 那两处同一口径（第 849 轮那条「第一个」）。

```ts
for (const item of owner.Data) {
  if (IsTriviaUnit(item)) {
    continue;
  }
  if (item !== bracket) {
    return false;
  }
  break;
}
for (const item of bracket.Data) {
  if (item instanceof SymbolToken && item.Is(":")) {
    return true;
  }
  if (item.constructor.name === "TypeDefine") {
    return true;
  }
}
return false;
```

## private method IsParameterListBracket:(unit:Token | null)=>bool

这个单元是不是**形参表的括号**：`(` + `)`、已关闭，而且宿主是那几种之一
（`NewType` 还要再确认是构造签名）。

```ts
if (!(unit instanceof Bracket) || unit.startBracket !== "(" || unit.Closed === false) {
  return false;
}
const owner = unit.Parent;
if (owner === null) {
  return false;
}
const name = owner.constructor.name;
if (name === "NewType") {
  return this.IsConstructSignature(unit, owner);
}
return (
  name === "FunctionType" || name === "Signature" || name === "MethodDeclaration" || name === "Function"
);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一张还没收过的形参表。

三条：`IsParameterListBracket` 成立；括号里还没有 `Parameter`（第二趟守卫）；
括号里至少有一个**实义**单元（空形参表 `()` 不必收）。

**注释不算实义内容**（第 818 轮）：`m(/*c*/) { … }` 里括号内只有一个 `AreaAnnotation`，
照「不是软换行就算内容」判 ⇒ 规则收下一张**空形参表**，`AppendSegment` 又把那条注释
包成一个**零宽的 `Parameter`**（实测 `EXTRA Parameter [12,12)`、`FIELD MethodDeclaration`
多一个 `parameters`；`function f(/*c*/)` / `interface I { m(/*c*/): void }` /
`(/*c*/) => 1` 同一根）。判据与 `IsTriviaUnit` 那份名单同一口径——注释、软换行、
预处理指令都不承载语义。（块注释与行注释都算：`//c` 后面那个换行本来就是软换行。）

```ts
const current = Get(units, index);
if (this.IsParameterListBracket(current) === false) {
  return false;
}
if (current === null) {
  return false;
}
let hasContent = false;
for (const item of current.Data) {
  if (item.constructor.name === "Parameter") {
    return false;
  }
  if (IsTriviaUnit(item) === false) {
    hasContent = true;
  }
}
return hasContent;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按**顶层逗号**把形参表切成若干段，每段收成一个 `Parameter`，**返回原来的下标**。

逗号留在原地（它属于形参表本身）。软换行**留在 `Parameter` 里**——形参表可以折行排版，
那条换行是源码内容的一部分（丢掉它会让 `cases:boundaries` 的 XML 定位器少一个叶子、
整体错位；实测 `@types/node/url.d.ts` 因此报出过一处假阳性，虽然根因不在换行上，
少一个叶子只会让定位更难）。

**先拷出来再重建**：改的正是这个括号的 `Data`，边遍历边改会读到自己的写入。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("ParameterCloseRule.Process: current is null");
}
const original: Token[] = [];
for (const item of current.Data) {
  original.push(item);
}
const rebuilt: Token[] = [];
let segment: Token[] = [];
for (const item of original) {
  if (item instanceof SymbolToken && item.Is(",")) {
    this.AppendSegment(rebuilt, segment, current);
    segment = [];
    rebuilt.push(item);
    continue;
  }
  segment.push(item);
}
this.AppendSegment(rebuilt, segment, current);
current.Data.splice(0, current.Data.length, ...rebuilt);
return index;
```

## private method AppendSegment:(rebuilt:Array<Token>, segment:Array<Token>, owner:Token)=>void

把一段（一个形参的单元）收成 `Parameter`；**只有 trivia 的段跳过**——软换行丢掉，
注释**推回 `rebuilt`**（它不属于任何形参，但也不该从产物里消失）。

`Parameter` 自己挂通用队列（见 `./lamda/lamda-parameter.xl.md`），所以
`name?: T = 默认值` 里的类型标注与默认值会在它自己那一趟里继续成形。

**为什么注释要推回去**（第 818 轮）：`f(a, /*c*/)` 的第二段只有一个注释，
照原来的「不是软换行就算实义」会包出一个零宽 `Parameter`（与 `Previous` 那条同一根）；
直接 `return` 又会把那条注释**从产物里删掉**（`CommentsIn` 那一族的教训：
落在被替换区间里的注释要么显式收下、要么推回去）。

```ts
const content: Token[] = [];
let hasReal = false;
for (const item of segment) {
  content.push(item);
  if (IsTriviaUnit(item) === false) {
    hasReal = true;
  }
}
if (hasReal === false) {
  for (const item of content) {
    if (!(item instanceof LineWrap)) {
      rebuilt.push(item);
    }
  }
  return;
}
const parameter = new Parameter(owner.Template);
parameter.Parent = owner;
// **区间的右端取最后一个实义单元**（第 934 轮）：`content` 里带着这一段收集到的
// **全部**单元（注释与软换行都算，它们照旧装进 `Parameter`——见上面「软换行留在
// `Parameter` 里」那一句），可**区间**带上尾部 trivia 就不对了：
// `function f(a: string//c` 换行 `, b: number) {}` 里那个行注释连同它吃掉的换行都是
// trailing trivia（TS 的 `Parameter` 是 `[11,20)`），照 `content` 的末格签出会多出一格
//（实测 `tt-param`：漂 1 + 多 1）。与第 920 轮 `SignatureTailEnd`、第 934 轮 `TypeDefine`
// 那两处**同一条口径**：尾部 trivia 不算区间。
let tail = content.length - 1;
while (tail > 0 && IsTriviaUnit(content[tail])) {
  tail = tail - 1;
}
parameter.SignIn(content[0].SourceRange.Start!);
parameter.SignOut(content[tail].SourceRange.End!);
for (const item of content) {
  parameter.AddAndCloseLast(item);
}
parameter.TryToClose();
rebuilt.push(parameter);
```
