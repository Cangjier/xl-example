# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { SkipNextTrivia, SkipPreviousWrapSymbol, IsTriviaUnit, IsTypeContainerUnit, IsTypeMemberStart } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { String } from "./string/string.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**字面量类型**：类型位的 `"a"` / `1` / `0x10` / `true` / `null` / `-1` 各收成一个 `LiteralType`。

第 66 轮之前它们**没有专属标签**：产物里就是 `String` / `Identifier` / `UnaryOperator`，
与**值位**的字面量长得一模一样——`type X = "a"` 与 `const x = "a"` 在树里分不出来。
内容与位置一直是对的（`cases:lossless` 全绿），缺的是「这是**类型**位的字面量」这条语义
（TypeScript 那边叫 `LiteralType`，全语料 13110 处）。

**判据与方括号 / 类型运算符那两条同源**：形状在两边一样，区别只在**容器**
（`IsTypeContainerUnit`）与**是不是成员开头**（`IsTypeMemberStart`）。

规则**排在类型队列的第三位**（`TypeBracket` → `TypePrefix` → 本规则 → `TypeUnion`）：
先把 `T[]` / `keyof T` 成形，再把剩下的字面量包起来，最后才让联合 / 交叉去收
（`A | "b"` 里那个 `"b"` 因此是 `UnionType` 的一个成员，而不是让它先去当操作数）。

# class LiteralTypeCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:LiteralTypeCloseRule = new LiteralTypeCloseRule()

唯一的实例。

## private method IsNumericLiteral:(item:Identifier)=>bool

这个 `Identifier` 的文本算不算**数字字面量**。

**不能直接用 `Identifier.IsNumber()`**：那个判据只认十进制（数字 + 至多一个 `.` + 可选的
`d` / `f` 后缀），而真实的 `.d.ts` 里数字字面量类型大量写成**十六进制**
（`type M = 0xFFFFFFFF`，`lib.dom.d.ts` 一处就有几百个），还有二进制 / 八进制 /
指数 / 数字分隔符 / `BigInt`。实测只认十进制时，当时那把对齐尺子的 `LiteralType`
缺 **3097 处**全部来自这一族（样本清一色 `0x…`）。

所以本方法先把**下划线分隔符**与**后缀**（`n` / `d` / `f`）摘掉，再按进制判：
`0x` / `0X` 十六进制、`0b` / `0B` 二进制、`0o` / `0O` 八进制、其余按十进制
（允许小数点与指数，指数部分允许正负号但必须至少有一位数字）。

**不改 `IsNumber` 本身**：它还被 `generic-type.xl.md` 的名字闸用来拒「数字开头的泛型」，
把十六进制也算进去会改变那边的行为；这一族目前只有本规则需要。

```ts
const chars: string[] = [];
for (const ch of item.Temp) {
  if (ch !== "_") {
    chars.push(ch);
  }
}
if (chars.length === 0) {
  return false;
}
let end = chars.length;
const last = chars[end - 1];
if (last === "n" || last === "d" || last === "f") {
  end = end - 1;
}
if (end === 0) {
  return false;
}
if (end > 2 && chars[0] === "0" && (chars[1] === "x" || chars[1] === "X")) {
  for (let i = 2; i < end; i++) {
    const c = chars[i];
    if (!((c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F"))) {
      return false;
    }
  }
  return true;
}
if (end > 2 && chars[0] === "0" && (chars[1] === "b" || chars[1] === "B")) {
  for (let i = 2; i < end; i++) {
    const c = chars[i];
    if (c !== "0" && c !== "1") {
      return false;
    }
  }
  return true;
}
if (end > 2 && chars[0] === "0" && (chars[1] === "o" || chars[1] === "O")) {
  for (let i = 2; i < end; i++) {
    const c = chars[i];
    if (!(c >= "0" && c <= "7")) {
      return false;
    }
  }
  return true;
}
let dotCount = 0;
let digitCount = 0;
for (let i = 0; i < end; i++) {
  const c = chars[i];
  if (c >= "0" && c <= "9") {
    digitCount = digitCount + 1;
    continue;
  }
  if (c === ".") {
    dotCount = dotCount + 1;
    if (dotCount > 1) {
      return false;
    }
    continue;
  }
  if (c === "e" || c === "E") {
    if (digitCount === 0) {
      return false;
    }
    let j = i + 1;
    if (j < end && (chars[j] === "+" || chars[j] === "-")) {
      j = j + 1;
    }
    let exponentDigits = 0;
    for (; j < end; j++) {
      const d = chars[j];
      if (!(d >= "0" && d <= "9")) {
        return false;
      }
      exponentDigits = exponentDigits + 1;
    }
    return exponentDigits > 0;
  }
  return false;
}
return digitCount > 0;
```

