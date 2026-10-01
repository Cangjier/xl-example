# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack, SearchFront, TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IsTypeContainerUnit, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Keyword } from "../keyword.xl.md"
import { JsonObjectReorganization } from "../json/object-literal.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { TernaryOperatorCondition } from "./ternary-operator-condition.xl.md"
import { TernaryOperatorFalseStatement } from "./ternary-operator-false-statement.xl.md"
import { Bracket } from "../bracket.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
import { Statement } from "../statement.xl.md"
import { TernaryOperatorTrueStatement } from "./ternary-operator-true-statement.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符 `条件 ? 真值 : 假值`：把一段包含 `?` 与 `:` 的子单元序列收成一个 `TernaryOperator`。

# class TernaryOperatorReorganization extends Reorganization

它做的事是**把 `? … : …` 收成一个 `TernaryOperator`**：从 `:` 往前找 `?`，再从 `?` 往前找「表达式的起点」，从 `:` 往后找到语句边界，然后把三段分别切进条件 / 真值 / 假值三个子单元。

`TernaryOperatorReorganization` 写在 `TernaryOperator` **之前**。

## static readonly field Instance:TernaryOperatorReorganization = new TernaryOperatorReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个可以当作三元运算符的 `:`。

条件是四层：先要求是 `SymbolToken` 且 `Is(":")`，再往前找 `?`；`?` 不存在（`-1`）或紧邻（`questionIndex == index - 1`）都算不成立。
**第三层是位置**：处在类型位的 `? :` 是**条件类型**，不是三元表达式（判据见下面的 `IsTypePosition`）。
少了这一层，括号里的条件类型会长出一个 `TernaryOperator` 节点
（`type-cond-nested` / `type-cond-union-member` 两条用例报的 `不该有 TernaryOperator` 就是它）。
**第四层是嵌套**：**假值段里还有别的 `?`** 时先不成，把内层让出来。

**为什么必须有第四层**：规则是**按规则轮询、每条规则从左往右扫一遍所有下标**
（见 `core/syntax/token.xl.md` 的 `Reorganize`），所以**靠左的 `:` 先被问到**。
`a ? b : c ? d : e` 这种右结合嵌套里，第一个 `:` 会先把假值段切成 `c ? d : e` 四个平铺单元
（`?` / `:` 都留在里面），内层再也没机会成形。
判据只看**假值段里还有没有 `?`**：有就先不做，等内层被换成一个 `TernaryOperator` 单元、
`?` 从列表里消失，外层下一趟自然成立。配上 `Reorganize` 的重复扫，任意层数的右结合嵌套都成立
（实测 `a ? b : c ? d : e ? f : g` 三层全对）。

**往前找 `?` 时必须先撞上语句边界就停**（第 66 轮修，见 `QuestionIndexBefore`）。
少了这一条实测会把**上一条语句的 `?`** 与**这一条语句的 `:`** 配成一对：

    const a = x ? "t" : "f";
    const b = y ? "t" : "f";
    const c: number[] = [];

`const c` 那个类型标注的 `:` 往前找到了 `y ?`（中间只隔着别的语句），于是第一条三元
把后面两条语句整段吞进真值段、`number[]` 落进假值段——产物里只有一个 `<Statement>`、
只有两个三元、`string[]` / `number[]` 再也长不出 `ArrayType`
（自己的产物 `dist/ts/typescript/tokens/string/string.ts` 实测就是这样，
`cases:align` 的「缺 `ArrayType`」把它抓出来）。

**已知限制：左结合嵌套 `a ? b ? c : d : e` 还不能完全成形。**
TypeScript 的解是 `a ? (b ? c : d) : e`，现状是 `a` / `?` / `b` 平铺，后三层成节点。
试过加「条件段里还有 `?` 就不成」的对称守卫，结果**两层都被挡掉**、整条退化成平铺符号
（这类写法在真实语料里为 0，所以先留着不修；要修得让 `Previous` 有能力判断
「这个 `:` 属于哪一个 `?`」，不能只看平铺列表里的相对位置）。

