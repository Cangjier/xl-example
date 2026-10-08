# dependencies
```xl
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceRangeAt, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

复合赋值运算符 `+=` / `-=` / `*=` 这类：把 `符号 + 赋值号` 拆开成两个符号，再把左侧表达式的副本补回来。

它**不改写**成别的结构，只在单元序列里做一次「切 + 插」——下游照样看到原始的符号与单元。动机是执行层需要一个能单独取到的运算符符号副本。

以 `a += b` 为例（单元序列 `a` `+=` `b`，下标 0 / 1 / 2）：

1. `current`（`+=`）丢掉**除最后一个字符以外**的字符（`+=` → `=`，`<<=` → `=`），
   `operatorSymbol` 副本丢掉**最后一个**字符（`+=` → `+`，`<<=` → `<<`）。
2. 副本被塞进「本次插入的一批单元」的**末尾**。
3. 用 `SearchFront` 从 `index - 1` 往前找赋值表达式起点，把起点之后到 `index` 之间的单元**逐个克隆**，排在副本前面。
4. 整批在 `index + 1` 处纯插入。

于是 `a += b` 的单元序列变成 `a` `=` `a` `+` `b`，下游的二元规则再把 `a + b` 折成一个节点；
`a <<= b` 同样得到 `a` `=` `a` `<<` `b`（**三字符运算符靠第 1 步按长度切**，见 `Process` 的说明）。

`CompoundAssignmentOperatorCloseRule` 写在 `CompoundAssignmentOperator` 之前——
它的 `Instance` 静态字段在类定义时立即求值，而 `Root` 的规则队列会直接引用 `CompoundAssignmentOperatorCloseRule.Instance`。

# class CompoundAssignmentOperatorCloseRule extends CloseRule

## static readonly field Instance:CompoundAssignmentOperatorCloseRule = new CompoundAssignmentOperatorCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个复合赋值符号。

命中就是 `true`，否则 `false`，合成一个表达式。

注意这里用的是**参数传进来的** `template`，而不是 `current.Template`——两个模板在本工程的调用路径上是同一个对象，所以这样写是安全的。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken)) {
  return false;
}
if (current.FromCompoundAssignment) {
  return false;
}
return template.SymbolTemplate.IsCompoundAssignmentSymbol(current.TempToString());
```

**`FromCompoundAssignment` 那一支是防自反馈的**：`Process` 会插回一份运算符副本
（`&&=` 切出来的 `&&`），那份副本本身也在 `CompoundAssignmentSymbols` 的判据范围内，
不挡掉就会被反复切开、单元数量来回翻倍（实测 `run.mjs` OOM）。见 `Process` 的说明。

## static method IsCompoundAssignmentOperatorStart:(current:Token)=>bool

`current` 能不能当作**赋值表达式的起点**——`Process` 用它向前找「这段赋值从哪儿开始」。

被 `Process` 当作判定器传给 `SearchFront`。三条判定：

1. 是 `SymbolToken`：文本算赋值号（`IsAssignmentSymbol`），或者是 `,` / `;` / `:` / `?` 之一。
2. 是内容为 `return` 的 `Identifier`。
3. 是**已经成形的语句级单元**，或者一个 `}` 收尾的括号。

**第 3 条是必须的**（实测）：`x => x` 换行 `a += 1` 里，`=>` 往左的实义单元是那个已经收好的 `Lamda`；
不把它当起点，`SearchFront` 会一路跨过换行、把上一行整段当成「等号左边」克隆一遍——
产物里那个 `<Lamda>` 于是出现两次，而且两条语句被并进**同一个** `Statement`
（`cases:boundaries` 当场报「被 `<Statement>` 横跨」）。
块语句同理：`{ A }a += 1` 里 `}` 就是上一段的结尾。

**为什么用类名而不是 `instanceof`**：`statement.xl.md` 已经在 `IsStatementUnit` 里
用类名认 `Let`（避免 `let.xl.md` → `statement.xl.md` 的循环依赖），这里沿用同一条约定——
本文件只需要「是不是一个已经收好的单元」这一个信息，不需要认识那些类。

