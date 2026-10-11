# dependencies
```xl
import { BlockToken } from "../../core/syntax/block-token.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { Document } from "../../core/syntax/document.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { IsLeadingDotNumber, IsUnclosedBracedEscape, IsUnicodeEscapeStart } from "../text-common-util.xl.md"
import { Translate } from "./string/translate.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

通用字符块：标识符、数字、布尔字面量。它把连续的「不是符号、也不是空白」的字符吞进自己的 `Temp`，最终吐成 `<Identifier>abc</Identifier>`。

`CommonBranch` 必须写在 `Identifier` 之前：后者的静态字段 `AppendIn` 在类定义时就 `new CommonBranch()`。

# class CommonBranch extends Branch

分发规则比看上去绕：**上一个单元也是 `Identifier`** 时才会尝试续写，否则一律开新的。三条分支：

1. 当前字符是 `.` 且算符号——如果上一个 `Identifier` 是「纯数字」，这个点要**交给 `SymbolToken`**（小数点归符号处理），返回失败；否则失败。
2. 上一个 `Identifier` 已关闭——用「当前字符不是符号也不是空白」决定能不能开新块，`Message = 0`（新增）。
3. 否则——问上一个 `Identifier` 的 `IsAppend`，`Message = 1`（追加）。

无上一个 `Identifier` 时与第 2 条同款判定。

**指数里的正负号要单独放行**（`IsExponentSign`）：`1e-10` 的 `-` 是数字字面量的一部分，
可它同时又是符号，`IsAppend` 会判否。这一条与 `SymbolBranch` 那边的「让路」是同一件事的两半——
符号分支先被判，它得先拒收，这里才轮得到；两边判据必须一致，所以都调 `Identifier.IsExponentSign`。

**小数点开头的小数**（`.5`）同理，判据是 `../text-common-util.xl.md` 的 `IsLeadingDotNumber`：
`.` 是符号，`IsAppend` 会判否；而 `=` 后面直接跟 `.5` 时前面根本没有可续写的 `Identifier`，
所以要**新开**一个（`Message = 0`），不能沿用「上一个纯数字 Identifier 的小数点」那条（那条是 `Message = 1`，给 `1.5` 用）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断要不要接手当前字符，以及是「新增」还是「追加」。

```ts
const value = source.Value;
const last = unit.Last();
const escapeStart = value === "\\" && IsUnicodeEscapeStart(source.Document, source.Index);
const leadingDot = IsLeadingDotNumber(source.Document, source.Index);
if (last instanceof Identifier) {
  if (value === "." && unit.Template.SymbolTemplate.IsSymbol(value)) {
    const result = new BranchConditionResult();
    // **数字与点号之间隔着空白时那个点是成员访问**（第 180 轮）：`1 .toString()` 里
    // `1` 已经被那个空白**关掉**（`last.Closed`），点号不该再并进数字。
    // `1.5` 不受影响：那儿点号紧挨着数字，`Closed` 还是假。
    if (last.Closed === false && last.IsDecimalIntegerPrefix()) {
      result.Success = true;
      result.Message = 1;
      return result;
    }
    result.Success = leadingDot;
    return result;
  }
  if (last.Closed) {
    const result = new BranchConditionResult();
    result.Success = escapeStart || leadingDot || !(unit.Template.SymbolTemplate.IsSymbol(source.Value) || unit.Template.SymbolTemplate.IsWhiteSpace(source.Value));
    result.Message = 0;
    return result;
  }
  if (leadingDot) {
    const result = new BranchConditionResult();
    result.Success = true;
    result.Message = 0;
    return result;
  }
  const result = new BranchConditionResult();
  result.Success = escapeStart || last.IsExponentSign(source.Document, source.Index) || last.IsAppend(source) || last.IsBracedEscapePart(source);
  result.Message = 1;
  return result;
}
const result = new BranchConditionResult();
result.Success = escapeStart || leadingDot || !(unit.Template.SymbolTemplate.IsSymbol(source.Value) || unit.Template.SymbolTemplate.IsWhiteSpace(source.Value));
result.Message = 0;
return result;
```

**`escapeStart` 那一项是给标识符里的 Unicode 转义的**（`const \u0061bc = 1`）：
`\` 是符号，靠「不是符号」这条判定它进不来，所以要单独放行。
判据是 `../text-common-util.xl.md` 的 `IsUnicodeEscapeStart`，
它要求 `\` 后面跟 `u` 加十六进制数字，所以普通的反斜杠不受影响。
（`SymbolBranch` 那边同时让了路，两边配合才成立。）
它只管**反斜杠那一刻**：花括号写法的 `{` / `}` 由 `IsBracedEscapePart` 接手。

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

`Message` 为 `0` 就开一个新 `Identifier` 并签入，为 `1` 就追加到上一个。

```ts
if (result.Message === 0) {
  unit.AddAndCloseLast(new Identifier(unit.Template)).AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as Identifier)!.AppendAndSignOut(source);
}
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `Identifier` 关掉——它已经断开了。

与基类的空实现不同，这里**有活干**。

```ts
const last = unit.Last();
if (last instanceof Identifier) {
  last.TryToClose();
}
```

# class Identifier extends BlockToken

通用字符块。

单元值类型是单字符的 `string`。

