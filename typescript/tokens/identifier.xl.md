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
import { IsLeadingDotNumber, IsUnicodeEscapeStart } from "../text-common-util.xl.md"
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
    if (last.IsDecimalIntegerPrefix()) {
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
  result.Success = escapeStart || last.IsExponentSign(source.Document, source.Index) || last.IsAppend(source);
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

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：标识符 / 数字 / 布尔字面量的文本块在 TS 那边**按文本再分名**
（`bar` 是 `Identifier`、`0` 是 `NumericLiteral`、`true` 是 `TrueKeyword`、`"x"` 是 `StringLiteral`）。
这条「按值分名」的规则原来在 `typescript/ts-ast.xl.md` 的中央 `switch` 里，现在跟这个类待在一起。

```ts
const text = ctx.Text(v);
return ctx.Node(ctx.LeafKind(text), { text }, v);
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
