# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { FirstBinaryOperatorShape } from "../aliases/first-binary-operator-shape.xl.md"
import { InKeywordShape } from "../keywords/in-keyword-shape.xl.md"
import { InstanceOfKeywordShape } from "../keywords/instance-of-keyword-shape.xl.md"
import { AmpersandAmpersandEqualsTokenShape } from "../punctuation/ampersand-ampersand-equals-token-shape.xl.md"
import { AmpersandAmpersandTokenShape } from "../punctuation/ampersand-ampersand-token-shape.xl.md"
import { AmpersandEqualsTokenShape } from "../punctuation/ampersand-equals-token-shape.xl.md"
import { AmpersandTokenShape } from "../punctuation/ampersand-token-shape.xl.md"
import { AsteriskAsteriskEqualsTokenShape } from "../punctuation/asterisk-asterisk-equals-token-shape.xl.md"
import { AsteriskAsteriskTokenShape } from "../punctuation/asterisk-asterisk-token-shape.xl.md"
import { AsteriskEqualsTokenShape } from "../punctuation/asterisk-equals-token-shape.xl.md"
import { AsteriskTokenShape } from "../punctuation/asterisk-token-shape.xl.md"
import { BarBarEqualsTokenShape } from "../punctuation/bar-bar-equals-token-shape.xl.md"
import { BarBarTokenShape } from "../punctuation/bar-bar-token-shape.xl.md"
import { BarEqualsTokenShape } from "../punctuation/bar-equals-token-shape.xl.md"
import { BarTokenShape } from "../punctuation/bar-token-shape.xl.md"
import { CaretEqualsTokenShape } from "../punctuation/caret-equals-token-shape.xl.md"
import { CaretTokenShape } from "../punctuation/caret-token-shape.xl.md"
import { ColonTokenShape } from "../punctuation/colon-token-shape.xl.md"
import { EqualsEqualsEqualsTokenShape } from "../punctuation/equals-equals-equals-token-shape.xl.md"
import { EqualsEqualsTokenShape } from "../punctuation/equals-equals-token-shape.xl.md"
import { EqualsTokenShape } from "../punctuation/equals-token-shape.xl.md"
import { ExclamationEqualsEqualsTokenShape } from "../punctuation/exclamation-equals-equals-token-shape.xl.md"
import { ExclamationEqualsTokenShape } from "../punctuation/exclamation-equals-token-shape.xl.md"
import { GreaterThanEqualsTokenShape } from "../punctuation/greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanEqualsTokenShape } from "../punctuation/greater-than-greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanGreaterThanEqualsTokenShape } from "../punctuation/greater-than-greater-than-greater-than-equals-token-shape.xl.md"
import { GreaterThanGreaterThanGreaterThanTokenShape } from "../punctuation/greater-than-greater-than-greater-than-token-shape.xl.md"
import { GreaterThanGreaterThanTokenShape } from "../punctuation/greater-than-greater-than-token-shape.xl.md"
import { GreaterThanTokenShape } from "../punctuation/greater-than-token-shape.xl.md"
import { LessThanEqualsTokenShape } from "../punctuation/less-than-equals-token-shape.xl.md"
import { LessThanLessThanEqualsTokenShape } from "../punctuation/less-than-less-than-equals-token-shape.xl.md"
import { LessThanLessThanTokenShape } from "../punctuation/less-than-less-than-token-shape.xl.md"
import { MinusEqualsTokenShape } from "../punctuation/minus-equals-token-shape.xl.md"
import { MinusTokenShape } from "../punctuation/minus-token-shape.xl.md"
import { PercentEqualsTokenShape } from "../punctuation/percent-equals-token-shape.xl.md"
import { PercentTokenShape } from "../punctuation/percent-token-shape.xl.md"
import { PlusEqualsTokenShape } from "../punctuation/plus-equals-token-shape.xl.md"
import { PlusTokenShape } from "../punctuation/plus-token-shape.xl.md"
import { QuestionQuestionEqualsTokenShape } from "../punctuation/question-question-equals-token-shape.xl.md"
import { QuestionQuestionTokenShape } from "../punctuation/question-question-token-shape.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { SlashEqualsTokenShape } from "../punctuation/slash-equals-token-shape.xl.md"
import { SlashTokenShape } from "../punctuation/slash-token-shape.xl.md"
import { AsExpressionShape } from "./as-expression-shape.xl.md"
import { DeleteExpressionShape } from "./delete-expression-shape.xl.md"
import { OperatorTable } from "./operator-table.xl.md"
import { PostfixUnaryExpressionShape } from "./postfix-unary-expression-shape.xl.md"
import { PrefixUnaryExpressionShape } from "./prefix-unary-expression-shape.xl.md"
import { SatisfiesExpressionShape } from "./satisfies-expression-shape.xl.md"
import { TypeOfExpressionShape } from "./type-of-expression-shape.xl.md"
import { VoidExpressionShape } from "./void-expression-shape.xl.md"
```

# namespace cangjie

`OperatorShapeMap` 是**「运算符文本 → 形状类」的唯一分支点**（WP-E0a，依据 `_coord/PLAN-all-possible.md` §7.1）。

它回答两件事，且只有这里回答：

1. `KindOf(text)`：这段文本是哪一类运算符（二元 / 赋值 / 条件问号 / 条件冒号 / 前缀 / 后缀 update / `as`·`satisfies`）；
2. `Create(...)`：按类造出**类别正确**的形状实例（复用既有 `*-token-shape` / `*-expression-shape`，不新造形状类）。

**为什么必须唯一。** 优先级表只有 `operator-table` 一份（C 口径：禁抄表），形状类名是账本的节点 identity（类名错 = divergent）。把「文本 → 类」写散到多个 form 候选里，同一个 `-` 在两处可能被解析成不同节点。这里收成一个分支点，form WP 只调它。

**与 legacy EOF 树的对应关系（实测，`typescript/cases/tts/tools/expr-probe.mjs --eof-only`）。** `Create` 对二元/赋值/条件返回的是**运算符形状**（legacy 树里确实有这一格子节点）；对前缀 / 后缀 / update / `as`·`satisfies` 返回的是**表达式节点形状**——legacy 树里前缀 `!a` / `-a` / `++a` 只有 `PrefixUnaryExpressionShape` 一个节点、**没有运算符子节点**，后缀 `a++` 只有 `PostfixUnaryExpressionShape`，`a as T` 的 `AsExpressionShape` 下只有 `[表达式, TypeReferenceShape]`、没有 `as` 关键字节点。所以后几类**不能**造一张 `*TokenShape` 挂进去，否则多出一个节点 = divergent。

`<` 是唯一例外：legacy 对二元 `<` 用的是 `FirstBinaryOperatorShape`（`a<b` / `a<b&&c>d` 实测），不是 `LessThanTokenShape`。这是 legacy 为类型实参歧义留的占位形状，E-base 照抄（类名即 identity），`KindOf` 仍判 `binary`、优先级仍读 `OperatorTable`（11）。

# class OperatorShapeMap

运算符文本 → 形状类的唯一分支点。

## static field KindBinary:string = "binary"

二元运算符（含 `instanceof` / `in` 两个关键字运算符）。

## static field KindAssignment:string = "assignment"

赋值运算符（`=` 与全部复合赋值）。

## static field KindPrefix:string = "prefix"

前缀一元（`!` `~` `+` `-` `typeof` `void` `delete`）。

## static field KindPostfix:string = "postfix"

后缀一元（`++` `--`）。

## static field KindUpdate:string = "update"

自增自减（`++` / `--`）。**前缀位与后缀位同一份文本、不同节点类**：由 `Create` 的 `position` 参数决定，见 `PositionPrefix` / `PositionPostfix`。

## static field KindConditionalQuestion:string = "conditional-question"

条件表达式的 `?`（`ConditionalExpressionShape` 的第 2 格）。

## static field KindConditionalColon:string = "conditional-colon"

条件表达式的 `:`（`ConditionalExpressionShape` 的第 4 格）。

## static field KindTypeAssert:string = "type-assert"

`as` / `satisfies`（`AsExpressionShape` / `SatisfiesExpressionShape`；节点下**没有**运算符子节点）。

## static field PositionBinary:string = "binary"

`Create` 的位置口径：二元/赋值/条件——造**运算符形状**。

## static field PositionPrefix:string = "prefix"

`Create` 的位置口径：前缀——造**表达式节点形状**（不含操作数）。

## static field PositionPostfix:string = "postfix"

`Create` 的位置口径：后缀——造**表达式节点形状**（不含操作数）。

## static field PositionTypeAssert:string = "type-assert"

`Create` 的位置口径：`as` / `satisfies`——造**表达式节点形状**（不含表达式与类型）。

## static method KindOf:(text:string)=>string

文本的运算符类别；不是运算符返回空串。

判据顺序就是分类本身：`?` / `:` → 条件；`as` / `satisfies` → 类型断言；赋值表命中 → 赋值；`++` / `--` → update；二元表命中 → 二元；前缀表命中 → 前缀；其余空串。

**顺序的理由**：`+` / `-` 同时在前缀表与二元表里，先判二元 ⇒ 二元位得到 `binary`；前缀位由调用方显式用 `PositionPrefix` 调用 `Create` 区分，不靠 `KindOf` 猜位置。`OperatorTable.IsBinaryOperator` 是只读查询（同一条表，C 口径不另抄运算符集合）。

```ts
if (text === "?") {
  return OperatorShapeMap.KindConditionalQuestion;
}
if (text === ":") {
  return OperatorShapeMap.KindConditionalColon;
}
if (text === "as" || text === "satisfies") {
  return OperatorShapeMap.KindTypeAssert;
}
if (OperatorTable.IsAssignmentOperator(text)) {
  return OperatorShapeMap.KindAssignment;
}
if (text === "++" || text === "--") {
  return OperatorShapeMap.KindUpdate;
}
if (OperatorTable.IsBinaryOperator(text)) {
  return OperatorShapeMap.KindBinary;
}
if (OperatorTable.IsPrefixOperator(text)) {
  return OperatorShapeMap.KindPrefix;
}
return "";
```

## static method IsOperator:(text:string)=>bool

是不是本 map 认识的运算符文本（`KindOf` 非空）。

```ts
return OperatorShapeMap.KindOf(text).length > 0;
```

## static method IsBinary:(text:string)=>bool

二元位（含赋值？不——赋值单独一类；这里只回答「二元运算符表命中」）。

**`instanceof` / `in` 算二元**：`OperatorTable.Precedence` 把两者都放在 11。

```ts
return OperatorTable.IsBinaryOperator(text);
```

## static method IsAssignment:(text:string)=>bool

赋值运算符（`=` 与全部复合赋值），优先级 `OperatorTable.AssignmentPrecedence`（0）、右结合。

```ts
return OperatorTable.IsAssignmentOperator(text);
```

## static method IsPrefix:(text:string)=>bool

前缀一元（`!` `~` `+` `-` `++` `--` `typeof` `void` `delete`）。`++` / `--` 在两个位置都合法，位置由调用方给。

```ts
return OperatorTable.IsPrefixOperator(text);
```

## static method IsPostfix:(text:string)=>bool

后缀一元：只有 `++` / `--`（TS 里其余一元运算符没有后缀形式）。

```ts
return text === "++" || text === "--";
```

## static method IsConditional:(text:string)=>bool

条件表达式的位置符号：`?` 或 `:`。

```ts
return text === "?" || text === ":";
```

## static method IsTypeAssert:(text:string)=>bool

`as` / `satisfies`。

```ts
return text === "as" || text === "satisfies";
```

## static method PrecedenceOf:(text:string)=>int

`text` 在二元位上的优先级（**只读 `OperatorTable`**）：赋值 → `AssignmentPrecedence`，其余 → `OperatorTable.Precedence`；不是二元/赋值返回 `-1`。

条件 `?` / `:` 不在这里回答：它是表达式节点、不是运算符形状，优先级常量在归约栈（`ShapeOperatorStack.ConditionalPrecedence`）里，见 `shape-operator-stack.xl.md`。

```ts
if (OperatorTable.IsAssignmentOperator(text)) {
  return OperatorTable.AssignmentPrecedence;
}
return OperatorTable.Precedence(text);
```

## static method IsRightAssociative:(text:string)=>bool

`text` 在二元位是否右结合（`**` 与全部赋值）。

**为什么用 `AssociationOf` 而不是 `IsRightAssociative`**：`operator-table.xl.md` 里已有的 `IsRightAssociative(text)` 只回答 `**`（它服务旧二元候选）；赋值右结合写在同表的 `AssociationOf(text)`（`"**"` 与赋值 → `"right"`）里。两者同源、同文件，`AssociationOf` 是**完整**答案，所以归约栈与本 map 都以它为准；`operator-table.xl.md` 一个字都没改（`IsRightAssociative` 已存在，按 §5.1 不重复加）。

```ts
return OperatorTable.AssociationOf(text) === "right";
```

## static method Create:(text:string, position:string, template:Template, start:int, end:int, context:SyntaxContext | null)=>Token

按位置造形状，**唯一分支点**。四类语义各不相同（这是 deliberately 不统一的地方）：

- `position = binary`：造**运算符形状**（`*` → `AsteriskTokenShape`、`<` → `FirstBinaryOperatorShape`、`in` → `InKeywordShape`、`=` → `EqualsTokenShape`、`?` → `QuestionTokenShape`……）。若 `start >= 0` 就 `SignIn(start)`、`end >= 0` 就 `SignOut(end)`（运算符自己的源码区间）；`context` 非空时再 `TryToClose(context)`（形状关闭，与 `PlusTokenShape.FromSymbol` 同口径）。`Pos` 不在这里赋：归约栈按 C1 赋「左操作数 `EndIndex`」。
- `position = prefix`：造**表达式节点形状**（`!` `~` `+` `-` `++` `--` → `PrefixUnaryExpressionShape`；`typeof` → `TypeOfExpressionShape`；`void` → `VoidExpressionShape`；`delete` → `DeleteExpressionShape`）。**不签入、不签出、不关闭**：范围从运算符起点到操作数终点，只能由调用方在挂上操作数后 `SignIn`/`SignOut`，`Pos` 也由调用方按 C1 赋。
- `position = postfix`：造 `PostfixUnaryExpressionShape`，同样不签、不关（范围从**操作数起点**开始，起点只有调用方知道）。
- `position = type-assert`：造 `AsExpressionShape` / `SatisfiesExpressionShape`，不签、不关（范围从表达式起点开始）。

造不出来按 C10 显式抛错，不静默返回错形状。

```ts
if (position === OperatorShapeMap.PositionPrefix) {
  return OperatorShapeMap.CreatePrefix(text, template);
}
if (position === OperatorShapeMap.PositionPostfix) {
  return OperatorShapeMap.CreatePostfix(text, template);
}
if (position === OperatorShapeMap.PositionTypeAssert) {
  return OperatorShapeMap.CreateTypeAssert(text, template);
}
if (position === OperatorShapeMap.PositionBinary) {
  return OperatorShapeMap.CreateBinary(text, template, start, end, context);
}
throw new Error("增量变量形状未支持：expression 运算符位置 " + position);
```

## private static method CreateBinary:(text:string, template:Template, start:int, end:int, context:SyntaxContext | null)=>Token

二元位分支表。**只在这里出现「符号文本 → 具体类」的对应**；新增运算符只加这里一个分支。

`<` 用 `FirstBinaryOperatorShape`（legacy 实测口径，见类头说明）；`in` / `instanceof` 用关键字形状（它们不是 `Symbol`，但位置/文本口径相同）。

```ts
if (text === "*") {
  return OperatorShapeMap.FinishShape(new AsteriskTokenShape(template), start, end, context);
}
if (text === "/") {
  return OperatorShapeMap.FinishShape(new SlashTokenShape(template), start, end, context);
}
if (text === "%") {
  return OperatorShapeMap.FinishShape(new PercentTokenShape(template), start, end, context);
}
if (text === "+") {
  return OperatorShapeMap.FinishShape(new PlusTokenShape(template), start, end, context);
}
if (text === "-") {
  return OperatorShapeMap.FinishShape(new MinusTokenShape(template), start, end, context);
}
if (text === "**") {
  return OperatorShapeMap.FinishShape(new AsteriskAsteriskTokenShape(template), start, end, context);
}
if (text === "<<") {
  return OperatorShapeMap.FinishShape(new LessThanLessThanTokenShape(template), start, end, context);
}
if (text === ">>") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanTokenShape(template), start, end, context);
}
if (text === ">>>") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanGreaterThanTokenShape(template), start, end, context);
}
if (text === "<") {
  return OperatorShapeMap.FinishShape(new FirstBinaryOperatorShape(template), start, end, context);
}
if (text === ">") {
  return OperatorShapeMap.FinishShape(new GreaterThanTokenShape(template), start, end, context);
}
if (text === "<=") {
  return OperatorShapeMap.FinishShape(new LessThanEqualsTokenShape(template), start, end, context);
}
if (text === ">=") {
  return OperatorShapeMap.FinishShape(new GreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === "instanceof") {
  return OperatorShapeMap.FinishShape(new InstanceOfKeywordShape(template), start, end, context);
}
if (text === "in") {
  return OperatorShapeMap.FinishShape(new InKeywordShape(template), start, end, context);
}
if (text === "==") {
  return OperatorShapeMap.FinishShape(new EqualsEqualsTokenShape(template), start, end, context);
}
if (text === "!=") {
  return OperatorShapeMap.FinishShape(new ExclamationEqualsTokenShape(template), start, end, context);
}
if (text === "===") {
  return OperatorShapeMap.FinishShape(new EqualsEqualsEqualsTokenShape(template), start, end, context);
}
if (text === "!==") {
  return OperatorShapeMap.FinishShape(new ExclamationEqualsEqualsTokenShape(template), start, end, context);
}
if (text === "&") {
  return OperatorShapeMap.FinishShape(new AmpersandTokenShape(template), start, end, context);
}
if (text === "^") {
  return OperatorShapeMap.FinishShape(new CaretTokenShape(template), start, end, context);
}
if (text === "|") {
  return OperatorShapeMap.FinishShape(new BarTokenShape(template), start, end, context);
}
if (text === "&&") {
  return OperatorShapeMap.FinishShape(new AmpersandAmpersandTokenShape(template), start, end, context);
}
if (text === "||") {
  return OperatorShapeMap.FinishShape(new BarBarTokenShape(template), start, end, context);
}
if (text === "??") {
  return OperatorShapeMap.FinishShape(new QuestionQuestionTokenShape(template), start, end, context);
}
if (text === "=") {
  return OperatorShapeMap.FinishShape(new EqualsTokenShape(template), start, end, context);
}
if (text === "+=") {
  return OperatorShapeMap.FinishShape(new PlusEqualsTokenShape(template), start, end, context);
}
if (text === "-=") {
  return OperatorShapeMap.FinishShape(new MinusEqualsTokenShape(template), start, end, context);
}
if (text === "*=") {
  return OperatorShapeMap.FinishShape(new AsteriskEqualsTokenShape(template), start, end, context);
}
if (text === "/=") {
  return OperatorShapeMap.FinishShape(new SlashEqualsTokenShape(template), start, end, context);
}
if (text === "%=") {
  return OperatorShapeMap.FinishShape(new PercentEqualsTokenShape(template), start, end, context);
}
if (text === "**=") {
  return OperatorShapeMap.FinishShape(new AsteriskAsteriskEqualsTokenShape(template), start, end, context);
}
if (text === "<<=") {
  return OperatorShapeMap.FinishShape(new LessThanLessThanEqualsTokenShape(template), start, end, context);
}
if (text === ">>=") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === ">>>=") {
  return OperatorShapeMap.FinishShape(new GreaterThanGreaterThanGreaterThanEqualsTokenShape(template), start, end, context);
}
if (text === "&=") {
  return OperatorShapeMap.FinishShape(new AmpersandEqualsTokenShape(template), start, end, context);
}
if (text === "^=") {
  return OperatorShapeMap.FinishShape(new CaretEqualsTokenShape(template), start, end, context);
}
if (text === "|=") {
  return OperatorShapeMap.FinishShape(new BarEqualsTokenShape(template), start, end, context);
}
if (text === "&&=") {
  return OperatorShapeMap.FinishShape(new AmpersandAmpersandEqualsTokenShape(template), start, end, context);
}
if (text === "||=") {
  return OperatorShapeMap.FinishShape(new BarBarEqualsTokenShape(template), start, end, context);
}
if (text === "??=") {
  return OperatorShapeMap.FinishShape(new QuestionQuestionEqualsTokenShape(template), start, end, context);
}
if (text === "?") {
  return OperatorShapeMap.FinishShape(new QuestionTokenShape(template), start, end, context);
}
if (text === ":") {
  return OperatorShapeMap.FinishShape(new ColonTokenShape(template), start, end, context);
}
throw new Error("增量变量形状未支持：expression 运算符 " + text);
```

## private static method CreatePrefix:(text:string, template:Template)=>Token

前缀位：返回**表达式节点**（legacy 树里这几种节点都只有操作数子节点）。`typeof` / `void` / `delete` 是关键字形式的三种专用节点，其余（`!` `~` `+` `-` `++` `--`）统一 `PrefixUnaryExpressionShape`。

```ts
if (text === "typeof") {
  return new TypeOfExpressionShape(template);
}
if (text === "void") {
  return new VoidExpressionShape(template);
}
if (text === "delete") {
  return new DeleteExpressionShape(template);
}
if (OperatorTable.IsPrefixOperator(text)) {
  return new PrefixUnaryExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 前缀运算符 " + text);
```

## private static method CreatePostfix:(text:string, template:Template)=>Token

后缀位：只有 `++` / `--`，统一 `PostfixUnaryExpressionShape`（legacy `a++` 实测）。

```ts
if (text === "++" || text === "--") {
  return new PostfixUnaryExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 后缀运算符 " + text);
```

## private static method CreateTypeAssert:(text:string, template:Template)=>Token

`as` → `AsExpressionShape`；`satisfies` → `SatisfiesExpressionShape`。节点下没有关键字子节点（legacy 实测），调用方只挂 `[表达式, 类型]`。

```ts
if (text === "as") {
  return new AsExpressionShape(template);
}
if (text === "satisfies") {
  return new SatisfiesExpressionShape(template);
}
throw new Error("增量变量形状未支持：expression 类型断言 " + text);
```

## private static method FinishShape:(shape:Token, start:int, end:int, context:SyntaxContext | null)=>Token

运算符形状的统一收尾：按运算符自己的源码区间签入 / 签出；`context` 非空时关闭形状（与既有 `PlusTokenShape.FromSymbol` 同口径：签入 → 签出 → `TryToClose`）。`Pos` 留空（C1：归约栈赋「左操作数 `EndIndex`」）。

```ts
if (start >= 0) {
  shape.SignIn(start);
}
if (end >= 0) {
  shape.SignOut(end);
}
if (context !== null && shape.SourceRange.Start >= 0 && shape.SourceRange.End >= 0) {
  shape.TryToClose(context);
}
return shape;
```