```ts
if (current instanceof SymbolToken) {
  if (current.Template.SymbolTemplate.IsAssignmentSymbol(current.TempToString())) {
    return true;
  }
  if (current.Is(",") || current.Is(";") || current.Is(":") || current.Is("?")) {
    return true;
  }
  return false;
}
if (current instanceof Identifier && current.Is("return")) {
  return true;
}
const name = current.constructor.name;
return (
  name === "Lamda" ||
  name === "Statement" ||
  name === "Import" ||
  name === "Class" ||
  name === "Function" ||
  name === "Enum" ||
  name === "Interface" ||
  name === "Switch" ||
  name === "Try" ||
  name === "IfSet" ||
  name === "For" ||
  name === "Foreach" ||
  name === "While" ||
  name === "DoWhile" ||
  name === "Label" ||
  // **第 170 轮试过在这里补 `name === "Block"`**——**退回来了**（没验证出用处）。
  // 量到的现场是：块在这一刻**已经是 `Bracket startBracket="{" endBracket="}"`**
  //（XML 实测），下面那条「`}` 收尾的括号」本来就能认它；
  // 补 `Block` 之后 `cases:tsast` 照样 1434/1434、运行期那几条**照样失败** →
  // **一处没被验证过的改动不留**。
  //
  // **真正的缺口比这一处大**（四条最小反例都量过）：
  //   · `let a = 1;{ const A = 1; }a += 1;` `compound assignment to a non-identifier`
  //   · `let b = 2;{ b += 1; }` `unimplemented: expression Block`
  //   · `let c = 1;{ }c += 1;` 同上
  //   · `let d = 1;{ const D = 1; }d = d + 1;` **连普通 `=` 也失败**
  // ——也就是说：**「语句以块开头、后面还接着一个表达式」这一族**都还没拆开
  //（`+=` 那条的**词法**产物其实已经对了：XML 里是 `Bracket{…}` 再 `a = (a + 1)`，
  // 缺的是**把它拆成两条 Statement**——`cases:boundaries` 那条「被 `Statement` 横跨」
  // 的判据正是量这个的）。下一轮从这里查。
  (current instanceof Bracket && current.endBracket === "}")
);
```

**`endBracket` 不是 `startBracket`**（第 63 轮改）：这一条要认的是「**`}` 收尾**的括号」，
写成 `startBracket === "}"` 的话一个都匹配不上——块语句 `{ A }` 的起点是 `{`。
实测后果很重：`{ A }a += 1` 里 `SearchFront` 一路穿到列表头、返回 `-1`，
于是 `front = units.slice(0, index)` 把**整段**（块 + 目标）都算成「等号左边」克隆一遍，
产物是 `<Bracket>{ A }</Bracket><Identifier>a</Identifier><SymbolToken>=</SymbolToken>`
**`<Bracket>{ A }</Bracket>`**`<BinaryOperator op="+">a + 1</BinaryOperator>`——
块语句凭空多出一份。

## method Process:(template:Template, units:Array<Token>, index:int)=>int

切开复合赋值符号、补一份运算符副本，**返回新的下标**。

它**不推进下标**（`ReplaceRangeAt` 的插入发生在 `index + 1` 之后），
所以原样返回入参 `index`。

逐步：

- `current = Get(units, index) as SymbolToken`——把 `+=` 这个符号取出来。
- `operatorSymbol = current.Clone() as SymbolToken`，然后 `operatorSymbol.Temp.splice(1, 1)`、`current.Temp.splice(0, 1)`：
  副本去掉第二个字符（留 `+`），原件去掉第一个字符（留 `=`）。
- `startIndex = SearchFront(units, index, CompoundAssignmentOperatorCloseRule.IsCompoundAssignmentOperatorStart)`——从 `index - 1` 往前找赋值表达式起点；
  找不到给 `-1`，此时 `units.slice(0, index)` 正好取出从头到 `index` 的全部单元。