它没有覆写 `ToXmlString`，XML 由 `BlockToken` 产出：`<Identifier>转义后的文本</Identifier>`。

## field IsIdentifierUnit:bool = true

**我这一格是不是一个标识符单元**（第 1096 轮）：标识符就是这一页，所以常量答 `true`——
口径与理由见 `../core/syntax/token.xl.md` 的 `IsIdentifierUnit`。它与下面那一格 `IsNameNode`
（`Identifier` / `Keyword` 都答 `true`，第 1057 轮）不是同一问。

## field IsNameNode:bool = true

**我这一格能不能当「一个名字」**（第 1057 轮）：这一页答 `true`——标识符在名字位上出现
（声明名、成员名、限定名的两半、绑定名），所以 `Token.IsNameNode` 这一格由**这一页**
显式声明并给出自己的值（构造时就赋好）。

判据过去在投影层（`print-ast-common.xl.md` 的 `isNameNode`：`Tag` 是 `Identifier` 或 `Keyword`），
而那两个名字**就是这一页与 `Keyword` 那一页自己的类名**——所以它本来就该由这两页各自答；
投影那一侧只读属性（`node.IsNameNode`），不再比类名。

## field IsOperatorUnit:bool = false

**我这一格能不能当「一个运算符」**（第 1062 轮）：标识符里只有 `in` / `instanceof`
这两个词算（判据就是**这一格自己的正文**），所以在 `Close()` 里赋好（见下）。

**为什么标识符也要答**：关掉 reorg 之后，`in` / `instanceof` 是由 `KeywordCloseRule`
在关前那一趟升上去的，而那一趟**排在最后**——二元折叠造出来的那个单元是自己又往下钻了一层
（`ApplyCloseRules` 里那道临时硬界），界那一层**不再跑规则**，所以最里面那一层的运算符
**永远停在 `Identifier`**（第 550 轮实测：`expr-in-array-literal.ts` 一份缺 38）。
按 `Keyword` 判就一格也认不出来，所以**同一个词两态都要认**——而这件事判的正是
「我这一格的正文是不是那个词」。

## field OperatorWordKind:string = ""

**我这一格的正文是词形运算符的话，它在 TS 那边叫什么**（第 1106 轮）：`in` / `instanceof`
两态各自答 `InKeyword` / `InstanceOfKeyword`，其余（含正文还没攒完的空串）答**空串**。
判据与赋值点与上一格**同一份正文、同一趟**（`Close()` 里紧跟着那一行），
口径见 `../core/syntax/token.xl.md` 的 `OperatorWordKind`。

**为什么这一页也要答**：与 `IsOperatorUnit` 同一件事实的两半（第 550 / 1062 轮那条
「同一个词两态都要认」）——关掉 reorg 之后最里面那一层的 `in` / `instanceof`
**永远停在 `Identifier`**，投影要的是那个关键字节点名，而这个名字与 `LeafKindOfText` 里
`true` / `null` / `this` / `super` 那几档同一条口径：**这一页的正文对应哪个 TS 叶子节点**，
由这一页自己答（那一格答的是语法位置上的叶子，这一格答的是运算符位上的那一态）。

## field IsTypeParameterModifier:bool = false

**我这一格是不是类型参数的修饰词**（第 1062 轮）：标识符里是 `in` / `out` / `const`
这三个词（`out` 是上下文修饰、词法上仍是标识符；`in` / `const` 的另一态是 `Keyword`），
同样按**这一格自己的正文**判、同样在 `Close()` 里赋好。

## field IsNewKeyword:bool = false

**我这一格的正文是不是 `new` 那个词**（第 1118 轮）：是的话答 `true`，
在 `Close()` 里与上面那几格**同一趟**赋好。口径与理由见
`../core/syntax/token.xl.md` 的 `IsNewKeyword`——过去投影层三处 `k.TextValue === "new"`
现在都读这一格（`new` 在产物里是 `Keyword`，但「还停在标识符上的那一格」也递得到投影，
所以两页各写自己认得的词）。

## field IsAsyncKeyword:bool = false

**我这一格的正文是不是 `async` 那个词**（第 1118 轮）：同上一格，同一趟赋好。
`async` 在本工程里**多数时候就停在 `Identifier` 上**（它是上下文关键字），所以这一页
正是它最常见的收件人。

## field IsAbstractKeyword:bool = false

**我这一格的正文是不是 `abstract` 那个词**（第 1118 轮）：同上一格，同一趟赋好
（`abstract` 也是上下文关键字，类成员那一页把它当修饰词）。

## field IsImportKeyword:bool = false

**我这一格的正文是不是 `import` 那个词**（第 1118 轮）：同上一格，同一趟赋好
（`import.meta` 里那个词在产物里也可能还停在 `Identifier` 上）。

## field IsAsKeyword:bool = false

**我这一格的正文是不是 `as` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（`as` 是上下文关键字，`import { a as b }` 里那个词在产物里也可能还停在 `Identifier` 上）。

## field IsExtendsKeyword:bool = false

**我这一格的正文是不是 `extends` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（条件类型里那个词在产物里也可能还停在 `Identifier` 上）。

## field IsTypeKeyword:bool = false

