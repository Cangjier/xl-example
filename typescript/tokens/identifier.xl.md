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

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
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

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **文本读 token 自己的 `Temp`**（第 992 轮）：`ctx.Text(v)` 在值为空时会回原文切一刀，
  // 那是这条路上不许有的第二份近似；`Identifier` 的正文就是它自己攒下来的那串字符。
  const text = this.TempToString();
  return ctx.Node(this.LeafKind(), { text: Translate.DecodeIdentifierEscapes(text) }, v);
```

## method LeafKind:()=>string

**我这一格在 TS 那边是哪个 kind**（第 1029 轮）：标识符 / 数字 / 布尔字面量 / 字符串 / 私有名
在产物里**都是 `<Identifier>` 这个文本块**，而 TS 那边各有一个 `SyntaxKind`——
这一页是它们的家，所以由这一页按**自己的正文**答。

```ts
  return Identifier.LeafKindOfText(this.TempToString());
```

## static method LeafKindOfText:(text:string)=>string

**给一段叶子文本，答它在 TS 那边的 kind**（第 1029 轮从投影层搬到这里）。

搬过来之前它是 `typescript/print-ast-common.xl.md` 的 `# method leafKindOfText`，投影经
`ctx.LeafKind(text)` 问它——而**键是叶子自己的正文**（`Identifier.TempToString()` /
`Keyword.Value` 那一族），也就是**这一页自己的事实**。今天读法有两个：
`Identifier.LeafKind()`（自己的正文）与投影里那两处「手上只有一段名字文本」的地方
（`projectBindingElement` 的默认值、`method.xl.md` 的调用名）走这个静态入口。

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
  // 类型位那一边由投影页的 `PRIMITIVE_TYPE_KIND` 负责（那里面有 `undefined`）。
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
