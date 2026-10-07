# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceRangeAt, SearchBack, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

逻辑运算符：把 `a && b && c` 这样的表达式按 `&&` / `||` 切成若干个 `LogicalOperator` 单元——每个单元装着**一段操作数与跟在它后面的那个运算符**（最后一个单元只有操作数）。运算符符号**进 `Data`**（它是这一段的尾巴，不再是纯粹的分隔符）。

**为什么运算符符号必须进树**（第 71 轮改）：原来它是分隔符、不进 `Data`，于是 `a || b` 的产物是**两个**只有左操作数的单元——
`LogicalOperator(a) LogicalOperator(b)`，运算符符号与右操作数在投影层无法还原成 TS 的
`BinaryExpression(left, operatorToken, right)`（真实语料 `BarBarToken` 缺 822、`AmpersandAmpersandToken` 缺 574、
`BinaryExpression` 缺 668 + 漂移 1220，全是这一条）。现在 `a || b` 收成一个单元
`LogicalOperator > [Identifier(a), SymbolToken(||), Identifier(b)]`，投影层按符号左结合折叠即可。

源文件里同时有两个静态实例（`OrInstance` / `AndInstance`），靠 CloseRule 自己的 `op` 字段区分口径；`LogicalOperatorCloseRule` 写在 `LogicalOperator` **之前**。

# class LogicalOperatorCloseRule extends CloseRule

与其它 token 的重组类不同，它**是带状态的**：构造时就固定一个运算符，`Previous` / `Process` 都按这个运算符工作。因此这里给了两个静态实例，而不是一个 `Instance`。

`Process` 的形态也更绕：它把 `[startIndex + 1, endIndex)` 这一段按运算符切分，连续的操作数攒成一个 `LogicalOperator`，每遇到一个运算符就把攒好的那个收走、重新开一个。

## constructor:(operator:string)=>void

参数名 `operator` 直接用，ts 里不需要转义。

```ts
super();
this.op = operator;
```

## field op:string = "||"

本规则认的运算符，`"||"` 或 `"&&"`。

## static readonly field OrInstance:LogicalOperatorCloseRule = new LogicalOperatorCloseRule("||")

`||` 口径的实例。

## static readonly field AndInstance:LogicalOperatorCloseRule = new LogicalOperatorCloseRule("&&")

`&&` 口径的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是本规则认的那个运算符符号。

```ts
const current = Get(units, index);
return current instanceof SymbolToken && current.Is(this.op);
```

## method IsLogicalOperatorStart:(current:Token, logicalOperatorSymbol:string)=>bool

`current` 是不是「逻辑运算符段的起点」。

四种命中：

- 是 `SymbolToken`，且被 `SymbolTemplate.IsAssignmentSymbol` 认成赋值符号；
- 是 `SymbolToken`，且内容是 `,` / `;` / `:` / `?` / `=>`；
- 是 `SymbolToken`，内容是 `||`，且**本规则的**运算符是 `&&`（`&&` 段被 `||` 截断）；
- 是内容为 `return` 的 `Identifier`，或者是 `op` 等于 `logicalOperatorSymbol` 的 `LogicalOperator`。

分支之间互斥，展开成连续的 `if`，语义相同。

```ts
if (current instanceof SymbolToken) {
  if (current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())) {
    return true;
  }
  if (current.Is(",") || current.Is(";") || current.Is(":") || current.Is("?") || current.Is("=>")) {
    return true;
  }
  if (this.op === "&&" && current.Is("||")) {
    return true;
  }
  return false;
}
if (current instanceof Identifier && current.Is("return")) {
  return true;
}
return current instanceof LogicalOperator && current.op === logicalOperatorSymbol;
```

## method IsLogicalOperatorEnd:(current:Token, logicalOperatorSymbol:string)=>bool

`current` 是不是「逻辑运算符段的终点」。比 `IsLogicalOperatorStart` 窄：只认 `,` / `;` / `?` / `:`，以及「本规则是 `&&`、`current` 是 `||`」这一条；**不**认赋值符号、`=>`、`return`。

注意第二个参数在体里**没有被用到**——不要删。

```ts
if (current instanceof SymbolToken) {
  if (current.Is(",") || current.Is(";") || current.Is("?") || current.Is(":")) {
    return true;
  }
  if (this.op === "&&" && current.Is("||")) {
    return true;
  }
  return false;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

按 `op` 把一段逻辑表达式收成一个 `LogicalOperator`：**子单元的原文顺序就是 `左 运算符 右 运算符 …`**。

形态是**整段一个单元**（不是按运算符切成一串单元）——这样投影层才能按符号左结合地折出
TS 的 `BinaryExpression(left, operatorToken, right)`；切成多个单元时运算符夹在两个单元之间，
位置与归属都还原不出来。这一段的范围从前一个「段起点」到后一个「段终点」：

- 符号在 `Data` 里的位置：`a || b && c` 里先由 `&&` 那一趟收成 `a || [b && c]`，
  再由 `||` 这一趟往下展开成 `[a, ||, b, &&, c]`——展开时把内层那个 `LogicalOperator` 的子单元摊平接上。
- 内层单元的 `op` 与外层不同时**整体覆盖**成外层那个（一个单元只报一种 `op`）；
  产物只拿它做 `Or` / `And` 的翻译，符号本身的身份由 `SymbolToken` 承担。
- 收尾：用**首尾子单元**签入签出（`Data[0]` / `Data[Data.length - 1]`，不是 `Token.Last()`）。
- 传 Token 的那两个重载叫 `SignInToken` / `SignOutToken`；`ReplaceRangeAt` 要的是一批单元，
  所以单元素版是 `Add`、整批展开是 `AddRange`。

```ts
const current = Get(units, index) as SymbolToken;
const startIndex = SearchFront(units, index, (item) => this.IsLogicalOperatorStart(item, this.op));
let endIndex = SearchBack(units, index, (item) => this.IsLogicalOperatorEnd(item, this.op));
if (endIndex === -1) {
  endIndex = units.length;
}
const result = new LogicalOperator(template);
result.Parent = current.Parent;
result.op = this.op;
for (let i = startIndex + 1; i < endIndex; i++) {
  const item = Get(units, i)!;
  if (item instanceof LogicalOperator) {
    result.AddRange(item.Data);
  } else {
    result.Add(item);
  }
}
if (result.Data.length === 0) {
  throw new Error("LogicalOperator 为空");
}
result.SignInToken(result.Data[0]);
result.SignOutToken(result.Data[result.Data.length - 1]);
result.TryToClose();
return ReplaceRangeAt(units, startIndex + 1, endIndex - startIndex - 1, [result]);
```

# class LogicalOperator extends IndependentToken
一段操作数，以及跟在它背后的那个逻辑运算符（`SymbolToken` 本身就是 `Data` 的**最后一个**子单元；最后一段没有运算符）。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`：标签名是运行时类名，另外把 `"||"` / `"&&"` 翻译成 `Or` / `And` 放进 `op` 属性（**不是**原样的 `||` / `&&`）。

