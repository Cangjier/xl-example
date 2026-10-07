# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchBack, SearchFront, TakeRange } from "../../../core/extensions/list-extension.xl.md"
import { IsTriviaUnit, IsTypeContainerUnit, SkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Identifier } from "../identifier.xl.md"
import { Keyword } from "../keyword.xl.md"
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

# class TernaryOperatorCloseRule extends CloseRule

它做的事是**把 `? … : …` 收成一个 `TernaryOperator`**：从 `:` 往前找 `?`，再从 `?` 往前找「表达式的起点」，从 `:` 往后找到语句边界，然后把三段分别切进条件 / 真值 / 假值三个子单元。

`TernaryOperatorCloseRule` 写在 `TernaryOperator` **之前**。

## static readonly field Instance:TernaryOperatorCloseRule = new TernaryOperatorCloseRule()

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

**「假值段」的边界是下一个 `,` / `;`，不是列表末尾**（第 123 轮修）。原来的判据是
`SearchBack(units, questionIndex, Is("?"))`——一路扫到列表末尾，于是**右边那些平级的兄弟三元**
也被算成「假值段里的 `?`」，一整个列表里只有最右边那个能成形：

    const o = { a: x ? 1 : 0, b: x ? 2 : 0, c: x ? 3 : 0 };
    → 只有 `c` 那个成三元，前两个被 `BinaryOperator` 折成 `x ? 1` / `x ? 1 : 0`  ✗

所以向前找 `?` 时要**在第一个 `,` / `;` 处停**：条件表达式的两个分支都是 `AssignmentExpression`，
`?` 与 `:` 之间、`:` 与下一个分隔符之间都不可能夹着平级的逗号，那个 `,` 一定属于**外层列表**
（属性表 / 实参表 / 声明符表），右边那个 `?` 属于**另一个**表达式。真实语料
（`dist/ts/typescript/ts-ast.ts` 一个文件 24 处、`node_modules/@types/node` 成片）里
这一族是「投影后仍缺 `ConditionalExpression`」的最大来源。

**往前找 `?` 时必须先撞上语句边界就停**（第 66 轮修，见 `QuestionIndexBefore`）。
少了这一条实测会把**上一条语句的 `?`** 与**这一条语句的 `:`** 配成一对：

    const a = x ? "t" : "f";
    const b = y ? "t" : "f";
    const c: number[] = [];