**我这一格的正文是不是 `type` 那个词**（第 1120 轮）：同上一格，同一趟赋好
（导出子句 `export { type A }` 里那个词在产物里也可能还停在 `Identifier` 上）。

## field IsIsKeyword:bool = false

**我这一格的正文是不是 `is` 那个词**（第 1120 轮）：同上一格，同一趟赋好
（`is` 不是本工程的关键字，类型谓词 `x is T` 里那个词多半就停在 `Identifier` 上）。

## field IsDeclareWord:bool = false

**我这一格的正文是不是一个声明词**（第 1121 轮）：同上一格，同一趟赋好——本页只认
`using` 那一个（它不是本工程的关键字，`for (using x of xs)` 里那个词就停在这里；
`const` / `let` / `var` 由 `Keyword` 那一页认）。两页各写自己认得的词，
口令与理由见 `../../core/syntax/token.xl.md` 的 `IsDeclareWord`。

## field IsChainBaseNode:bool = true

**我这一格能不能当一条链的基名**（投影侧那一问；第 1075 轮）：标识符**默认能**，
把那几个「自己就开始一条语句 / 一种构造」的词排掉（`return` / `throw` / `case` / `default` /
`else` / `do` / `break` / `continue` / `yield` / `typeof` / `void` / `in` / `instanceof` /
`new` / `import` / `await` / `super`）——判据就是**这一格自己的正文**，所以在 `Close()` 里赋好（见下）。

**为什么默认 `true`**：这一格与 `IsOperatorUnit` 那两格同一个形状，但**方向相反**——
正文没攒完（`Temp` 还是空的）时投影读到的文本是空串，而空串不在上面那份名单里 ⇒ 那时候的答案是
`true`；默认值取 `true` 才与「读这一格自己的正文」逐格等价。

判据过去在投影层（`print-ast-common.xl.md` 的 `IsChainBaseNode`：`Tag` 是 `Identifier` /
`Keyword` 就回读 `node.value` 排掉那串词）——而「我这一格的正文是什么」只有这一页知道。

## static readonly field AppendIn:CommonBranch = new CommonBranch()

把 `CommonBranch` 注册进通用跳转队列用的实例。

## constructor:(Template:Template)=>void

转调基类构造器。