```ts
const current = Get(units, index);
if (current instanceof SymbolToken && current.Is(":")) {
  if (this.IsTypePosition(current)) {
    return false;
  }
  const questionIndex = this.QuestionIndexBefore(units, index);
  if (questionIndex === -1) {
    return false;
  }
  if (questionIndex === index - 1) {
    return false;
  }
  // **问号后面紧跟 `,` / `]` / `)` ⇒ 它是元组的可选标记**（第 66 轮第三批）：
  // `[A?, …]` 的 `A?` 与 `[name: D?]` 的 `name:` 会凑出一个假的三元对
  // （实测 `type T = [A?, ...B, C, name: D?, ...rest: E[]]` 整条被切成嵌套三元、
  // 元组元素结构全毁）。真正的三元问号后面一定跟着一个**表达式**，
  // 而不是元素分隔符 ✓。
  const afterQuestion = Get(units, SkipNextWrapSymbol(units, questionIndex));
  if (afterQuestion instanceof SymbolToken) {
    const text = afterQuestion.TempToString();
    if (text === "," || text === "]" || text === ")") {
      return false;
    }
  }
  const inFalse = SearchBack(units, questionIndex, (item: Token) => item instanceof SymbolToken && item.Is("?"));
  if (inFalse !== -1) {
    return false;
  }
  return true;
}
return false;
```

## private method QuestionIndexBefore:(units:Array<Token>, index:int)=>int

从 `index` 往左找那个 `?`，**遇到语句边界就放弃**（返回 `-1`）。

两种边界：`;` 符号，以及 `Statement.IsLineBreakBoundary` 认下来的软换行
（`const a = x ? 1 : 2` 换行 `const c: T = v` 这种**没有分号**的排版也挡得住）。

为什么不直接沿用 `SearchFront`：那个函数一路扫到列表开头，会把**上一条语句**的 `?` 认下来。
三元运算符的 `?` 与 `:` 属于**同一个表达式**，中间不可能隔着 `;`，也不可能隔着一个语句边界——
这条判据与 ASI 用的是同一份结论（`typescript/tokens/statement.xl.md`），不再是各写一份近似。