## private method IsLiteralUnit:(item:Token)=>bool

这个单元是不是一个**字面量**（能当字面量类型的那个东西）。

四种：

- `String`：且 `interpolationCount === 0`——带插值的模板串是**模板字面量类型**（`` `a${X}b` ``），
  不是一个字面量，不能包（包了就把插值段的类型文本也说成字面量了）；
- `Identifier`：数字（十进制 / 十六进制 / 二进制 / 八进制 / 指数 / `BigInt`）或布尔
  （`true` / `false`）或 `null`。**先挡空文本**：空壳 `Identifier` 真出现过
  （实测 `@types/node/test.d.ts` 里一个 `[start,start]` 的空单元），不挡就会给它套一层；
- `UnaryOperator`：`-1` / `+1` 这种**带符号的数字字面量**（TypeScript 那边是
  `LiteralType > PrefixUnaryExpression`）。`op` 必须是 `-` / `+` **且**操作数是数字——
  映射类型的 `-readonly` 也是 `UnaryOperator`，只看类名会把它包成字面量。

按**类名**认 `UnaryOperator` 而不是 import：与 `type-operator.xl.md` 的 `IsFoldedTypeof` 同一做法。

```ts
if (item instanceof String) {
  return item.interpolationCount === 0;
}
if (item instanceof Identifier) {
  if (item.TempToString().length === 0) {
    return false;
  }
  return this.IsNumericLiteral(item) || item.IsBool() || item.TempToString() === "null";
}
if (item.constructor.name === "UnaryOperator") {
  const op = (item as any).op;
  if (op !== "-" && op !== "+") {
    return false;
  }
  const operand = item.Last();
  return operand instanceof Identifier && operand.TempToString().length > 0 && this.IsNumericLiteral(operand);
}
return false;
```

## private method IsSignedNumberStart:(units:Array<Token>, index:int)=>bool

`index` 处是不是「`-` / `+` + 数字」这个**带符号数字字面量**的开头。

**为什么它单独一支**：类型位里的 `-1`（`type X = -1 | 0 | 1`）**不会**被折成 `UnaryOperator`——
折叠规则（`unary-operator.xl.md`）挂在**通用队列**上，而那时这段文本已经装进 `TypeAssign`
（类型队列）里了，通用队列轮不到它。实测只有 `-` 符号加一个数字 `Identifier` 两个单元。
不单独认这一支，`-` 会留在外面、只有 `1` 被包成 `LiteralType`
（产物 `<SymbolToken>-</SymbolToken><LiteralType><Identifier>1</Identifier></LiteralType>`），
TypeScript 那边的 `PrefixUnaryExpression` 也就对不上了。

判据与 `IsLiteralUnit` 的数字那一支共用同一个 `IsNumericLiteral`。

**跳的是 trivia 而不是软换行**（第 948 轮）：`-/*c*/1` / `- /*c*/ 1` / `-//c` 换行 `1`
里的注释夹在语法相邻的两格之间——只跳软换行时下一格是那条注释 ⇒ 判否 ⇒
`-` 留在外面当 `SymbolToken`、只有数字被包成 `LiteralType`
（实测 `type A = -/*c*/1 | 0 | 1;`：缺 `LiteralType` / `PrefixUnaryExpression` / `NumericLiteral`
各 1、多 `MinusToken` 1）。`SkipNextTrivia` 是「下一个实义单元」的统一口径
（`infer` / `field` / `binary-operator` 那几处同一做法）。