- `front = units.slice(startIndex + 1, index)`——赋值号左侧的那一段（**取副本，不动原列表**）。
- 逐个克隆：`front.map((item) => item.Clone())`。
- `insertUnits = [...frontClones, operatorSymbol]`——副本排在运算符前面。
- `ReplaceRangeAt(units, index + 1, 0, insertUnits)`——在 `index + 1` 处**删除 0 个、插入一批**，即纯插入。

`Process` 的 `template` 形参没有用到（基类签名要求），保留。

```ts
const current = Get(units, index) as SymbolToken;
const operatorSymbol = current.Clone() as SymbolToken;
operatorSymbol.FromCompoundAssignment = true;
// 「保留最后一个字符」的切法，**不能写死下标**：`+=` 是两个字符，`<<=` / `>>>=` / `??=` 是三个。
// 写死 `splice(1, 1)` / `splice(0, 1)` 时 `<<=` 会被切成 `<` 与 `<=`
// （实测产物是两层 `BinaryOperator op="<="`），`??=` 切成 `?=` 与 `?=`。
const lastIndex = operatorSymbol.Temp.length - 1;
operatorSymbol.Temp.splice(lastIndex, 1);
current.Temp.splice(0, lastIndex);
const startIndex = SearchFront(units, index, CompoundAssignmentOperatorCloseRule.IsCompoundAssignmentOperatorStart);
const front = units.slice(startIndex + 1, index);
const frontClones = front.map((item) => item.Clone());
const insertUnits: Token[] = [...frontClones, operatorSymbol];
ReplaceRangeAt(units, index + 1, 0, insertUnits);
return index;
```

**`lastIndex` 那一对 splice 是这条规则的核心**（实测踩过）：本规则的输入是**一个**复合赋值符号，
要把它拆成「运算符」与「`=`」两份——`operatorSymbol` 留下运算符（去掉最后一个字符），
`current` 变成 `=`（去掉前面所有字符）。两者都必须按 `Temp.length` 算，
因为 TypeScript 的复合赋值有三字符的（`<<=` `>>=` `>>>=` `**=` `&&=` `||=` `??=`）。

**`FromCompoundAssignment` 这个标记是必需的**（实测踩过）：
`Process` 会把 `&&=` 切成 `=` 与一份 `&&` 副本插回去。那份 `&&` **本身也在
`CompoundAssignmentSymbols` 的判据范围内**——新一轮扫描时它又被当成复合赋值去切，
切出来的东西又被处理，于是单元数量来回翻倍，`node tests/parse/run.mjs` 直接
`FATAL ERROR: heap out of memory`（单条用例都在 200ms 内跑完，整份
`expressions/ex-logical-assign` 就发散——是 `Process` 里那条自反馈，不是规则数量的问题）。
打上标记之后 `Previous` 直接放行这一份副本，它只作为普通运算符参与二元/逻辑折算。

# class CompoundAssignmentOperator

复合赋值运算符的**容器类**，本身没有任何成员。

它不继承 `Token`，只是 `CompoundAssignmentOperatorCloseRule` 的宿主。
`Root` 引用的是 `CompoundAssignmentOperatorCloseRule.Instance`，所以这个空壳类不参与解析流程，也不会进 `Data` / XML。

**切分必须按 `Temp.length`**：`Process` 要把**一个**复合赋值符号拆成「运算符」与「`=`」两份，
而 TypeScript 的复合赋值有三字符的（`<<=` `>>=` `>>>=` `**=` `&&=` `||=` `??=`）。
原来写死 `operatorSymbol.Temp.splice(1, 1)` 与 `current.Temp.splice(0, 1)`，
只对两字符的 `+=` 这类成立——`a <<= b` 被切成 `<` 与 `<=`（产物是两层
`BinaryOperator op="<="`），`a ??= b` 被切成 `?=` 与 `?=`。
改成「保留最后一个字符」之后，15 种写法都产出 `左值 = 左值 op 右值`。
