# dependencies
```xl
import { BlockToken } from "../../core/syntax/block-token.xl.md"
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token, PrintAstCtx, AstNode } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Identifier } from "./identifier.xl.md"
import { IsLeadingDotNumber, IsUnicodeEscapeStart } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

符号块：`=`、`+`、`*`、`{`、`.` 这些。它比 `Identifier` 多一层「组合符号」判断——`Temp` 里的内容加上当前字符如果构成 `+=`、`??`、`=>` 这类多字符符号，就继续吞；否则断开重开。

`SymbolBranch` 写在 `SymbolToken` **之前**。

# class SymbolBranch extends Branch

判定顺序：

1. 当前字符不是符号 → 失败。
   **例外**：`\` 后面跟着 `u` 加十六进制时**也让路**（那是标识符里的 Unicode 转义，
   由 `CommonBranch` 接手；判据是 `../text-common-util.xl.md` 的 `IsUnicodeEscapeStart`）。
   **花括号写法还要多让一格**：`\u{65}` 里的 `{` / `}` 也是符号，判据是本块自己的
   `Identifier.IsBracedEscapePart`（那两格只看 `Temp`，见 `identifier.xl.md`）。
2. 当前字符是 `.`、且它是**小数点开头的小数**（`.5` / `.5e3`）→ 失败，让给 `CommonBranch`
   （判据 `IsLeadingDotNumber`）。这一条要排在下面「上一个单元也是 SymbolToken」之前：
   `= .5` 里 `=` 是个已关闭的 `SymbolToken`，不先让路的话这个点会被当成新符号收走。
   **但要放过 `...`**：`..` 与 `...` 都是组合符号，`....5`（`...` 展开一个 `.5`）里第 4 个点
   同样是「点后面跟数字」的形状。所以多一条：上一个 `SymbolToken` 没关闭、且 `IsAppend` 说还能续写时，
   这个点属于那个点串，本规则不插手（`...` 的第三个点就是靠这一条保住的）。
3. 上一个单元也是 `SymbolToken`：已关闭就开新的（`Message = 0`）；没关闭就看它的 `IsAppend`，能续就 `Message = 1`，不能续也开新的（`Message = 0`）。
4. 上一个单元是 `Identifier` 且当前字符是 `.`、且那个 `Identifier` 是**十进制整数前缀** → 失败（小数点交给 `Identifier` 自己吃）。
   判据是 `Identifier.IsDecimalIntegerPrefix`（不是 `IsNumberWithoutDecimal`：后者不认数字分隔符，
   `1_000.5` 的小数点会被这里抢走，实测数字被拆成三段）。
   **注意这条排在「上一个单元也是 SymbolToken」之后**，所以只有上一个不是 `SymbolToken` 时才会走到。
5. 上一个单元是 `Identifier`、当前字符是 `+` / `-`、且那个 `Identifier` 正处在数字字面量的指数位上
   （`1e-10` 的 `-`）→ 失败，让给后面的 `CommonBranch`。
   判据是 `common.xl.md` 的 `Identifier.IsExponentSign`，与 `CommonBranch.Condition` 里那一处**是同一个方法**：
   符号分支排在前，它不让路，`CommonBranch` 就没机会。
6. 其余：当前字符算符号就接手，`Message = 0`。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断要不要接手当前字符，以及是「新增」还是「追加」。

```ts
const value = source.Value;
if (!unit.Template.SymbolTemplate.IsSymbol(value)) {
  const result = this.Result;
  result.Success = false;
  return result;
}
if (value === "\\" && IsUnicodeEscapeStart(source.Document, source.Index)) {
  const result = this.Result;
  result.Success = false;
  return result;
}
const last = unit.Last();
if (last instanceof Identifier && last.IsBracedEscapePart(source)) {
  const result = this.Result;
  result.Success = false;
  return result;
}
if (value === "." && IsLeadingDotNumber(source.Document, source.Index)) {
  const continuesSymbol = last instanceof SymbolToken && last.Closed === false && last.IsAppend(source);
  if (continuesSymbol === false) {
    const result = this.Result;
    result.Success = false;
    return result;
  }
}
if (last instanceof SymbolToken) {
  if (last.Closed) {    const result = this.Result;
    result.Success = true;
    result.Message = 0;
    return result;
  }
  const result = this.Result;
  result.Success = true;
  result.Message = last.IsAppend(source) ? 1 : 0;
  return result;
}
if (
  value === "." &&
  last instanceof Identifier &&
  last.IsDecimalIntegerPrefix() &&
  // **已经关掉的数字后面那个点是成员访问**（第 180 轮）：这一条原来只看「前一个是十进制
  // 整数前缀」，于是 `1 .toString()` 里那个点**两边都不要**——`Identifier.Condition` 那边
  // 已经按 `Closed` 放行（它不再吃这个点），这里又拒收，结果点号整个消失
  // （产物成了 `Identifier(1)` + `Method(toString)`，`1 .toString()` 那次调用也丢了）。
  last.Closed === false
) {
  const result = this.Result;
  result.Success = false;
  return result;
}
if (last instanceof Identifier && last.IsExponentSign(source)) {
  const result = this.Result;
  result.Success = false;
  return result;
}
const result = this.Result;
result.Success = unit.Template.SymbolTemplate.IsSymbol(source.Value);
result.Message = 0;
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

`Message` 为 `0` 就开一个新 `SymbolToken` 并签入，为 `1` 就追加到上一个。

**append 之后立刻问一次宿主**（第 486 轮）：`;` 这一类终结符**已经进 `Data`**，
语句壳此时才收得出含终结符的区间（见 `statement.xl.md` 的 `FormFrom`）。
钩子是基类上的空方法（`core/syntax/token.xl.md` 的 `FormStatement`）——
这一层**不能** import `statement.xl.md`（会绕出环），所以只发问、不收束。

```ts
if (result.Message === 0) {
  unit.AddAndCloseLast(new SymbolToken(unit.Template)).AppendAndSignOut(source).SignIn(source);
} else {
  (unit.Last() as SymbolToken)!.AppendAndSignOut(source);
}
unit.FormStatement(unit.Last() as SymbolToken);
```

## field HasFailedHook:bool = true

**这一格覆写了 `Failed`**（第 1210 轮，用户口径 1.2）：基类那一格是空方法，而本页这一格**有活干**
（把上一个断开的 `SymbolToken` 关掉）——所以 `Branch.Transit` 那一句守卫在**这一格**上答「值得进函数」。
问法与读数写在 `core/syntax/branch.xl.md` 的 `HasFailedHook` 那一节。

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

失败时把上一个 `SymbolToken` 关掉。

```ts
const last = unit.Last();
if (last instanceof SymbolToken) {
  last.TryToClose();
}
```

# class SymbolToken extends BlockToken

符号块。

单元值类型是单字符的 `string`。

## field IsSymbolToken:bool = true

**我这一格是不是一个符号块**（第 1093 轮）：投影层折链、折调用、切类型实参那一族里
**三十九处**连写 `X.Tag === "SymbolToken"` / `X.Tag !== "SymbolToken"`，而**类名就是这一页
自己的名字**——所以它本来就该由这一页答，不是由投影先问一句「你是什么类」。

常量：构造时就赋好（与 `IsDotSymbol` / `IsTypeSeparator` / `IsPrefixOperatorUnit` 同一个类里，
但那三格是「正文的函数」、在 `Close()` 里赋；这一格只看类名，所以是构造时的常量）。

**它不与 `IsOperatorUnit` / `IsPrefixOperatorUnit` / `IsNotNullSymbol` 重复**：那三格答的是
「**这一格正文**是不是某一串字符」（`IsOperatorUnit` 连 `in` / `instanceof` 那一族都算，
`IsNotNullSymbol` 只认那一个 `!`）；这一格答「**我这一格是什么类**」——就是类名本身。
所以三格各自显式声明、各自守着自己那一问（口径见 `../../core/syntax/token.xl.md`
的 `IsSymbolToken`）。

## field IsDotSymbol:bool = false

**我这一格是不是那个点号 `.`**（第 1057 轮）：`Token.IsDotSymbol` 在投影层过去是一个现场判据
（`print-ast-common.xl.md` 的 `isDot`：先问「我是不是 `SymbolToken`」、再回原文读那一格字符），
而这两问**都是这一页自己的事实**——正文就在 `this.Temp` 里。

## property IsCommaSymbol:bool

**我这一格是不是那个逗号分隔符 `,`**（第 1074 轮）：投影层要把**平级列表**里的逗号滤掉
（`projectEach` / `projectEachIn` / `typeMemberGroups` / `splitTopLevel` 四处），
判据过去是现场拼出来的 `k.Tag === "SymbolToken" && k.TextValue === ","`——
「我这一格的正文是什么」**只有这一页知道**（正文就在 `this.Temp` 里），所以它回到这一页。

覆写的是 `core/syntax/token.xl.md` 上那一格虚属性（基类答 `false`）。

**为什么它是 `## property` + `### get`、不是 `IsDotSymbol` 那样的 `## field`**
（与 `OperatorRank` 同一条理由，第 1074 轮**又量到同一件事**）：符号的正文是**逐字符攒**起来的，
而**不是每个符号都会走到 `Close()`**——这一轮先按 `## field` 写过一版，
`cases:tsast` 与 `samples` 当场红：**枚举成员之间那个逗号**（`enum E { A, B }`）
根本没关过，字段停在默认档 `false` ⇒ 它被当成语义子节点投了出去
（`samples/declarations.ts` 的 `EnumMember` 之间多出 `CommaToken`，
`coverage` 从 **4261 / 4422** 掉到 **4209 / 4422**、`blocked` 28 → 80）。
读时现算（`this.Is(",")`，读的仍是本页唯一那份 `Temp`）**与搬走之前逐格等价**。

### get

```ts
  return this.Is(",");
```

## property IsNotNullSymbol:bool

**我这一格是不是非空断言那个 `!`**（第 1090 轮）：投影层要把 `NotNull` 单元里收尾那个 `!`
滤掉、或者找出它（`print-ast-common.xl.md` 里 9 处过滤器 + 2 处 `find`），判据过去是现场拼出来的
`k.Tag === "SymbolToken" && k.TextValue === "!"`——「我这一格的正文是什么」**只有这一页知道**，
所以它回到这一页（与 `IsCommaSymbol` 同一条口径、同一形态）。

**它与 `IsPrefixOperatorUnit` 不是同一问**：那一格答「我是不是一个前缀运算符」，答 `true` 的
是一整串（`!` `~` `+` `-` `++` `--`）；这一格只认那一个 `!`（`x!` 的收尾、`a!()` 的断言位）。
`IsPrefixOperatorUnit` 那一节里也写着「`!x` 在产物里是 `UnaryOperator` 单元」——所以走到这一格的
裸 `!` 就是非空断言那一位。

覆写的是 `core/syntax/token.xl.md` 上那一格虚属性（基类答 `false`，与 `IsCommaSymbol` 同一形态）。

**为什么它是 `## property` + `### get`、不是 `## field`**：与 `IsCommaSymbol` **同一件事**
（第 1074 轮量到的那条）：符号的正文是**逐字符攒**起来的，而**不是每个符号都会走到 `Close()`**
——按字段写过一版的话，没关过的那一格会停在默认档 `false`，「它是 `!`」这个事实就丢了。

**取值口径与搬走之前逐字相同**：读的是基类那一格 `TextValue`（也就是原来那个
`k.TextValue === "!"` 的后一半），不是 `Is("!")`——后者读的是本页的 `Temp`，与 `TextValue`
在**没关过**的符号上未必同答（`IsCommaSymbol` 那一格读的正是 `Temp`，两页口径因此不同，
如实记在这里）。

### get

```ts
  return this.TextValue === "!";
```

## property IsEqualsSymbol:bool

**我这一格是不是那个等号 `=`**（第 1107 轮）：投影层要在单元串里把等号找出来
（`print-ast-common.xl.md` 里 6 处：`let` 的初值、绑定的默认值、导出语句的赋值），
判据过去是现场拼出来的 `k.IsSymbolToken && k.TextValue === "="`——「我这一格的正文是什么」
**只有这一页知道**，所以它与 `IsCommaSymbol` / `IsNotNullSymbol` 同一条口径、同一形态。

**取值口径与搬走之前逐字相同**：读的是基类那一格 `TextValue`（也就是原来那个
`k.TextValue` 的后一半），不是 `Is("=")`——理由与上面 `IsNotNullSymbol` 那一节**逐字相同**
（没关过的符号上两者未必同答）。

### get

```ts
  return this.TextValue === "=";
```

## property IsOperatorSymbol:bool

**我这一格的正文是不是那 26 个运算符词之一**（第 1198 轮从投影层搬来）。

名单是这一页自己的（`OPERATOR_TEXTS`，与 `SYMBOL_TOKEN_KIND` 同一份正文当键），
读法与 `IsEqualsSymbol` / `IsNotNullSymbol` 一族**逐字相同**：读基类那一格 **`TextValue`**，
不是 `Is(…)` / `TempToString()`——投影原来问的正是 `k.TextValue`（`text = k.TextValue`
那一行随本轮一起删掉），而没关过的符号上两者未必同答（第 1063 轮实测过）。

**为什么名单不留在投影层**：那两张 `# private const` 的读者只有 `projectExpression` 里
`?.` 那一支的两处，而键就是这一页自己的正文——第 1063 轮 `OperatorRank` / 第 1127 轮
`KindOfText` 已经把同一条口径走过两遍。

**为什么另立一格、不与 `IsAssignmentSymbol` 并**：那一格答的是「赋值那一族」
（`=` 与 `+=` / `??=` …），这一格答的是「参与优先级比较的那 26 个词」——两问的名单不同。

### get

```ts
  return OPERATOR_TEXTS.has(this.TextValue);
```

## property IsArrowSymbol:bool

**我这一格是不是那个箭头 `=>`**（第 1107 轮）：投影层要按它把**平铺的箭头**切开
（`print-ast-common.xl.md` 里 3 处：`functionTypeProps` 找箭头那一格、联合 / 交叉那一支
排它前面、以及 `new <T>(x: T) => T` 那一支），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "=>"`——同一条口径、同一形态。

**它与 `IsEqualsSymbol` 不是同一问**：`=>` 的正文里也有一个 `=`，两格各认自己那一串。

### get

```ts
  return this.TextValue === "=>";
```

## property IsAssignmentSymbol:bool

**我这一格是不是一个赋值运算符**（第 1125 轮）：投影层折逗号那一支要按它找「本层左边那个
赋值号」（`print-ast-common.xl.md` 里 1 处），判据过去是现场拼出来的
`text === "=" || (text.length > 1 && text.endsWith("=") && !["==", "===", "!=", "!==", "<=", ">="].includes(text))`
——与上面 `IsEqualsSymbol` 同一条口径、同一形态（读的还是基类那格 `TextValue`，不是 `Is("=")`：
没关过的符号上两者未必同答，第 1063 轮实测过）。

**它与 `IsEqualsSymbol` 不是同一问**：那一格只认那个等号 `=`，这一格还认那些**复合赋值**
（`+=` / `-=` / `*=` / `/=` / `%=` / `**=` / `<<=` / `>>=` / `>>>=` / `&=` / `|=` / `^=` /
`&&=` / `||=` / `??=`），并把六个**比较运算符**（`==` / `===` / `!=` / `!==` / `<=` / `>=`）
排除在外——判据一个字没改，只是那两半事实都住在这一页自己的正文上。

### get

```ts
  const text = this.TextValue;
  return (
    text === "=" ||
    (text.length > 1 &&
      text.endsWith("=") &&
      !["==", "===", "!=", "!==", "<=", ">="].includes(text))
  );
```

## property IsColonSymbol:bool

**我这一格是不是那个冒号 `:`**（第 1108 轮）：投影层要按它切开成员 / 绑定元素 /
`with`（`assert`）子句的键值对（`print-ast-common.xl.md` 里 2 处），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === ":"`——与上面 `IsEqualsSymbol` / `IsArrowSymbol`
同一条口径、同一形态（读的还是基类那格 `TextValue`，不是 `Is(":")`）。

### get

```ts
  return this.TextValue === ":";
```

## property IsDotDotDotSymbol:bool

**我这一格是不是那三个点 `...`**（第 1108 轮）：投影层要认出展开实参 `f(...xs)` 与
剩余绑定 `...rest`（`print-ast-common.xl.md` 里 2 处），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "..."`——同上。

**它与 `Spread` 那一页的 `IsSpreadUnit` 不是同一问**：那一格答「我是哪一类单元」，
这一格答「**我这一格的正文**是不是那三个点」（它也可能只是一格裸符号）。

### get

```ts
  return this.TextValue === "...";
```

## property IsAsteriskSymbol:bool

**我这一格是不是那个星号 `*`**（第 1108 轮）：投影层要认出 `yield*` 的 `asteriskToken`
与 `export * as ns` 的 `exportClause`（`print-ast-common.xl.md` 里 2 处），判据过去是
现场拼出来的 `k.IsSymbolToken && k.TextValue === "*"`——同上。

### get

```ts
  return this.TextValue === "*";
```

## property IsLessThanSymbol:bool

**我这一格是不是那个小于号 `<`**（第 1118 轮）：投影层要认出「`GenericType` 没成形的尖括号断言」
（`<number>1`）与「平铺的 `<…>` 实参段」（`A[Lowercase<K>]`）那两处
（`print-ast-common.xl.md` 里 2 处），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "<"`——与 `IsColonSymbol` 同一条口径、同一形态。

### get

```ts
  return this.TextValue === "<";
```

## property IsGreaterThanSymbol:bool

**我这一格是不是那个大于号 `>`**（第 1139 轮）：投影层那三处尖括号扫描（`<number>1` 的断言、
平铺的 `<…>` 实参段）原来是现场拼的 `k.IsSymbolToken && k.TextValue === ">"`——与
`IsLessThanSymbol` 同一条口径、同一形态。

### get

```ts
  return this.TextValue === ">";
```

## property IsHashSymbol:bool

**我这一格是不是那个 `#`**（第 1118 轮）：投影层要认出表达式位的私有名 `#x` 与
`this.#x` 的私有成员名那两处（`print-ast-common.xl.md` 里 2 处），判据过去是现场拼出来的
`k.IsSymbolToken && k.TextValue === "#"`——同上。

### get

```ts
  return this.TextValue === "#";
```

## property IsQuestionSymbol:bool

**我这一格是不是那个问号 `?`**（第 1119 轮）：投影层的两处（可选方法 / 方法签名那个
`questionToken`、条件类型里的 `?`）过去都现场拼 `k.IsSymbolToken && k.TextValue === "?"`
——与 `IsColonSymbol` 同一条口径、同一形态。

### get

```ts
  return this.TextValue === "?";
```

## property IsSemicolonSymbol:bool

**我这一格是不是那个分号 `;`**（第 1119 轮）：投影层 `projectExport` 里把尾分号从
赋值式导出的表达式里滤掉那一格过去现场拼 `k.IsSymbolToken && k.TextValue === ";"`——同上。

### get

```ts
  return this.TextValue === ";";
```

## property IsPipeSymbol:bool

**我这一格是不是那个竖线 `|`**（第 1120 轮）：投影层切平铺的联合类型
（`type A = B | C`，`projectTypeExpression` 里那一支）的那一格过去现场拼
`const isTypeOp = (k, text) => k.IsSymbolToken && k.TextValue === text`，
两处调用点给的实参**逐处量过**只有 `"|"` 与 `"&"`——于是两半各立一格
（局部转手连同它那半句 `IsSymbolToken` 一起删掉，与第 1118 / 1120 轮同一条口径）。

### get

```ts
  return this.TextValue === "|";
```

## property IsAmpersandSymbol:bool

**我这一格是不是那个和号 `&`**（第 1120 轮）：同一支里交叉类型那一格
（`type A = B & C`），与 `IsPipeSymbol` 同一轮立、同一形态、同一句话的另一个符号。

### get

```ts
  return this.TextValue === "&";
```

## field IsTypeSeparator:bool = false

**我这一格是不是类型成员之间的那个分隔符**（第 1057 轮）：`Token.IsTypeSeparator` 在投影层
过去也是一个现场判据（`print-ast-common.xl.md` 的 `isTypeSeparator`：`Tag === "SymbolToken"`
再加上回原文读那一格字符），而那两问同样都是这一页自己的事实。

## field IsOperatorUnit:bool = true

**我这一格能不能当「一个运算符」**（第 1062 轮）：符号这一页答 `true`——
`Token.IsOperatorUnit` 在投影层过去是一个现场判据（`print-ast-common.xl.md` 的 `isOperatorUnit`：
`Tag === "SymbolToken"` 就先答真），而**类名就是这一页自己的名字**，所以它本来就该由这一页答。
与 `IsDotSymbol` / `IsTypeSeparator` 同一个位置、同一条理由。

**为什么它是常量**：这一层不再细分「哪些符号是运算符」（`.` / `;` / `(` 那些也算，
口径与搬走之前一字不差）——那件事由**用它的人**按自己手上的形状判。

## field IsPrefixOperatorUnit:bool = false

**我这一格是不是一个前缀运算符**（第 1062 轮）：符号里只有 `!` `~` `+` `-` `++` `--`
这几个是（判据就是**这一格自己的正文**），所以在 `Close()` 里与 `IsDotSymbol` /
`IsTypeSeparator` **同一趟**赋好（见下）。

## property OperatorRank:int

**我这一格作为运算符的优先级**（第 1063 轮，**数字越小越松**）：按**这一格自己的正文**
（`Temp` 那一段）查本页那张词汇表（`SymbolToken.RankOfText`）。

它过去是投影层的一个现场判据 `operatorRank(text)`（`print-ast-common.xl.md` 的
`# private method`，一整条 `if` 链）——那一页的 `projectExpression` / `foldBinaryFrom`
拿它切分段与定结合性。可那份「运算符 → 优先级」的词汇**键就是这一页自己的正文**
——与 `Keyword.KeywordKind`（第 1028 轮）、`SymbolToken.KindOfText`（本页）同一条口径：
改一个优先级不必再跑投影那一页，投影也不会在手上只有一格 token 时回头去查一张中央表。

**为什么这一格是 `## property` + `### get`，而不是 `IsDotSymbol` 那样的 `## field`**（第 1063 轮**实测过**）：
符号的正文是**逐字符攒**起来的，而**不是每个符号都会走到 `Close()`**——
`let.xl.md` 的那一格尾巴符号（`let a = 1` 里那个 `=`，由 `ReplaceCountAt` 原样补回 `Let` 右边）
就是 `new SymbolToken(…)` + `AppendAndSignOut` + `SignIn`，**没有 `TryToClose()`**。
写成 `## field` 时它读到的永远是默认档，投影那一侧当场错：`coverage` 从 **4260 / 4422**
掉到 **4058 / 4422**（`differ` 134 → 328，`for..of` / 生成器整族红）。
**读时现算**（`this.Temp` —— 与 `BlockToken.value` 同一处、本页没有第二份存储）
则与搬走之前的 `textOfNode(node)` 逐格等价：**不管这一格有没有关过，正文都在**。

**赋值时机相反的那三格仍住在这里**：`IsDotSymbol` / `IsTypeSeparator` /
`IsPrefixOperatorUnit` 是第 1057 / 1062 轮的 `## field`（在 `Close()` 里赋）——
它们判的是「正文里有没有那几个字符」，而那几格的事实**不会在 `Close()` 之后被改**，
所以构造 / 克隆之后就齐全。

### get

```ts
  return SymbolToken.RankOfText(this.TempToString());
```

## protected method Close:()=>void

关闭：把自己标记为已关闭，**并把由那一格正文派生的三格一起赋好**（第 1057 / 1062 轮）。

**为什么赋值点在这里**：符号是**逐字符攒起来**的（`Temp` 那一段就是它的正文），
而 `Close()` 正是「攒完了」那一刻——基类的 `TryToClose` 先调这一格、再跑收尾规则队列，
所以读得到的一定是**收完的正文**（与 `Keyword.SetValue` 在记下正文那一刻赋「由正文派生的那几格」
是同一口径、同一个时机；`Bracket` 那一页把同样的两格放在 `Use` 里，因为它的正文是**一次给全**的）。

**三格都从 `this.Temp` 现算一次**（`Is` / `IsAny` 读的也是 `Temp`）：本页没有第二处存储，
所以「这一格是不是点号 / 类型分隔符 / 前缀运算符」只由**这一格自己的正文**决定。
**第 1063 轮那一格（`OperatorRank`）不在这里赋**：它的正文可能在 `Close()` 之后才到
（`let.xl.md` 那格尾巴符号根本没关过），所以它是 `## property` + `### get`、读时现算。

```ts
this.Closed = true;
// **`IsDotSymbol` / `IsTypeSeparator` / `IsPrefixOperatorUnit` 都是「我这一格的正文是什么」的函数**
//（第 1057 / 1062 轮），所以三格在同一个时刻、同一趟里赋好——几格不会各说各话。
this.IsDotSymbol = this.Is(".");
this.IsTypeSeparator = this.Is(",") || this.Is("|") || this.Is("&");
this.IsPrefixOperatorUnit = this.IsAny(["!", "~", "+", "-", "++", "--"]);
```

## field FromCompoundAssignment:bool = false

这个符号是**复合赋值切开后插回来的运算符副本**（`CompoundAssignmentOperatorCloseRule.Process`
把 `&&=` 切成 `=` 与一份 `&&`）。

**为什么需要它**：那份副本本身也在 `CompoundAssignmentSymbols` 的判据范围内，
不排除的话同一趟会被反复切开，单元数量来回翻倍——实测 `run.mjs` 直接
`FATAL ERROR: heap out of memory`。`Clone` **不复制**这个字段（默认 `false`），
所以只有 `Process` 显式打标记的那份副本会被排除。

## static readonly field AppendIn:SymbolBranch = new SymbolBranch()

把 `SymbolBranch` 注册进通用跳转队列用的实例。

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## method IsAppend:(Src:Source)=>bool

能不能把 `Src` 并进本块。

两段判定：
- `Temp` 还是空的、且当前字符是符号 → 能（开头的符号直接收）。
- 否则要求当前字符是符号，**并且** `Temp` 现有内容加上当前字符能构成一个组合符号。

```ts
if (this.Temp.length === 0 && this.Template.SymbolTemplate.IsSymbol(Src.Value)) {
  return true;
}
return this.Template.SymbolTemplate.IsSymbol(Src.Value)
  && this.Template.SymbolTemplate.IsCombinedSymbol(this.Temp.join("") + Src.Value);
```

## method Is:(value:string)=>bool

`Temp` 里的内容是否逐字符等于 `value`。

先比长度，再逐字符比。

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

## method IsValueOrAny:(value:string, items:Array<string>)=>bool

先比 `value`，再在 `items` 里找。

先看单项、再看列表的版本叫 `IsValueOrAny`。

```ts
const text = this.TempToString();
if (text === value) {
  return true;
}
return items.includes(text);
```

## method PrintAst:(ctx:PrintAstCtx, v:any)=>AstNode

**第三个出口的直出版**（第 992 轮）：这一格出哪个节点，只许用这个 token 自己的属性、子单元与 `Parent`，不回原文查——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintAst`。

```ts
  // **文本读 token 自己的 `Temp`**（第 992 轮）：见 `identifier.xl.md` 那一页的同一条说明。
  const text = this.TempToString();
  return ctx.Node(this.TokenKind, { text }, v);
```

## property TokenKind:string

**我这一格在 TS 那边是哪个 kind**（第 1028 轮；**第 1127 轮由 `## method` 收成属性**）：
`SymbolToken` 的正文是运算符 / 标点，
TS 那边它们各有一个 `SyntaxKind`（`=` → `EqualsToken`、`=>` → `EqualsGreaterThanToken`…）。

词汇表是这一页自己的（见下面的 `SYMBOL_TOKEN_KIND`），查法也收在这一页
（`KindOfText` 管「文本 → kind」这一件事，`?? 文本` 那一条兜底只有一份）。
过去它是投影层那张按文本查的 `TOKEN_KIND` 加上投影层的一个 `tokenKind(text)` 函数——
同一份词汇被声明了两遍；现在按文本问的那几处问 `KindOfText`，**手上就是这一格单元**的那一处读本属性
（第 1127 轮起；与 `Keyword.KeywordKind` / `SymbolToken.OperatorRank` 同一形态）。

`## property` + `### get` 而不是 `## field`：与同页 `OperatorRank`（第 1063 轮）同一条理由——
符号的正文未必关过（`let a = 1` 那一格尾巴符号是 `new SymbolToken` + `AppendAndSignOut` + `SignIn`，
没有 `TryToClose()`），写成字段会在那些格子上静默退回默认值。

### get

```ts
  return SymbolToken.KindOfText(this.TempToString());
```

## static method KindOfText:(text:string)=>string

**给一段符号文本，答它在 TS 那边的 kind**（第 1028 轮）；表里没有的**原样返回文本**
（`tokenKind` 的老口径：`a **= 2` 那种当年没登记的符号曾以文本当 kind 出现在产物里，
补表之后仍然保留这条兜底，免得下次漏一个符号就变成 `undefined`）。

**为什么它是 `static`**：投影在**折叠二元表达式**时要给「手上只有一段文本、没有单元」的运算符
造节点（`print-ast-common.xl.md` 的 `foldBinaryFrom` 一族），所以这一格要能按文本问；
而词汇表只有一份，`SymbolToken` 这一页是它的家。

```ts
  return SYMBOL_TOKEN_KIND.get(text) ?? text;
```


## static method RankOfText:(text:string)=>int

**给一段符号文本，答它的运算符优先级**（第 1063 轮从投影层搬到这里）——**数字越小越松**。

词汇表就是这一页自己的（键是符号的正文），所以与 `KindOfText` 同一形态：**问这一页**，
投影不再存一张「文本 → 优先级」的中央表。读法有两处、都在本页：
`Close()` 里给 `SymbolToken.OperatorRank` 赋值那一趟（数据形态），
以及将来任何「手上只有一段文本、没有单元」的地方按文本问一次。

搬过来之前它是 `typescript/print-ast-common.xl.md` 的 `# private method operatorRank`
——那一页的 `projectExpression` / `foldBinaryFrom` 拿它切分段与定结合性。可**键就是这一页
自己的正文**（与 `SYMBOL_TOKEN_KIND` / `Keyword.KeywordKind` 同一条口径），
而「投影层不许再有按文本查词的中央表」正是第 1028 / 1029 轮那句话——这一格是它剩下的最后一处。

**函数体的形状一字没动**（连注释、连 `if` 链的顺序）：搬家这一步不夹带改写。
**不在表里的给 7**，也就是「比较 / `in` / `instanceof` / `as` / `satisfies`」那一档；
`in` / `instanceof` 在产物里可能是 `Keyword` / `Identifier`，那两页不声明 `OperatorRank`、
读基类的默认值 **7**——与搬走之前逐格等价（老 `operatorRank` 对它们答的正是兜底 7）。

**结合性不在这里**：赋值也是 0，但「赋值右结合、其余左结合」由投影那一侧
（`foldBinaryFrom` 的两支）判——那是**怎么折**，不是「这一格的优先级是几」。

```ts
  if (text === ",") return -1;
  if (
    text === "=" ||
    text === "+=" ||
    text === "-=" ||
    text === "*=" ||
    text === "/=" ||
    text === "%=" ||
    text === "**=" ||
    text === "<<=" ||
    text === ">>=" ||
    text === ">>>=" ||
    text === "&=" ||
    text === "|=" ||
    text === "^=" ||
    text === "&&=" ||
    text === "||=" ||
    text === "??="
  ) {
    return 0;
  }
  if (text === "||" || text === "??") return 1;
  if (text === "&&") return 2;
  if (text === "|") return 3;
  if (text === "^") return 4;
  if (text === "&") return 5;
  if (text === "==" || text === "!=" || text === "===" || text === "!==") return 6;
  if (text === "<<" || text === ">>" || text === ">>>") return 8;
  if (text === "+" || text === "-") return 9;
  if (text === "*" || text === "/" || text === "%") return 10;
  if (text === "**") return 11;
  // `<` / `>` / `in` / `instanceof` / `as` / `satisfies` 那一档（也是这一族里最常见的一档）。
  return 7;
```


## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Temp` 追加到自身 → `TryToClose()`。

```ts
const result = new SymbolToken(this.Template);
result.Sign(this);
result.Temp.push(...this.Temp);
result.TryToClose();
return result;
```

# private const SYMBOL_TOKEN_KIND:Map<string, string>

**符号词汇表**：符号文本 → 它在 TS 词汇表里的 `SyntaxKind` 名（第 1028 轮从投影层搬到这里）。

这一格是 `SymbolToken.KindOfText` 要读的那份词汇——它说的就是**这一页自己的事实**
（符号块的正文住在我这里）。搬过来之前它叫 `TOKEN_KIND`、住在
`typescript/print-ast-common.xl.md`，与投影层那个 `tokenKind(text)` 一起构成同一件事的
**两份声明**：改一个符号要跑两个地方，而投影那份的读者只有这一页与两个「手上只有运算符文本」
的折叠处（`foldBinaryFrom` 一族）。

```ts
new Map([
  ["=", "EqualsToken"], ["+=", "PlusEqualsToken"], ["-=", "MinusEqualsToken"],
  ["*=", "AsteriskEqualsToken"], ["/=", "SlashEqualsToken"], ["%=", "PercentEqualsToken"],
  ["+", "PlusToken"], ["-", "MinusToken"], ["*", "AsteriskToken"], ["/", "SlashToken"],
  ["%", "PercentToken"], ["<", "LessThanToken"], [">", "GreaterThanToken"],
  ["<=", "LessThanEqualsToken"], [">=", "GreaterThanEqualsToken"],
  ["==", "EqualsEqualsToken"], ["===", "EqualsEqualsEqualsToken"],
  ["!=", "ExclamationEqualsToken"], ["!==", "ExclamationEqualsEqualsToken"],
  ["&&", "AmpersandAmpersandToken"], ["||", "BarBarToken"], ["??", "QuestionQuestionToken"],
  ["!", "ExclamationToken"], ["?", "QuestionToken"], [":", "ColonToken"],
  [",", "CommaToken"], [";", "SemicolonToken"], ["(", "OpenParenToken"], [")", "CloseParenToken"],
  ["[", "OpenBracketToken"], ["]", "CloseBracketToken"], ["{", "OpenBraceToken"], ["}", "CloseBraceToken"],
  ["=>", "EqualsGreaterThanToken"], ["++", "PlusPlusToken"], ["--", "MinusMinusToken"],
  [".", "DotToken"], ["...", "DotDotDotToken"],
  // **第 135 轮补齐的一批**：位运算 / 移位 / 幂 / 逻辑赋值这些运算符原来一个都没在表里，
  // 于是 `tokenKind` 原样返回文本——`a **= 2` 的 `operatorToken.kind` 成了 `"**="` 而不是
  // `"AsteriskAsteriskEqualsToken"`（实测 `expr-compound-assign-all.ts` 缺 10 / 多出 10、
  // `ex-logical-assign.ts` 缺 5 / 多出 5，样本全是 `**= <<= >>= >>>= &= |= ^= &&= ||= ??=`）。
  // 名字一律照 `ts.SyntaxKind` 的拼法（`tests/parse/ts-ast.mjs` 就是从那边查的）。
  ["**", "AsteriskAsteriskToken"], ["**=", "AsteriskAsteriskEqualsToken"],
  ["<<", "LessThanLessThanToken"], ["<<=", "LessThanLessThanEqualsToken"],
  [">>", "GreaterThanGreaterThanToken"], [">>=", "GreaterThanGreaterThanEqualsToken"],
  [">>>", "GreaterThanGreaterThanGreaterThanToken"], [">>>=", "GreaterThanGreaterThanGreaterThanEqualsToken"],
  ["&", "AmpersandToken"], ["&=", "AmpersandEqualsToken"],
  ["|", "BarToken"], ["|=", "BarEqualsToken"],
  ["^", "CaretToken"], ["^=", "CaretEqualsToken"], ["~", "TildeToken"],
  ["&&=", "AmpersandAmpersandEqualsToken"], ["||=", "BarBarEqualsToken"], ["??=", "QuestionQuestionEqualsToken"],
])
```

# private const OPERATOR_TEXTS:Set<string>

**符号词汇表里的「运算符词」**（第 1198 轮从投影层搬到这里）：`IsOperatorSymbol` 要读的那一格。

它就是 `typescript/print-ast-common.xl.md` 里原来那两张 `# private const`
（`OP_TEXTS` 与它多一个 `=` 的 `NCO_BASE_OPERATORS`）的 **26 个词**，
键是符号那一页自己的正文，所以与 `SYMBOL_TOKEN_KIND` / `OperatorRank` 同一条口径：
**词汇表与它服务的那个问题住同一页**。`=` 不在表里——投影读它的那一处另读 `IsEqualsSymbol`。

```ts
new Set(["+", "-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "!=", "===", "!==", "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof"])
```