```ts
super(Template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块：不是符号、也不是空白就行。

```ts
return !(this.Template.SymbolTemplate.IsSymbol(Src.Value) || this.Template.SymbolTemplate.IsWhiteSpace(Src.Value));
```

## method IsBracedEscapePart:(Src:Source)=>bool

本块正停在**没闭合的 `\u{…`** 里，而 `Src` 是花括号形态的两个符号字符之一（`{` / `}`）——
这一个字符该并进标识符，不该归 `SymbolToken`。

**为什么需要它**（第 601 轮）：`IsUnicodeEscapeStart` 认花括号写法（`\u{65}`），
所以 `\` 那一格两边都让路了；可它只在**反斜杠那一刻**回答，
`\u` 收进 `Temp` 之后就到了 `{`——`{` 是符号，`CommonBranch` 的 `IsAppend` 判否、
`SymbolBranch` 又当仁不让 ⇒ 一个标识符被切成 `Identifier(\u)` + `TypeLiteral{65}` + `Identifier(scaped)`
（实测：声明的是 `\u`，用的是 `scaped`）。

判据落在**本块的 `Temp`** 上，而不是「上一个单元是不是 `Identifier`」：
`{` 那一刻 `unit.Last()` 问得到的是别人，只有 `Temp` 记录着「`\u{` 还差一个 `}`」。
文本那半截是 `../text-common-util.xl.md` 的 `IsUnclosedBracedEscape`（`BracketBranch` 也问它）。
十六进制位不用在这里放行（它们不是符号，`IsAppend` 本来就收）；
闭合之后的 `}` 也不放行（那时 `Temp` 里已经有 `}`，`IsUnclosedBracedEscape` 判否）。

```ts
if (this.Closed) {
  return false;
}
if (Src.Value !== "{" && Src.Value !== "}") {
  return false;
}
return IsUnclosedBracedEscape(this.TempToString());
```

## protected method Close:()=>void

关闭：把自己标记为已关闭，**并把由这一格正文派生的那几格一起赋好**（第 1062 / 1075 / 1106 / 1118 轮）。

**为什么赋值点在这里**：标识符是**逐字符攒起来**的，而 `Close()` 正是「攒完了」那一刻
（`SymbolToken` 那一页把同款的三格放在同一处，理由同一条：读得到的一定是收完的正文）。

```ts
this.Closed = true;
// 这几格都是「我这一格的正文是什么」的函数，所以在同一个时刻、同一趟里赋好。
this.IsOperatorUnit = this.IsAny(["in", "instanceof"]);
// **第 1106 轮**：同一份事实的第二个出口——是那两个词的话，名字也在这里一起答
// （判据读上一行那一格，这一页因此只有一份「那两个词」的名单）。
this.OperatorWordKind = this.IsOperatorUnit
  ? (this.TempToString() === "in" ? "InKeyword" : "InstanceOfKeyword")
  : "";
this.IsTypeParameterModifier = this.IsAny(["in", "out", "const"]);
// **第 1118 轮**：投影层那几处 `k.TextValue === "new"` / `"async"` / `"abstract"` /
// `"import"` 收成属性读——判据仍是这一页自己的正文，所以与上面那几格**同一趟**赋好。
this.IsNewKeyword = this.Is("new");
this.IsAsyncKeyword = this.Is("async");
this.IsAbstractKeyword = this.Is("abstract");
this.IsImportKeyword = this.Is("import");
// **第 1119 轮**：`as` 也是上下文关键字（同一份正文的函数），同一趟赋好。
this.IsAsKeyword = this.Is("as");
this.IsExtendsKeyword = this.Is("extends");
// **第 1120 轮**：`type` / `is` 两格同一趟赋好（导出子句那个标志词与类型谓词那个词）。
this.IsTypeKeyword = this.Is("type");
this.IsIsKeyword = this.Is("is");
// **第 1121 轮**：声明词那一格同一趟赋好——本页只认 `using`（它不是本工程的关键字，
// `for (using x of xs)` 里那个词就停在 `Identifier` 上），投影层 `ctx.HeadDeclare` 读这一格。
this.IsDeclareWord = this.Is("using");
// **第 1075 轮**：投影侧那一问（这一格能不能当链的基名）的另一半是「我这一格的正文是
// 不是那几个不走链的词」——同一趟、同一份正文。
this.IsChainBaseNode = !this.IsAny([
  "return", "throw", "case", "default", "else", "do", "break", "continue",
  "yield", "typeof", "void", "in", "instanceof", "new", "import", "await", "super",
]);
```

## method IsExponentSign:(document:Document, index:number)=>bool

`Temp` 是一个**十进制**数字字面量的前缀、末尾是 `e` / `E`，而 `index` 处是紧跟其后的 `+` / `-`，
再往后一位是数字——这时这个正负号属于指数的一部分（`1e-10` / `1.5e+3`），该由 `Identifier` 吃掉。

TypeScript 的数字文法里指数部分允许带符号。少了这一条，`1e-10` 会被切成
「数字 `1e` + 二元减号 + 数字 `10`」——产物里凭空多出一个 `BinaryOperator`，
数字本身还被拆成两半（探索性差分实测 37 处）。

三条限制都不能省：

- **前缀必须是十进制**：`0x1e-5` 里那个 `e` 是十六进制位、不是指数标记，`-` 仍旧是减号；
- **前缀得是有数字的十进制字面量**（至多一个小数点）：`abse-1` 里 `e` 只是标识符的一部分；
- **符号后面必须紧跟数字**：`1e- 5`、`1e-x` 都不是数字字面量。

`this.Closed` 为真说明这一块已经断了，不该再续。

```ts
if (this.Closed) {
  return false;
}
const sign = document.GetValue(index);
if (sign !== "+" && sign !== "-") {
  return false;
}
const text = this.TempToString();
if (text.length < 2) {
  return false;
}
const tail = text[text.length - 1];
if (tail !== "e" && tail !== "E") {
  return false;
}
const head = text.substring(0, text.length - 1);
const lowered = head.toLowerCase();
if (lowered.startsWith("0x") || lowered.startsWith("0b") || lowered.startsWith("0o")) {
  return false;
}
let digits = 0;
let dots = 0;
for (const item of head) {
  if (item >= "0" && item <= "9") {
    digits = digits + 1;
  } else if (item === "_") {
    // 数字分隔符：`1_000e-2`
  } else if (item === ".") {
    dots = dots + 1;
  } else {
    return false;
  }
}
if (digits === 0 || dots > 1) {
  return false;
}
if (index + 1 >= document.GetCount()) {
  return false;
}
const next = document.GetValue(index + 1);
return next >= "0" && next <= "9";
```

## method IsDecimalIntegerPrefix:()=>bool

`Temp` 是不是**十进制整数字面量的写法**——只由数字与分隔符 `_` 组成，至少有一个数字，首尾都不是 `_`。

用它而不是 `IsNumberWithoutDecimal` 来判「小数点该并进来吗」：后者要求**每一位都是数字**，
数字分隔符会把它判否，于是 `1_000.5` 里那个小数点被 `SymbolToken` 抢走——
产物变成 `Identifier(1_000)` + `SymbolToken(.)` + `Identifier(5)`，一个数字字面量被拆成三段（实测）。
与 `1.5` 对齐才是对的：分隔符只是排版，不改变「这是个十进制整数前缀」这件事。

`0x1_F` 这类十六进制前缀不含十六进制位以外的字符？它含 `x`，所以这里判否——
十六进制字面量没有小数部分，后面的点该归 `SymbolToken`。

```ts
const text = this.TempToString();
if (text.length === 0) {
  return false;
}
if (text[0] === "_" || text[text.length - 1] === "_") {
  return false;
}
let digits = 0;
for (const item of text) {
  if (item >= "0" && item <= "9") {
    digits = digits + 1;
  } else if (item !== "_") {
    return false;
  }
}
return digits > 0;
```

## method IsNumberWithoutDecimal:()=>bool

`Temp` 里的内容是不是「纯数字」——每一位都是数字。

直接转调符号模板的同名方法。

```ts
return this.Template.SymbolTemplate.IsNumberWithoutDecimal(this.Temp.join(""));
```

## method IsNumberContainsDecimal:()=>bool

`Temp` 里的内容是不是能解析成小数。

```ts
return this.Template.SymbolTemplate.IsNumberContainsDecimal(this.Temp.join(""));
```

## method IsLastCharIsNumber:()=>bool

最后一个字符是不是数字。

直接转调符号模板的 `IsNumber`，取 `Temp` 的末位字符。

```ts
return this.Template.SymbolTemplate.IsNumber(this.Temp[this.Temp.length - 1]);
```

## method IsNumber:()=>bool

`Temp` 里的内容算不算数字字面量。

规则里有两处**反直觉但必须保留**的行为：

- 允许**至多一个小数点**，而且**不要求有数字**——所以 `"."` 也会返回 `true`；`".."` 返回 `false`。
- 允许结尾一个 `d` 或 `f` 后缀，但**必须在有数字之后且是最后一个字符**。

`Temp` 为空时循环一次都不执行，返回 `true`。

```ts
let containsDot = false;
let containsNumber = false;
let index = 0;
for (const item of this.Temp) {
  if (this.Template.SymbolTemplate.IsNumber(item)) {
    if (!containsNumber) {
      containsNumber = true;
    }
  } else if (item === ".") {
    if (containsDot) {
      return false;
    }
    containsDot = true;
  } else {
    if ((item === "d" || item === "f") && containsNumber && index === this.Temp.length - 1) {
      // 后缀合法，什么都不做
    } else {
      return false;
    }
  }
  index++;
}
return true;
```

## method IsBool:()=>bool

`Temp` 里的内容是不是 `true` / `false` 字面量。

```ts
const text = this.TempToString();
return text === "true" || text === "false";
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否**逐字符**等于 `value`。

先比长度，再逐字符比；语义上等价于 `TempToString() === value`，但这里保留显式循环。

```ts
if (this.Temp.length !== value.length) {
  return false;
}
for (let i = 0; i < this.Temp.length; i++) {
  if (this.Temp[i] !== value[i]) {
    return false;
  }
}
return true;
```

## method IsAny:(items:Array<string>)=>bool

`Temp` 里的内容是否命中 `items` 里的任意一项。

这是 `Is` 的多项版本，参数个数与单参版不同，所以叫 `IsAny`。

```ts
return items.includes(this.TempToString());
```

## method PrintAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：这一格出哪个节点，只许用这个 token 自己的属性、子单元与 `Parent`，不回原文查——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintAst`。

```ts
  // **文本读 token 自己的 `Temp`**（第 992 轮）：`ctx.Text(v)` 在值为空时会回原文切一刀，
  // 那是这条路上不许有的第二份近似；`Identifier` 的正文就是它自己攒下来的那串字符。
  const text = this.TempToString();
  return ctx.Node(this.LeafKind, { text: Translate.DecodeIdentifierEscapes(text) }, v);
```

## property LeafKind:string

**我这一格在 TS 那边是哪个 kind**（第 1029 轮；**第 1127 轮由 `## method` 收成属性**）：
标识符 / 数字 / 布尔字面量 / 字符串 / 私有名
在产物里**都是 `<Identifier>` 这个文本块**，而 TS 那边各有一个 `SyntaxKind`——
这一页是它们的家，所以由这一页按**自己的正文**答。

**为什么它是属性、而且是 `## property` + `### get` 不是 `## field`**：与 `Token.TextValue`（第 1069 轮）
/ `Keyword.KeywordKind`（第 1042 轮）/ `SymbolToken.OperatorRank`（第 1063 轮）同一条口径——
它答的是「**我这一格正文**」的函数，而正文到 `Close()` 那一刻才攒完；有些单元没走过 `Close()`
（第 1063 轮实测过把同族写成字段的代价：`coverage` 4260 → 4058），写成字段就会静默退回默认值。
**取值口径与原来那一格逐字符相同**：`TextValue` 对块 token 就是 `TempToString()`（`BlockToken.value` 那一格），
所以 `LeafKindOfText(this.TextValue)` 与原来 `LeafKindOfText(this.TempToString())` 同答。

**投影那一侧**（`print-ast-common.xl.md` 绑定位默认值那一处）手上**就是这一格单元**，
所以它读 `only.LeafKind`——不再把这一格的正文拿去问这一页的静态表
（用户口径 1.1~1.4：token 子类构建完，信息就齐全）。静态那格 `LeafKindOfText` 留着，
给**只有一段文本**的调用点（`method.xl.md` 那两处）。

### get

```ts
  return Identifier.LeafKindOfText(this.TextValue);
```

## property IsLiteralTypeWord:bool

**我这一格的正文是不是「类型位要套一层 `LiteralType`」的那三个词之一**（`null` / `true` / `false`；
**第 1128 轮由下面那一格静态入口收成属性**）。投影在 `projectTypeExpression` 里手上**就是这一格单元**
（`head.IsNameNode`），所以这一问由这一格自己答：读自己的 `TextValue` 问同一份名单，
与原来 `Identifier.IsLiteralTypeWord(head.TextValue)` **逐字符同答**。
名单与判据只有一处（下面那个静态入口），`Keyword` 那一页也答同一格
（能当一个名字的只有那两页，第 1057 轮）。

### get

```ts
  return Identifier.IsLiteralTypeWord(this.TextValue);
```

## property PrimitiveTypeKind:string | undefined

**我这一格的正文在类型位叫哪个 kind**（**第 1128 轮由 `PrimitiveTypeKindOf` 收成属性**；
答 `undefined` ＝「不是原始类型名」，投影于是走到 `TypeReference` 那一支）。
与 `LeafKind` 同一形态、同一条理由（正文到 `Close()` 那一刻才攒完，所以是 `### get` 不是 `## field`）；
静态那一格留给「手上只有一段文本」的调用点。

### get

```ts
  return Identifier.PrimitiveTypeKindOf(this.TextValue);
```

## property IsNumericLiteral:bool

**我这一格的正文是不是数字字面量**（**第 1129 轮由下面那一格静态入口收成属性**）：
投影在 `json/object-literal.xl.md` 里手上**就是这一格单元**（`{ 1: "a" }` 的键，
`nameUnits[0].IsNameNode`），所以这一问由这一格自己答：读自己的 `TextValue` 问同一张
`NUMERIC_LITERAL`，与原来 `Identifier.IsNumericLiteral(nameUnits[0].TextValue)`
**逐字符同答**（同一个静态入口、同一段文本）。`Keyword` 那一页也答同一格
（能当一个名字的就是那两页，第 1057 轮；对非数字正文两张答案同为 `false`）。
静态那一格留给「手上只有一段文本」的调用点（`object-literal.xl.md` 那一处仍走它）。
**第 1135 轮试过把投影 `memberNameOf` 那一处也收进本页一格属性（`IsNumericLiteralName`）、
当场被 `coverage` 抓住并如实还原**：那一处的收件人**不是名字单元自己**，而是**声明了
这一格名字的那一格**（`MethodDeclaration` / `Field`）——它拿到的是基类默认档 `false`，
逐节点 diff 是 `MISS NumericLiteral` + `EXTRA Identifier` 那一对（四条用例一起 blocked）。
**第 1136 轮按那一条判据把它收成了**：量到落进那一档的类**只有那两个**，
所以那一格立在 `typescript/tokens/field.xl.md` 与 `function/method-declaration.xl.md`
（各 `## field IsNumericLiteralName`，在认下名字那一趟用**本页这个静态入口**赋好），
不是立在本页、也不是立在基类；本页这一格与静态那一格一个字没动。

### get

```ts
  return Identifier.IsNumericLiteral(this.TextValue);
```

## property NameNode:any

**我这一格当名字时投出来的那个 `Identifier` 节点**（第 1130 轮）：投影过去拿一个名字单元去问
`ctx.NameOf(unit)`（`print-ast-common.xl.md` 的 `nameOf`，第 4463 行立的），而这一问的两半事实
（正文是 `TextValue`、坐标是自己的 `start` 与正文长度）**都在这一格单元自己身上**——按用户口径
1.1~1.4，它由**这一格自己**答，投影那一侧只读 `unit.NameNode`（出口随之删掉，
名字补进 `direct:lint` 的 `CTX_BANNED`）。

**取值口径与原来那个函数逐字符相同**：`text` 是 `Translate.DecodeIdentifierEscapes(this.TextValue)`
（`{ \u0061: 1 }` 的键在源码里占 6 个字符、而它的名字是 `a`，第 381 / 382 轮），
`pos` 是 `this.start`、`end` 是 `pos + TextValue.length`（**原文那一格的**长度，
不是解开之后的长度——与 `nameOf` 里的 `at + text.length` 同一个 `text`）。

**为什么是 `## property` + `### get` 不是 `## field`**：与同页 `LeafKind` 同一条口径——
正文到 `Close()` 那一刻才攒完，而名字位（对象字面量的键、限定名的右半、类型引用的名字）
未必都走过 `Close()`（第 1063 轮实测过把同族写成字段的代价：coverage 4260 → 4058）。

**为什么 `Keyword` 那一页也答同一格**：能当一个名字的就是那两页（`IsNameNode`，第 1057 轮）。

**位置用原文、`text` 用解开的**（第 382 轮挑出来的那一处，第 1131 轮随这一格一起搬进本页）：
`{ \u0061: 1 }` 那个键在源码里占 **6 个字符**（`end` 要按它算），而它的**名字**是 `a`
（TS 的 AST `text` 也是 `a`）。**这一格第 381 轮漏过**——那时候改的是
`Identifier.PrintAst`（**子单元**那条路）与投影读**属性**那三处，而对象字面量那一支是
**自己拿文本合一个节点**的，压根不经过前两条 ⇒ `Object.keys({ \u0061: 1 })` 给 `["\u0061"]`、
`x.a` 给 `undefined`（**静默错值**）。所以这一格的两截必须这么分：`text` 走
`DecodeIdentifierEscapes`、长度走**原文那一格**。

**第 1131 轮起它是唯一入口**：投影页那一格 `nameOf`（连同它自己那 17 处内部调用点）
一并删掉，全仓只剩这一个入口。

### get

```ts
  const text = this.TextValue;
  const at = this.start;
  return { kind: "Identifier", text: Translate.DecodeIdentifierEscapes(text), pos: at, end: at + text.length };
```

## static method LeafKindOfText:(text:string)=>string

**给一段叶子文本，答它在 TS 那边的 kind**（第 1029 轮从投影层搬到这里）。

搬过来之前它是 `typescript/print-ast-common.xl.md` 的 `# method leafKindOfText`，投影经
`ctx.LeafKind(text)` 问它——而**键是叶子自己的正文**（`Identifier.TempToString()` /
`Keyword.Value` 那一族），也就是**这一页自己的事实**。今天读法有两个：
`Identifier.LeafKind`（**第 1127 轮起是属性**，读自己的正文；`Keyword.LeafKind` 也答同一格）与
投影里那些「手上只有一段名字文本」的地方（`method.xl.md` 的调用名）走这个静态入口。

```ts
  // **`1n` 是 `BigIntLiteral`**（第 160 轮）：TS 那边整数字面量带 `n` 后缀时是**另一个 kind**
  // （`BigIntLiteral`），照 `NumericLiteral` 投会同时记「缺 `BigIntLiteral`」与
  // 「多出 `NumericLiteral`」（实测 `lex-number-bigint.ts` / `lx-numeric-literals.ts` /
  // `ty-literal-types.ts` 各一处）。
  if (NUMERIC_LITERAL.test(text)) return text.endsWith("n") ? "BigIntLiteral" : "NumericLiteral";
  if (/^["'`]/.test(text)) return "StringLiteral";
  if (text === "true") return "TrueKeyword";
  if (text === "false") return "FalseKeyword";
  if (text === "null") return "NullKeyword";
  // **`#x` 是 `PrivateIdentifier`**（第 131 轮）：类里的私有名在 TS 那边有自己的 kind
  // （`PrivateIdentifier`，区间含那个 `#`）。产物把它当普通文本块，照 `Identifier` 投
  // 会同时记「缺 `PrivateIdentifier`」与「多出 `Identifier`」
  // （实测 `cls-hash-in-operator.ts` / `cls-private-fields.ts` 一族 22 处）。
  if (text.length > 1 && text[0] === "#") return "PrivateIdentifier";
  // **`super` 永远是 `SuperKeyword`**（第 98 轮）：`super(1)` / `super.x` 的 TS 是
  // `CallExpression > SuperKeyword` / `PropertyAccessExpression > SuperKeyword`，
  // 而产物把那两个名字投成了 `Identifier`（实测缺 `SuperKeyword` 134 + 多出 `Identifier` 134）。
  // 它不可能是一个标识符名（`super` 是保留字），所以这一条没有副作用。
  if (text === "super") return "SuperKeyword";
  // **`this` 永远是 `ThisKeyword`**（第 146 轮）：值位与类型位在 TS 那边都是它
  // （`x?.Document === y.Document` 那种比较式里产物把 `this` 记成普通 `Identifier`，
  // 实测 `dist/ts/core/syntax/source-range.ts`：缺 `ThisKeyword` 1 + 多出 `Identifier` 1）。
  // **成员名 / 绑定名不走这里**（投影的 `nameOf` 一律给 `Identifier`），所以 `a.this` / `{ this: 1 }` 不受影响；
  // 形参名那一处也单独走 `nameOf`。
  if (text === "this") return "ThisKeyword";
  // **`undefined` 不走这里**（第 91 轮修）：它是**上下文关键字**——值位的 `x === undefined`
  // 在 TS 那边是一个 `Identifier`（`undefined` 不是保留字），只有**类型位**的 `: undefined`
  // 才是 `UndefinedKeyword`。这一格管的是**叶子**（值位标识符），把它算成 `UndefinedKeyword`
  // 会同时记「多出 `UndefinedKeyword` 147 + 缺 `Identifier` 一大片」。
  // 类型位那一边由**这一页**的 `PrimitiveTypeKindOf` 负责（那里面有 `undefined`；第 1032 轮搬过来）。
  return "Identifier";