`const c` 那个类型标注的 `:` 往前找到了 `y ?`（中间只隔着别的语句），于是第一条三元
把后面两条语句整段吞进真值段、`number[]` 落进假值段——产物里只有一个 `<Statement>`、
只有两个三元、`string[]` / `number[]` 再也长不出 `ArrayType`
（自己的产物 `dist/ts/typescript/tokens/string/string.ts` 实测就是这样，
当时那把对齐尺子的「缺 `ArrayType`」把它抓出来）。

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
  // **这一段的边界**：从 `?` 往右第一个平级的 `,` / `;`（没有就是列表末尾）。
  // 它给下面两道判据共用：「`?` 与 `:` 之间不能有分隔符」与「假值段里还有没有 `?`」。
  let segmentEnd = units.length;
  for (let i = questionIndex + 1; i < units.length; i++) {
    const item = Get(units, i);
    if (item instanceof SymbolToken && (item.Is(",") || item.Is(";"))) {
      segmentEnd = i;
      break;
    }
  }
  // **`?` 与 `:` 之间不能有平级的 `,` / `;`**（第 123 轮）。
  //
  // 这是「这个 `:` 到底属于哪一个 `?`」的第二道判据，也是唯一挡住**属性冒号**的那道。
  // 实测（`{ a: x ? 1 : 0, b: x ? 2 : 0, c: 3 }`）：
  //
  //   1. 内层那个二元先成形（`inFalse` 那道只让内层先走），列表变成
  //      `a : x ? 1 : 0 , b : «Ternary» , c : 3`；
  //   2. 扫描下标继续右移，**落到 `c:` 那个属性冒号上**——它往前能找到那个还没被用掉的
  //      `?`（`inFalse` 此刻已经看不到别的 `?`），于是规则把 `c:` 当成三元的冒号，
  //      条件段取到 `x`、真值段吃下 `1 : 0 , b : «Ternary» , c`、假值段是 `3`。
  //      产物里于是出现「整个对象体被一个三元包住」这种形状。
  //
  // 判据本身来自文法：条件表达式的两个分支都是 `AssignmentExpression`，而逗号运算符的优先级
  // **低于**条件表达式，所以 `?` 与它的 `:` 之间**不可能**出现一个平级的 `,` 或 `;`。
  // 反过来，属性冒号与上一条属性之间一定隔着一个 `,` ✓。
  if (segmentEnd < index) {
    return false;
  }
  // **假值段里还有 `?` ⇒ 先不成，把内层让出来**；但「假值段」只到 `segmentEnd` 为止。
  const inFalse = SearchBack(units, questionIndex, (item: Token) => item instanceof SymbolToken && item.Is("?"));
  if (inFalse !== -1 && inFalse < segmentEnd) {
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
第一趟结束时已经被 `KeywordCloseRule` 收成 `Keyword`。只写
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
    // **复合赋值的符号也是起点** ✓（第 373 轮 ✓）——**这是这一条真正要补的那一格** ✗。
    //
    // `IsAssignmentSymbol` 认的是 `AssignmentSymbols`，而那张表上**只有 `=`** ✓
    //（`+=` / `*=` / `&&=` 那些在 `CompoundAssignmentSymbols` 上 ✓）⇒ 少了这一条，
    // 回扫会**冲过** `+=` ✓、一路找到上一条语句的 `;` ✓ ⇒ 条件段收成 `a += c` ✗
    // ⇒ 产物是 `(a += c) ? 2 : 3` ✗——**静默错值** ✓（实测 `a += c ? 2 : 3` 给 `2` ✓，JS 给 `3` ✓）。
    // **判据要在这一层**（不是等展开之后看 `FromCompoundAssignment` ✓）：
    // 规则是**按规则轮询、每条规则从左往右扫一遍所有下标** ✓（见 `core/syntax/token.xl.md` ✓），
    // 而三元这一条**排在复合赋值展开之前** ✓——实测那一刻列表里还是 `Identifier += Identifier` ✓
    //（插桩：`DBG ternary process q=11 start=7 list=… Identifier += Identifier ? …` ✓）。
    // 下面那一条 `FromCompoundAssignment` 是**另一半** ✓：展开已经跑过的那一趟（同一趟里更靠后的三元 ✓、
    // 或者下一趟 ✓）认的是标记 ✓——两条一起才把「`+=` 前面 / 后面」都盖住 ✓。
    || current.Template.SymbolTemplate.IsCompoundAssignmentSymbol(current.TempToString())
    || current.Is(":")
    || current.Is("=>")
    || current.Is(",")
    || current.Is(";")
    // **上一个 `?` 也是起点**（第 127 轮）：左嵌套 `a ? b ? c : d : e` 里
    // 内层那个 `:` 往左找条件起点时会一直走到声明/语句的边界，把
    // `a ? b` 整段当成内层的条件（TS 的解是 `a ? (b ? c : d) : e`）。
    // 把 `?` 也当边界之后，回扫在**外层的 `?`** 上停下，条件正好是 `b` ✓。
    // 右嵌套与普通三元不受影响：它们的回扫先撞上 `:` / `=` / `,` / `;`。
    || current.Is("?")
    // **复合赋值展开出来的那一份运算符也是起点** ✓（第 373 轮 ✓）。
    //
    // 理由与 `CompoundAssignmentOperatorCloseRule.IsCompoundAssignmentOperatorStart`
    // 那一条**同源** ✓：`a += b` 会先被展开成单元序列 `a` `=` `a` `+` `b` ✓
    //（见 `compound-assignment-operator.xl.md` ✓），而**插进来的那个 `+` 不是用户写的** ✓——
    // 它表达的是「`op=` 这个符号」✓ ⇒ 它的**右操作数是整个赋值右侧** ✓
    //（JS 里赋值右侧是一个完整的 AssignmentExpression ✓）。
    //
    // **少了这一条会怎样** ✗：`a += b ? c : d` 回扫从 `?` 往前先撞上 `=` ✓
    // ⇒ 条件段收成 `a + b` ✗ ⇒ 产物是 `(a + b) ? c : d` ✗——**静默错值** ✓
    //（实测 `a += c ? 2 : 3` 给 `2` ✓，JS 给 `3` ✓；`a += 1 < 2 ? 4 : 5` 给 `1` ✓，JS 给 `5` ✓）。
    // 加上之后回扫在**标记运算符**上停下 ✓ ⇒ 条件正好是 `b` ✓ ⇒ 三元先成形 ✓、
    // 插进来的 `+` 随后折它 ✓（与第 373 轮在二元那一侧加的「等右边长完」是**同一件事的两半** ✓：
    // 那一半管 `*=` / `-=` 这类同层的 ✓，这一半管右边被三元切走的 ✓）。
    //
    // **它不会误伤** ✓：真正的三元里带复合赋值时，那一格总在**括号**自己的单元列表里 ✓
    //（`x = (a += b) ? c : d` 的括号是一个单元 ✓，回扫撞到的是它 ✓），
    // 而三元自己的真值段 / 假值段在 `?` 之后 ✓，回扫根本到不了 ✓。
    || current.FromCompoundAssignment
  ) {
    return true;
  }
  return false;
}
// **`return` 那一档要按「受限产生式那个词」认，不能只看 `Identifier`** ✗
// （第 360 轮 ✓，**实测撞到的** ✓）：产物里 `return` 是**一个 `Keyword`** ✓
// （见 `print-ast-common.xl.md` 的 `KEYWORD_STATEMENT` ✓），而这一句原来只认
// `Identifier` ✗ ⇒ 回扫**冲过** `return` ✓、一路没找到起点 ✓ ⇒ `SearchFront` 给 `-1` ✗
// ⇒ `condition.AddRange(TakeRange(units, 0, …))` ✓ ⇒ **条件段把 `return` 那个词收进去了** ✗
// ⇒ 投影出一个 `ConditionalExpression` 的**条件是一格 `Identifier("return")`** ✗
// ⇒ 降级层报 **`name is not a local or a capture: return`** ✓
//（**一句话里没有一个字提到三元** ✗）。判据 `rt-ternary-nesting-and-assign` 量的就是它 ✓：
// `return n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : "F"` ✓——**三层的链**才现形 ✓
//（两层的链在**同一趟**里就成形了 ✓，根本走不到这条回扫 ✓，所以它藏了这么久 ✓）。
// 复用 `Statement.IsRestrictedKeyword` ✓（`return` / `throw` / `break` / `continue` / `yield` ✓，
// 它走的是 `Statement.WordOf` ✓，两种词形都认 ✓）——**不另写一份「哪些词算 return」的名单** ✗。
if (Statement.IsRestrictedKeyword(current)) {
  return true;
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

执行重组：切出条件 / 真值 / 假值三段，组装成 `TernaryOperator`，**返回新的下标**。

重组把多个子单元换成一个，下标必须跟着走。

**假值段的边界是「下一个 `,` 或 `;`，谁先到谁算」**（第 123 轮修）。

原来按父单元分两种：JSON 对象里找 `,`、其余找 `;`。这一条在**逗号分隔的列表**里是错的——
`const t = a ? 1 : 0, u = 2;` 的父单元是 `Statement`（不是 JSON 对象），于是假值段一路吃到 `;`：

    a ? 1 : 0, u = 2
    → TernaryOperator(falseStatement = «0, u = 2»)     ✗
    TS：ConditionalExpression(whenFalse = «0»)，那个 `,` 是**声明符分隔符**

实测的受害者是一整族：`const t = a ? 1 : 0, u = 2`（多声明符）、`f(a ? 1 : 0, b)`（实参表）、
`[a ? 1 : 0, b]`（数组元素）——`dist/ts/typescript/ts-ast.ts` 一个文件里就有 24 处。

**按 TS 的文法，两种符号都必须是边界**：条件表达式的两个分支都是 `AssignmentExpression`，
而逗号运算符的优先级**低于**条件表达式（`a ? b : c, d` 是 `(a ? b : c), d`）。
所以「假值段里出现一个平级的 `,`」在文法上不可能，把它当边界不会误伤；
真正的逗号运算符在括号里（`(a ? 1 : 0, b)`），那是另一个单元，到不了这一层。
`;` 仍旧是边界（`const t = a ? 1 : 0;`）。

`JsonObjectCloseRule` 的 import 随之不再需要——原来它只为这一处判定存在。

三段都是用 `TakeRange` 切出来的**一批**单元（取出不移除），用 `AddRange` 塞进子单元。

切完之后先查**三段都非空**：`Previous` 只保证「有一个 `?` 在 `:` 前面且不相邻」，
切出来的区间长度仍可能是 0（例如 `:` 前面隔着别的东西、或者 `:` 已经到列表末尾）。
空的时候直接返回原下标、什么都不改——三段的签入都要取 `Data[0]`，那里为 `undefined` 会当场抛内部错误，
而输入本身已经不成形状，交给后面的规则处理更合适。

```ts
const current = Get(units, index)!;
const elseIndex = index;
const questionIndex = this.QuestionIndexBefore(units, index);
const startIndex = SearchFront(units, questionIndex, TernaryOperatorCloseRule.IsTernaryOperatorStart);
// **假值段的终点**：`Previous` 里那个 `segmentEnd` 的同一条判据（第 123 / 127 轮）。
//
// 三种终止符：
//   · `,` / `;` —— 外层列表的分隔符（文法上假值段里不可能有平级逗号）；
//   · **外层的 `:`** —— `a ? b ? c : d : e` 里内层那个 `:` 的假值段只到 `d` 为止，
//     后面那个 `:` 属于**外层的三元**。少这一条，内层会把 `d : e` 整段吞掉
//     （实测 `dist/ts/typescript/ts-ast.ts` 里 `computed === undefined ? … ? a : b : {…}`
//     这一族：内层三元的一个都没成形，产物把整段读成 `BinaryExpression`）。
//     判据是「自己那个 `:` 之后出现过 `?` 没有」：出现过 ⇒ 后面那个 `:` 是**内层**的，
//     放行；没出现过 ⇒ 它是外层的，收工。
let endIndex = units.length;
let questionSinceColon = false;
for (let i = elseIndex + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    break;
  }
  if (!(item instanceof SymbolToken)) {
    continue;
  }
  if (item.Is(",") || item.Is(";")) {
    endIndex = i;
    break;
  }
  if (item.Is("?")) {
    questionSinceColon = true;
    continue;
  }
  if (item.Is(":")) {
    if (questionSinceColon) {
      questionSinceColon = false;
      continue;
    }
    endIndex = i;
    break;
  }
}
// 真值段不能越过**下一个 `?`**：`a ? b ? c : d : e` 里 `b ? c` 不是真值段，
// 那个 `?` 属于内层三元（`b ? c : d`）。不夹这一刀，真值段会把内层的 `?` 与 `:` 一起吞进来，
// 内层永远不成形，产物里留下裸的 `?` `:` 符号。
//
// **上界与 `Previous` 的 `segmentEnd` 是同一个**（第 123 轮）：分隔符右边那个 `?` 属于
// **另一个**表达式（`{ a: x ? 1 : 0, b: x ? 2 : 0 }`），不是本三元的真值段里的嵌套。
// 少了 `innerQuestion < endIndex` 这一夹，真值段会收下一批**不在本段里**的单元
// （它们随后被 `ReplaceCountAt` 从列表里删掉，产物里出现同一个单元挂在两处）。
let trueEnd = elseIndex;
const innerQuestion = SearchBack(units, questionIndex, (item: Token) => item instanceof SymbolToken && item.Is("?"));
if (innerQuestion !== -1 && innerQuestion < endIndex) {
  trueEnd = innerQuestion;
}
const ternaryOperator = new TernaryOperator(template);
ternaryOperator.Parent = current.Parent;
// **两个标点的位置当场记进字段**（`QuestionPos` / `ColonPos`）：这一刻它们就是 `units` 里
// 那两格 `SymbolToken`，区间已经签好；不记的话投影只能回原文再扫一遍。
const questionUnit = Get(units, questionIndex);
const colonUnit = Get(units, elseIndex);
const questionStart = questionUnit === null ? null : questionUnit.SourceRange.Start;
const colonStart = colonUnit === null ? null : colonUnit.SourceRange.Start;
if (questionStart !== null && colonStart !== null) {
  ternaryOperator.QuestionPos = questionStart.Index;
  ternaryOperator.ColonPos = colonStart.Index;
}
const condition = ternaryOperator.CreateCondition();
const trueStatement = ternaryOperator.CreateTrueStatement();
const falseStatement = ternaryOperator.CreateFalseStatement();
condition.AddRange(TakeRange(units, startIndex + 1, questionIndex - startIndex - 1));
trueStatement.AddRange(TakeRange(units, questionIndex + 1, trueEnd - questionIndex - 1));
falseStatement.AddRange(TakeRange(units, elseIndex + 1, endIndex - elseIndex - 1));
if (condition.Data.length === 0 || trueStatement.Data.length === 0 || falseStatement.Data.length === 0) {
  return index;
}
// **段首尾的软换行不进区间**（第 125 轮）：`const t =` 换行 `a === b ? … : …` 时，
// 条件段的第一个单元正是那个换行——`SignInToken(Data[0])` 会把整条三元的起点
// 提到换行上，而 TS 的 `getStart()` **从不含前导 trivia**（实测这一族以
// `ConditionalExpression` 为首，`漂移` 榜上一整片）。段尾同理。
//
// 换行仍然留在段的 `Data` 里（投影侧按 `INVISIBLE` 跳过它们），只是**不参与签入签出**。
// 第 127 轮把**注释**也一并跳过：`? // 说明` 换行 `nameUnits…` 这种排版里，
// 段首是一个 `LineAnnotation`，拿它签入会把整条三元的 `pos` 提到注释开头。
const firstReal = (data: Array<Token>): Token => {
  for (const item of data) {
    if (!IsTriviaUnit(item)) {
      return item;
    }
  }
  return data[0];
};
const lastReal = (data: Array<Token>): Token => {
  for (let i = data.length - 1; i >= 0; i--) {
    if (!IsTriviaUnit(data[i])) {
      return data[i];
    }
  }
  return data[data.length - 1];
};
condition.SignInToken(firstReal(condition.Data));
condition.SignOutToken(lastReal(condition.Data));
trueStatement.SignInToken(firstReal(trueStatement.Data));
trueStatement.SignOutToken(lastReal(trueStatement.Data));
falseStatement.SignInToken(firstReal(falseStatement.Data));
falseStatement.SignOutToken(lastReal(falseStatement.Data));
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

## method PrintAst:(ctx:any, v:any)=>any

三元表达式 `a ? b : c` → `ConditionalExpression`（`condition` / `whenTrue` / `whenFalse`
+ `questionToken` / `colonToken`；**从 `ts-ast.xl.md` 的 `projectConditionalExpression` 搬来**，第 188 轮）。

**`?` 与 `:` 在这里是字段**（TS 的 `cond.questionToken` / `cond.colonToken` 都在
`forEachChild` 那一层），与 `ConditionalType` **正好相反**——那个是类型位，
TS 那边两个标点都不进子节点。两者形状极像、口径相反，是这一带最容易写错的地方。

分段名（`trueStatement` / `falseStatement`）是上游 Cangjie 的叫法，
TS 现在叫 `whenTrue` / `whenFalse`，改名在 `FIELD_BY_KIND` 里做。

标点的位置**由 token 自己记**（`QuestionPos` / `ColonPos`，第 614 轮 ✓）：
`Process` 收三段那一刻两个 `SymbolToken` 就在手上、区间已经签好 ✓，
所以这里直读字段 ✓。**从前是回原文量的** ✗——在两段区间之间扫那个标点 ✓（还要跳过注释 ✓），
那是**第二份近似** ✓：同一件事（标点在哪）源码里只有一处，投影却要再推一遍 ✓。
两个字段都由 `ToDictionary` 带到视图上 ✓。

```ts
  const props: any = {
    condition: ctx.Segment(v, "condition"),
    whenTrue: ctx.Segment(v, "trueStatement"),
    whenFalse: ctx.Segment(v, "falseStatement"),
  };
  const questionPos = v.attrs.get("questionPos");
  const colonPos = v.attrs.get("colonPos");
  if (typeof questionPos === "number" && questionPos >= 0) {
    props.questionToken = { kind: "QuestionToken", text: "?", pos: questionPos, end: questionPos + 1 };
  }
  if (typeof colonPos === "number" && colonPos >= 0) {
    props.colonToken = { kind: "ColonToken", text: ":", pos: colonPos, end: colonPos + 1 };
  }
  return ctx.NodeHead("ConditionalExpression", props, v);
```

## field QuestionPos:int = -1

条件那个 `?` 在源码里的下标；还没记下来时是 `-1`。

**为什么记下来** ✗：`?` 不进 `Data` ✓（`TernaryOperator` 只收三段 ✓），
而 TS 的 `ConditionalExpression.questionToken` **是节点** ✓——
不记的话投影只能回原文在「条件段末尾与真值段开头之间」扫 ✓，
那既要知道 `endOf` 是闭区间 ✓、又要跳过注释与空白 ✓（第 88 / 143 轮各踩过一次 ✓）。

## field ColonPos:int = -1

真值段与假值段之间那个 `:` 的下标，口径与 `QuestionPos` 同。

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
// **两个标点的位置**（见 `QuestionPos` / `ColonPos`）：投影直读，不再回原文扫那个标点。
result.set("questionPos", this.QuestionPos);
result.set("colonPos", this.ColonPos);
return result;
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 克隆全部子单元 → `TryToClose()`。

`QuestionPos` / `ColonPos` 照抄——它们是投影要直读的事实，漏了克隆体就没有标点节点。

```ts
const result = new TernaryOperator(this.Template);
result.Sign(this);
result.QuestionPos = this.QuestionPos;
result.ColonPos = this.ColonPos;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