`Previous` 与 `Process` 共用它：两边的「哪个 `?`」必须一致，各写一份就会出现
「判定说有、收集说找不到」的错位（`conditional-type.xl.md` 的 `FindExtendsIndex` 记过同一个教训）。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    return -1;
  }
  if (item instanceof LineWrap) {
    if (Statement.IsLineBreakBoundary(units, i)) {
      return -1;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    if (item.Is("?")) {
      return i;
    }
    if (item.Is(";")) {
      return -1;
    }
    continue;
  }
}
return -1;
```

## private method IsTypePosition:(current:Token)=>bool

这个 `:` 是不是处在**类型位**（那么它的 `? :` 是条件类型而不是三元表达式）。

三处判据，都只用**此刻手上有的东西**：

- **父单元是类型容器**（`../text-common-util.xl.md` 的 `IsTypeContainerUnit`：
  `TypeDefine` / `TypeAssign` / `TupleType` / `MappedType` / `TypeParameter` / `InferType` …）——
  类型里根本没有三元表达式 ✓；
- 父单元是 `GenericType`——泛型实参段里的 `? :`（`Wrap<T extends U ? A : B>`）；
- 父单元是**括号**、且括号里含 `extends`——`(T extends U ? A : B)` 这种**括号里的条件类型**。

**第一条是第 66 轮第三批补的**：元组类型里的**可选元素**写法 `[A?, …]` 与**具名元素**的冒号
（`[name: D?]`）会各自贡献一个 `?` 与一个 `:`，三元规则于是把它们配成一对——
实测 `type T = [A?, ...B, C, name: D?, ...rest: E[]]` 整条被切成一串嵌套的
`<TernaryOperator>`（元组本身的元素结构全毁）。那两种写法都在**类型容器**里，
父单元判据一次就能挡住（元组是 `TupleType`，在容器白名单里）。

第二条为什么看「括号里有没有 `extends`」而不是看「括号的父单元是不是类型宿主」：
括号**有自己的队列**，条件类型是在**括号关闭那一刻**成形的，那时它的父单元还是**语句**
（`TypeAssign` 要等更晚的通用队列才把它收走）。第一版就是按父单元判的，跑出来毫无效果。
`extends` 是个够用的信号：它不是值运算符，值位的三元里不会出现
（`(a instanceof B ? c : d)` 里是 `instanceof`，不是它）。
`let x: A = (cond ? a : b)` 的括号里没有 `extends`，三元照旧成立 ✓。

**必须按文本判、不能只认 `Identifier`**（实测补的）：`extends` 在**第一趟**还是 `Identifier`，
第一趟结束时已经被 `KeywordReorganization` 收成 `Keyword`。只写
`item instanceof Identifier && item.Is("extends")` 时，**第二趟**这个判据全部失灵——
括号里的条件类型会长出 `TernaryOperator`（`type-cond-nested` /
`type-cond-union-member` 两条用例在加两趟之后当场报「不该有 TernaryOperator」）。
判据写成「是 `Identifier` 且文本是 `extends`，**或者**是 `Keyword` 且 `Value` 是 `extends`」就与趟数无关。

**注意 `Identifier` 与 `Keyword` 没有共同的取文本方法**（实测两轮踩坑）：
`Identifier` 有 `Is` / `TempToString`，`Keyword` **两个都没有**、只有 `Value` 字段。
所以必须分两支写；写成 `item.TempToString()` 或 `item.Is(...)` 会在运行期抛
`TypeError: item.TempToString is not a function` / `item.Is is not a function`。

```ts
const parent = current.Parent;
if (parent === null) {
  return false;
}
if (IsTypeContainerUnit(parent)) {
  return true;
}
if (parent instanceof GenericType) {
  return true;
}
if (!(parent instanceof Bracket)) {
  return false;
}
return parent.Data.some((item) => {
  if (item instanceof Identifier) {
    return item.Is("extends");
  }
  if (item instanceof Keyword) {
    return item.Value === "extends";
  }
  return false;
});
```

## static method IsTernaryOperatorStart:(current:Token)=>bool

`current` 能不能当作三元运算符表达式的**起点**。

被 `Process` 当作判定器传给 `SearchFront`。

两条判定：(1) 是 `SymbolToken`，且它的文本算赋值号，或者是 `:` / `=>` / `,` / `;` 之一；(2) 是内容为 `return` 的 `Identifier`。

```ts
if (current instanceof SymbolToken) {
  if (
    current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())
    || current.Is(":")
    || current.Is("=>")
    || current.Is(",")
    || current.Is(";")
  ) {
    return true;
  }
  return false;
}
if (current instanceof Identifier && current.Is("return")) {
  return true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：切出条件 / 真值 / 假值三段，组装成 `TernaryOperator`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。

父单元在不在 JSON 对象里，用 `JsonObjectReorganization.IsObject` 判断。

分隔符的取法：父单元是 JSON 对象时按 `,` 找边界，否则按 `;` 找；找不到（`-1`）就取到列表末尾。

三段都是用 `TakeRange` 切出来的**一批**单元（取出不移除），用 `AddRange` 塞进子单元。

切完之后先查**三段都非空**：`Previous` 只保证「有一个 `?` 在 `:` 前面且不相邻」，
切出来的区间长度仍可能是 0（例如 `:` 前面隔着别的东西、或者 `:` 已经到列表末尾）。
空的时候直接返回原下标、什么都不改——三段的签入都要取 `Data[0]`，那里为 `undefined` 会当场抛内部错误，
而输入本身已经不成形状，交给后面的规则处理更合适。

```ts
const current = Get(units, index)!;
const elseIndex = index;
const questionIndex = this.QuestionIndexBefore(units, index);
const startIndex = SearchFront(units, questionIndex, TernaryOperatorReorganization.IsTernaryOperatorStart);
const parentIsJsonObject = JsonObjectReorganization.Instance.IsObject(current.Parent);
const splitSymbol = parentIsJsonObject ? "," : ";";
let endIndex = SearchBack(units, elseIndex, (item: Token) => item instanceof SymbolToken && item.Is(splitSymbol));
if (endIndex === -1) {
  endIndex = units.length;
}
// 真值段不能越过**下一个 `?`**：`a ? b ? c : d : e` 里 `b ? c` 不是真值段，
// 那个 `?` 属于内层三元（`b ? c : d`）。不夹这一刀，真值段会把内层的 `?` 与 `:` 一起吞进来，
// 内层永远不成形，产物里留下裸的 `?` `:` 符号。
let trueEnd = elseIndex;
const innerQuestion = SearchBack(units, questionIndex, (item: Token) => item instanceof SymbolToken && item.Is("?"));
if (innerQuestion !== -1) {
  trueEnd = innerQuestion;
}const ternaryOperator = new TernaryOperator(template);
ternaryOperator.Parent = current.Parent;
const condition = ternaryOperator.CreateCondition();
const trueStatement = ternaryOperator.CreateTrueStatement();
const falseStatement = ternaryOperator.CreateFalseStatement();
condition.AddRange(TakeRange(units, startIndex + 1, questionIndex - startIndex - 1));
trueStatement.AddRange(TakeRange(units, questionIndex + 1, trueEnd - questionIndex - 1));
falseStatement.AddRange(TakeRange(units, elseIndex + 1, endIndex - elseIndex - 1));
if (condition.Data.length === 0 || trueStatement.Data.length === 0 || falseStatement.Data.length === 0) {
  return index;
}
condition.SignInToken(condition.Data[0]);
condition.SignOutToken(condition.Data[condition.Data.length - 1]);
trueStatement.SignInToken(trueStatement.Data[0]);
trueStatement.SignOutToken(trueStatement.Data[trueStatement.Data.length - 1]);
falseStatement.SignInToken(falseStatement.Data[0]);
falseStatement.SignOutToken(falseStatement.Data[falseStatement.Data.length - 1]);
ternaryOperator.SignInToken(condition);
ternaryOperator.SignOutToken(falseStatement);
condition.TryToClose();
trueStatement.TryToClose();
falseStatement.TryToClose();
ternaryOperator.TryToClose();
return ReplaceCountAt(units, startIndex + 1, endIndex - startIndex - 1, ternaryOperator);
```

# class TernaryOperator extends IndependentToken

三元运算符。

它**没有覆写 `ToXmlString`**，XML 由基类 `Token` 产出：`<TernaryOperator>…</TernaryOperator>`，内容是三个子单元的串接。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## property Condtion:TernaryOperatorCondition

条件子单元。

### get

注意成员名 `Condtion` 是拼错的（少一个 `i`），这里保持原样，调用点跟着用这个名字。

用 `find` 取第一个命中的；`find` 的类型收窄成 `T | undefined`，这里直接断言存在。

```ts
return this.Data.find((item) => item instanceof TernaryOperatorCondition)!;
```

## method CreateCondition:()=>TernaryOperatorCondition

新建一个条件子单元并挂到自己名下。

```ts
return this.Add(new TernaryOperatorCondition(this.Template));
```

## property TrueStatement:TernaryOperatorTrueStatement

真值子单元。

### get

```ts
return this.Data.find((item) => item instanceof TernaryOperatorTrueStatement)!;
```

## method CreateTrueStatement:()=>TernaryOperatorTrueStatement

新建一个真值子单元并挂到自己名下。

```ts
return this.Add(new TernaryOperatorTrueStatement(this.Template));
```

## property FalseStatement:TernaryOperatorFalseStatement

假值子单元。

### get

```ts
return this.Data.find((item) => item instanceof TernaryOperatorFalseStatement)!;
```

## method CreateFalseStatement:()=>TernaryOperatorFalseStatement

新建一个假值子单元并挂到自己名下。

```ts
return this.Add(new TernaryOperatorFalseStatement(this.Template));
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `condition` / `trueStatement` / `falseStatement` 三个**具名分段**。

三个键对应三元表达式在树里的三个子单元：条件、`?` 之后的真值、`:` 之后的假值。
条件那一段的取法写的是 `this.Condtion`——成员名本身就是这么拼的（少一个 `i`），
这里照抄字段名，不另起别名，免得同一个段在源码与产物里出现两个名字。

三段的值都取 `ToList()`：每段都是**一批子单元**的容器，段名必须显式写出来——
摊成扁平的 `children` 之后，「哪一段是真值、哪一段是假值」就再也分不出来了。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("condition", this.Condtion.ToList());
result.set("trueStatement", this.TrueStatement.ToList());
result.set("falseStatement", this.FalseStatement.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

```ts
const result = new TernaryOperator(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