```

## static method IsNumericLiteral:(text:string)=>bool

**这段文本是不是数字字面量**（第 1029 轮）：判据就是这一页下面那张 `NUMERIC_LITERAL`。

它单独成一个入口，是因为**数字字面量的写法是这一页的事实**，而投影里有两处要判它
却不持有叶子单元：`memberNameOf`（成员名那一格是数字 ⇒ `NumericLiteral`）与
`object-literal.xl.md`（对象字面量的键是数字 ⇒ `NumericLiteral` 而不是 `Identifier`）。
搬过来之前投影经 `ctx.NumericLiteral` 把那张正则**整个**递出去，等于把这一页的词汇
复制到 `ctx` 上；现在只递一个问句。

```ts
  return NUMERIC_LITERAL.test(text);
```


## static method PrimitiveTypeKindOf:(text:string)=>string | undefined

**给一段叶子文本，答它在 TS 那边算不算「原始类型名」、算的话是哪个 kind**（第 1032 轮从投影层
`print-ast-common.xl.md` 的 `# private const PRIMITIVE_TYPE_KIND` 搬到这一页）。

**为什么家在这一页**：键还是**叶子自己的正文**（与 `LeafKindOfText` / `IsNumericLiteral` 同一格
事实、同一个入口形态），只是**语义不同**——那一份管的是「产物把它标成 `<Identifier>` 了」，
这一份管的是「**在类型位上**该叫这个名字」。而产物在类型位把 `string` 标成的正是
`<Identifier>`（实测 `x: string` 里 `string` 是 `Identifier`），所以这一页本来就是它的家。
搬过来之前它住在投影页里，投影经 `.get(text)` 直接读那张表；今天读法只有一个：
`Identifier.PrimitiveTypeKindOf(text)`（`projectTypeExpression` 那一支）。