```ts
const current = Get(units, index);
if (current === null || !(current instanceof SymbolToken)) {
  return false;
}
const text = current.TempToString();
if (text !== "-" && text !== "+") {
  return false;
}
const nextIndex = SkipNextTrivia(units, index);
const operand = Get(units, nextIndex);
return operand instanceof Identifier && operand.TempToString().length > 0 && this.IsNumericLiteral(operand);
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

四条：本身是字面量（**或者是带符号数字的开头**）；**容器**是纯类型容器；
不是成员开头；**不带符号的数字字面量前面不能紧挨着一个符号**（那一段由符号那一格收，
不然 `-1` 会被包两层）。

容器这一条是唯一的位置判据（与 `type-bracket.xl.md` / `type-operator.xl.md` 共用
`../text-common-util.xl.md` 的 `IsTypeContainerUnit`）：值位的 `"a"` / `1` / `-1`
父亲是语句 / 表达式 / `BinaryOperator`，都不在白名单里，一个都不会被误包。

**父亲已经是 `LiteralType` 时不再包**：`-1` 收成 `LiteralType` 之后，
那一趟还会在同一段上看到里面那个 `1`。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const signed = this.IsSignedNumberStart(units, index);
if (signed === false && this.IsLiteralUnit(current) === false) {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
if (current.Parent !== null && current.Parent.constructor.name === "LiteralType") {
  return false;
}
if (IsTypeMemberStart(current)) {
  return false;
}
if (signed) {
  return true;
}
if (current instanceof Identifier) {
  const beforeIndex = SkipPreviousWrapSymbol(units, index);
  const before = Get(units, beforeIndex);
  if (before instanceof SymbolToken && (before.Is("-") || before.Is("+"))) {
    return false;
  }
}
return true;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把这个字面量包成一个 `LiteralType`，**返回新的下标**。

字面量本身就是子单元（`<LiteralType><String>…</String></LiteralType>`），不搬它的内容。
带符号数字那一支把**符号与数字一起**收进来（`ReplaceCountAt` 替换两格）。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 里记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点，`Replace` 就变成
「把自己插进自己里面」。所以顺序固定为 **`Replace` 先、`AddAndCloseLast` 后**。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("LiteralTypeCloseRule.Process: current is null");
}
if (this.IsSignedNumberStart(units, index)) {
  const nextIndex = SkipNextTrivia(units, index);
  const operand = Get(units, nextIndex)!;
  const signedResult = new LiteralType(current.Template);
  signedResult.SignIn(current.SourceRange.Start!);
  signedResult.SignOut(operand.SourceRange.End!);
  // **中间夹着的 trivia 要跟着搬进来**（第 948 轮）：`-/*c*/1` 里那条注释落在 TS 那个
  // `LiteralType` 的区间**里面**，而 `ReplaceCountAt` 是整段替换 —— 只把 `-` 与数字加进来，
  // 注释就被从树上抹掉了（它在 XML / AST JSON 两个出口里是**真实存在的文本**）。
  // 加进子单元的顺序就是**源码顺序**：`-`、中间那些注释、数字；软换行照旧不进
  //（它是透明单元，与原来一字不差）。
  signedResult.AddAndCloseLast(current);
  for (let i = index + 1; i < nextIndex; i++) {
    const between = Get(units, i);
    if (between !== null && IsTriviaUnit(between) && between.constructor.name !== "LineWrap") {
      signedResult.AddAndCloseLast(between);
    }
  }
  signedResult.AddAndCloseLast(operand);
  signedResult.TryToClose();
  return ReplaceCountAt(units, index, nextIndex - index + 1, signedResult);
}
const result = new LiteralType(current.Template);
result.SignIn(current.SourceRange.Start!);
result.SignOut(current.SourceRange.End!);
current.Replace(result);
result.AddAndCloseLast(current);
result.TryToClose();
return index;
```

# class LiteralType extends IndependentToken

字面量类型（`"a"` / `1` / `0x10` / `true` / `null` / `-1`）。类名必须与产物的标签名一致。

内容直接装在自己身上（那一个字面量单元，或「符号 + 数字」两个单元）。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：产物那边的分段名 → 目标语言的字段名。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["LiteralType", new Map([["children", "literal"]])]]);
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 1001 轮）：`<LiteralType>` 在投影里一直走**通用支**
（`KIND_BY_TAG` 换名 + `structuralProps` 给字段名 + 子单元照投），这一页把那一趟**写下来**。

**为什么值得写下来**：通用支是「三张中央表的合力」（换名表 / 字段名表 / 段名表），
而段名本来就是**这一页自己的事实**（见上一格 `SegmentNames`）——
写下来之后，这一格的形状有了一份可以逐字节对拍的**基线**，直出版也因此有了对象
（`direct:lint` 的判据②：覆写了直出版的页面必须留着 `PrintAst`）。

字段仍由 `ctx.Structural` 给：它与通用支**同一份实现**（`structuralProps`），
所以产物逐字节相同——这一页换来的只是「谁来说这一格」。

```ts
return ctx.Node("LiteralType", ctx.Structural(v, "LiteralType"), v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1001 轮）：与上面的 `PrintAst` 出**同一个答案**。

这一页**一处回原文查都没有**：名字（如果有）走属性、段内内容由 `ctx.Structural`
按子单元投（那是投影层的事），所以两半逐行同一份——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
return ctx.Node("LiteralType", ctx.Structural(v, "LiteralType"), v);
```

## constructor:(template:Template)=>void

转调基类构造器。

**刻意不挂类型队列**：内容就是一个字面量单元，里面没有类型文本要重组；
挂了反而要再多一条「父亲是自己就不许再包」的守卫。
（`String` 内部若有插值，那段内容由插值段自己的那一趟管，与本节点无关。）

```ts
super(template);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new LiteralType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
