# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceRangeAt, SearchBack, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
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

`index` 处是不是本规则认的那个运算符符号，**而且这一段里没有还没折完的成员访问**。

**为什么要看那一眼**（第 598 轮）：本规则把**一整段**收成一个单元，而本单元**不装规则队列**
（见 `LogicalOperator` 的构造器）⇒ 段里还是平铺的东西就**再也没人折它**。

`NotNull` 恰好比 `PropertyAccess` **晚**成形（队列次序：`PropertyAccess` → … → `NotNull` → …
→ 本规则），所以 `a || f()!.p` 到这一刻段里是 `[a, ||, NotNull, ., p]` ——
本规则一收，`.p` 就永远挂在 `NotNull` 旁边当兄弟了 ⇒ 树是 `a || (f()!.p)` 里那半截，
投影把 `p` 当成一个**自由名字** ⇒ 降级层报 `name is not a local or a capture: p`
（**整份文件进不来**，判据 `c371-e2e-multi-source-merge`）。

放过这一趟之后：下一趟 `PropertyAccessCloseRule` 先把 `NotNull . p` 折成一个单元，
本规则再收这一段就是对的。判据只看「`.` 前面那一个实义单元是不是 `NotNull`」——
那正是 `property-access.xl.md` 的 `IsChainBase` 会认、且保证下一趟一定折掉的那一格。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || current.Is(this.op) === false) {
  return false;
}
const range = this.SegmentRange(units, index);
for (let i = range[0] + 1; i < range[1]; i++) {
  const item = Get(units, i);
  if (!(item instanceof SymbolToken) || item.Is(".") === false) {
    continue;
  }
  const before = Get(units, SkipPreviousWrapSymbol(units, i));
  if (before !== null && before.constructor.name === "NotNull") {
    return false;
  }
}
return true;
```

## private method SegmentRange:(units:Array<Token>, index:int)=>Array<int>

`index` 处那个运算符所在的整段 `[startIndex, endIndex)`：往前找到「段起点」的后一格、
往后找到「段终点」（找不到终点就是列表末尾）。

`Previous` 要拿它看段里有没有没折完的成员访问、`Process` 要拿它切段——
**两处必须是同一段**，所以只有这一份算法。

```ts
const startIndex = SearchFront(units, index, (item) => this.IsLogicalOperatorStart(item, this.op));
let endIndex = SearchBack(units, index, (item) => this.IsLogicalOperatorEnd(item, this.op));
if (endIndex === -1) {
  endIndex = units.length;
}
return [startIndex, endIndex];
```

## method IsLogicalOperatorStart:(current:Token, logicalOperatorSymbol:string)=>bool

`current` 是不是「逻辑运算符段的起点」。

五种命中：

- 是 `SymbolToken`，且被 `SymbolTemplate.IsAssignmentSymbol` 认成赋值符号；
- 是 `SymbolToken`，且内容是 `,` / `;` / `:` / `?` / `=>`；
- 是 `SymbolToken`，内容是 `||`，且**本规则的**运算符是 `&&`（`&&` 段被 `||` 截断）；
- **是 `SymbolToken` 且 `FromCompoundAssignment` 为真**（第 603 轮）——`a += b || c` 展开成
  `a = a + b || c`，那个 `+` 是**插进来的副本**、不是用户写的运算符：它右边的 `b || c` 才是
  整个赋值右侧（JS 里右侧是一个完整的 AssignmentExpression）。不回这里截断的话，
  这段逻辑会一路扫回到 `=`，把副本**左边的克隆**也收进同一段
  ⇒ 段里平铺着 `[a, +, b, ||, c]` ⇒ 逻辑先折一次、`+` 再也折不到
  ⇒ `k += 0 || 5` 给 `-2`（判据 `c373-ex-compound-assign-logical-rhs`；JS 给 `4`）。
  与 `compound-assignment-operator.xl.md` 的 `FromCompoundAssignment` 是**同一个标记**。
- 是内容为 `return` 的 `Identifier`，或者是 `op` 等于 `logicalOperatorSymbol` 的 `LogicalOperator`。

**第 738 轮把 `return` 那一格补成四个词**（`yield` / `await` / `throw`）：它们与 `return`
在这一点上是**同一件事**——都是「**自己不是一个操作数、后面那一段才是**」的前缀词。
少这一格的症状是**整份文件跑不进来**：`yield 1 && 2` 的 `yield` 被当成链子的左操作数
⇒ 产物是 `LogicalOperator[yield, 1, &&, 2]` ⇒ 投影取 `kids[0]`（那个词）当 `left`、
`1` **一个字都没留下**，而那个词在链子里是 `Identifier`（不是 `Keyword`）
⇒ 投影层给 `yield` / `await` 准备的那两支（`kids[0].Tag() === "Keyword"`）
够不着它 ⇒ 降级期报 `name is not a local or a capture: yield`。

**与 `return` 同一句判定、同一处**：段从**那个词的后面一格**开始，
词自己留在外面当兄弟（`return a + b` 的产物就是这个形状：
`Keyword(return)` + `BinaryOperator`），`yield` / `await` 那两支投影按同一形状读。
**`throw` 也一样**（`throw x || new Error(…)` 在 `KEYWORD_STATEMENT_KINDS` 里
已经是一条 `ThrowStatement`，缺的只是这一格不让它被卷进逻辑段）。

分支之间互斥，展开成连续的 `if`，语义相同。

```ts
if (current instanceof SymbolToken) {
  if (current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())) {
    return true;
  }
  if (current.FromCompoundAssignment) {
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
if (current instanceof Identifier
  && (current.Is("return") || current.Is("yield") || current.Is("await") || current.Is("throw"))) {
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
const range = this.SegmentRange(units, index);
const startIndex = range[0];
const endIndex = range[1];
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

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **第 993 轮**：`ctx.TextOf` → `ctx.ValueOf` —— 只读那一格**自己记的**值，
  // 不回原文兜底（见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）。
  const kids = ctx.Kids(v);
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length; i++) {
    if (!ctx.IsOperatorUnit(kids[i])) continue;
    const rank = ctx.OperatorRank(ctx.ValueOf(kids[i]));
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  const declaredOp = v.op;
  const left = opIndex > 0 ? ctx.Expression(kids.slice(0, opIndex)) : undefined;
  if (opIndex > 0 && kids[opIndex].Tag() === "SymbolToken") {
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
return `<${name} range="${this.RangeOf()}" op="${operatorName}">${temp.join("")}</${name}>`;
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