答 `undefined` ＝「不是原始类型名」（投影于是走到 `TypeReference` 那一支）。

```ts
  return PRIMITIVE_TYPE_KIND.get(text);
```

## static method IsLiteralTypeWord:(text:string)=>bool

**这三个词在类型位要套一层 `LiteralType`**（第 1032 轮从投影层的
`# private const LITERAL_TYPE_KEYWORDS` 搬来，并把第二处声明收成一处）。

**同一份名单原来有两处**：`literal-type.xl.md` 的 `LiteralTypeCloseRule.IsLiteralUnit`
自己写了一遍（`item.IsBool() || item.TempToString() === "null"`），投影层那一支又写了一遍
（那张三词的集合）——但两者管的是同一句话，只是**覆盖的位置不同**：
收尾规则认得的位置（类型容器里）它已经包好了，而类型参数约束 / 类型实参段里那些
`null` / `true` / `false` 还是**裸的 `Identifier`**，要投影这一支来补
（实测缺 `LiteralType` 214 处，样本几乎全是 `X extends null | Y`）。
今天两处都问这一格，**词表只有一份**。

`undefined` 刻意**不在**里面：TS 的 `undefined | null` 是 `UndefinedKeyword` +
`LiteralType > NullKeyword`——两个词长得一样、形状却不同（TS 自己的口径，不是本工程的取舍）。

