# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceRangeAt, SearchBack, SearchFront } from "../../../core/extensions/list-extension.xl.md"
import { Common } from "./common.xl.md"
import { Symbol } from "./symbol.xl.md"
```

# namespace cangjie

`Dawn/Text`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

逻辑运算符：把 `a && b && c` 这样的表达式按 `&&` / `||` 切成若干个 `LogicalOperator` 单元——每个单元装着**一个操作数与它背后的运算符**，而不是整条表达式。运算符本身不进 `Data`（它是分隔符）。

源文件里同时有两个静态实例（`OrInstance` / `AndInstance`），靠 Reorganization 自己的 `Operator` 字段区分口径；按 M33，展平的嵌套类 `LogicalOperatorReorganization` 写在 `LogicalOperator` **之前**。

# class LogicalOperatorReorganization extends Reorganization

原 C# 是嵌套类 `LogicalOperator.Reorganization`（M32 展平改名）。

与其它 token 的重组类不同，它**是带状态的**：构造时就固定一个运算符，`Previous` / `Process` 都按这个运算符工作。原 C# 因此给了两个静态实例，而不是一个 `Instance`。

`Process` 的形态也更绕：它把 `[startIndex + 1, endIndex)` 这一段按运算符切分，连续的操作数攒成一个 `LogicalOperator`，每遇到一个运算符就把攒好的那个收走、重新开一个。

## constructor:(operator:string)=>void

原 C# 是 `public Reorganization(string @operator)`，参数名在 C# 里要转义才不撞关键字；ts 侧没有这个限制。

```ts
super();
this.Operator = operator;
```

## field Operator:string = "||"

本规则认的运算符，`"||"` 或 `"&&"`。原 C# 是 `public string Operator { get; set; } = "||";`。

## static readonly field OrInstance:LogicalOperatorReorganization = new LogicalOperatorReorganization("||")

`||` 口径的实例。原 C# 是静态属性 `public static Reorganization OrInstance { get; } = new("||");`，按 M19 落成静态只读字段。

## static readonly field AndInstance:LogicalOperatorReorganization = new LogicalOperatorReorganization("&&")

`&&` 口径的实例。原 C# 是静态属性 `public static Reorganization AndInstance { get; } = new("&&");`。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本规则认的那个运算符符号。

原 C# 是一句 `units.Get(index) is Symbol elseSymbol && elseSymbol.Is(Operator)`。

```ts
const current = Get(units, index);
return current instanceof Symbol && current.Is(this.Operator);
```

## method IsLogicalOperatorStart:(current:Token, logicalOperatorSymbol:string)=>bool

`current` 是不是「逻辑运算符段的起点」。

原 C# 是 `public bool IsLogicalOperatorStart(Token<char> current, string logicalOperatorSymbol)`，四种命中：

- 是 `Symbol`，且被 `SymbolTemplate.IsAssignmentSymbol` 认成赋值符号；
- 是 `Symbol`，且内容是 `,` / `;` / `:` / `?` / `=>`；
- 是 `Symbol`，内容是 `||`，且**本规则的**运算符是 `&&`（`&&` 段被 `||` 截断）；
- 是内容为 `return` 的 `Common`，或者是 `Operator` 等于 `logicalOperatorSymbol` 的 `LogicalOperator`。

`else` 分支之间互斥，ts 侧展开成连续的 `if`，语义相同。

```ts
if (current instanceof Symbol) {
  if (current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())) {
    return true;
  }
  if (current.Is(",") || current.Is(";") || current.Is(":") || current.Is("?") || current.Is("=>")) {
    return true;
  }
  if (this.Operator === "&&" && current.Is("||")) {
    return true;
  }
  return false;
}
if (current instanceof Common && current.Is("return")) {
  return true;
}
return current instanceof LogicalOperator && current.Operator === logicalOperatorSymbol;
```

## method IsLogicalOperatorEnd:(current:Token, logicalOperatorSymbol:string)=>bool

`current` 是不是「逻辑运算符段的终点」。比 `IsLogicalOperatorStart` 窄：只认 `,` / `;` / `?` / `:`，以及「本规则是 `&&`、`current` 是 `||`」这一条；**不**认赋值符号、`=>`、`return`。

原 C# 是 `public bool IsLogicalOperatorEnd(Token<char> current, string logicalOperatorSymbol)`；注意第二个参数在体里**没有被用到**——照抄，不要删。

```ts
if (current instanceof Symbol) {
  if (current.Is(",") || current.Is(";") || current.Is("?") || current.Is(":")) {
    return true;
  }
  if (this.Operator === "&&" && current.Is("||")) {
    return true;
  }
  return false;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按运算符切分 `[startIndex + 1, endIndex)`，把每一段操作数收成一个 `LogicalOperator`，**返回新的下标**。

原 C# 是 `void Process(…, ref int index)`，按 M15 改成返回值。要点：

- `startIndex` 是往前找到的段起点，`endIndex` 是往后找到的段终点；`endIndex == -1` 时取 `units.Count`。
- 原 C# 用局部函数 `appendToLogicalOperator` 在「攒」的时候惰性建单元，闭包里改写外层的 `itemLogicalOperator`；ts 侧把它**内联**到唯一的调用点（循环的 `else` 分支），避免闭包改写外层变量，语义逐句对应。
- 遇到运算符就要求当前攒着的单元非空（否则抛），把它收进 `logicalOperators` 并清空，准备攒下一个。
- 每个攒好的单元用**它自己的首尾子单元**签入签出——`Data.First()` / `Data.Last()` 是 LINQ 取首尾元素，落到 ts 是 `Data[0]` / `Data[Data.length - 1]`（**不是** `Token.Last()`，那个取的是「倒数第几个子单元」）。
- `SignIn(Token)` / `SignOut(Token)` 是传 Token 的重载，按 M14(c) / §7.3 改名为 `SignInToken` / `SignOutToken`。
- `units.ReplaceRangeAt(startIndex + 1, count, logicalOperators)` 返回**最后一个插入位置**，直接成为新下标。

```ts
const current = Get(units, index) as Symbol;
const startIndex = SearchFront(units, index, (item) => this.IsLogicalOperatorStart(item, this.Operator));
let endIndex = SearchBack(units, index, (item) => this.IsLogicalOperatorEnd(item, this.Operator));
if (endIndex === -1) {
  endIndex = units.length;
}
let itemLogicalOperator: LogicalOperator | null = null;
const logicalOperators: LogicalOperator[] = [];
for (let i = startIndex + 1; i < endIndex; i++) {
  const item = Get(units, i);
  if (item instanceof Symbol && item.Is(this.Operator)) {
    if (itemLogicalOperator === null) {
      throw new Error("NullReferenceException: LogicalOperator is null");
    }
    logicalOperators.push(itemLogicalOperator);
    itemLogicalOperator = null;
  } else {
    if (itemLogicalOperator === null) {
      itemLogicalOperator = new LogicalOperator(template);
      itemLogicalOperator.Parent = current.Parent;
      itemLogicalOperator.Operator = this.Operator;
    }
    itemLogicalOperator.Add(item!);
  }
}
if (itemLogicalOperator !== null) {
  logicalOperators.push(itemLogicalOperator);
}
for (const logicalOperator of logicalOperators) {
  logicalOperator.SignInToken(logicalOperator.Data[0]);
  logicalOperator.SignOutToken(logicalOperator.Data[logicalOperator.Data.length - 1]);
  logicalOperator.TryToClose();
}
return ReplaceRangeAt(units, startIndex + 1, endIndex - startIndex - 1, logicalOperators);
```

# class LogicalOperator extends IndependentToken
一个操作数加它背后的逻辑运算符。

原 C# 侧是 `public class LogicalOperator : IndependentToken<char>`。按 M31，`char` 在规范里写 `string`。

它覆写了 `ToXmlString`：标签名是运行时类名，另外把 `"||"` / `"&&"` 翻译成 `Or` / `And` 放进 `Operator` 属性（**不是**原样的 `||` / `&&`）。这是验收核心，与 C# 逐字对照。

## constructor:(template:Template)=>void

转调基类构造器，然后从重组模板里取出「本类」对应的一组重组规则。

原 C# 的构造体只有一句 `ReorganizationQueue = template.ReorganizationTemplate.Get(typeof(LogicalOperator));`；`typeof(X)` 按 §3.8 落成类对象 `X`（`SequenceTemplate` 以类对象为键）。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(LogicalOperator);
```

## field Operator:string = "||"

本单元背后的运算符。原 C# 是 `public string Operator { get; set; } = "||";`。

注意它只影响 `ToXmlString` 里的 `Or` / `And` 翻译——`Data` 里装的是操作数，运算符本身不在里面。

## method ToXmlString:()=>string

产出 XML：`<LogicalOperator Operator="Or|And">子单元的 XML 串接</LogicalOperator>`。

原 C# 是 `$"<{name} Operator=\"{operatorName}\">{temp.Join("")}</{name}>"`，其中 `name = GetType().Name`（按 M17 写成 `this.constructor.name`），`operatorName = Operator == "||" ? "Or" : "And"`，`temp` 是每个子单元的 `ToXmlString()` 串接。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
const operatorName = this.Operator === "||" ? "Or" : "And";
return `<${name} Operator="${operatorName}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

原 C# 的顺序是：`new LogicalOperator(...) { Operator = Operator }`（对象初始化器）→ `Sign(this)` → `Add(Data.Select(item => item.Clone()))` → `TryToClose()`；ts 侧把初始化器拆成先 `new` 再赋值，批量 `Add` 按 M14(c) 写成 `AddRange`。

```ts
const result = new LogicalOperator(this.Template);
result.Operator = this.Operator;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
