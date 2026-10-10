# dependencies
```xl
import { Branch } from "../../core/syntax/branch.xl.md"
import { BranchConditionResult } from "../../core/syntax/branch-condition-result.xl.md"
import { BranchStates } from "../../core/syntax/branch-states.xl.md"
import { CommonUtil } from "../../core/common-util.xl.md"
import { Document } from "../../core/syntax/document.xl.md"
import { Source } from "../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../core/syntax/syntax-context.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../core/syntax/unit-token.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Get } from "../../core/extensions/list-extension.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Keyword } from "./keyword.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { String } from "./string/string.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { IsTemplateTypeContent, IsTriviaUnit, IsTypeBracketPosition, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

泛型实参段：`Array<Int64>` 里的 `<Int64>`、`Map<String, Int64>` 里的 `<String, Int64>`。

**这个特性完全由本文件定义**——`GenericType` 的形状与 XML 产出格式都以这里为准（XML 形状见 `GenericType.ToXmlString`）。

难度只有一个：`<` 与 `>` 同时是比较运算符（`SymbolTemplate.CompareSymbols` 里就有 `>` `<` `>=` `<=`），而词法层拿不到「这里期望一个类型」这种语法上下文。判定因此按**先试读、读不通就退回比较运算符**来组织，口径参考 TypeScript 的泛型实参消解：**不看空白**，看能不能凑出一个合法的类型实参表，以及 `>` 后面跟着什么。

四道闸门，任一不过就返回失败，`<` 继续由 `SymbolToken` 接手当比较运算符：

1. **名字闸**：宿主单元最后一个子单元必须是 `Identifier`，且不是数字 / 布尔字面量。`3 < 4`、`true < false`、行首的 `<`、`(` 后面的 `<` 都直接判否。
   **例外**：最后一个是 `?` 符号、而它前面是 `Identifier` 时也算数——TypeScript 的可选成员签名写作
   `m?<T>()`（`?` 在类型参数之前），不放这一条，`<T>` 会退回比较符号，整条签名被三元表达式规则抢走。
2. **内容闸**（`ScanArguments`）：从 `<` 之后按「类型实参字母表」扫到配对的 `>`，带尖括号 / 圆括号 / 方括号嵌套；换行只在嵌套未归零、上一个非空字符是 `,` / `<` / `|` / `&`、下一个非空字符是 `>` / `|` / `&` / `:` / `?` / `,`、宿主停在声明头的名字上、**或 `<` 前面按定义还没有左操作数**（`IsOperandStartUnit`：`<T` 换行 `,>(a: T) => a` 那一族）时才续扫，否则视为语句到此为止。
3. **位置闸**（`IsTypePosition`）：从宿主单元的 `Data` 往前找最近的边界，判定 `<` 处在**类型位**还是**表达式位**——最近的 `:` / `->` 是类型位，最近的 `=` / 括号 / 语句边界是表达式位，声明关键字按「`class`/`func`/`type`/`new`/`as`/`is`/`where` 给类型位，`let`/`var`/`const` 跨过 `=` 之后算表达式位」处理。
4. **后继闸**（`IsAllowedFollower`）：类型位允许名字 / `) ] } , ; > < . = ( : { ?` / 行尾（含行尾注释）或文件尾；表达式位**只**允许 `(`——这就是 TypeScript 的「泛型调用」形状。数字、引号、算术与逻辑运算符一律判否。

按这四道闸门：

- 判成泛型：`let a: Array<Int64>`、`new Array<Int64>(3)`、`HashMap<String, Int64>`、`Array<Array<Int64>>`、`func f<T, U>(x: T)`、`x as Array<Int64>`、`where T <: Comparable<T> {` 里的 `Comparable<T>`（`T <:` 本身仍然是符号——`:` 不在字母表里）；
- 退回比较符号：`a < b`、`i <= 10`、`answer > 50`、`a < b && c > d`、`f(a<b, c>d)`、`if (a<b) {}`、`for (let i = 0; i<n; i++)`、`let x = a < b > c`。

残余误判都被样本钉住（见 `samples/generic.cj` 与 README）：**类型位**里写出来的零空格比较链（如 Json 对象里的 `{a: b<c>d}`）仍会被读成泛型。要根治得引入整句语法上下文，本层不做。

`GenericTypeBranch` 写在 `GenericType` **之前**：后者的静态字段 `JumpIn` 在类定义时立即 `new GenericTypeBranch()`，写反了会命中 ts 的暂时性死区（TDZ）。

# class GenericTypeBranch extends Branch

泛型实参段的跳转判定。

它比 `SymbolToken` 早一步被问到（见 `../parse-pipeline.xl.md` 的通用跳转队列），所以「这个 `<` 到底是不是泛型开头」这件事只能在它这里回答。判定成立就挂载一个 `GenericType` 子单元——挂载是必须的：`UnitToken.Process` 先问挂载单元再问跳转队列，只有挂起来的单元才能让配对的 `>` 抢在 `SymbolToken` 前面被吃掉（否则 `>` 会先和后面的 `=` 组成 `>=`）。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

只有当前字符是 `<`、且四道闸门都过才成立。`Message` 保持 `0`（新建单元）。

```ts
const result = new BranchConditionResult();
result.Success = source.Value === "<" && this.IsGenericStart(unit, source);
return result;
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

认下这个 `<`：新建一个 `GenericType` 挂到宿主上，并用 `<` 签入。

结构与 `BracketBranch.Success` 一致——`<` 这个字符本身不进 `Temp`、不进 `Data`，它由 `GenericType.startBracket` 记着；后续字符由挂载单元自己啃。

```ts
unit.AddToMounted(new GenericType(unit.Template)).SignIn(source);
```

## private method IsGenericStart:(unit:Token, source:Source)=>bool

四道闸门的入口，按「便宜的先问」排序：名字闸（只看宿主最后一个子单元）→ 内容闸（纯文本前瞻）→ 后继闸（要位置闸的结论）。

**名字闸有三支**：宿主最后一个子单元是 `Identifier`（`Array<T>` 这种）；
**或者是一个「操作数起点」**——`=` / `=>` / `:` / `;` / `,` 这些符号，或者一段括号、一个软换行；
**或者是「名字 + `?`」里的那个名字**（见下一条）。
第二支是给**泛型箭头函数**与**泛型函数类型**的：`<T>(x: T) => x` / `type X = <T>(x: T) => T`
里 `<` 前面**没有名字**，只有 `=` 或者什么都没有；只认第一支时 `<T>` 退回符号，
`Lamda` / 函数类型都跟着散架（实测 5 条用例）。

**可选成员签名的名字可以是计算成员名**（第 66 轮补）：
`[EventEmitter.captureRejectionSymbol]?<K>(error: Error, event: Key<K, T>, ...args: Args<K, T>): void`
与 `m?<T>()` 是同一个形状（`?` 在类型参数**之前**），只是名字写在 `[ ]` 里。
那个 `[ ]` 到这一刻可能已经是 `ArrayLiteral`（`JsonArrayCloseRule` 先收走了）、
也可能还是 `[` 括号，两种都要认。只认 `Identifier` 时这次试读被判否：`<K>` 退回裸符号，
接着 `MethodDeclarationCloseRule.ParameterIndex` 在 `<` 处拿不到括号 →
整条成员降级成 `Field` + `Signature`（实测 `@types/node/events.d.ts` 两处，
当时那把对齐尺子的 `MethodSignature` 缺 2 / `MethodDeclaration` 缺 1 全是它）。

放宽的风险由「左侧必须有操作数」这条语义兜住：比较式 `a < b > (c)` 的 `<` 前面**是** `a`（走第一支），
而第二支的位置上按定义还没有操作数，`<…>` 只可能是类型参数段。

**「宿主还是空的」也是一支**（第 66 轮第十三批）：`{ <T>(x: T): T }` / `interface Y { <T>(): T }`
里 `<` 是那条**成员**的第一个单元，前面什么都没有——上面三支都不成立（没有名字、也没有
`=` / `:` / `;` 之类的操作数起点符号），于是 `<T>` 退回裸符号、类型参数规则看不到 `GenericType`，
TS 那边的 `CallSignatureDeclaration > TypeParameter` 就一直缺（实测：类型字面量与接口体里的
**泛型调用签名**；同一位置带 `new` 的构造签名本来就成形，因为 `new` 那个词在宿主里）。
理由与第二支相同：这个位置上按定义还没有操作数，`<…>` 只可能是类型参数段
（`<T>x` 那种类型断言在语句开头也早就被第二支放行了，所以这条不新增风险面）。

```ts
if (unit.Data.length === 0) {
  const emptyHostClose = this.ScanArguments(unit, source);
  return emptyHostClose !== -1 && this.IsAllowedFollower(unit, source, emptyHostClose);
}
// **字符串字面量名也是名字，但只认成员体里的那一档**（第 833 轮）：
// `interface I { "a"<T>(x: T): T }` / `type X = { "a"<T>(x: T): T }` / `class C { "a"<T>() {} }`
// 里 `<` 前面是那个 `String` 单元 —— 与 `Array<T>` / `m<T>()` 的 `<` 同一条名字闸。
// 少了这一档：`<T>` 退回裸符号 ⇒ 参数表那一段找不到 `GenericType` ⇒ 整条成员散架成
// `StringLiteral` + `<` + `T` + `>` + `CallSignature`（TS 那边是**一个** `MethodSignature`）。
//
// **表达示位那一份还没接**（第 834 轮量清了它到底缺在哪）：`const s = "a" < b > (c);`
// 在 TS 那边是一次泛型调用 `"a"<b>(c)`，这里放开位置闸之后 `GenericType` 确实成形了，
// 可**没有规则把 `String` + `GenericType` + `(` 收成一个 `Method`**
//（`method.xl.md` 的名字判据只认 `Identifier`，而 `PrintDirectAst` 那边还要按
// `v.start + calleeText.length` 算被调者的终点 —— 字符串名会把这段算错）。
// 也就是说：**这一格的真缺口在 `Method` 那一侧**，与本文件的名字闸无关；
// 位置闸在这里放开只会把「两条二元表达式」换成「缺 typeArguments 的调用」，
// 两种都还是错，读数不改善 ⇒ **先不放开**（要动的是 `Method` + 投影那两处）。
let hostName = unit.constructor.name;
let inMemberHost =
  hostName === "InterfaceBody" || hostName === "ClassBody" ||
  (unit instanceof Bracket && unit.startBracket === "{");
// **名字闸要看的是最后一个「实义」单元，不是最后一格**（第 845 轮）：`m/* c */<T>(x: T): T { … }`
// 里 `<` 前面紧挨着的是那条注释，`unit.Last()` 拿到它 ⇒ 名字闸判否 ⇒ 整个 `<…>` 退回裸符号
// ⇒ 参数表那一段找不到 `GenericType` ⇒ 整条成员散架（实测 `mut-cls-generic-method-arrow-field-58/61`
// 与 `gap-sweep-comment-generic-01`）。注释与软换行都只是排版，往回跳过它们之后
// 判据与原来一字不差（没有 trivia 时落点就是原来那一格）。
// 往回走的写法与同文件的 `IsDeclarationHeadHost` 同源。
let lastAt = unit.Data.length - 1;
while (lastAt >= 0 && (unit.Data[lastAt] instanceof LineWrap || IsTriviaUnit(unit.Data[lastAt]))) {
  lastAt = lastAt - 1;
}
let last = lastAt >= 0 ? Get(unit.Data, lastAt) : null;
let hasName = last instanceof Identifier || (last instanceof String && inMemberHost);
if (last instanceof SymbolToken && last.Is("?")) {
  // `?` 前面那一格同样要跨 trivia（`m?/* c */<T>()`）
  let beforeAt = lastAt - 1;
  while (beforeAt >= 0 && (unit.Data[beforeAt] instanceof LineWrap || IsTriviaUnit(unit.Data[beforeAt]))) {
    beforeAt = beforeAt - 1;
  }
  const beforeMark = beforeAt >= 0 ? Get(unit.Data, beforeAt) : null;
  const isComputedName =
    beforeMark !== null &&
    (beforeMark.constructor.name === "ArrayLiteral" || (beforeMark instanceof Bracket && beforeMark.startBracket === "["));
  if (!(beforeMark instanceof Identifier) && isComputedName === false) {
    return false;
  }
  hasName = true;
  last = beforeMark;
}
const isOperandStart = this.IsOperandStartUnit(unit);
if (!hasName && isOperandStart === false) {
  return false;
}
if (last instanceof Identifier && (last.IsNumber() || last.IsBool())) {
  return false;
}
const closeIndex = this.ScanArguments(unit, source);
if (closeIndex === -1) {
  return false;
}
return this.IsAllowedFollower(unit, source, closeIndex);
```

## private method NextSignificantContinuesArguments:(document:Document, count:int, index:int)=>bool

从 `index`（一个换行）往后看，跳过空白与换行，第一个非空字符是不是**类型还在继续**的字符：
`>`（收尾）、`|` / `&`（联合 / 交叉的下一项）、`:` / `?`（条件类型的分支）、
`,`（类型实参 / 类型参数之间的分隔符）。

给上面那条换行判定用：`<` 里的换行如果紧接着是这几者之一，那这个换行属于**类型参数表的排版**，
不是语句结束。

**`,` 那一档是第 915 轮补的**（名字也跟着从 `…IsCloseAngle` 改成 `…ContinuesArguments`：
它认的已经不只是「收尾那个 `>` 了」）。原来只认 `>` / `|` / `&` / `:` / `?`，
于是**逗号写在下一行开头**的排版整族认不出来——`f<T` 换行 `,U>(x)`（泛型调用）、
`Map<T` 换行 `,U>`（类型实参）、`new Map<T` 换行 `,U>()`、`a<b` 换行 `, c>(d)`
（TS 那边也是**带类型实参的调用**）全都在换行处收壳、`<` 退回裸符号。
按 TS 的读法这一格本来就没有歧义：它那句 `canFollowTypeArgumentsInExpression` 是
**先把 `<…>` 当类型实参表读完再问后继**，逗号是表内的分隔符而不是语句分隔符
（后继闸仍然是最后一道：表外那个 `,` 要接上表达式才放行——见 `IsAllowedFollower`）。

`|` / `&` 那一支是给**折行的联合类型实参**的：`interface ParsedUrlQueryInput extends NodeJS.Dict<`
换行 `| string` 换行 `| number` 换行 `| boolean` 换行 `> { }`。
`string` 之后的换行前面是标识符（不是 `,` 也不是 `<`），只看「下一个是不是 `>`」会判否、
整个 `<…>` 退回符号、接口跟着塌（`querystring.d.ts` 的 `ParsedUrlQueryInput` 就是它）。

`:` / `?` 那一支是给**折行的条件类型**的（类型参数的默认值里很常见）：
`ReturnType = F extends (...args: any) => infer T ? T` 换行
`: F extends abstract new(...args: any) => infer T ? T` 换行 `: unknown,`。
换行后面是 `:` / `?`，说明这个条件类型还没写完（`@types/node/test.d.ts` 的
`interface MockFunctionCall<…>` 三个类型参数都是这个形状）。

```ts
let i = index;
while (i < count) {
  const item = document.GetValue(i);
  if (item === " " || item === "\t" || item === "\n" || item === "\r") {
    i = i + 1;
    continue;
  }
  return item === ">" || item === "|" || item === "&" || item === ":" || item === "?" || item === ",";
}
return false;
```

## private method IsDeclarationHeadHost:(unit:Token)=>bool

`<` 的宿主是不是停在一个**声明头的名字**上——`function f<T extends U>` 里的那个 `f`。

判据两条：宿主 `Data` 里**最后一个实义单元是名字**（`Identifier`），名字前面那一格是声明头那个词
（`function` / `class` / `interface` / `type` / `enum` / `namespace` / `module`）。
`LineWrap` 与 trivia 一路跳过（注释与软换行都只是排版）。

**为什么只认这一格**：`<` 前面**有名字**才可能是类型参数表（名字闸已经在 `IsGenericStart` 里问过），
而「名字前面是声明词」这一条把 `Array<T>`（前面是 `:` / `=` / `(`）与 `f<T>(x)`（调用）
排除掉——那两处是值位的泛型实参，折行照旧按 `NextSignificantContinuesArguments` 那四条收紧。

```ts
const data = unit.Data;
let at = data.length - 1;
while (at >= 0 && (data[at] instanceof LineWrap || IsTriviaUnit(data[at]))) {
  at = at - 1;
}
if (at < 0 || !(data[at] instanceof Identifier)) {
  return false;
}
at = at - 1;
while (at >= 0 && (data[at] instanceof LineWrap || IsTriviaUnit(data[at]))) {
  at = at - 1;
}
if (at < 0) {
  return false;
}
const head = data[at];
let word = "";
if (head instanceof Identifier) {
  word = head.TempToString();
} else if (head instanceof Keyword) {
  word = head.Value;
}
return (
  word === "function" ||
  word === "class" ||
  word === "interface" ||
  word === "type" ||
  word === "enum" ||
  word === "namespace" ||
  word === "module"
);
```

## private method ScanArguments:(unit:Token, source:Source)=>int

从 `<` 之后扫到配对的 `>`，返回那个 `>` 的下标；扫不通返回 `-1`。

扫描器只认「类型实参字母表」：标识符字符、`_`、`.`、`,`、`?`、`=`（类型参数的默认值）、`:`（类型字面量里的键）、
`|` 与 `&`（联合 / 交叉类型）、**`-` 与 `+`（映射类型的 `-readonly` / `+readonly` / `-?` / `+?` 修饰符、
负数字面量类型）**、**成对的字符串字面量**（`Exclude<K, "a">` 这种字面量类型实参），
加上成对的 `< >` / `( )` / `[ ]` / `{ }`，以及 `->`（函数类型）。其余字符一律中止：
`/`（注释除外）、`%`、`^`、`~`、`!`、`@`、`#`、`;`（括号组里除外），
以及**括号层级为 0 时**的 `)` / `]` / `}`（它闭合的是 `<` 外面的东西，说明这里根本不是泛型）。

**模板字面量整段在字母表里**（第 867 轮）：`` ` `` 一到就交给 `SkipTemplate`，
连 `${ … }` 那一截（花括号 / 字符串 / 注释 / 嵌套模板）一起吃到底——
所以 `$` / `{` / `}` / `%` / `!` 这些字符**在模板里面**都合法，`` ` `` 自己也不再是中止符。
少了这一条：`function f<X extends `a${A}b`>(x: X): X { return x; }` 整条塌掉
（缺 14 多 7、未映射 `Bracket`，见 `SkipTemplate` 那一节）。

**字符串字面量是必须放进字母表的**：`Exclude<K, "a">` / `Record<"x", T>` 这类写法到处都是，
`"` 在字母表外时扫描在它那里中止、整个 `<…>` 退回符号。
它成对吃掉（含 `\"` 转义），所以不会把 `a < b, "s" > c` 这种比较链读成泛型——
最后还有后继闸：表达式位里 `<…>` 后面必须紧跟 `(` 才算数。

**`;` 只在括号组里放行**（`groupDepth > 0`）：类型实参里的类型字面量成员用 `;` 分隔，
`Promise<{` 换行 `publicKey: string;` 换行 `privateKey: string;` 换行 `}>` 是最常见的写法之一，
`;` 一律中止的话这些类型实参整段认不出来（`crypto.d.ts` 一处就有几十个）。
组外的 `;` 仍然是语句边界，照样中止。

**`|` 与 `&` 是必须放进字母表的**：TypeScript 的类型实参到处是联合与交叉——
`Array<string | number>`、`<I extends null | Writable, O extends null | Readable>`。
它们在字母表外时，扫描在第一个 `|` 处中止、整个 `<…>` 退回符号，
于是**类型参数段认不出来、整条声明跟着塌掉**（实测 `@types/node/child_process.d.ts` 的
`interface ChildProcessByStdio<I extends null | Writable, …>` 就是这样丢的：接口与它的成员一起消失）。
放进来的风险由最后一道闸门兜住：表达式位里 `<…>` 后面必须紧跟 `(` 才算数，
`a < b | c > d` 这种写法的 `>` 后面不是 `(`，照样被挡回去。

**`=` / `:` / `{ }` 三个字符是「类型参数段」需要的**：`<T = unknown>`、`<T extends object = {}>`、
`<T = { a: number }>` 这些写法里它们必然出现，而 TypeScript 的类型位到处是它们。
放开这三个字符不会把表达式里的 `<` 误读成泛型——最后一道闸门是 `IsAllowedFollower`：
表达式位里 `<…>` 后面必须紧跟 `(` 才算数（`a<b, c=d>e` 这类写法在那一关被挡回去）。

换行的取舍：泛型实参表允许折行，但折行不能是「语句结束」。所以只有**嵌套未归零**（`angleDepth > 1` 或 `groupDepth > 0`）、
**上一个非空字符是 `,` / `<` / `|` / `&`**（明显的续行信号）、**下一个非空字符是这个表的收尾 `>` / `|` / `&` / `:` / `?` / `,`**、
宿主停在**声明头的名字**上、或 **`<` 前面按定义还没有左操作数**（`IsOperandStartUnit`）时才跨过换行，否则判否——
`let n = a<b` 后面另起一行 `foo(bar) > x` 这种跨语句误吞就是这样挡掉的。
倒数第二档（第 914 轮补）是 `<T` 换行 `,>(a: T) => a` 那一族：那个位置上**没有左操作数**可比较，
`<…>` 只可能是类型参数表 —— 放行的前提是**这一格本来就不可能是比较式**。
最后一档（第 915 轮补）是**逗号写在下一行开头**的排版（`f<T` 换行 `,U>(x)` / `Map<T` 换行 `,U>`）：
逗号在类型实参表里是**表内分隔符**，TS 也是先把 `<…>` 当类型实参表读完再问后继——
放行的边界仍然交给最后那道 `IsAllowedFollower`（表外接不上操作数的那些字符才放行），
`const n = a<b` 换行 `, c > d` 这种真·声明列表照样在那一关被挡回去。

**「下一个非空字符是 `>`」这一条是必须的**：真实的声明几乎总是把类型参数表折成多行，而收尾的 `>` 常常独占一行——
`interface ChildProcessByStdio<` 换行 `I extends null | Writable,` 换行 `O extends null | Readable` 换行
`> extends ChildProcess { … }`。
`O extends null | Readable` 之后的那个换行前面是标识符 `Readable`（不是 `,` 也不是 `<`），
没有这一条就会判否、整个 `<…>` 退回符号，接口规则再也认不出类型参数段，**整条接口连同它的成员一起消失**
（实测 `@types/node/child_process.d.ts` 两个接口、若干成员就是这么丢的）。

`lastSignificant` 也要把 `|` / `&` 认成续行信号：折行的联合类型实参写法里，
一行以 `|` 结尾是常见排版。

注释按「透明」处理：`//` 吃到行尾、`/* … */` 吃到配对处，都不改变扫描状态——否则 `let m: HashMap<String, // 键` 换行后接 `Int64> = …` 这种写法里的 `//` 会把这次试读打断（`/` 不在字母表里）。

`->` 里的 `>` 必须当成箭头的一部分吞掉、**不能**参与尖括号计数，否则 `(A) -> B>` 会被算少一层。

**`=>` 同理，而且更常见**：类型位的函数类型写作 `(args) => R`，
`type Parameters<T extends (...args: any) => any> = …` / `interface ClassDecoratorContext<Class extends abstract new (...args: any) => any>` 都是这个形状。
不吞的话那个 `>` 会被当成**类型参数表的收尾**，`<…>` 提前结束、整条声明跟着塌
（`lib.es5.d.ts` 的 `Parameters` / `ReturnType` / `InstanceType`、`lib.decorators.d.ts` 的两个
`…DecoratorContext`、`typescript.d.ts` 的 `visitNodes` —— 实测正是这几处）。

`seenArgument` 保证 `<>`、`< >` 这类空实参表不成立。

```ts
const document = source.Document;
const count = document.GetCount();
let angleDepth = 1;
let groupDepth = 0;
let seenArgument = false;
let lastSignificant = "<";
let index = source.Index + 1;
while (index < count) {
  const item = document.GetValue(index);
  if (item === "<") {
    angleDepth++;
    seenArgument = true;
    lastSignificant = "<";
    index++;
    continue;
  }
  if (item === ">") {
    angleDepth--;
    if (angleDepth === 0) {
      return seenArgument ? index : -1;
    }
    lastSignificant = ">";
    index++;
    continue;
  }
  if (item === "-" && index + 1 < count && document.GetValue(index + 1) === ">") {
    // `->` 箭头：`-` 与 `>` 一起吞掉，不参与尖括号计数
    seenArgument = true;
    lastSignificant = ">";
    index += 2;
    continue;
  }
  if (item === "=" && index + 1 < count && document.GetValue(index + 1) === ">") {
    seenArgument = true;
    lastSignificant = ">";
    index += 2;
    continue;
  }
  if (item === "(" || item === "[" || item === "{") {
    groupDepth++;
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === ")" || item === "]" || item === "}") {
    if (groupDepth === 0) {
      return -1;
    }
    groupDepth--;
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "|" || item === "&") {
    // **`&&` / `||` 不是类型**（第 834 轮）：单个 `|` / `&` 必须放行（联合 / 交叉类型），
    // 但**连着两个**在类型里不可能出现 —— `A && B` / `A || B` 只可能是值位的逻辑运算。
    // 少了这一条：`const s = a < b && c > (d);` 里 `<b && c>` 被当成合法的类型实参表
    // ⇒ 整条读成一次泛型调用，而 TS 那边是**两条二元表达式**
    //（`a < b` 与 `c > (d)`，实测：缺 6 个节点、多一个 `CallExpression`）。
    // 判据用 `lastSignificant`（空格 / 换行不改它），所以 `& &` 这种排版也一并挡住。
    if (lastSignificant === item) {
      return -1;
    }
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "-" || item === "+") {
    // **映射类型的修饰符与负数字面量类型**（第 61 轮补）：
    // `{ -readonly [P in keyof T]: T[P] }`、`{ [P in K]-?: T[P] }`、`{ +readonly … }`、
    // `Array<-1 | 0>` 这些写法里 `-` / `+` 必然出现（`lib.es2015.promise.d.ts` 的
    // `Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>` 就是这么写的）。
    // 它们在字母表外时扫描当场中止、整个 `<…>` 退回符号：产物里 `Promise` 后面是个裸的
    // `<` 符号，映射类型落成值位的 `ObjectLiteral`、**剩下的整段掉进 `<FunctionBody>`**（实测）。
    // 表达式位里的 `a < b - c > (d)` 这种写法由后继闸兜住（与 `|` / `&` / `=` 同一个取舍）。
    // `-` 要走到这里，上面那条只认 `->` 的分支就不能对其余 `-` 直接判否（踩过一次）。
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === ";" && groupDepth > 0) {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "\"" || item === "'") {
    const next = index + 1 < count ? document.GetValue(index + 1) : "";
    const closer = item;
    if (next === closer) {
      return -1;
    }
    index++;
    while (index < count) {
      const inner = document.GetValue(index);
      if (inner === "\\") {
        index += 2;
        continue;
      }
      if (inner === closer) {
        break;
      }
      index++;
    }
    if (index >= count) {
      return -1;
    }
    seenArgument = true;
    lastSignificant = closer;
    index++;
    continue;
  }
  // **模板字面量（第 867 轮）**：`` `a${A}b` `` 整段吃掉，`${ … }` 里再递归（见 `SkipTemplate`）。
  // 少了这一条：`` ` `` 不在字母表里 ⇒ 扫描在它那里中止 ⇒ `<X extends `a${A}b`>` 整段退回
  // **比较运算符** ⇒ 类型参数段认不出来、整条 `function` / `type` / `interface` / `class` 跟着塌
  //（实测 `function f<X extends `a${A}b`>(x: X): X { return x; }` 缺 14 多 7、未映射 `Bracket`）。
  // 值位那一边照旧由后继闸 `IsAllowedFollower` 兜住（`<…>` 后面必须紧跟 `(`）。
  if (item === "`") {
    const after = this.SkipTemplate(document, count, index);
    if (after < 0) {
      return -1;
    }
    seenArgument = true;
    lastSignificant = "`";
    index = after;
    continue;
  }
  if (item === "=" || item === ":") {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  if (item === "/") {
    const next = index + 1 < count ? document.GetValue(index + 1) : "";
    if (next === "/") {
      index += 2;
      while (index < count && document.GetValue(index) !== "\n") {
        index++;
      }
      continue;
    }
    if (next === "*") {
      index += 2;
      while (index + 1 < count && (document.GetValue(index) !== "*" || document.GetValue(index + 1) !== "/")) {
        index++;
      }
      index += 2;
      continue;
    }
    return -1;
  }
  if (item === "\n" || item === "\r") {
    if (
      groupDepth === 0 &&
      angleDepth === 1 &&
      lastSignificant !== "," &&
      lastSignificant !== "<" &&
      lastSignificant !== "|" &&
      lastSignificant !== "&"
    ) {
      // **声明头的类型参数段：折行一律放行**（第 825 轮）：`function f<T` 换行
      // `extends U>(x: T): T { … }` 与 `function f<T extends` 换行 `U>(…)` 都是**同一个**参数表
      // 的排版 —— 这一个 `<` 前面是「声明词 + 名字」（`IsDeclarationHeadHost`），
      // 它不是比较式，段里的换行没有「这条语句到此为止」那种读法。
      //
      // **少了它会怎样**：`NextSignificantContinuesArguments` 只认「下一个实义字符是 `>` / `|` / `&` /
      // `:` / `?` / `,`」，而这两处的下一个实义字符是 `extends` / 约束类型名 ⇒ 判否 ⇒
      // 整个 `<…>` 退回比较运算符 ⇒ 类型参数段认不出来、`FunctionDeclaration` 整条缺
      //（实测 `gap-sweep-newline-generic-03/04` 与 `gap-sweep-linecomment-generic-03/04` 四份）。
      //
      // **为什么不能放宽成「下一格是字母就放行」**：`let n = a<b` 换行 `foo(bar) > x`
      // 正是靠这一条挡住的（那三行注释在上面），而它的下一格也是字母。
      //
      // **`<` 前面按定义没有操作数时，段里的换行一律放行**（第 914 轮）：
      // `const f = <T` 换行 `,>(a: T) => a` 里的换行后面是 `,`，而**第 914 轮那一刻**
      // 逗号还不在 `NextSignificantContinuesArguments` 里（第 915 轮才补上），
      // 上一个实义字符也不是 `,` / `<` ⇒ 三条判据一条都不认、整个 `<…>` 退回裸符号、
      // `(a: T) => a` 掉进下一条语句（实测 `gap-r907-arrow-generic-newline-before-comma`：
      // 缺 9 漂 1 多 4）。
      //
      // **为什么这里可以一律放行**：这一支只在 `IsOperandStartUnit(unit)` 为真时才放行，
      // 而它问的正是「`<` 前面还没有左操作数」——那个位置上比较式根本写不出来
      //（`< b > c` 没有左操作数可比较），`<…>` 只可能是**类型参数表 / 断言类型**，
      // 段里的换行没有「这条语句到此为止」那种读法。这**不是**新开口子：
      // 名字闸的第二支（第 66 轮）与位置闸（第 379 轮）用的是**同一个** `IsOperandStartUnit`，
      // 那句话原本就写着「第二支的位置上按定义还没有操作数，`<…>` 只可能是类型参数段」——
      // 这一轮只是把同一句话接到换行那一格上。
      //
      // **这一支与第 915 轮补的 `,` 那一档不重叠**（两轮各管一半）：`<` 前面**有**名字时
      // （`f<T` 换行 `,U>(x)` / `a<b` 换行 `, c>(d)`）`IsOperandStartUnit` 答否，走的是
      // `NextSignificantContinuesArguments` 那个逗号；这一支管的是**没有左操作数**的那几格
      //（`const f = <T` 换行 `,>`、`type X = <T` 换行 `,>`、语句开头的 `<T` 换行 `,>`）。
      if (
        this.IsOperandStartUnit(unit) === false &&
        this.IsDeclarationHeadHost(unit) === false &&
        this.NextSignificantContinuesArguments(document, count, index) === false
      ) {
        return -1;
      }
    }
    index++;
    continue;
  }
  if (item === " " || item === "\t") {
    index++;
    continue;
  }
  if (this.IsArgumentChar(unit, item)) {
    seenArgument = true;
    lastSignificant = item;
    index++;
    continue;
  }
  return -1;
}
return -1;
```

## private method SkipTemplate:(document:Document, count:int, index:int)=>int

`index` 指在**开引号** `` ` `` 上时，跳到闭合那个 `` ` `` **之后**一格；扫不通返回 `-1`（第 867 轮）。

模板字面量是**类型位与值位共用的字面量**，它的正文里可以出现字母表外的字符（`` ` `` 自己、
`$`、`{`、`}`、`%`、`!`、`/`…），也可以换行 —— 所以它只能**整段吃掉**，不能按字符逐个放行。
`${ … }` 那一截是**表达式 / 类型**，里面可以有嵌套的花括号、字符串、注释
（`` `${ { a: 1 }.a }` ``），甚至再套一层模板（`` `a${`b${C}d`}e` ``）⇒ 递归回本方法。

**为什么 `>` 也要一起吃掉**：`` `${A extends B ? C : D}` `` 里那个 `>` 若参与尖括号计数，
`<X extends `a${A > B}b`>` 会**提前收尾**、类型参数段被切成两半。

```ts
let at = index + 1;
while (at < count) {
  const item = document.GetValue(at);
  if (item === "\\") {
    // 转义：`` \` `` 与 `\$` 都不结束这一格
    at += 2;
    continue;
  }
  if (item === "`") {
    return at + 1;
  }
  if (item === "$" && at + 1 < count && document.GetValue(at + 1) === "{") {
    at = this.SkipTemplateExpression(document, count, at + 2);
    if (at < 0) {
      return -1;
    }
    continue;
  }
  at++;
}
return -1;
```

## private method SkipTemplateExpression:(document:Document, count:int, index:int)=>int

`${` 之后那一截的扫描器：`index` 指在 `{` **之后**一格，返回配对的 `}` **之后**一格；扫不通返回 `-1`（第 867 轮）。

花括号自己计数（对象字面量 / 块都在里面）、成对的字符串按转义吃、注释吃到头，
再撞上 `` ` `` 就交给 `SkipTemplate` —— 三者与 `ScanArguments` 自己的口径同源，只是这里**不判类型合法性**。

```ts
let depth = 1;
let at = index;
while (at < count) {
  const item = document.GetValue(at);
  if (item === "{") {
    depth++;
    at++;
    continue;
  }
  if (item === "}") {
    depth--;
    at++;
    if (depth === 0) {
      return at;
    }
    continue;
  }
  if (item === "`") {
    at = this.SkipTemplate(document, count, at);
    if (at < 0) {
      return -1;
    }
    continue;
  }
  if (item === "\"" || item === "'") {
    const closer = item;
    at++;
    while (at < count && document.GetValue(at) !== closer) {
      if (document.GetValue(at) === "\\") {
        at++;
      }
      at++;
    }
    if (at >= count) {
      return -1;
    }
    at++;
    continue;
  }
  if (item === "/") {
    const next = at + 1 < count ? document.GetValue(at + 1) : "";
    if (next === "/") {
      at += 2;
      while (at < count && document.GetValue(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && (document.GetValue(at) !== "*" || document.GetValue(at + 1) !== "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  at++;
}
return -1;
```

## private method IsArgumentChar:(unit:Token, item:string)=>bool

类型实参表里允许出现哪些普通字符。

字母与数字借符号模板判定（`IsLetterOrNumber` 只认 ASCII），`_` / `.` / `,` / `?` 单独放行——`.` 给限定名，`,` 给多实参，`?` 给可空类型后缀。

```ts
if (item === "_" || item === "." || item === "," || item === "?") {
  return true;
}
return unit.Template.SymbolTemplate.IsLetterOrNumber(item);
```

## private method IsTypePosition:(unit:Token, from:int = -1, bounded:bool = false, source:Source | null = null)=>bool

从宿主单元的 `Data` **往前**找最近的边界，判定当前处在类型位还是表达式位。
`from` 是回扫的起点（默认最后一个）；**换一个起点**只为下面「宿主是一对方括号」那一条 ——
位置答案在括号**自己那一层**，所以那一支换宿主、换起点再问一次。

`bounded` 是那一支专用的收窄（**只在递归那一趟为真**）：只走**当前这一条声明**，
括号与语句壳都是边界。不放它的话这一趟会走出声明之外——函数体在解析期是**摊平在 `Root` 上的
一堆 `Statement`**（`((` 那一格往前全是别的语句），回扫会一路穿到**上一条声明的** `:` / `=` / `type` 上，
把 `while (at < units.length && …)` 里的 `<` 判成类型位
（实测那批普查用的语料 `dist/ts/typescript-exec/builtins/globals.ts`：整份文件散架，缺 5385 个 `Identifier`）。
类型位那一档（`type X = K[A<B, C>]` / `let v: K[A<B, C>]`）**根本走不到那些壳**——
它撞上的是 `=` / `:`。

规则：

- 宿主自己就是 `GenericType` → 类型位（嵌套 `Array<Array<T>>`、`Map<String, Int64>` 的内层直接成立）。
- **宿主是一对方括号，而括号自己在类型位** → 类型位（第 644 轮）：
  `K[A<B, C>]` 里那个 `<` 被读进来时，宿主是还没成形的 `[`（`TypeBracketCloseRule` 要等括号关闭才动），
  它的 `Data` 里只有 `K` / `A` 两个**操作数** ⇒ 本地回扫到头只能答「表达式位」。
  而这一格问的其实是**那个方括号在不在类型位**——答案在括号自己那一层（它的前一个实义单元是
  类型名，再往前是 `=` → `type` / `:`）。所以这一支**换宿主、换起点**把同一个问题再问一次
  （起点是括号在父单元里的下标减一，不能从父单元的末尾回扫：那里有括号**后面**的东西）。
  **只会把「否」翻成「是」，不会翻回去**：括号不在类型位时这一支一句话不说，
  本地那一趟照旧（值位对象字面量里的 `<T>()` 缺的正是这一支的反面）。
  **只认方括号**：`(` / `{` 走这条会当场踩到**函数体那个 `{`** ——
  它的前一个实义单元正是返回类型里的 `:` ⇒ 整个函数体被判成类型位
  （实测那批普查用的语料 `dist/ts/typescript-exec/builtins/globals.ts`：`while (at < units.length)` 里的 `<` 成了泛型开头，
  整份文件散架，缺 5385 个 `Identifier`）。这一格要的只是 `K[…]` 那种**下标访问**。
- 最近的边界是 `:` / `?:` 或 `->` / `=>` → 类型位（类型标注、可选成员的标注、返回类型、`<:` 约束、
  函数类型的返回类型）。**`=>` 是第 58 轮补的**：`type F = () => Iterable<T> | AsyncIterable<T>`
  里 `<T>` 的扫描会先撞上 `=>`，不认它的话返回类型整段退回比较运算符
  （实测 `@types/node/stream.d.ts` 的 `PipelineSourceFunction`）；
  值位的箭头体（`x => a < b`）不受影响——那里没有配对的 `>`，后继闸本来就过不了。
  **`?:` 必须单独列出来**：可选成员 / 可选参数的类型标注整体是一个 `?:` 符号（见 `symbol.xl.md`
  的符号合并），不是 `?` 与 `:` 两个单元。少了它，`interface I { h?: Record<string, string> }` 的
  `<` 会被判成表达式位（退回比较运算符），泛型再也合不起来——实测产物会把这条成员**劈成两半**：
  `<Field fieldName="h"><TypeDefine><Identifier>Record</Identifier><SymbolToken>&lt;</SymbolToken><Identifier>string</Identifier></TypeDefine></Field>`
  后面还跟着一个 `<Statement><Identifier>string</Identifier><SymbolToken>&gt;</SymbolToken></Statement>`。
- `.` 与 `,` 是**透明**的：限定名 `a.b.C<T>` 的点、以及参数表 / 父接口列表里的逗号，都不改变类型位判定——继续往前找真正的边界。TypeScript 里带类型实参的名字几乎总是出现在这两种位置（`extends a.b.Base<T>`、`function f(a: A, b: B<T>)`），把它们当边界会让这些写法整条退回比较运算符。
- **`|` 与 `&` 也是透明的**（第 58 轮补）：联合 / 交叉类型里的带类型实参的名字极其常见
  （`ArrayBuffer | NodeJS.TypedArray<T>`、`| Uint8Array<T>`），原来它们在扫到 `|` 时直接判表达式位，
  于是 `<T>` 退回比较运算符、整个类型**劈成两半**
  （实测 `let x: X | Foo<Bar>` 的产物：`<UnionType>X | Foo</UnionType><SymbolToken>&lt;</SymbolToken>…`）。
  透明而不是「见到 `|` 就判类型位」是必须的：`let x = a | Foo<Bar>` 在**值位**同样是这个形状，
  透明过去才会撞上 `=` → `let`，判回表达式位（TypeScript 自己在这里也按比较运算符读）。
- **`?` 也是透明的**（第 66 轮补）：**条件类型真分支里的类型实参**是这个形状的常客
  （`T extends U ? F<A, B> : C`、`ApplyOptionalModifiers<T["options"], { … }>`）。
  原来扫到 `?` 就判表达式位，于是那次试读只允许后继是 `(`，
  `F<A, B>` 后面跟着的 `:` 过不了闸门——**整个泛型实参段退回符号**，
  条件类型跟着在 `,` 处收尾（实测 `lib.es2019.array.d.ts` 的元组类型与
  `@types/node/util.d.ts` 的 `T["options"]`，当时那把对齐尺子的缺节点两处全是它）。
  透明之后会继续往前找真正的边界：类型位的条件类型会撞上 `extends`（⇒ 类型位），
  值位三元里的比较式会撞上 `=` → `let` / `const`（⇒ 表达式位，
  那里后继闸只放行 `(`，`a ? b < c > d : e` 照旧读成比较）。
  `?:` 仍然是**边界**（上面那条）——它是可选成员 / 可选参数的标注符号，不是条件类型的 `?`。
- 最近的边界是 `=` → 记下「跨过赋值」继续往前找：再遇到 `type` 就是类型位（`type X = Array<Int64>` 的右端是类型），遇到 `let` / `var` / `const` 则是表达式位（`let x = Array<Int64>(3)` 的右端是值）。两个 `=` 之间没有结论也算表达式位。
- 最近的边界是括号单元或 `;` / 其它符号 → 表达式位（实参、下标、语句边界都不保证期望类型）。
  **例外**：括号前面是 `import` 时继续往前——那是**导入类型** `import("./m").A<T>`，
  括号（模块说明符）只是类型引用的一部分，不该把它当表达式位的边界
  （`type-import-generic` 那条用例的 `<T>` 就是在这儿被挡掉的）。
- 最近的实义单元是 `Identifier`：是 `class` / `interface` / `struct` / `enum` / `extend` / `extends` / `func` / `type` / `where` / `new` / `as` / `satisfies` / `is` 就判类型位；是普通标识符就继续往前找（限定名 `a.b.C<T>` 要跨过中间的名字）。
  `satisfies` 是必须的：`x satisfies Record<string, number>` 里 `<…>` 的右端是语句结尾、不是 `(`，
  不判类型位就过不了后继闸（`type-op-satisfies` 那条用例就是它）。
- `LineWrap` 与 `GenericType` 都是透明的，直接跳过（软换行不该挡住判定；已经收起来的泛型实参属于名字的一部分）。
- 一路找到头没有边界 → 表达式位（保守：`Array<Int64>` 这种裸类型表达式在 Cangjie 里不是合法语句）。

```ts
if (unit instanceof GenericType) {
  return true;
}
// **宿主是一对方括号，而括号自己在类型位**（第 644 轮）：`K[A<B, C>]` 的 `<` 宿主是那个还没
// 成形的 `[`（`TypeBracketCloseRule` 要等它关闭才动），而它 `Data` 里只有 `K` / `A` 两个操作数
// ⇒ 本地回扫问不出位置。**换宿主、换起点**把同一个问题再问一次：位置答案就在括号自己那一层。
// 起点必须是括号在父单元里的下标减一（不能从父单元末尾回扫——那里有括号后面的 `>` / `]`）。
if (unit instanceof Bracket && unit.startBracket === "[" && unit.Parent !== null) {
  const bracketAt = unit.Parent.Data.indexOf(unit);
  if (bracketAt > 0 && this.IsTypePosition(unit.Parent, bracketAt - 1, true, source)) {
    return true;
  }
}
// **模板字面量类型的插值段**（第 129 轮）：`` type X = `${Foo<Bar>}` `` 里那个 `<` 的宿主
// 是插值段（也可能是外层那个 `String`），往上找不到类型容器——它的类型位答案在
// 「外层 `String` 在它自己那一格前面是什么」，那正是 `IsTemplateTypeContent` 的回答
// （与 `type-union.xl.md` 里的联合 / 交叉共用同一个函数）。
// 少了这一条，插值段里的泛型实参整段退回比较运算符——实测 `lib.dom.d.ts` 的
// `` `${OptionalPrefixToken<AutoFillSection>}${…}` `` 一族：缺 41 个 `TypeReference`
// 与 136 个 `Identifier`，`TypeReference` 只盖住基名、`TemplateMiddle` 多吞了 `<…>`。
if (IsTemplateTypeContent(unit)) {
  return true;
}
if (
  unit.constructor.name === "String" &&
  unit.Parent !== null &&
  IsTypeBracketPosition(unit.Parent, unit)
) {
  return true;
}
let crossedAssignment = false;
// 刚跨过 `=`（下一步撞上的那个名字是**声明自己的名字**，见下面 Identifier 那一支）。
let justCrossedAssignment = false;
// 回扫路上有没有撞见**操作数**（名字 / 括号）——见函数末尾那一条的说明。
let sawOperand = false;
for (let i = from >= 0 ? from : unit.Data.length - 1; i >= 0; i--) {
  const item = unit.Data[i];
  if (item instanceof LineWrap || item instanceof GenericType) {
    continue;
  }
  if (item instanceof SymbolToken) {
    const text = item.TempToString();
    if (text === "." || text === "," || text === "|" || text === "&" || text === "?") {
      continue;
    }
    if (text === ":" || text === "?:" || text === "->") {
      return true;
    }
    // **`=>` 分两种**（第 178 轮）：函数类型的返回类型 ⇒ 类型位；
    // 箭头函数的体 ⇒ **不是边界，继续往前找**（与 `.` / `,` / `|` / `&` / `?` 同一条口径）。
    //
    // 第 58 轮补 `=>` 时写的是「值位的箭头体不受影响——那里没有配对的 `>`，
    // 后继闸本来就过不了」。**嵌套三元推翻了这句话**：`x < y ? -1 : x > y ? 1 : 0`
    // 里配对的 `>` 就在同一个箭头体里（`x > y` 的那个），于是后继闸放行、
    // 回扫又撞上 `=>` 判类型位——`<` 成了泛型实参，比较器的标准写法变成**静默错值**。
    //
    // 分辨办法与 `text-common-util.xl.md` 的 `IsTypeBracketPosition` **同一句**：
    // 问箭头**自己的形参表**在不在类型位——在 ⇒ 函数类型的返回类型 ⇒ 类型位；
    // 不在 ⇒ 箭头函数的体 ⇒ **跳过形参表**继续往前找
    //（`const f = (x, y) => x < y ? …` 会继续撞上 `=`→`const` ⇒ 表达式位；
    //  `type F = () => Iterable<T>` 的形参表前面是 `=`→`type` ⇒ 类型位）。
    //
    // **形参表正好在这一格的头部时问不出去**（`write?: ((…args) => Promise<boolean>) | undefined`
    // 实测：`unit.Data` 是 `[Bracket(形参), =>, Promise]`，形参表在下标 0）——
    // 这一格**跳过**它，扫到头的兜底那句会问「这个容器自己在不在类型位」（`?:` ⇒ 类型位）。
    // 少了这一条，`Promise<boolean>` 会退回比较运算符（实测三份 `.d.ts` 的 `TypeReference`
    // 各缺一截、`UnionType` 还多带上 `typeArguments`）。
    if (text === "=>") {
      const parameterAt = SkipPreviousWrapSymbol(unit.Data, i);
      const parameters = parameterAt >= 0 ? unit.Data[parameterAt] : null;
      if (parameters instanceof Bracket) {
        if (parameterAt > 0 && IsTypeBracketPosition(unit, parameters)) {
          return true;
        }
        i = parameterAt;
      }
      continue;
    }
    if (text === "=" && !crossedAssignment) {
      crossedAssignment = true;
      justCrossedAssignment = true;
      continue;
    }
    // **语句边界的 `;`**（第 144 轮）：`<T>x;` 换行 `<T[]>xs` 这种写法里，第二个 `<` 回扫
    // 先撞上前一条语句的 `;`——而 `<` 左边一个操作数都没有，它只能是**类型断言的类型**
    // （一条语句以 `<` 开头时，TypeScript 只可能按类型断言读）。
    // 有操作数时（`a;` 换行 `b < c > d`）`sawOperand` 已经为真，照旧判表达式位。
    if (text === ";") {
      return sawOperand === false;
    }
    return false;
  }
  if (item instanceof Bracket) {
    // **递归那一趟里括号就是边界**（第 644 轮）：见 `bounded` 那一段的账。
    if (bounded) {
      return false;
    }
    const beforeBracket = i - 1 >= 0 ? unit.Data[i - 1] : null;
    if (beforeBracket instanceof Identifier && beforeBracket.Is("import")) {
      i = i - 1;
      continue;
    }
    // **空的 `[]` 是数组类型的后缀**（第 124 轮）：`A[] | B<C>` 里 `<` 回扫先撞上
    // `A[]` 那个括号，`IsTypeBracketPosition` 只看括号前面是 `A`（名字）→ 判值位，
    // 于是整段退回比较运算符：产物里 `<` / `>` 成了 `SymbolToken`、
    // `B<C>` 只剩一个 `Identifier`（实测 `type CompilerOptionsValue = … | MapLike<string[]> | …`
    // 那一整行，`typescript.d.ts` 与 `lib.dom.d.ts` 各成片）。
    // 空的 `[]` 在值位没有对应写法（`a[]` 不是合法 JS），所以这一条没有副作用。
    if (item.startBracket === "[" && item.Data.length === 0) {
      continue;
    }
    if (IsTypeBracketPosition(unit, item)) {
      // **括号类型里的 `A<B>`**（第 62 轮补）：`(TransformerFactory<SourceFile> | CustomTransformerFactory)[]`
      // 里 `<` 的扫描会先撞上 `(`；把它当值位边界的话整个类型退化成散单元，
      // 里面那个联合也跟着没了（实测 `typescript.d.ts` 两处、共 5 个联合）。
      // 「这个括号是不是类型位」由 `../text-common-util.xl.md` 的 `IsTypeBracketPosition` 回答
      // ——与 `type-union.xl.md` 共用同一个答案。
      continue;
    }
    return false;
  }
  // **`function` 已经升成 `Keyword` 时也要认**（第 825 轮）：`IsTypePosition` 与
  // `KeywordCloseRule` **跑在同一趟里**（后者排在队列最后，可同一趟会跑两遍）——
  // 只认 `Identifier` 那一支的话，第二遍看到的 `function` 是 `Keyword`、回扫又判回操作数。
  // 其余关键词照旧落到末尾那条「其余单元是操作数」的兜底上（本支一句话不说）。
  if (item instanceof Keyword && item.Value === "function") {
    return true;
  }
  if (item instanceof Identifier) {
    const text = item.TempToString();
    // **映射类型的键 `[K in X<U>]`**（第 133 轮）：`in` 左边的 `K` 与右边的约束都是**类型**，
    // 而回扫到这里时 `in` 还是一个普通 `Identifier`（`KeywordCloseRule` 排在最后）。
    // 不认它，`Lowercase<HeaderNames>` 里那个 `<` 被判成表达式位、泛型退回比较运算符——
    // 于是约束里的实参整段丢（实测 `undici-types/header.d.ts` 与
    // `lib.esnext.temporal.d.ts` 两族：缺 `Identifier` 110 / `TypeReference` 32）。
    if (text === "in") {
      return true;
    }
    switch (text) {
      case "class":
      case "interface":
      case "struct":
      case "enum":
      case "extend":
      case "extends":
      case "func":
      // **`function` 也是声明头**（第 825 轮）：`function f<T extends U>` 换行 `(x: T): T { … }`
      // 里 `<` 的宿主是那个语句壳（`Data` 是 `[function, f]`），回扫撞上的正是这个词。
      // 不认它 ⇒ 判表达式位 ⇒ 后继闸那一支只看同一行，而 `>` 后面那一格是**换行**
      // （`IsAllowedFollower` 直接 `return isTypePosition`）⇒ 答否 ⇒ 整个 `<…>` 退回比较运算符
      // ⇒ 类型参数段认不出来、`FunctionDeclaration` 整条缺
      //（实测 `gap-sweep-newline-generic-05` 与 `gap-sweep-linecomment-generic-05` 两份，
      //  以及同族的 02 / 04 两条的收尾那一关）。
      // **安全**：名字闸已经要求 `<` 前面是一个名字，所以这一格只可能是函数声明的头。
      case "function":
      case "type":
      case "where":
      case "new":
      case "as":
      case "satisfies":
      case "is":
        return true;
      case "let":
      case "var":
      case "const":
        // **`const c = <string>x`：`=` 之后直接就是 `<`**（第 144 轮）。回扫先撞上 `=`、
        // 再撞上**声明单元自己**（`Let` 是 `Identifier` 的子类，文本是 `let` / `const`）。
        // 这一支原来只看「跨没跨过 `=`」，于是 `const c = …` 一律判表达式位——
        // 尖括号类型断言整族因此站不住（实测 `ex-angle-cast.ts` / `expr-angle-assertion.ts`）。
        //
        // `sawOperand` 是分水岭：`let x = a < b` 回扫会先撞上那个 `a`（`sawOperand` 为真），
        // 仍旧判表达式位；只有「`=` 到声明关键字之间**一个操作数都没有**」才翻成类型位——
        // 那个位置上 `<…>` 只可能是类型参数段 / 类型断言的类型。
        return !crossedAssignment || sawOperand === false;
      default:
        break;
    }
    // **`instanceof` 右边那一格是类型位**（第 894 轮，实测补的）：
    // `b instanceof C<D>` 在 TS 那边是 `BinaryExpression(b, instanceof, ExpressionWithTypeArguments(C<D>))`，
    // 也就是**实例化表达式**（`generic-type.xl.md` 第 850 轮那一族）——TS 自己为它
    // 专门留了一条语法错（`The right hand side of an instanceof expression must not be
    // an instantiation expression`，见 `checkExpressionWithTypeArguments`），
    // 说明它**照实例化表达式读**，再从语法上拒掉。
    //
    // **它为什么和别的运算符不一样**：`b + C<D>;` 能读成实例化表达式是因为
    // 「C 后面那个 `<` 在 token 层被判成泛型」——而那件事由后继闸（`>` 后面是 `;`）决定。
    // `instanceof` 的右操作数**与左操作数同为「关系层」**，`b instanceof C < D` 在
    // TS 里也照实例化表达式读（那里 `>` 后面还是 `;`，后继闸照样放行）。
    //
    // **不这么做会怎样**：`C<D>` 退回裸符号 ⇒ 产物是 `Identifier` + `SymbolToken(<)` +
    // `Identifier` + `SymbolToken(>)`，而 TS 那边是 `ExpressionWithTypeArguments > TypeReference`
    //（实测片段 `const a = b instanceof C<D>;`：缺 2 / 漂 2 / 多 1）。
    //
    // **只认「`typeof` 那一族里紧邻的前一个名字是 `instanceof`」**：`instanceof` 与 `in` 一样
    // 是 `Keyword`，而 `KeywordCloseRule` 排在队列最后 ⇒ 这里两种身份都要认
    //（`in` 那一支在上面就是这么写的）。**`instanceof` 与名字之间不许隔任何实义单元**，
    // 所以 `a instanceof b.c<D>` 里 `c` 前面是 `.`（不是 `instanceof`）⇒ 这一支不响，
    // 与原来一字不差。
    let instanceAt = i - 1;
    while (instanceAt >= 0 && (unit.Data[instanceAt] instanceof LineWrap || IsTriviaUnit(unit.Data[instanceAt]))) {
      instanceAt = instanceAt - 1;
    }
    const beforeName = instanceAt >= 0 ? unit.Data[instanceAt] : null;
    const beforeNameWord =
      beforeName instanceof Identifier ? beforeName.TempToString() : (beforeName instanceof Keyword ? beforeName.Value : "");
    if (beforeNameWord === "instanceof") {
      return this.IsInstanceOfTypeArgument(unit, source, from);
    }
    // **`=` 左边紧挨着的那个名字是声明自己的名字**（`const c = …` 里的 `c`），
    // 不是操作数：`const c = <string>x` 的回扫顺序是 `=` → `c` → `const`，
    // 把 `c` 记成「看见操作数」会让声明关键字那一支判回表达式位（第 144 轮）。
    // 判定只看**位置**（紧跟在 `=` 之后），所以 `let x = a < b` 里的 `a` 不受影响——
    // 那个 `a` 在 `=` **之前**就被扫到了。
    if (justCrossedAssignment) {
      justCrossedAssignment = false;
      continue;
    }
    sawOperand = true;
    continue;
  }
  // **其余单元是「操作数」，不是边界，继续往左找**（第 124 轮）。
  //
  // 这一句原来是 `return false`（按值位收场）。问题是回扫路上的**操作数**远不止
  // `Identifier` 一种：字符串字面量类型（`type X = "s" | B<C>` 里的 `String`）、
  // 已经成形的类型节点（`ArrayType` / `UnionType` / `TypeQuery`…）、
  // 数组字面量（计算成员名）都会走到这里。一遇到它们就判值位，`<` 就退回比较运算符：
  //
  //     type X = "s" | B<C>;   →  <UnionType>LiteralType("s") | B</UnionType><SymbolToken>&lt;</SymbolToken>…
  //     type X = A[] | B<C>;   →  同上（`A[]` 那个空括号由上面那一支放行）
  //
  // 放行的风险由「多找几格」兜住：回扫会一直走到真正的边界（`:` / `=` / `;` / 括号 / 语句关键词），
  // 那些边界给出的结论才是本方法要的答案。值位的比较式（`let x = a[0] < b`）会在
  // 括号那一支停下、或者一路走到 `=` / `let` 判回表达式位。
  //
  // **唯一的例外是「只装着注释的 `Statement`」**（第 144 轮）：`// xl:note …` 那种行在本工程
  // 是一层 `Statement` 包着一个注释单元，而 `<T>x;` 这类**语句开头**的类型断言前面正好是它。
  // 把它算成「看见操作数」，回扫就再也翻不成类型位（实测 `expr-angle-assertion.ts`）。
  const triviaOnly =
    item.constructor.name === "Statement" && item.Data.every((x) => IsTriviaUnit(x));
  // **递归那一趟只走当前这一条声明**（第 644 轮）：语句壳不是操作数，是**边界**——
  // 见 `bounded` 那一段的账。
  if (bounded) {
    return false;
  }
  if (triviaOnly === false && IsTriviaUnit(item) === false) {
    sawOperand = true;
  }
  continue;
}
// **回扫到头都没撞见操作数 ⇒ 这个 `<` 就在列表的最前面**（第 144 轮）。两种形态都要它：
//
//     const c = <string>x     宿主 Data = [Let, =]（跨过 `=`，声明名不算操作数）
//     <T>x;                   宿主 Data = [Statement(注释), LineWrap]（语句开头的断言）
//
// 两种情况里 `<…>` 都只可能是**类型参数段 / 类型断言的类型**：比较式 `a < b > c` 要求 `<`
// 左边有操作数，而那个操作数一定与 `<` 同在宿主列表里、回扫必然先撞上它（⇒ `sawOperand`）。
// 这一条是 `let x = a < b > c` 不被读成泛型的关键。
if (sawOperand === false) {
  return true;
}
// **扫描在自己这一层找不到边界**：宿主正好是一个括号时，答案在**括号自己那一格**
// （`(A<B> | C)[]`：问 `(` 在它的父列表里前面是什么）。判定与 `type-union.xl.md` 共用
// `../text-common-util.xl.md` 的 `IsTypeBracketPosition`。
if (unit instanceof Bracket && unit.Parent !== null) {
  return IsTypeBracketPosition(unit.Parent, unit);
}
return false;
```

## private method IsOperandStartUnit:(unit:Token)=>bool

**宿主这一格是不是「`<` 前面还没有左操作数」**（第 379 轮）——名字闸与后继闸**共用它**。

**为什么需要它**：`f<T>(…)` / `Array<T>` 这类泛型前面**有一个名字**（走名字闸的第一支），
而 `<T>x` 这种**尖括号断言**前面**什么都没有**——它只可能出现在**操作数位置**上：
语句（或实参）的开头、`=` / `=>` / `:` / `;` / `,` 之后、括号与软换行之后、
以及**二元运算符之后**（`a + <number>b`——第 379 轮补的就是最后这一档）。

**原来只列了前几档**：运算符之后那一格没列 ⇒ `a + <number>b` 里的 `<` 连名字闸都过不了
⇒ 退回比较运算符 ⇒ `number` 被当成值（降级层报 `name is not a local or a capture: number`）。

**列进运算符是安全的**：那个位置上按定义**还没有操作数**，
所以 `< b > c` 只可能是断言 `<b>c`，读不成「谁小于 b」——
而真正的比较式 `a + b < c > d` 里 `<` 前面是 `b`（一个名字）⇒ 这一支不成立。
**`<` / `>` 自己不列**（`a < <T>b` 不是合法写法，列进去只会给比较链开口子）。

**「宿主这一格还剩什么」要按实义单元算，不能按最后一格算**（第 890 轮）：
往回跳过软换行、注释，以及**只装着注释的 `Statement`**——与 `IsTypePosition`（第 144 轮）
和名字闸（第 845 轮）**同一句话**。语句开头那一条 `//` 注释在产物里是一层独立的
`Statement`，那时 `<` 的宿主（`Root`）`Data` 里只有它 ⇒ 位置闸答否、名字闸也答否
⇒ `<T>x` 退回裸符号（实测：去掉注释就成形，留着就不成形）。

```ts
  // **宿主还是空的**（语句 / 实参的开头）：按定义还没有操作数。
  if (unit.Data.length === 0) {
    return true;
  }
  // **往回跳过「纯排版」的那几格**（第 890 轮）：软换行、注释，以及**只装着注释的 `Statement`**
  // ——与 `IsTypePosition` 第 144 轮那条例外**同一句话**（`// xl:note …` 那类行在本工程里
  // 是一层 `Statement` 包着一个注释单元）。
  //
  // **少了这一档会怎样**：`// c1` 换行 `<T>x > y` 里那个 `<` 的宿主是 `Root`、
  // `Data` 只有那个**注释壳**（插桩实测 `host=Root data=[Statement]`）
  // ⇒ `last` 是 `Statement` ⇒ 名字闸（`hasName`）与位置闸**双双答否**
  // ⇒ `<…>` 退回裸符号。反过来说：**语句开头那一条注释，把整个尖括号断言挡在门外**
  //（实测 `gap-angle-assertion-then-compare`：去掉头两行注释，`<T>` 立刻成形）。
  let lastAt = unit.Data.length - 1;
  while (lastAt >= 0) {
    const item = unit.Data[lastAt];
    if (item instanceof LineWrap || IsTriviaUnit(item)) {
      lastAt = lastAt - 1;
      continue;
    }
    if (item.constructor.name === "Statement" && item.Data.every((one) => IsTriviaUnit(one))) {
      lastAt = lastAt - 1;
      continue;
    }
    // **别的语句是「边界」，不是操作数**：`<T>x;` 换行 `<T[]>xs;` 里第二个 `<` 回扫
    // 只看得见**前一条语句**那个壳（它后面只剩软换行）⇒ 这个 `<` 就在新语句的开头。
    // 与 `IsTypePosition` 把语句壳当边界、`IsOperandStartUnit` 只问「这一层里前面有没有操作数」
    // 是同一口径。
    if (item.constructor.name === "Statement") {
      return true;
    }
    break;
  }
  // **一整段都是排版** ⇒ 与空宿主同一档：`<` 前面按定义还没有操作数。
  if (lastAt < 0) {
    return true;
  }
  const last = Get(unit.Data, lastAt);
  if (last instanceof SymbolToken) {
    // **赋值 / 声明那几档**（原来就有的）——
    // `let x = <T>…`、`type X = <T>() => T`、`f(a, <T>b)`。
    if (last.Is("=") || last.Is("=>") || last.Is(":") || last.Is(";") || last.Is(",")) {
      return true;
    }
    // **运算符那一档**（第 379 轮）：`a + <T>b`、`a ? <T>b : c`、`!<T>x`。
    // 只列**会带一个右操作数**的那些——`<` / `>` / `)` / `]` / `}` 都不列。
    const symbolText = last.TempToString();
    if (
      symbolText === "+" || symbolText === "-" || symbolText === "*" || symbolText === "/"
      || symbolText === "%" || symbolText === "**"
      || symbolText === "<<" || symbolText === ">>" || symbolText === ">>>"
      || symbolText === "&" || symbolText === "|" || symbolText === "^"
      || symbolText === "&&" || symbolText === "||" || symbolText === "??"
      || symbolText === "==" || symbolText === "!=" || symbolText === "===" || symbolText === "!=="
      || symbolText === "<=" || symbolText === ">="
      || symbolText === "~" || symbolText === "!" || symbolText === "?"
    ) {
      return true;
    }
  }
  // **括号 / 软换行**（原来就有的）：`(<T>x)`、折行之后的 `<T>x`。
  if (last instanceof Bracket || last instanceof LineWrap) {
    return true;
  }
  // **关键词那一档**：`typeof` / `void` / `delete` / `await` / `in` / `instanceof` /
  // `return` / `case` / `do` / `else` 之后都是一个操作数。
  if (last instanceof Keyword) {
    const word = last.Value;
    return word === "typeof" || word === "void" || word === "delete" || word === "await"
      || word === "in" || word === "instanceof" || word === "return" || word === "case"
      || word === "do" || word === "else" || word === "new";
  }
  return false;
```

## private method IsInstanceOfTypeArgument:(unit:Token, source:Source | null, from:int)=>bool

`instanceof` **右边**那一格的那个 `<`，判它是不是类型实参段（第 894 轮）。

判据与 `IsAllowedFollower` 的表达式位**同一句话**（TS 那句
`canFollowTypeArgumentsInExpression`）：配对 `>` 后面紧跟的字符若是
**`<` / `>` / `+` / `-`**，这次试读**必须判否**——TS 把这一档写成
「这几个 token 出现在这里，类型实参列表讲不通」，于是**回退成比较式**：

| 源码 | TS 读成 | 本仓（少了这一条时） |
| --- | --- | --- |
| `b instanceof C<D>;` | `b instanceof ExpressionWithTypeArguments(C<D>)` | 同左 ✓ |
| `b instanceof C<D> + e;` | `((b instanceof C) < D) > (+e)` | `(b instanceof C<D>) + e` ✗ |
| `b instanceof C<D> - e;` | 同上（`-` 也是前缀） | 同左 ✗ |

**为什么这一条不能省**：`instanceof` 与 `+` / `-` / `<` / `>` 同属二元运算符那一族，
`b instanceof C < D > +e` 里**每一格都是合法的比较**——把 `<…>` 认成类型实参段
就是在**静默错值**（实测：漂 2 / 多 2）。

**它为什么不与 `c < D > (e)` 冲突**：那一格的后继是 `(`（`canFollowTypeArgumentsInExpression`
的第一档直接答真），所以 `const a = b < c > (d);` 照 TS 读成**泛型调用**，一个字没动
（实测 12 条片段里那一条通过）。

`IsAllowedFollower` 已经会在「后继是字母 / 数字 / 引号」时判否，这里**只补它漏掉的那四格**：
`.` / `[` / `?.` / `!` 这些**后缀**在 TS 那边确实能接（`a instanceof b<C>.d` 是语法错，
但 `a + b<C>.d` 里 TS 也走回退——`canFollowTypeArgumentsInExpression` 的兜底那一句
`isBinaryOperator2()` 与 `.` 无关，`.` 走的是 `!isStartOfExpression()` ⇒ 答真）。
这里不自己重新发明一张表：**只问那四个字符**，其余交给 `IsAllowedFollower`。

**⚠️ 为什么这一支**不能**把 `source` 交给 `IsAllowedFollower`**（第 895 轮量清）：
上一轮把它记成「带上 `source` 会当场 `throw by line 0`」，这一轮把那一趟的真实数据流量出来了
（`tmp/r896/patch.mjs` 插桩 + `probe8`）：那**不是**坐标问题，是**递归**——

    IsAllowedFollower → IsTypePosition(source) → instanceof 那一支
      → IsInstanceOfTypeArgument → IsAllowedFollower → IsTypePosition(source) → …

插桩栈把这一圈印得清清楚楚（`IsAllowedFollower` 与 `IsTypePosition` 交替出现）。
所以第 894 轮「补第 4 个实参」的设想**根本不成立**：那一格的答案必须在
`IsTypePosition` 这一趟里**就地**给出，不能再回去问后继闸。

就地判据用的是**同一句话的窄版**：那四格（`<` / `>` / `+` / `-`）本来就是
`IsAllowedFollower` 表达式位里**接不上表达式**的那一档，所以「是这四格 ⇒ 判否」
在 `instanceof` 这个位置上与「把整条后继闸问一遍」**同结论**，而不会绕回来。

```ts
// **没有 `Source` 时这一支不参与**（第 4 个形参默认 null）：
// `IsTypePosition` 还有三处调用没有 `source`（`type-literal.xl.md` 两处、三元那一处），
// 那些位置本来就走不到 `instanceof` 这一格，保守答否，行为与加这一支之前一字不差。
if (source === null) {
  return false;
}
const closeIndex = this.ScanArguments(unit, source);
if (closeIndex === -1) {
  return false;
}
// **文档要从传进来的 `Source` 上取**（`ScanArguments` 用的就是它）：
// `IsTypePosition` 的其余分支都不需要 `source`，所以这一格是**新加的第 4 个形参**
// 一路带下来的（宿主自己身上没有文档——`Template.Document` 不存在，插桩实测）。
const document = source.Document;
let at = closeIndex + 1;
while (at < document.GetCount() && (document.GetValue(at) === " " || document.GetValue(at) === "\t")) {
  at = at + 1;
}
if (at >= document.GetCount()) {
  return true;
}
// **就地判据**：那四格之外一律放行（`;` / `)` / `,` / 行尾 / 标识符… 在 `instanceof`
// 右边都只能读成实例化表达式）。**不把 `source` 交给 `IsAllowedFollower`**——见上面那段递归账。
const next = document.GetValue(at);
return next !== "<" && next !== ">" && next !== "+" && next !== "-";
```

## private method IsAllowedFollower:(unit:Token, source:Source, closeIndex:int)=>bool

配对 `>` 之后跟着什么，决定这次试读算不算数。

类型位给的是「名字或类型收尾」这一档：标识符字符、`) ] } [ , ; > < . = ( : { ? | &`、行尾或文件尾。表达式位原来只给 `(`——TypeScript 的泛型调用形状（`f<Int64>(x)`）：在表达式里，`<…>` 后面不接 `(` 的写法一律按比较运算符读，这样 `f(a<b, c>d)`、`a<b>c` 都会退回 `SymbolToken`。

**表达式位还要放行「后面那一格接不上表达式」的那几个字符**（第 850 轮起，第 888 轮补齐）：`;`、`)`、`,`、`??`，
第 888 轮又加了 `]`、`?`、`:`、`||`、`&&`。
它们出现时 `<…>` **只可能是泛型实例化表达式**（TS 4.7 的 instantiation expression `f<string>`，
TS 那边是 `ExpressionWithTypeArguments`），不可能是比较式：`a < b` 的右边还得要一个操作数，
而 `;` / `)` / `,` 都接不上，`??` 左边要的是一个**完整的**操作数（`a < b ?? c` 在 TS 里也是语法错）。
少了这一格，`const a = f<string>;` 那种写法里 `<…>` 退回裸符号，
投影就只能把它读成 `BinaryOperator(f < string)`（实测四条用例：`expr-generic-instantiation` /
`expr-generic-inst-let` / `expr-generic-inst-statement` / `gap-d-generics-tuple-mapped-01`）。

判据仍然只问「**紧跟配对的 `>` 的那一个字符**」：`a < b > c` 后面是 `c`，不在这一档里，照旧读成比较式
（`f(a<b, c>d)` 同理——`>` 后面是 `d`）。

**`|` 与 `&` 必须单独列出来**（实测补的）：**嵌套泛型的实参后面跟联合 / 交叉**是极常见的写法，
`T extends Array<X> | Y`、`Record<string, X> | undefined` 都是它。
白名单里没有这两个符号时，那次试读被判否，整个 `<…>` 退回 `SymbolToken`——
于是**类型参数段认不出来、整条声明跟着塌掉**：

实测 `node_modules/typescript/lib/typescript.d.ts` 的
`function visitNodes<TIn extends Node, TInArray extends NodeArray<TIn> | undefined, TOut extends Node>(…)`
两个重载**一个都产不出**（全语料 `Function` 真缺 2 处全部来自它）。

（注意这与「`|` 在 `ScanArguments` 的字母表里」是**两件事**：字母表决定「扫得进去」，
后继闸决定「这次试读算不算数」。两边都得认 `|` / `&`。）

**`[` 也必须单独列出来**（同一次实测补的）：数组类型后缀 `X<A, D>[]` / `Map<string, number>[]` 里，
配对 `>` 后面紧跟的就是 `[`。白名单里只有 `)` 与 `]` 而没有 `[` 时，这次试读被判否，
泛型只吃到 `X<A` 就闭合——于是**整条成员声明认不出来**：
`interface I { m(): X<A, D>[] }` 的产物是 `<Statement><Method name="m"></Method>…`，
连 `MethodDeclaration` 都没有（`@types/node/sqlite.d.ts` 与
`lib.es2019.array.d.ts` 的 `flatMap<…>(…): …[]` 就是这一形状）。

**只看同一行，可「行尾」自己是一档**（第 890 轮订正）：跳过空格与制表符之后，遇到换行 / `\r` /
文件尾 / 注释开头（`//`、`/*`）就算这一行到此为止。**这一档的答案现在是「放行」**——
TS 那句 `canFollowTypeArgumentsInExpression` 的第一句就是 `hasPrecedingLineBreak()`：
后继那一格只要前面带着一个换行，`<…>` 就是类型实参段 / 实例化表达式。

**为什么「不跨行看」与「行尾放行」不矛盾**：不跨行看的是**下一个非空字符是什么**
（越过换行看到的多半是下一条语句的开头，拿它当后继字符只会误判——
`type Pair = Array<Int64>` 后面跟一句注释或 `let`，泛型必须照样成立）；
而「行尾放行」根本**不去看**那个字符。前者是类型位的判据，后者是表达式位的判据，
两句话问的不是同一件事。

**表达式位原来在这一档答「否」**（返回 `isTypePosition`，而表达式位是假）
⇒ `const f = a<b>` 换行 `const g = a.b.c<string>` 整条读成比较式
（实测 `gap-instantiation-line-end`：TS 两边都是 `ExpressionWithTypeArguments`，
第一句到 `>` 就收、`c;` 是**另一条**语句）。这一改**只动表达式位**——
类型位原来就在这一档返回真，行为一字不差。

数字刻意不在类型位的白名单里：`foo(bar) > 3` 这种被误当成泛型的收尾，最后会被这一条挡掉。

```ts
const document = source.Document;
let index = closeIndex + 1;
// **这一格不把 `source` 带下去**（第 894 轮（三）写下、第 895 轮量清了为什么）：
// 带上它会与 `instanceof` 那一支**成环**——
// `IsAllowedFollower → IsTypePosition(source) → IsInstanceOfTypeArgument → IsAllowedFollower → …`，
// 栈溢出的样子在第 894 轮被读成了「`throw by line 0`」。
// 所以 `instanceof` 那一格改成**就地判据**（见 `IsInstanceOfTypeArgument` 那一节），
// 这里继续只传 `unit`：那一支现在不需要后继闸，也不需要 `source`。
const isTypePosition = this.IsTypePosition(unit);
while (index < document.GetCount()) {
  const item = document.GetValue(index);
  if (item === " " || item === "\t") {
    index++;
    continue;
  }
  // **块注释要跨过去**（第 845 轮）：`m<T>/* c */(x: T): T { … }` 里配对 `>` 后面紧跟的
  // 就是那条注释，而注释只是 trivia —— TS 那边的后继字符是那个 `(`。
  // 原来「遇到注释开头就算这一行到此为止」直接返回「是不是类型位」，而成员体里的 `<T>`
  // **不是**类型位 ⇒ 这次试读被判否 ⇒ `<…>` 退回裸符号 ⇒ 整条方法声明散架
  //（实测 `mut-cls-generic-method-arrow-field-61`）。跨过去之后判据与原来一字不差
  //（`>` 后面本来就没有注释时，走的就是原来那条路）。
  // **注释里带换行**照样算这一行到此为止；没闭合的块注释也当到此为止。
  if (item === "/" && index + 1 < document.GetCount() && document.GetValue(index + 1) === "*") {
    let scan = index + 2;
    let closed = -1;
    while (scan + 1 < document.GetCount()) {
      const char = document.GetValue(scan);
      if (char === "\n" || char === "\r") {
        // **注释里带着换行** ⇒ 后继那一格前面就有一个换行 ⇒ 与行尾同一档（第 890 轮）。
        return true;
      }
      if (char === "*" && document.GetValue(scan + 1) === "/") {
        closed = scan + 2;
        break;
      }
      scan = scan + 1;
    }
    if (closed < 0) {
      // **没闭合的块注释 = 走到文件尾**：后继那一格是 EOF，TS 那边
      // `canFollowTypeArgumentsInExpression` 的最后一句 `!isStartOfExpression()` 放行。
      return true;
    }
    index = closed;
    continue;
  }
  break;
}
if (index >= document.GetCount()) {
  return true;
}
const item = document.GetValue(index);
if (item === "\n" || item === "\r") {
  // **行尾本身就是放行条件**（第 890 轮）：TS 那句
  // `return scanner2.hasPrecedingLineBreak() || isBinaryOperator2() || !isStartOfExpression();`
  // 里，`hasPrecedingLineBreak()` 是**第一句**——配对 `>` 后面那一格只要换了行，
  // `<…>` 就是类型实参段（TS 4.7 的实例化表达式），与它后面接什么无关。
  //
  // **少了这一格会怎样**：`const f = a<b>` 换行 `const g = a.b.c<string>` 整条读成比较式
  // ⇒ 两条语句都塌（实测 `gap-instantiation-line-end`：TS 第一句到 `>` 就收、`c;` 是另一条语句）。
  // 类型位那一支原来就返回 `isTypePosition`（真），所以这一改**只动表达式位**。
  return true;
}
if (item === "/" && index + 1 < document.GetCount() && (document.GetValue(index + 1) === "/" || document.GetValue(index + 1) === "*")) {
  // **注释开头同样算「这一行到此为止」**：`//` 一定吃到行尾、`/*` 没闭合也吃到文件尾
  // ⇒ 后继那一格**必然**带着一个换行 ⇒ 上面那句放行条件成立。
  return true;
}
if (!isTypePosition) {
  // **表达式位里那个「只许 `(`」的例外：尖括号断言**（第 379 轮）。
  //
  // 那个「只许 `(`」的口径是给**比较式**用的（`a < b > (c)` 里 `<…>` 后面必须紧跟 `(`，
  // 这是 TS 在表达式位唯一敢认的泛型形状）。
  // 可**操作数位置上**的 `<` 是另一回事：它前面**没有左操作数**
  // ⇒ 只可能是**尖括号断言** `<T>x`（TS 自己就是这么读的，
  // `print-ast-common.xl.md` 第 1833 / 1855 行那两条投影规则等的正是它）。
  //
  // **少了这一条例外会怎样**：`a + <number>b` 里那个 `<` 走不进泛型这一支
  //（名字闸先把它挡了，见下面 `IsOperandStartUnit` 那一段），
  // 于是它退回**比较运算符**、`number` 变成一个**值** ⇒ 降级层报
  // `name is not a local or a capture: number`（判据 `c371-ex-type-assertions-in-operands`）。
  //
  // **`<` 前面有左操作数时这一条不成立**（`IsOperandStartUnit` 为假）——
  // 所以 `a < b > c` 那种比较式一位都没动。
  // **`;` / `)` / `,` / `??` 是第 850 轮补的那一档**（泛型实例化表达式 `f<string>;`）：
  // 那四个字符后面接不上表达式，`<…>` 只可能是实例化表达式。判据见上面那一节。
  // **第 888 轮又补了五个**（`]` / `?` / `:` / `||` / `&&`）：同一条判据——
  // 它们都**接不上一个操作数**，所以 `a<b>` 只可能是类型实参段：
  // `[a<b>]`（数组字面量 / 下标）、`a<b> ? x : y` 与 `x ? a<b> : c`（三元的两侧）、
  // `a<b> || c` / `a<b> && c`（逻辑两侧）。
  // 实测（`tmp/r887/snips4.mjs`，17 条逐字符片段）修前 8 条对不上、修后 0 条——
  // 其中 `]` `?` `:` `||` `&&` 五格是这一档，另两格（`x < y >= z` / `x < y == z`，
  // 比较链的结合性）与这一档无关，另案。
  // **`=` 不放行**（虽然 TS 认 `a<b> = c`）：`=` 紧跟配对 `>` 时那两格是 **`>=`**
  //（`a < b >= c` 是合法的比较），而这里判据是**跳出空白之后的那一个字符**，
  // 拿不到「紧不紧邻」这条信息 ⇒ 放行它会当场把 `>=` 读错。要收它得先改判据的形状。
  // **反引号是第 977 轮普查补的**（`const a = f<T>`t`;` 那一族）：「标签模板」与
  // 「泛型调用」在 TS 的 `canFollowTypeArgumentsInExpression` 里是**同一条**——
  // 那一格后面紧跟反引号时，`<…>` 只可能是实例化表达式（比较式的右边接不上模板标记那一段）。
  // 拿真 TS 复量过（`tmp/r977-ts.mjs`）：`f < T > `t`` / `f<T>`t`` / `f < T > (1)`
  // 三种排版 TS 都读成一条 `TaggedTemplateExpression` / `CallExpression` 带 `TypeReference`
  //（而 `x < y > z` 才是二元）。少了这一格，`inst-tagged` 那一个底样的**每个位置 ×
  // 三种 trivia 共 39 条**片段全部对不上（症状：`f<T>` 被折成 `BinaryExpression`）。
  const nextChar = index + 1 < document.GetCount() ? document.GetValue(index + 1) : "";
  if (
    item === "(" ||
    item === "`" ||
    item === ";" ||
    item === ")" ||
    item === "," ||
    item === "]" ||
    item === "?" ||
    item === ":" ||
    (item === "|" && nextChar === "|") ||
    (item === "&" && nextChar === "&")
  ) {
    return true;
  }
  if (this.IsOperandStartUnit(unit)) {
    // **`last` 是一个已关闭的括号时，左边其实有操作数**（第 589 轮实测）：
    // `IsOperandStartUnit` 那一支（`last instanceof Bracket ⇒ true`）本意是给
    // 「`(<T>x)`」与「折行之后的 `<T>x`」用的，可它把**元素访问**也算进去了——
    // `digits[d] < 48` 的 `<` 因此被当成操作数位上的断言 ⇒ 放行数字之后整条比较式
    // 退化成断言（实测 `dist/ts/typescript-exec/builtins/array.ts` 缺 11）。
    // 所以这里再问一句：`last` 是**已经关上的**括号 ⇒ 按「有左操作数」处理。
    const last = unit.Last();
    if (last instanceof Bracket && last.Closed) {
      return false;
    }
    // **操作数位上的 `<T>` 后面跟什么都是被断言的那个操作数**（第 589 轮）：
    // `<T>x` / `<T>{ … }` / `<T>[ … ]` / `<T>( … )` / `<T>1` / `<T>"s"` 都是断言——
    // 前面**没有左操作数** ⇒ 后面那一格只可能是操作数，不可能是比较式的右边。
    //
    // **原来只放行「字母」**：`<{ n: number }>{ n: 1 }` 的 `<` 于是退回比较运算符
    // ⇒ 那个 `{` 按值位收成 `ObjectLiteral` ⇒ 投影出来的断言**类型**是一个
    // `ObjectLiteralExpression`（TS 那边是 `TypeLiteral` + `PropertySignature`）。
    return (
      unit.Template.SymbolTemplate.IsLetter(item) ||
      item === "_" ||
      (item >= "0" && item <= "9") ||
      item === "{" ||
      item === "[" ||
      item === '"' ||
      item === "'" ||
      item === "`"
    );
  }
  return false;
}
if (unit.Template.SymbolTemplate.IsLetter(item) || item === "_") {
  return true;
}
// **反引号那一格是给 `new f<T>`t`` 的**（第 980 轮）：`new` 在 `IsTypePosition` 的类型词表里
// （为了构造签名 `new (a: number) => A` / `new <T>() => T`），于是**表达式位**的 `new f<T>`
// 被这一趟回扫判成了**类型位**——而上面那张表（名字与类型收尾）放不下反引号 ⇒ 这次试读判否
// ⇒ `<…>` 退回裸符号、`f<T>` 不成形、整条标签模板塌（实测 `new f<T>`t``：
// 产物是 `BinaryExpression(BinaryExpression(New(f), <, T), >, `t`)`，TS 那边是
// `NewExpression > TaggedTemplateExpression`）。
//
// **为什么放行它不会把类型读法改坏**：在**类型位**里反引号本来接不上任何东西——
// `type X = F<T>`t`` / `let v: F<T>`t`` 都不是 TypeScript 的合法类型，
// 而能走到这一格的合法形状（`new f<T>`t`` / `x as F<T>`t`` / `x satisfies F<T>`t``）
// 在 TS 里都是**标签模板**：`<…>` 本来就是那条表达式的类型实参段。
// 与表达式位第 977 轮补的那一格（`IsAllowedFollower` 表达式位收下反引号）是**同一句话**，
// 只是这里落在类型位那条分支上——两张表各缺一格。
switch (item) {
  case ")":
  case "]":
  case "[":
  case "}":
  case ",":
  case ";":
  case ">":
  case "<":
  case ".":
  case "=":
  case "(":
  case ":":
  case "{":
  case "?":
  case "|":
  case "&":
  case "`":
    return true;
  default:
    return false;
}
```

# class GenericType extends UnitToken

泛型实参段。

`UnitToken` 的调度把「先问退出条件、再跑跳转队列」固定下来，这正是它要的：**`ExitOrPre` 抢在 `SymbolToken` 前面**处理配对的 `>`，`>=` 因此没有机会被拼出来（`Array<Int64>=x` 里那个 `>` 仍然是收尾，后面的 `=` 才轮到 `SymbolToken`）。

它覆写了 `ToXmlString`，形状对齐 `Bracket`：尖括号本身做属性（`startBracket` / `endBracket`），子单元照常串在标签里。属性值必须过一遍 `CommonUtil.XmlDecode`——`<` 直接写进属性会破坏 XML，而 `Bracket` 的 `(` / `)` 没有这个问题，所以那边没有这一步。

## method WrapperField:()=>string | null | undefined

**投成目标语言形状时，我这一层是不是「包装」**：是的话答「内容提到哪个字段」，不是的话答 `undefined`（见 `core/syntax/token.xl.md` 那一节——`null` 与 `undefined` 是两件事）。

**只有装 `TypeParameter` 时它才是包装**（`<T, U>` 的括号段，要提到 `typeParameters`）；
装类型实参时（`Array<T>`）它是**真的节点**，得投成 `TypeReference`。
不作这个区分就会把类型实参整个提掉——那种错误在尺子上表现为「凭空少一片节点」。
判据取**自己的子单元**（这一层切出来的时候它就在手上），不回原文扫也不问上下文。

```ts
return this.Data.some((x) => x.constructor.name === "TypeParameter") ? "typeParameters" : undefined;
```

## static readonly field JumpIn:GenericTypeBranch = new GenericTypeBranch()

把 `GenericTypeBranch` 注册进通用跳转队列用的实例（`../parse-pipeline.xl.md` 里插在 `Bracket.JumpIn` 之后、`SymbolToken.AppendIn` 之前）。

## constructor:(template:Template)=>void

取本类型的跳转队列与规则队列。

跳转队列取默认值就是**通用跳转队列**：泛型实参表里要能长出 `Identifier` / `SymbolToken` / 嵌套 `GenericType`，靠的正是它。

规则队列取默认值（通用规则队列）——与 `Bracket.Use("(")` 那一支同款：
泛型实参段里能出现**各种类型形状**（类型字面量 `Array<{ a: 1 }>`、元组、嵌套泛型），
通用队列里那几条类型规则都要在；好处还有表内的软换行会被正常摘掉
（注释则不再被摘掉，见 `../parse-pipeline.xl.md` 的 `GeneralCloseRule`）。

**「泛型内部不会长出语句节点」这一句原来是错的**（第 583 轮实测订正）：
跳转队列取的是**通用跳转队列**，而 `StatementBranch.JumpIn` 第 499 轮起**就在那条队列里**
（`../parse-pipeline.xl.md` 第 167 行，为的是让语句壳抢在 `LineWrap.AppendIn` 之前）
⇒ 泛型实参段里的软换行**照样会收壳** ——
`interface Folded<` 换行 `T extends B,` 换行 `U extends C` 换行 `>` 那一折被收成一个 `Statement`，
壳里那条逗号运算符规则再把 `B , U` 折成 `BinaryOperator op=","` ⇒
`TypeParameterCloseRule` 按**顶层逗号**切时一个都找不到 ⇒ 两个形参被包成**一个** `TypeParameter`。
真正的护栏现在写在 `../tokens/statement.xl.md` 里（`FormFrom` 与 `StatementBranch.Condition`
各一句「`owner === "GenericType"` ⇒ 不收壳」，与成员列表 / `[` `(` 括号 / `IfCondition`
三条早退同一处、同一口径），不在这一层。

**两条表达式规则要单独挡在泛型实参段外面**（就地拒，而不是换队列）：
`LetCloseRule`（`<const T>` 的 `const T` 会被当成变量声明）与
`TernaryOperatorCloseRule`（`Wrap<T extends U ? A : B>` 的 `? :` 是**条件类型**，不是三元表达式）。
换队列的做法试过、退回来了：通用队列里同时带着类型字面量等**类型**规则，
一刀切掉会伤到 `Array<{ a: 1 }>` / `<T extends X = {}>` 这些完全正常的写法。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field startBracket:string = "<"

起始括号字符。与 `Bracket` 同形，只为产物形状服务。

## field endBracket:string = ">"

结束括号字符。`ExitOrPre` 就是拿它配对的。

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底处理。

与 `Bracket` 一样是**空的**：泛型实参表里的空白由调用方忽略，其余字符都能在通用跳转队列里找到接手的人。不写方法体，打印器产出空方法。

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到配对的 `>` 就退出：签出、关闭并跑重组、从父单元卸载，返回 `Done`；否则返回 `Undo`，让这个字符继续走跳转队列。

顺序与 `Bracket.ExitOrPre` 一致（`SignOut` → `TryToClose` → `Quit`）。

嵌套泛型（`Array<Array<Int64>>`）不需要 `Depth` 字段：内层的 `<` 会由同一个分支在**内层宿主**上再挂一个 `GenericType`，`UnitToken.Process` 先转给挂载单元，所以内层的 `>` 由内层收，收完 `Quit` 把宿主的 `MountedUnit` 清空，外层的 `>` 才轮到外层。

```ts
if (source.Value === this.endBracket) {
  const previous = source.Pre();
  const isArrow =
    previous !== null && (previous.Value === "=" || previous.Value === "-");
  if (isArrow === false) {
    this.SignOut(source);
    this.TryToClose();
    this.Quit();
    return BranchStates.Done;
  }
}
return BranchStates.Undo;
```

**`=>` / `->` 里的 `>` 不是收尾**（这一条与 `ScanArguments` 里那两处是对称的，
三处少一处都不行）：`interface X<T extends (a: any) => any> { … }` 里
那个 `>` 属于箭头，`ExitOrPre` 一退出，`GenericType` 就停在 `=` 后面，
`any>` 掉到外面、**整条声明跟着塌**。
`ScanArguments` 那边（内容闸）早已经把 `=>` 吞掉了，但 `ExitOrPre` 是**另一条路**——
字符级配对时它先跑（`UnitToken.Process` 的「先问退出条件」），
所以两处必须都认这个形状。

## method ToXmlString:()=>string

产出 XML：标签名是运行时类型名，开标签上带转义过的尖括号属性，内容是子单元的 XML 串接。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} range="${this.RangeOf()}" startBracket="${CommonUtil.XmlDecode(this.startBracket)}" endBracket="${CommonUtil.XmlDecode(this.endBracket)}">${temp.join("")}</${name}>`;
```

## method Clone:()=>Token

克隆自身。

顺序与 `Bracket.Clone` 一致：`Sign` → 抄两个字段 → 整批加入克隆出来的子单元 → `TryToClose`。

```ts
const result = new GenericType(this.Template);
result.Sign(this);
result.startBracket = this.startBracket;
result.endBracket = this.endBracket;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