```ts
  return LITERAL_TYPE_WORDS.has(text);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new Identifier(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```

# private const NUMERIC_LITERAL:RegExp = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*(\.[\d_]*)?|\.[\d_]+)([eE][+-]?\d[\d_]*)?)n?$/

**数字字面量的写法**（第 1029 轮从投影层搬到这里）：十进制 / 十六进制 / 二进制 / 八进制 /
指数 / 数字分隔符 / `BigInt` 的 `n` 后缀都认——数字字面量在产物里就是一格 `<Identifier>`，
所以它的写法是**这一页自己的事实**（`LeafKindOfText` 与 `IsNumericLiteral` 读的都是它）。

**这一版修过两处**（第 160 轮）：

- **指数里的分隔符**：`1_0e1_0` 原来不匹配（`[eE][+-]?\d+` 不许 `_`），于是投成 `Identifier`
  ——TS 那边它是 `NumericLiteral`（实测 `lex-number-separator-exponent.ts`）；
- **小数部分可以为空**：`1.`（`1..toString()` 的前半截）原来也不匹配，
  同样掉成 `Identifier`（TS：`NumericLiteral("1.")`）。小数点的两种写法合成
  `(\d[\d_]*(\.[\d_]*)?|\.[\d_]+)`：整数可带空小数、`.5` 这种前导点单独一支。

