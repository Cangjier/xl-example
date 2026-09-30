# dependencies
```xl
import { IndependentToken } from "../../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack, SearchFront, TakeRange } from "../../../../core/extensions/list-extension.xl.md"
import { Common } from "../common.xl.md"
import { JsonObjectReorganization } from "../json/json-object.xl.md"
import { Symbol } from "../symbol.xl.md"
import { TernaryOperatorCondition } from "./ternary-operator-condition.xl.md"
import { TernaryOperatorFalseStatement } from "./ternary-operator-false-statement.xl.md"
import { TernaryOperatorTrueStatement } from "./ternary-operator-true-statement.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

三元运算符 `条件 ? 真值 : 假值`：把一段包含 `?` 与 `:` 的子单元序列收成一个 `TernaryOperator`。

# class TernaryOperatorReorganization extends Reorganization

它做的事是**把 `? … : …` 收成一个 `TernaryOperator`**：从 `:` 往前找 `?`，再从 `?` 往前找「表达式的起点」，从 `:` 往后找到语句边界，然后把三段分别切进条件 / 真值 / 假值三个子单元。

`TernaryOperatorReorganization` 写在 `TernaryOperator` **之前**。

## static readonly field Instance:TernaryOperatorReorganization = new TernaryOperatorReorganization()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个可以当作三元运算符的 `:`。

条件是三层：先要求是 `Symbol` 且 `Is(":")`，再往前找 `?`；`?` 不存在（`-1`）或紧邻（`questionIndex == index - 1`）都算不成立。

```ts
const current = Get(units, index);
if (current instanceof Symbol && current.Is(":")) {
  const questionIndex = SearchFront(units, index, (item: Token) => item instanceof Symbol && item.Is("?"));
  if (questionIndex === -1) {
    return false;
  }
  if (questionIndex === index - 1) {
    return false;
  }
  return true;
}
return false;
```

## static method IsTernaryOperatorStart:(current:Token)=>bool

`current` 能不能当作三元运算符表达式的**起点**。

被 `Process` 当作判定器传给 `SearchFront`。

两条判定：(1) 是 `Symbol`，且它的文本算赋值号，或者是 `:` / `=>` / `,` / `;` 之一；(2) 是内容为 `return` 的 `Common`。

```ts
if (current instanceof Symbol) {
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
if (current instanceof Common && current.Is("return")) {
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
const questionIndex = SearchFront(units, index, (item: Token) => item instanceof Symbol && item.Is("?"));
const startIndex = SearchFront(units, questionIndex, TernaryOperatorReorganization.IsTernaryOperatorStart);
const parentIsJsonObject = JsonObjectReorganization.Instance.IsObject(current.Parent);
const splitSymbol = parentIsJsonObject ? "," : ";";
let endIndex = SearchBack(units, elseIndex, (item: Token) => item instanceof Symbol && item.Is(splitSymbol));
if (endIndex === -1) {
  endIndex = units.length;
}
const ternaryOperator = new TernaryOperator(template);
ternaryOperator.Parent = current.Parent;
const condition = ternaryOperator.CreateCondition();
const trueStatement = ternaryOperator.CreateTrueStatement();
const falseStatement = ternaryOperator.CreateFalseStatement();
condition.AddRange(TakeRange(units, startIndex + 1, questionIndex - startIndex - 1));
trueStatement.AddRange(TakeRange(units, questionIndex + 1, elseIndex - questionIndex - 1));
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