## method PrintAst:(ctx:any, v:any)=>any

`a && b || c` 的链 → **左结合的嵌套 `BinaryExpression`**（**从 `ts-ast.xl.md` 的
`projectBinary` 整块搬来**，第 196 轮——本类与 `BinaryOperator` **共用同一份实现**，
所以这里那一份与 `tokens/binary-operator.xl.md` 的同名方法逐字相同）。

**切在优先级最低的运算符上**（第 88 轮）：原来取**第一个**运算符、右边整段递归，
四段逻辑链会被折成**右结合**，而 TS 是左结合（四个节点都从第一个操作数起、终点逐个增长）。

**运算符在树里**时从 `left` 起按 TS 的结合性折（`ctx.FoldBinaryFrom`）。

**两侧都没有时不要发空壳**：产物里有一类残缺的 `LogicalOperator`（只有 `op` 属性、
运算符符号根本没进树，而且左右两块还散成了平级兄弟）——那是 token 层的结构问题，
投影这里治不了根，但至少不能凭空造一个既没有 `left` 也没有 `right` 的 `BinaryExpression`
（实测 1118 处）。退回把子单元投出来，让里面的节点还能对上。

```ts
  const kids = ctx.Kids(v);
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length; i++) {
    if (!ctx.IsOperatorUnit(kids[i])) continue;
    const rank = ctx.OperatorRank(ctx.TextOf(kids[i]));
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  const declaredOp = v.attrs.get("op");
  const left = opIndex > 0 ? ctx.Expression(kids.slice(0, opIndex)) : undefined;
  if (opIndex > 0 && kids[opIndex].get("type") === "SymbolToken") {
    return ctx.FoldBinaryFrom(left, kids.slice(opIndex));
  }
  const right =
    opIndex >= 0 && opIndex + 1 < kids.length ? ctx.Expression(kids.slice(opIndex + 1)) : undefined;
  if (left === undefined && right === undefined) {
    return kids.length > 0 ? ctx.Expression(kids) : undefined;
  }
  const opNode =
    opIndex >= 0
      ? ctx.Project(kids[opIndex])
      : {
          kind: ctx.TokenKind(typeof declaredOp === "string" ? declaredOp : "?"),
          pos: v.start,
          end: v.start,
        };
  return {
    kind: "BinaryExpression",
    left,
    operatorToken: opNode,
    right,
    pos: left ? left.pos : v.start,
    end: right ? right.end : v.end,
  };
```

## constructor:(template:Template)=>void

转调基类构造器。**不装规则队列**——运算符符号进 `Data` 之后，本单元自己的子单元里就有那个符号；
再挂上 `LogicalOperatorCloseRule` 会让 `Reorganize` 反复认出自己（实测栈溢出：
`LogicalOperator → Reorganize → Process → TryToClose → Reorganize → …`）。
段内的操作数本来就已经在**外层**那一趟里成形了，不需要本单元再跑一遍。

```ts
super(template);
```

## field op:string = "||"

本单元背后的运算符（同一段里只会有一种，混用的那一段由两个实例分两趟收，见 `Process`）。

它只影响 `ToXmlString` / `ToDictionary` 里的 `Or` / `And` 翻译——**运算符符号本身是 `Data` 的最后一个子单元**，
所以投影层不必从 `op` 反推运算符在原文里的位置（反推不出来：区间要的是那个符号自己的位置）。

## method ToXmlString:()=>string

产出 XML：`<LogicalOperator op="Or|And">子单元的 XML 串接</LogicalOperator>`。

标签名取 `this.constructor.name`，属性值是 `op === "||" ? "Or" : "And"`，内容是每个子单元的 `ToXmlString()` 串接。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
const operatorName = this.op === "||" ? "Or" : "And";
return `<${name} op="${operatorName}">${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 AST JSON 节点：类型名 + 逻辑运算符 + 操作数。

`op` 键与 XML 属性同名，值**照抄同一句翻译** `this.op === "||" ? "Or" : "And"`——
两个出口对同一个字段必须说同一句话，所以这里不另写一套判定，也不把原始的 `||` / `&&` 泄进 JSON。
`Data` 里的操作数进 `children`；为空时不写这个键。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("op", this.op === "||" ? "Or" : "And");
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是：`new` 出单元 → 赋 `op` → `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new LogicalOperator(this.Template);
result.op = this.op;
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