**它标 `RegExp`**：TS 目标上这一格是准的；换到 C++ 目标时这一类要另想办法（登记在 README
的目标差异里），**不为了一个还不存在的目标改动已经量过的实现**。

# private const LITERAL_TYPE_WORDS:Set<string> = new Set(["null", "true", "false"])

**类型位要套 `LiteralType` 的三个词**（第 1032 轮从投影层搬到这里，读法是
`Identifier.IsLiteralTypeWord`）。`undefined` 为什么不在这里，见那一格的说明。

# private const PRIMITIVE_TYPE_KIND:Map<string, string>

**原始类型**名 → `SyntaxKind` 名（第 1032 轮从投影层搬到这里，读法是
`Identifier.PrimitiveTypeKindOf`）。

它在 TS 那边**不是** `TypeReference`（见 `tokens/type-define.xl.md` 的 `PrintAst`）。
这张表与 `Keyword.KeywordKind` 那一份词汇有重叠，但**语义不同**：那一份管的是
「产物把它标成 `<Keyword>` 了」，这张表管的是「**在类型位上**该叫这个名字」——
而产物在类型位把 `string` 标成的是 `<Identifier>`（实测 `x: string` 里 `string` 是 `Identifier`）。

```ts
new Map([
  ["any", "AnyKeyword"],
  ["unknown", "UnknownKeyword"],
  ["number", "NumberKeyword"],
  ["bigint", "BigIntKeyword"],
  ["object", "ObjectKeyword"],
  ["boolean", "BooleanKeyword"],
  ["string", "StringKeyword"],
  ["symbol", "SymbolKeyword"],
  ["void", "VoidKeyword"],
  ["undefined", "UndefinedKeyword"],
  ["never", "NeverKeyword"],
  ["null", "NullKeyword"],
  ["this", "ThisKeyword"],
  // **`intrinsic` 在 TS 那边是一个独立的 kind**（第 123 轮）：`type U = intrinsic;`
  // 的 TS 节点是 `IntrinsicKeyword`——**不是** `TypeReference > Identifier`。
  // 它只在类型位有意义（`lib.es5.d.ts` 的 `Uppercase` / `Lowercase` / `Capitalize` /
  // `Uncapitalize` 四个内建别名就是这一族，一个文件里 5 处）。
  ["intrinsic", "IntrinsicKeyword"],
])
```
