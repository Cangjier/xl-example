# dependencies
```xl
import { IOwner } from "../../../../owners/i-owner.xl.md"
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

原 C# 是嵌套类 `TernaryOperator.Reorganization`（M32 展平改名）。

它做的事是**把 `? … : …` 收成一个 `TernaryOperator`**：从 `:` 往前找 `?`，再从 `?` 往前找「表达式的起点」，从 `:` 往后找到语句边界，然后把三段分别切进条件 / 真值 / 假值三个子单元。

按 M33，展平的嵌套类写在 `TernaryOperator` **之前**。

## static readonly field Instance:TernaryOperatorReorganization = new TernaryOperatorReorganization()

唯一的实例。

原 C# 是静态属性 `public static Reorganization Instance { get; } = new();`，按 M19 落成静态只读字段，调用点形态不变。

## method Previous:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个可以当作三元运算符的 `:`。

原 C# 的条件是三层：先要求是 `Symbol` 且 `Is(":")`，再往前找 `?`，`?` 不存在（`-1`）或紧邻（`questionIndex == index - 1`）都算不成立。

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

原 C# 是静态方法 `public static bool IsTernaryOperatorStart(Token<char> current)`，被 `Process` 当作判定器传给 `SearchFront`。

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

## method Process:(owner:IOwner, template:Template, units:Array<Token>, index:int)=>int

执行重组：切出条件 / 真值 / 假值三段，组装成 `TernaryOperator`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。

有一处 ts 侧的差异：C# 用 `Json.JsonObject.Reorganization.IsObject(current.Parent)` 判断父单元在不在 JSON 对象里；ts 侧对应展平后的 `JsonObjectReorganization.IsObject`。

分隔符的取法：父单元是 JSON 对象时按 `,` 找边界，否则按 `;` 找；找不到（`-1`）就取到列表末尾。

三段都是用 `TakeRange` 切出来的**一批**单元，原 C# 靠 `Add<T>(IEnumerable<T>)` 重载塞进子单元；按 M14(c) 那个重载在 ts 侧改名成 `AddRange`，所以这里写 `condition.AddRange(...)`。

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
const ternaryOperator = new TernaryOperator(owner, template);
ternaryOperator.Parent = current.Parent;
const condition = ternaryOperator.CreateCondition();
const trueStatement = ternaryOperator.CreateTrueStatement();
const falseStatement = ternaryOperator.CreateFalseStatement();
condition.AddRange(TakeRange(units, startIndex + 1, questionIndex - startIndex - 1));
trueStatement.AddRange(TakeRange(units, questionIndex + 1, elseIndex - questionIndex - 1));
falseStatement.AddRange(TakeRange(units, elseIndex + 1, endIndex - elseIndex - 1));
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

原 C# 侧是 `public class TernaryOperator : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它**没有覆写 `ToXmlString`**，XML 由基类 `Token` 产出：`<TernaryOperator>…</TernaryOperator>`，内容是三个子单元的串接。它的 `ToDictionary` 也是少数**不带 `type` 键**的实现——只有 `condition` / `trueStatement` / `falseStatement` 三个键。

## constructor:(owner:IOwner, template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(owner, template);
```

## property Condtion:TernaryOperatorCondition

条件子单元。

### get

原 C# 是 `public TernaryOperatorCondition Condtion => (TernaryOperatorCondition)Data.First(item => item is TernaryOperatorCondition);`——注意成员名在原 C# 里就是拼错的 `Condtion`，这里照抄，以免调用点对不上。

ts 侧用 `find` 取第一个命中的；`find` 的类型收窄成 `T | undefined`，这里按原实现直接断言存在。

```ts
return this.Data.find((item) => item instanceof TernaryOperatorCondition)!;
```

## method CreateCondition:()=>TernaryOperatorCondition

新建一个条件子单元并挂到自己名下。

原 C# 是 `public TernaryOperatorCondition CreateCondition() { return Add(new TernaryOperatorCondition(Owner, Template)); }`。

```ts
return this.Add(new TernaryOperatorCondition(this.Owner, this.Template));
```

## property TrueStatement:TernaryOperatorTrueStatement

真值子单元。

### get

原 C# 是 `public TernaryOperatorTrueStatement TrueStatement => (TernaryOperatorTrueStatement)Data.First(item => item is TernaryOperatorTrueStatement);`。

```ts
return this.Data.find((item) => item instanceof TernaryOperatorTrueStatement)!;
```

## method CreateTrueStatement:()=>TernaryOperatorTrueStatement

新建一个真值子单元并挂到自己名下。

原 C# 是 `public TernaryOperatorTrueStatement CreateTrueStatement() { return Add(new TernaryOperatorTrueStatement(Owner, Template)); }`。

```ts
return this.Add(new TernaryOperatorTrueStatement(this.Owner, this.Template));
```

## property FalseStatement:TernaryOperatorFalseStatement

假值子单元。

### get

原 C# 是 `public TernaryOperatorFalseStatement FalseStatement => (TernaryOperatorFalseStatement)Data.First(item => item is TernaryOperatorFalseStatement);`。

```ts
return this.Data.find((item) => item instanceof TernaryOperatorFalseStatement)!;
```

## method CreateFalseStatement:()=>TernaryOperatorFalseStatement

新建一个假值子单元并挂到自己名下。

原 C# 是 `public TernaryOperatorFalseStatement CreateFalseStatement() { return Add(new TernaryOperatorFalseStatement(Owner, Template)); }`。

```ts
return this.Add(new TernaryOperatorFalseStatement(this.Owner, this.Template));
```

## method ToDictionary:()=>Map<string, any>

转成字典：只有 `condition` / `trueStatement` / `falseStatement` 三个键，各自是三段子单元的 `ToList()`。

原 C# 用集合初始化器一次写出三个键，**没有** `type` 键——这一点与基类 `Token.ToDictionary` 不同，照抄。

```ts
const result = new Map<string, any>();
result.set("condition", this.Condtion.ToList());
result.set("trueStatement", this.TrueStatement.ToList());
result.set("falseStatement", this.FalseStatement.ToList());
return result;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是 `Sign(this)` → `Add(Data.Select(x => x.Clone()))` → `TryToClose()`；按 M14(c) 用 `AddRange`。

```ts
const result = new TernaryOperator(this.Owner, this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
