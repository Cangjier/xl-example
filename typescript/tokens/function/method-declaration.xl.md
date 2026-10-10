# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../../core/syntax/close-rule.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifierSpans, DeclarationModifiers, DeclarationStart, HasDeclarationLineBreak, IsDeclarationModifier, IsDeclarationTailStop, ScanDeclarationBody, ScanDeclarationTailEnd, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextTrivia, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol, WordText, GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { BracketNameText } from "../field.xl.md"
import { ArrayLiteral } from "../json/array-literal.xl.md"
import { ObjectLiteral } from "../json/object-literal.xl.md"
import { ClassBody } from "../class/class-body.xl.md"
import { Identifier } from "../identifier.xl.md"
import { GenericType } from "../generic-type.xl.md"
import { InterfaceBody } from "../interface/interface-body.xl.md"
import { MethodBody } from "./method-body.xl.md"
import { TypeLiteralBody } from "../type-literal/type-literal-body.xl.md"
import { ReturnType } from "./return-type.xl.md"
import { SymbolToken } from "../symbol-token.xl.md"
import { Statement } from "../statement.xl.md"
import { ConstString } from "../string/const-string.xl.md"
import { String } from "../string/string.xl.md"
import { LineWrap } from "../line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

方法声明：把 `name(参数): 返回类型 { 方法体 }` 收成一个 `MethodDeclaration`。

「名字 + 括号」默认会收成 `Method`（**调用**）：`Method` 是 `<Method name="x">实参…</Method>`，
而方法声明要的 `<MethodDeclaration name="x">参数 + 方法体</MethodDeclaration>` 结构完全不同，两者必须分开。

**与 `Method` 的分工靠「括号后面跟不跟 `{`」**：

- 括号后面是 `{` → 声明（本文件接手）；
- 其余 → 调用（`MethodCloseRule` 接手）。

这也是本规则必须排在 `MethodCloseRule` **之前**的原因（见 `../parse-pipeline.xl.md`）：
`Method` 一旦先成形，名字与参数就都被它装走了，这里再也看不到「名字 + `(`」。

**没有方法体的成员签名也收**：`abstract f(): void;` / 接口里的 `m(): void` / 重载签名
`calls(exact?: number): () => void;` 都是**成员签名**，它们该有自己的节点。

原来这一条不收，理由是「括号后面是 `;`，与一条以 `;` 收尾的调用语句完全同形」。
那个理由只在**语句位置**成立：在类体 / 接口体里，直接成员不可能是调用语句——
`f(1);` 只能是某个字段初始化式的一部分，而那种情况下 `Field`（排在方法声明之后，但它的起点更靠左）
会先把整条 `x = f(1);` 收走，`f` 根本轮不到这里。

所以判据是**父单元**：只有 `ClassBody` / `InterfaceBody` 的直接成员才允许无体形状，
其余位置仍然要 `{` 才收——`foo(a);` 这类语句不会因此变成假的方法声明。

`MethodDeclarationCloseRule` 写在 `MethodDeclaration` **之前**。

# class MethodDeclarationCloseRule extends CloseRule

## static readonly field Instance:MethodDeclarationCloseRule = new MethodDeclarationCloseRule()

唯一的实例，注册进通用规则队列时用。

## static readonly field ValueOperators:Array<string> = ["=>", "===", "==", "!==", "!=", "<=", ">=", "<", ">", "&&", "||", "??", "?", ".", "!", "+", "-", "*", "/", "%", "**", "&", "|", "^", "<<", ">>", ">>>", "="]

**值位运算符表**：方法声明的形参表后面**只可能**接 `:` 返回类型、`{` 体、成员边界（`;` / `,`）
或列表末尾；接的是这张表里的**运算符**时，那不是声明，而是**一个表达式**（调用、点号链、
二元 / 比较 / 逻辑运算、三元、非空断言…）。

`=>` 是这一族的第一个（第 66 轮：`abstract new(...args: any) => any` 是类型位的构造签名）；
第 75 轮把其余的补齐——**对象字面量的属性值**位置上，`f(x)` 后面跟 `?` / `&&` / `<=`
之类的运算符时，`BodyIndex` 会一路扫到后面那个**对象字面量的 `{`**，把整个三元收成
「方法声明 + 返回类型 + 方法体」（实测 `{ name: e(z) ? { k: 1 } : g }` 只剩 1 个
`MethodDeclaration`、**0 个三元**；`@types/node` 与 `dist/ts` 里都成片出现）。

这张表是**黑名单**而不是白名单：只挡「绝不可能是声明」的运算符，别的一概照旧走
`BodyIndex` / `IsMemberSignature`——那两条路径上有成片的无体重载与访问器签名，
按白名单收窄会把它们一起判否（本文件里记着两次净回归的教训）。

## static readonly field ValueKeywordTexts:Array<string> = ["in", "instanceof", "as", "satisfies"]

**值位关键字**：与 `ValueOperators` 同一族——它们只能出现在**表达式**里，
不可能紧跟在方法声明的形参表后面。按文本认词要**走 `WordText`**：在这一刻
`in` 可能还是 `Identifier`（`KeywordCloseRule` 排在队列尾部，还没跑过它），
只认 `Keyword` 会漏（第 75 轮实测）。

实测（同一条根因）：`{ name: e(z) in o ? { k: 1 } : g }` 里 `e(z)` 会被收成
`MethodDeclaration`、三元整个消失；`f(x)[0] ? { … } : g` 那种**下标**同理
（下标是括号、不是运算符，所以另有一条 Bracket 判定）。

## static field PredicateShape:(units:Array<Token>, bracketIndex:int)=>bool = null as any

**类型谓词那一格的判据**，与 `MethodCloseRule.PredicateShape` 是**同一份实现**：
`TypePredicateCloseRule` 在构造时把同一个箭头函数装到两处（见
`tokens/type-predicate.xl.md`）。第 875 轮的规矩：同一个问题只能有一份实现，
所以这里**不另写**一份谓词判据，只转发。

`null` 表示「还没装上」——那一格照旧（与装上之前逐字节相同）。

**它在这一格只用来问「不要收它」，副作用要挡住**：那个箭头函数是
`TypePredicateCloseRule.Claim`——答真的同时**会把括号当场收成 `ParenthesizedType`**
（原地替换 `units` 里那一格）。`BodyIndex` 探的是**只读**问题（这一对 `(` 是谓词的类型、
不是本签名的形参表），所以调用它之前先把**括号本身**取在手上：答真之后
`units` 里那一格已经不是 `Bracket` 了，本趟就此收手（那一格的成形交给它自己的队列）。

## private method ParameterText:(unit:Token)=>string

取一个参数表括号（或类型参数段）在**源码里的原文**。

`SourceRange` 的 `Start` / `End` 是 `Source`，它们带 `Index`（字符下标）与 `Document`，
所以按位置切片就能拿到原文——`Source.Value` 只是**那一个字符**，不要用它。

```ts
const range = unit.SourceRange;
if (range.Start === null || range.End === null) {
  return "";
}
const document = range.Start.Document;
let text = "";
for (let i = range.Start.Index; i <= range.End.Index; i++) {
  text = text + document.GetValue(i);
}
return text;
```

## private method BodyIndex:(units:Array<Token>, index:int)=>int

取方法体括号的下标：`index` 是参数表括号，往后允许一段 `: 返回类型`，再往后必须是 `{` 括号。
形状不成立时返回 `-1`（那说明这是一条调用语句，不是一个方法声明）。

判定基本委托给 `ScanDeclarationBody`（见 `../declaration-common.xl.md`）：跨换行、类型字面量 `{`
（`m(): { a: number } { … }` 里第一个 `{` 是类型）、下一条语句的关键字，都由那一处统一处理。
`Function` 用的是同一个函数，两条声明规则不会走偏。

**但先夹一条自己的边界**（实测补的）：`ScanDeclarationBody` 会跨换行，
于是**类里的无体重载签名**会跨过换行找到**下一条签名的 `{`**——
`class A { f(a: string): void` 换行 `f(a: number): void` 换行 `f(a: any) {}` 换行 `}` 里，
第一条与第二条签名各自得到第三条的体，三条只出 1 个 `MethodDeclaration`。

判据是**参数表原文必须一致**：

> 往回走到**这一条签名自己的形参表**那一格时，它的原文必须与**当前签名的参数表**原文相同。

理由：`f(a: string): void` 与 `f(a: number): void` 的参数表原文不同，
所以第一条签名看到「往回撞上的是 `(a: any)`」就知道那个体不是自己的（返回 `-1`）；
而真正的实现体（同名同参）前面就是同一个参数表原文，照常成立。

**「自己的形参表」不是「紧邻体的那个括号」**（第 598 轮）：返回类型自己就带括号时
（函数类型 `m(): () => void { … }`、括号类型、构造签名 `m(): new (a: A) => B { … }`），
紧邻体的那个括号**是返回类型的一部分**，拿它跟形参表比原文一定不等 ⇒ `BodyIndex` 给 `-1`
⇒ 整条成员退化成一次调用加一个裸 `<TypeDefine>`（实测 `<Method name="m">` +
`<FunctionType>` 抢走了方法体、把它读成 `TypeLiteral`）⇒ 降级层报
`unimplemented: class member CallExpression`（判据 `c371-e2e-observer-with-priority`）。
所以往回走时**跳过「前面是类型续接符」的括号**（见 `IsTypeContinuationBefore`），
只在撞上形参表那种括号时才比原文。

**谓词类型那一格要单独认**（第 959 轮，缺口 `gap-r958-class-method-predicate-paren`）：
`class C { m(x: unknown): x is (string) { return true; } }` 里往回走撞上的第一对 `(` 就是
`(string)`，而它**前面是 `is`、不是一个类型续接符**（`IsTypeContinuationBefore` 给假）
⇒ 拿它跟「本签名自己的形参表」比原文（`(string)` vs `(x: unknown)`）**当轮就判否**？
不是——**看它在列表里的位置**：`m` 那一趟往回走时下标还停在 `m` 自己那个形参表上
（`(x: unknown)` 与它逐字相同）⇒ 中途 `break`、跳过 `is` 与 `(string)` 直接答真，
于是 `is` 那一趟被认成「名字 + `(` + 体」、整条 `m` 塌成一次调用。

判据因此是**「这一对括号是不是谓词里的类型」**：是的话它**不是形参表**，
照返回类型那一格的办法**接着往回找**，由真正的形参表来决定这一条声明有没有体。
这一格与 `IsTypeContinuationBefore` 必须**分成两支**：后者是「只读 `Is()` 的纯谓词」，
而谓词那一份判据（`TypePredicateCloseRule.Claim`）**答真的同时会收掉括号**，
所以要挡在这个位置——**先把括号取在手上再去问**（`Claim` 会就地替换 `units` 里那一格，
那之后 `item` 才是这一步真正要看的东西）。

**「跳过」而不是「收手」**要按两档分开量（第 959 轮实测定下来的）：

- `interface I { m(x: unknown): x is (string) }` 这种**无体**的签名：往回走撞上 `(string)`，
  跳过它再往回撞上 `(x: unknown)`——与当前形参表逐字相同 ⇒ 这就是本签名的形参表
  ⇒ 有体？`ScanDeclarationBody` 已经答了体在哪，所以这一支照样答真；
- `is` 自己那一趟（下标在 `is` 上、当前形参表是 `(string)`）：跳过之后撞上 `(x: unknown)`，
  与 `(string)` **不同** ⇒ `-1`——`is` 不是方法声明的名字。

两档的分别正是「真正的形参表在哪」，所以跳过之后那一句原文比较**一个字都不用改**。

**这一条不是第 958 轮撤回的那一版**：那一版把闸门下在 `Previous` 的入口（那是「这一格
整体是不是一条方法声明」），于是一次调用 `m(x: unknown)` 也在判据覆盖之内——实测
18 条普通方法声明一起判否（片段 2 → 20 条对不上）。这里问的是**往回走的那一对括号**，
只在「已经认定这一格有一个体」之后才轮到它。

```ts
const body = ScanDeclarationBody(units, index);
if (body < 0) {
  return -1;
}
const parameters = Get(units, index);
if (!(parameters instanceof Bracket)) {
  return body;
}
let before = body - 1;
while (before >= 0) {
  const item = Get(units, before);
  if (item instanceof Bracket) {
    if (item.startBracket !== "(") {
      break;
    }
    if (this.IsTypeContinuationBefore(units, before)) {
      // **返回类型里的括号**（函数类型 / 括号类型 / 构造签名的形参表）：它不是这一条
      // 签名的形参表，继续往回找——`m(): (a: A) => B { … }` 的两个 `(` 在这里分开。
      before = before - 1;
      continue;
    }
    let isPredicateType = false;
    if (MethodDeclarationCloseRule.PredicateShape !== null) {
      isPredicateType = MethodDeclarationCloseRule.PredicateShape(units, before);
    }
    if (isPredicateType) {
      // **谓词里的类型那一格**（`x is (string)`）：它**不是**本签名的形参表。
      // 判据是**转发的** `TypePredicateCloseRule.Claim`——它答真的同时已经把这一格
      // 收成 `ParenthesizedType` 换掉了（所以上面那句问话之前不能再用 `Get` 去看它）。
      // 与 `IsTypeContinuationBefore` 那一支同一个去处：接着往回找真正的形参表，
      // 由后面那句原文比较决定「这是本签名自己的形参表」还是「这是下一条签名」。
      before = before - 1;
      continue;
    }
    if (this.ParameterText(item) !== this.ParameterText(parameters)) {
      return -1;
    }
    break;
  }
  if (item instanceof SymbolToken && (item.Is(";") || item.Is("="))) {
    break;
  }
  before = before - 1;
}
return body;
```

**这一条试过三种写法，只有它没有净回归**：
- 「见过 `:` 后一跨换行就否决」→ 打掉接口里成片的多行重载与一行一条的 `get x(): number`
  （实测真缺 18 → 37 / 41，两次都是净回归）；
- 「换行后面是『一个词 + `(`』就算下一条签名」→ 把**带体的 getter**里的
  `return (this.Y as String)!` 误判成下一条签名（`return` 被当成方法名），
  于是 `NotNull` 真缺从 0 涨到 3；
- 原文比较只看**参数表**这一小段，既不依赖换行、也不依赖 `return` 这类词。

## private method IsTypeContinuationBefore:(units:Array<Token>, index:int)=>bool

`index` 处的单元前面那一个实义单元，是不是一个**类型还没写完**的续接符。

用来在 `BodyIndex` 里把「返回类型里的括号」与「形参表」分开：前者前面一定是
`: ` / `|` / `&` / `=>` / `(` / `,` / `<`（类型续接）或构造签名的 `new` / `abstract`，
后者前面一定是**成员名**。

```ts
const previous = SkipPreviousWrapSymbol(units, index);
const before = Get(units, previous);
if (before === null) {
  return false;
}
if (before instanceof SymbolToken) {
  return (
    before.Is(":") ||
    before.Is("?:") ||
    before.Is("|") ||
    before.Is("&") ||
    before.Is("(") ||
    before.Is(",") ||
    before.Is("<") ||
    before.Is("=>")
  );
}
return WordText(before) === "new" || WordText(before) === "abstract";
```

**这一格曾经是会并掉的**（第 674 轮复核时已经好了，`cases:tsast` 逐节点一致）：
形状是 `class A {` 换行 `  f(a: string): void` 换行 `  f(a: number): void` 换行
`  f(a: any) {}` 换行 `}` —— 那时第二条签名往前找体会跨过换行撞上**第三条的 `{`**，
于是三条只出 1 个 `MethodDeclaration`。

**下面这两个收窄版都试过，都是净回归，不要再试**：在「跨行且没见过 `{` 就判没有体」之外，
把接口里成片的多行重载（`lib.dom.d.ts` 的 `addEventListener<…>(…)`）、
`get x(): number` / `set x(v: number)` 这类一行一条的签名一起打掉了。
区分「体在下一行」与「下一条成员」不能靠往前看
（`m(): T` 换行 `{ }` 与 `m(): T` 换行 `m2(): T` 在扫描到那里时长得一样）。

## private method ParameterIndex:(units:Array<Token>, index:int)=>int

取参数表括号的下标：`index` 是方法名，名字后面允许夹一个**可选标记 `?`** 与一段类型参数段（`GenericType`），
再往后就是 `(` 括号。形状不对时返回 `-1`。

`?` 排在最前：TypeScript 的可选成员签名写作 `m?()` / `m?<T>()`，`?` 在类型参数之前。
没有这个 `?`，接口里的可选方法签名就永远匹配不上（`Get(units, i)` 拿到的是 `SymbolToken("?")` 而不是括号）。

**`*` 是生成器方法**（`class C { *g() {} }`）：它在**名字前面**，所以由 `Process` 在头部先吃掉、
而这里只需要知道「名字之后」的形状——`*` 不在名字之后，`ParameterIndex` 因此不用为它加分支。
（`Previous` 那一侧用 `GeneratorMark` 先把游标越过 `*`，见 `Previous` 的说明。）

`Previous` 与 `Process` 共用它。

**第 817 轮：名字与参数表之间跨注释**。原来三处都走 `SkipNextWrapSymbol`（只跳软换行），
于是 `m /* c */ (): void` 里名字后面紧邻的是注释 ⇒ `ParameterIndex` 给 `-1` ⇒
`Previous` 判否、方法声明整条不成形（实测 `class A { m /* c */ (): void {} }` 的 `MethodDeclaration`
与它的 `Block` 都缺、`()` 留在外面当未映射 `Bracket`；接口 / `abstract` 两条同族）。
三处一律改 `SkipNextTrivia`（注释与软换行同一条口径，与 `function-type.xl.md` 第 817 轮同一改法）。

```ts
let i = SkipNextTrivia(units, index);
const mark = Get(units, i);
if (mark instanceof SymbolToken && mark.Is("?")) {
  i = SkipNextTrivia(units, i);
}
if (Get(units, i) instanceof GenericType) {
  i = SkipNextTrivia(units, i);
}
const parameters = Get(units, i);
if (!(parameters instanceof Bracket) || parameters.startBracket !== "(") {
  return -1;
}
return i;
```

## private method GeneratorMark:(units:Array<Token>, index:int)=>Token | null

`index` 处如果是生成器方法的 `*`，返回它，否则返回 `null`。

`class C { *g() {} }` / `interface I { *g(): void }` 里的 `*` 在**名字前面**：
只认「名字 + `(`」的判定会在 `*` 处断掉，整条方法声明降级成
`<SymbolToken>*</SymbolToken>` 加一串散单元（实测生成器方法就是这么丢的）。

`*` 只认一次（`*` 与名字之间允许软换行）；拿到之后**要留在节点里**——
丢了就分不出生成器方法与普通方法。

```ts
const item = Get(units, index);
if (item instanceof SymbolToken && item.Is("*")) {
  return item;
}
return null;
```

## private method SignatureTailEnd:(units:Array<Token>, parametersIndex:int)=>int

成员签名的返回类型段末尾：与 `ScanDeclarationTailEnd` 的区别是**软换行就是成员边界**。

为什么不能直接用 `ScanDeclarationTailEnd`：它的四条终止条件里没有「换行」——那是为「返回类型可以折行」设计的。
但签名在没有 `;` 的写法里靠换行分隔成员：`interface I {` 换行 `m?(): void` 换行 `n?<T>(x: T): T` 换行 `}`。
用 `ScanDeclarationTailEnd` 会把 `n?<T>(x: T): T` 整条吞进 `m` 的返回类型里（实测产物里能看到 `m` 的
`ReturnType` 里跟着 `Identifier(n)`）。

折行仍然要支持（`m(): A |` 换行 `B`），所以判法与 `Field.MemberEnd` 同源：
换行前一个实义单元是 `;` / `,` 以外的**符号**时才继续扫，否则换行即边界。其余四条终止条件照样生效。

**返回的是最后一个实义单元，尾随的注释不算**（第 920 轮）：注释是 trivia，
TS 那边的节点区间从不含它（见代码里那一节）。

```ts
let tailEnd = -1;
let i = parametersIndex + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    break;
  }
  if (item instanceof LineWrap) {
    // **「换行前那一格」取最后一个实义单元**（第 827 轮）：`m(): //c` 换行 `void;` 里换行
    // 前面紧挨着的是那条 `LineAnnotation` —— 只跳软换行的话 `continues` 判成假
    // ⇒ 返回类型在注释那里收尾 ⇒ 那条注释成了**整个返回类型**，`void` 掉到外面成了
    // 下一条成员（实测 `gap-sweep-linecomment-iface-05`）。
    // 与第 819 / 820 轮那两处同一条口径：**判「上一行写完了没有」时要看代码，不看注释**。
    const previous = Get(units, SkipPreviousTrivia(units, i));
    const continues = previous instanceof SymbolToken && !previous.Is(";") && !previous.Is(",");
    // **条件类型的假分支可以另起一行**（第 100 轮）：
    // ```
    // ): MockedObject[MethodName] extends Function ? Mock<MockedObject[MethodName]>
    //     : never;
    // ```
    // 换行前那一格是 `Mock<…>`（不是符号），照上面那条判据就断在这里——于是 `: never`
    // 掉进成员表成了一条**平级语句**。投影侧的症状是三处：多出 `ExpressionStatement` 412、
    // 假分支里的类型字面量成员整片丢失（`PropertySignature` 缺 67）、
    // `MethodSignature` 与 `ConditionalType` 的区间都短一截（漂移）。
    //
    // 判据落在**原文那一格**上（`Source.Value`），不看它被收成了哪个单元：
    // 换行后紧跟 `:` / `|` / `&` 时它不是成员边界，而是这一条类型**没写完**。
    // （`|` / `&` 是折行的联合 / 交叉类型：`typescript.d.ts` 里
    // `…): NodeBuilderFlags |\n | SignatureDeclaration & {…}\n | undefined;` 这种排版整片都是。）
    const next = GetSkipNextWrapSymbol(units, i);
    const nextStart = next === null ? null : next.SourceRange.Start;
    const nextChar = nextStart === null || nextStart === undefined ? "" : nextStart.Value;
    const continuesNextLine = nextChar === ":" || nextChar === "|" || nextChar === "&";
    if (continues === false && !continuesNextLine) {
      break;
    }
    i = i + 1;
    continue;
  }
  if (IsDeclarationTailStop(units, i)) {
    break;
  }
  tailEnd = i;
  i = i + 1;
}
// **尾随 trivia 不属于返回类型**（第 920 轮）：上面那个循环走到一条注释时也会把它记成
// `tailEnd`——注释不是 `;` / `,`、不是软换行，`IsDeclarationTailStop` 也认不出它。
// 于是 `interface I { m(): void //c` 换行 `}` 里那条 `LineAnnotation` 被装进了 `ReturnType`、
// 成员区间也跟着多吃一格（实测 `gap-r919-linecomment-after-return-type`：
// `MethodDeclaration` `[27,40)` vs TS `[27,36)`；类体里的方法、类型字面量里的调用签名、
// 块注释三处同根）。
//
// 判据借 `SkipPreviousTrivia` 一步问完：**`tailEnd + 1` 往回跳 trivia 的落点就是最后一个实义单元**
// （`tailEnd` 本来就落在实义单元上时，这一步原地不动）。口径与 `../field.xl.md` 的 `MemberEnd`
// 同源——「边界落在换行上时返回最后一个**非注释**单元」，那一处记着同一条教训。
tailEnd = SkipPreviousTrivia(units, tailEnd + 1);
return tailEnd;
```

## private method IsMemberSignature:(units:Array<Token>, index:int, parametersIndex:int)=>bool

`index` 处的「名字 + 参数表」是不是一条**没有方法体的成员签名**。

两条都要成立：

1. `current.Parent` 是 `ClassBody` 或 `InterfaceBody`——只有成员位置上无体形状才没有歧义（见文件头的说明）；
2. 参数表之后只剩下「返回类型」，并且以一个 `;`、一个软换行或列表结尾收住。

第 2 条用 `ScanDeclarationTailEnd` 找到返回类型的末尾，再看它**紧接着的一个单元**：
`;` / 软换行 / 结尾之外都不算签名——例如 `x = f(1)` 里 `f` 后面跟的是 `)`（属于外面的括号），
`foo(a).bar()` 里跟的是 `.`，这些都必须留给别的规则。

**换行也是成员签名的边界**（实测补的）：判据是「参数表之后是不是一段 `: 返回类型`，
并且它**不越过换行**」。先在参数表之后看到 `:`，再用 `SignatureTailEnd` 取到返回类型末尾；
**返回类型末尾的下一个实义单元是 `;` / `,` / 软换行 / 列表末尾 → 这是成员签名，到此为止。**

不能先去找方法体的 `{`：`class A {` 换行 `f(a: string): void` 换行
`f(a: number): void` 换行 `f(a: any) {}` 换行 `}` 里，第二条签名去找 `{` 会一路扫过换行
**撞上第三条的 `{`**，于是被判成「带体的方法声明」，把第三条一起吞掉——
实测三条重载只剩 1 个 `MethodDeclaration`。
（`Process` 侧的 `SignatureTailEnd` 本来就是这个口径，两边必须一致；
「两条签名、没有实现体」能对，正是因为那时扫到尾也没有 `{`。）

**这里不能要求「参数表后面紧跟 `:`」**（试过、退回了）：`get length(): number` /
`set length(v: number)` 这类**无参**签名的参数表是空括号，紧跟其后的确实是 `:`，
但 `get x() { … }` 这种**带体**的访问器后面是 `{`——写成「必须见到 `:`」会把它们一起判否，
全语料「成员·方法类」真缺从 18 涨到 41（用例集是绿的，靠当时那把逐节点对账的尺子
才抓出来，它已经删了）。判据只能看**尾部之后是什么**。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const parent = current.Parent;
// **值位对象字面量那一档要窄认**（第 950 轮）：`{ new (a: number): I }` 在 TS 那边是一条
// `MethodDeclaration`（名字 `new` + 形参表 + 返回类型），可**整档放开 `ObjectLiteral` 会把
// 面铺得太大**——第 949 轮实测：对象字面量里任何 `name(...)` 形状都成了成员签名
//（`coverage 4192 → 4155`、`blocked 27 → 56`、e2e 六条挂 `unimplemented: expression MethodDeclaration`），
// 所以那一版撤回了。这一版只认**一条缝**，两条都要成立：
//
// 1. **形参表之后紧跟 `:`**（真的写了返回类型）——这一条挡住 `{ a: b(c) }` 这类实参形状
//    与 `{ f(x) }` 这种没写返回类型的写法（它们保持原来的产物）；
// 2. **这一格在成员位**——父单元里它前面那个实义单元是**开头**、`;` 或 `,`
//    （`{ a: b(c) }` 的 `b` 前面是属性冒号，`{ x = f(1) }` 的 `f` 前面是赋值号，都判否）。
//
// 类 / 接口 / 类型字面量那三档**不加这两条**：那里本来就是成员位置，判据没有歧义。
const inObjectLiteral = parent instanceof ObjectLiteral;
if (inObjectLiteral) {
  const afterParamsForObject = Get(units, SkipNextTrivia(units, parametersIndex));
  if (!(afterParamsForObject instanceof SymbolToken && afterParamsForObject.Is(":"))) {
    return false;
  }
  const atInParent = parent.Data.indexOf(current);
  const beforeAtInParent = SkipPreviousTrivia(parent.Data, atInParent);
  const beforeInParent = Get(parent.Data, beforeAtInParent);
  const atMemberStart = beforeAtInParent < 0 || (beforeInParent instanceof SymbolToken && (beforeInParent.Is(",") || beforeInParent.Is(";")));
  if (atMemberStart === false) {
    return false;
  }
}
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody) && !(parent instanceof TypeLiteralBody) && !inObjectLiteral) {
  return false;
}
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
// **这一眼要跨过尾随 trivia 去问**（第 920 轮）：`SignatureTailEnd` 现在会把尾随的注释退掉
// （见那一节），于是 `interface I { m(): void //c` 换行 `}` 里「返回类型之后的一格」由那条
// `LineWrap` 变成了那条 `LineAnnotation`——只看一格会判否、整条成员不成形。
// 跨过去问的仍然是同一句话「这一行写完了没有」，只是**途中见过换行就是答案**
//（`HasDeclarationLineBreak` 连「块注释原文里那个换行」一起算，与 TS 的 `hasPrecedingLineBreak` 同口径）。
const afterFrom = tailEnd >= 0 ? tailEnd : parametersIndex;
const afterAt = SkipNextTrivia(units, afterFrom);
if (afterAt >= units.length || HasDeclarationLineBreak(units, afterFrom, afterAt)) {
  return true;
}
const afterTail = Get(units, afterAt);
if (afterTail === null) {
  return true;
}
return afterTail instanceof SymbolToken && (afterTail.Is(";") || afterTail.Is(","));
```

## private method AfterAssignment:(template:Template, units:Array<Token>, nameIndex:int)=>bool

`nameIndex` 处的名字是不是落在一个**赋值号右边**——也就是「字段 / 变量的初始化式」而不是成员声明。

**为什么必须有这一条**：`IsMemberSignature` 只问「名字的父单元是不是成员体」，而字段初始化式里的名字
**也在**成员体里。于是 `class C { A = new C("x"); }` 里那个 `C("x")` 会被本规则认成一条
`name(...)` 形式的方法签名，**并且因为它排在 `NewCloseRule` 之前，构造器名被抢走之后
`new` 就再也凑不成 `New` 节点**（实测：类里 `A = new C("x")` 产出
`<SymbolToken>=</SymbolToken><Keyword>new</Keyword><MethodDeclaration name="C">…`，类外同样写法却是
`<New><NewType>C</NewType><NewArguments>x</NewArguments></New>`）。
这也解释了 `cls-static-field-new.ts` 那条用例当初为什么要加。

判据一条：**从名字往前扫，先撞上赋值号就是初始化式，先撞上边界就不是**。

- 遇到 `=`（或任一 `AssignmentSymbols` 里的赋值号）→ 命中（在赋值号右边）；
- 遇到 `;` / `,` → 判否：这是上一条成员的结束标记，赋值号在它之前，与当前名字无关；
- 遇到 `{` / `}` 括号 → 判否（同上，且 `(` / `[` 括号**不**算边界，见下）；
- 遇到软换行 → 判否：成员体里「一行一条成员」，换行即上一条成员的结束；
- 扫到列表开头 → 判否。

**为什么必须把 `;` / 换行当停点**：平铺列表里**上一个成员的单元还留着**。实测
`class C { A = 1; m() { … } }` 的列表是 `0:Identifier(A) 1:SymbolToken(=) 2:Identifier(1) 3:SymbolToken(;) 4:Identifier(m) …`。
从 `m` 往前扫会撞上下标 1 那个**属于上一个字段**的 `=`；只有在 `;`（或换行）上停下，
`m` 才会被留给方法声明规则。少了这一条，实测 `m` 会退化成 `<Method>` 加 `<ObjectLiteral>`
（`lex-private-field` / `lex-private-in` 两条用例当场报 `缺 MethodDeclaration,MethodBody`）。

**为什么 `(` / `[` 括号不能当停点**：`A: Record<string, number> = f(1)` 里，
类型标注的泛型实参就是一对括号，名字 `f` 与赋值号之间隔着它；把它们当边界会漏判。
而 `{` / `}` 一定要停：类型标注里也可能带 `}`，但那种情况下赋值号离得更近，
先撞上的仍是赋值号（`class C { A: { x: number } = f(1) }` 实测仍命中）。

**名字后面跟不跟 `{`**：不需要在这里判——方法体那一支由 `BodyIndex` 负责。

```ts
for (let i = nameIndex - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && template.SymbolTemplate.AssignmentSymbols.includes(item.TempToString())) {
    return true;
  }
  if (item instanceof Bracket && (item.startBracket === "{" || item.startBracket === "}")) {
    return false;
  }
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    return false;
  }
  if (item instanceof LineWrap) {
    return false;
  }
}
return false;
```

## private method MethodNameOf:(unit:Token)=>string

取方法名的文本：`Identifier` 直接取；**关键字名**（`{ return(): T { … } }` / `class A { new() {} }`）取 `Keyword.Value`；
**字符串字面量名字**（`"m"() { }`）取它第一个 `ConstString` 子单元的文本。

TypeScript 允许成员名写成字符串字面量（`class C { "m"() { } }`），
与 `Field` 那边的 `NameText` 是同一套处理——只认 `Identifier` 时这些成员整个丢掉。

```ts
if (unit instanceof Identifier) {
  return unit.TempToString();
}
if (unit.constructor.name === "Keyword") {
  return (unit as any).Value;
}
if (unit instanceof String) {
  for (const item of unit.Data) {
    if (item instanceof ConstString) {
      return item.TempToString();
    }
  }
}
return "";
```

## private method StartsWithTernaryQuestion:(units:Array<Token>, index:int)=>bool

紧挨着 `index`（方法名）前面的**实义单元**是不是一个 `?`——是的话这个「名字 + 括号」
处在**三元运算符的真分支**里，后面那个 `:` 是三元冒号、不是返回类型。

允许中间夹**非边界的软换行**：`cond ?` 换行 `f(a, b) : v` 这种折行排版很常见，
而那个换行前面是 `?`（还要一个操作数），`Statement.IsLineBreakBoundary` 会给「不是边界」。
除 `?` 以外的任何实义单元都判否——保守的一侧是「当成方法声明」，
而这里拒错的代价只是少收一个方法声明，比把一次调用吞成声明轻得多。

```ts
for (let i = index - 1; i >= 0; i--) {
  const item = Get(units, i);
  if (item === null) {
    return false;
  }
  if (item instanceof LineWrap) {
    if (Statement.IsLineBreakBoundary(units, i)) {
      return false;
    }
    continue;
  }
  if (item instanceof SymbolToken) {
    return item.Is("?");
  }
  return false;
}
return false;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一个方法声明的名字：一个能当方法名的 `Identifier`，后面紧跟（允许夹一段类型参数）`(` 括号，
且括号后面（允许一段返回类型）有一个 `{` 方法体。

名字判定用的是 `template.MethodNameTemplate`——`switch` / `function` / `typeof` 这类
「名字 + 括号」的关键字在 `../parse-pipeline.xl.md` 的 `BanedMethodNames` 里已经被挡掉了。

**`import` 单独在这里再挡一次**：`typeof import("assert")`（模块查询类型）也是「名字 + 括号」的形状，
但 `import` **不能**加进 `BanedMethodNames`——那张表是「能不能当方法名」的唯一判据，
调用规则（`Method`）与声明规则共用它，加进去会连带挡掉动态 `import("m")` 的调用节点。
所以这里就地拒一次：`import` 不在成员位置当方法名。

**唯一的例外是对象字面量**（第 654 轮）：`{ import(): T { … } }` 里它是**成员名**，
判据是「名字的父单元就是 `ObjectLiteral`」——比「父单元是成员体」窄一格。第 640 轮按成员体放开被退回，
原因是成员体里 `typeof import("m").A` 的那个 `import` 的**父单元也是成员体**（平铺列表）；
而 `typeof import("m")` 那个 `import` 只可能待在 `TypeLiteralBody` / `InterfaceBody` / `ClassBody` 里，
不会待在一个**值位的** `ObjectLiteral` 里 ⇒ 这一格是安全的。

**成员位置反而要放开禁用表**：`class A { delete() {} if() {} for() {} new() {} }` /
`interface I { for(): void }` 里的方法名正是关键字——它们是**成员名**，不存在
「`if (x)` 被误当成调用」的风险（那个风险只属于表达式位）。所以名字的父单元是成员体时不再查
`MethodNameTemplate`，只查语句位的那一支。

**但类型运算符在成员位也绝不是方法名**（第 66 轮补，第 609 轮收窄）：`readonly` 后面跟一个括号是
**类型位**的写法（`readonly (A | B)[]`），不是「名叫 `readonly` 的方法」。
放任不管时实测
`interface ResolvedProjectReference { references?: readonly (ResolvedProjectReference | undefined)[] }`
整条成员被收成一个 `<MethodDeclaration name="readonly">`，那个 `[]` 还被当成返回类型
（产物里多出一个 `<ArrayLiteral>` 挂在 `ReturnType` 下）——成员名 `references`、
数组类型、括号类型、联合四种结构全塌（真实语料 `typescript.d.ts` 4 处）。

**「类型运算符」与「成员名」的分界是名字前面那一格**：类型位前面一定是符号（`:` / `?` / `|` / `&` / `=`…）
或一个类型关键字（`extends` / `keyof` / `typeof` / `in` / `new`），而成员名前面是成员起始
（`{` / `;` / `,` / `}`）或者一个修饰词（`static` / `get` / `async` …）。
第 66 轮只做了「一律拒收」那半边，于是
`readonly() {}` / `static readonly() {}` / `async readonly() {}` / `get readonly(): T {…}`
这四种**合法写法**整条成员散架（实测 `readonly() {}` 缺 2 多 2、`get readonly()` 缺 7 多 5）。

**只挡这五个词**：`readonly` / `keyof` / `unique` / `asserts` / `infer`。
`IsTypeModifier` 里的 `new` / `abstract` / `typeof` **不能**照抄着一起挡——
`class A { new() {} }` 里的 `new` 是**合法的方法名**（`lex-keyword-method-name.ts` 钉住这一条），
挡掉之后那个 `{}` 会退化成 `<ObjectLiteral>`（当时的仪表尺子当场多一处）。
成员位的构造签名 `new (): A` 由排在本规则之前的 `SignatureCloseRule` 认领，不靠这里。

**计算成员名 `[`m`]()` / `[x]()` 也算名字**：它是一个 `[` 括号，
名字由 `field.xl.md` 的 `BracketNameText` 拼出来（与 `[key: string]` 索引签名同一套）。
不认这一支时那个 `[...]` 会被收成 `ArrayLiteral`，整条方法声明散架。

```ts
let nameIndex = index;
const generator = this.GeneratorMark(units, index);
if (generator !== null) {
  // **`*` 与名字之间跨注释**（第 845 轮）：`{ * /*c*/ g() {} }` 里 `*` 后面紧跟的是那条注释，
  // 只跳软换行时 `nameIndex` 落在注释上 ⇒ 名字判据当场判否 ⇒ 整条方法声明不成形
  //（实测 `gap-a-comment-06`：缺 `MethodDeclaration` / `Identifier` / `Block` 三条）。
  // 第 817 轮那三处（名字与参数表之间）已经改成 trivia 口径，这一格是同一族的漏网。
  nameIndex = SkipNextTrivia(units, index);
}
const current = Get(units, nameIndex);
const isPrivateName = current instanceof SymbolToken && current.Is("#");
if (isPrivateName) {
  nameIndex = SkipNextWrapSymbol(units, nameIndex);
}
const name = Get(units, nameIndex);
const isComputedName = (name instanceof Bracket && name.startBracket === "[") || name instanceof ArrayLiteral;
// **成员体有四种**（第 640 轮补上 `ObjectLiteral`）：类体 / 接口体 / 类型字面量体 / **对象字面量**。
// 对象字面量的成员名与前三者同权：`{ return(): T { … } }` / `{ delete() {} }` 里的词是**成员名**，
// 而它们在语句位是关键字（`return (x)` / `delete o.k`）——所以只认「名字的父单元是成员体」。
const inMemberBody =
  name !== null &&
  (name.Parent instanceof ClassBody || name.Parent instanceof InterfaceBody ||
    name.Parent instanceof TypeLiteralBody || name.Parent instanceof ObjectLiteral);
// **关键字也能当成员名**（第 640 轮）：`KeywordCloseRule` 跑过之后那个词已经是 `Keyword`
// （`{ return(): T { … } }` 实测就是它），而 `Keyword` 既不是 `Identifier` 也不是 `String`，
// 上面那道形状判据会当场拒掉。成员位没有「`if (x)` 被误当成调用」的风险（那个风险只属于表达式位），
// 所以**只有成员位**才放开。
const isKeywordName = name !== null && name.constructor.name === "Keyword";
if (isComputedName === false && !(name instanceof Identifier) && !(name instanceof String) &&
    !(isKeywordName && inMemberBody)) {
  return false;
}
if (isComputedName === false && inMemberBody === false && name instanceof Identifier && !template.MethodNameTemplate.IsMethodName(name.TempToString())) {
  return false;
}
if (isComputedName === false && inMemberBody) {
  let word = "";
  if (name instanceof Identifier) {
    word = name.TempToString();
  } else if (name !== null && name.constructor.name === "Keyword") {
    word = (name as any).Value;
  }
  if (word === "readonly" || word === "keyof" || word === "unique" || word === "asserts" || word === "infer") {
    // **「类型运算符」还是「成员名」，看名字前面那一格**（第 609 轮）：
    // `references?: readonly (A | B)[]` 里它是类型运算符（前面是 `?` / `:`），
    // 而 `readonly() {}` / `get readonly(): T {…}` / `static readonly() {}` 里它是**成员名**——
    // 前面要么是成员起始（`{` `;` `,` `}`），要么是一个修饰词（`static` / `get` / `async` …）。
    // 原来不看前面、一律拒收，于是这三种写法整条成员散架（实测 `readonly() {}` 缺 2 多 2）。
    const before = Get(units, SkipPreviousWrapSymbol(units, nameIndex));
    const atMemberStart =
      before === null ||
      (before instanceof SymbolToken && (before.Is("{") || before.Is(";") || before.Is(",") || before.Is("}")));
    if (atMemberStart === false && IsDeclarationModifier(before) === false) {
      return false;
    }
  }
}
if (name instanceof Identifier && name.Is("import") && !(name.Parent instanceof ObjectLiteral)) {
  return false;
}
const parametersIndex = this.ParameterIndex(units, nameIndex);
if (parametersIndex < 0) {
  return false;
}
if (this.AfterAssignment(template, units, nameIndex)) {
  return false;
}
// **形参表后面是「表达式的继续」⇒ 那是表达式，不是方法声明**（第 66 轮起，第 75 轮补齐）。
// 方法声明的形参表后面只可能是 `: 返回类型` / `{ 体 }` / 成员边界（`;` `,` 换行）：
//   · 接**运算符**（`=>` / `===` / `&&` / `?` / `.` …）⇒ 值位表达式。
//     `=>` 那一支是第 66 轮补的：`F extends abstract new(...args: any) => any ? F : undefined`
//     里的构造签名随后由 `../function-type.xl.md` 收成 `FunctionType`；
//   · 接**下标括号** `[` ⇒ `f(x)[0]` 这种索引；
//   · 接**值位关键字**（`in` / `instanceof` / `as` / `satisfies`）⇒ 同样是表达式。
// 少了这三条，`f(x)` 会被收成 MethodDeclaration，它的「返回类型」从那个 token 一路吞到 `?`、
// 「方法体」就是后面那个对象字面量（实测 `{ name: e(z) ? { k: 1 } : g }`：
// 三元 0 个、方法声明 1 个；`f(x)[0] ? …` 与 `f(x) in o ? …` 同理）。
const afterParameters = Get(units, SkipNextWrapSymbol(units, parametersIndex));
if (afterParameters instanceof SymbolToken && afterParameters.IsAny(MethodDeclarationCloseRule.ValueOperators)) {
  return false;
}
if (afterParameters instanceof Bracket && afterParameters.startBracket === "[") {
  return false;
}
// **形参表后面紧贴一个逗号 ⇒ 那是实参表**（第 76 轮）：`mk(leafKindOfText(text), { text })`
// 里 `leafKindOfText(text)` 后面就是逗号——`BodyIndex` 一路扫到后面那个 `{`，
// 于是那次调用被收成一个 `MethodDeclaration`（`ReturnType` 是那个逗号、`MethodBody` 是 `{ text }`），
// 连带把简写属性 `{ text }` 读成标签、把里面的东西读成参数与字面量类型
// （实测 `cases:align` 的「产物里有标签、源码里没有对应构造」4 类全是这一处）。
//
// 逗号在**值位**只能是实参 / 表达式分隔符；而方法声明的形参表后面不可能是逗号：
// 成员之间用 `;` / 换行 / `,` 分隔时，逗号也只会出现在**返回类型或体之后**，不会紧贴 `)`。
if (afterParameters instanceof SymbolToken && afterParameters.Is(",")) {
  return false;
}
// **三元运算符的真分支里那个 `:`** ⇒ 不是返回类型（第 127 轮）。
//
// `cond ? f(a, b) : value` 里 `f(a, b)` 后面正好是 `:`，而 `:` 在方法声明里是
// **返回类型**的开头——两种形状只差「那个 `?` 在不在前面」。实测
// `dist/ts/typescript/ts-ast.ts` 的
// `? g(nameNode, ctx) : nameNode.get(…) === … ? { … } : k(nameNode, ctx)`
// 里那次调用被收成一个 `MethodDeclaration`：「返回类型」从那个 `:` 一路吞到下一个 `?`、
// 「方法体」是后面那个对象字面量（那一个文件 70 处缺口里的成片）。
//
// 判据只看**紧挨着名字前面的实义单元是不是 `?`**（允许中间夹非边界的软换行）：
// 三元与「方法声明的返回类型」在词法上唯一的区别就是它。
// 多行排版不受影响——`<\n g(…)` 那种换行前面是 `?`，`IsLineBreakBoundary` 判它「不是边界」
// （`?` 还要操作数），回扫照旧穿过去。
if (afterParameters instanceof SymbolToken && afterParameters.Is(":") && this.StartsWithTernaryQuestion(units, nameIndex)) {
  return false;
}
if (afterParameters !== null && (afterParameters instanceof Identifier || afterParameters.constructor.name === "Keyword") && MethodDeclarationCloseRule.ValueKeywordTexts.includes(WordText(afterParameters))) {
  return false;
}
return this.BodyIndex(units, parametersIndex) >= 0 || this.IsMemberSignature(units, nameIndex, parametersIndex);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整条方法声明收成一个 `MethodDeclaration`，**返回新的下标**。

要点：

- 起点由 `DeclarationStart` 往前吃掉一串修饰词（`public` / `static` / `async` / `get` / `set` …）与装饰器；
  修饰词折进 `modifiers`（`join(",")`），装饰器作为子单元搬进 `MethodDeclaration`。
- 名字与参数表之间允许一个 `GenericType`（`find<U>(key: U)`）。
- 参数表括号作为子单元留着；参数括号的内容已经由它自己的规则队列啃过
  （`(` 括号有队列，见 `../bracket.xl.md` 的 `Use`），不重复处理。
- 返回类型段（`:` 与类型单元）单独搬给 `ReturnType` 并 `TryToClose()`——**必须自成一段**，
  否则 `TypeDefine` 会从 `:` 一路吞到方法体里去（见 `./return-type.xl.md`）。
  它的边界由 `ScanDeclarationBody` / `ScanDeclarationTailEnd` 给出（见 `../declaration-common.xl.md`）。
- 名字与方法体之间搬进去的子单元里，软换行**不进树**（与 `Class` / `Function` 一致：
  它们本来就会被 `WrapSymbolCloseRule` 摘掉，这里先一步跳过，免得落进一个不跑重组的单元里）。
- 范围终点取自己的最后一个单元（有体时是 `}`，无体时是返回类型末位或那个 `;`）。
  **尾随软换行不进范围**——它留在父单元里充当语句/成员边界
  （见 `../declaration-common.xl.md` 里「为什么这里不再有收尾口径」那一节）。
- 方法体括号的**内容**整体搬给 `MethodBody`，括号本身不再留在树里；`MethodBody` 有自己的语句队列，
  搬完要 `TryToClose()` 一次。
- **没有方法体时**（成员签名）：`memberEnd` 取返回类型的末尾，并把紧跟的一个 `;` 一起吃掉。
  `MethodBody` 那一段整个跳过——签名本来就没有体。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
const startIndex = DeclarationStart(units, index);
let nameIndex = index;
const generator = this.GeneratorMark(units, index);
if (generator !== null) {
  // 与 `Previous` 那一格同一条口径（第 845 轮）：`*` 与名字之间跨注释。
  nameIndex = SkipNextTrivia(units, index);
}
const markUnit = Get(units, nameIndex);
const privateMark = markUnit instanceof SymbolToken && markUnit.Is("#") ? markUnit : null;
if (privateMark !== null) {
  nameIndex = SkipNextWrapSymbol(units, nameIndex);
}
const parametersIndex = this.ParameterIndex(units, nameIndex);
if (parametersIndex < 0) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const bodyIndex = this.BodyIndex(units, parametersIndex);
const isSignature = bodyIndex < 0;
if (isSignature && this.IsMemberSignature(units, nameIndex, parametersIndex) === false) {
  throw new Error("方法声明不满足格式要求：name(...) { ... }");
}
const tailEnd = isSignature
  ? this.SignatureTailEnd(units, parametersIndex)
  : ScanDeclarationTailEnd(units, parametersIndex);
const tailStart = SkipNextWrapSymbol(units, parametersIndex);
const result = new MethodDeclaration(template);
result.Parent = current.Parent;
const nameUnit = Get(units, nameIndex)!;
const computedName = nameUnit instanceof Bracket || nameUnit instanceof ArrayLiteral;
if (computedName) {
  result.name = BracketNameText(nameUnit);
} else if (privateMark === null) {
  result.name = this.MethodNameOf(nameUnit);
} else {
  result.name = "#" + this.MethodNameOf(nameUnit);
}
// **名字的位置当场记进字段**（见 `NameStart`）：普通标识符、关键字名与**字符串名**都记——
// 只有计算名留给投影（它要的是方括号那一对，另有分派）。
// 字符串名记的是**引号里那一段**（与 `Field.NameStart` 同一口径）：投影按 `name` 的文本位置
// 自己判「左边一格是不是引号」，于是 `"a-b"()` 也**不再回原文 `indexOf("a-b")` 猜**
//（带转义的名字 `indexOf` 根本找不到）。
// 私有名的区间从 `#` 那一格算起（`name` 记的是 `#x` 整个名字）。
if (!computedName && (nameUnit instanceof Identifier || nameUnit.constructor.name === "Keyword" || nameUnit instanceof String)) {
  const isStringName = nameUnit instanceof String;
  // 标识符那一档取的是 `Source` 对象（私有名取 `#` 那一格），字符串名直接算下标。
  const head = privateMark === null ? nameUnit.SourceRange.Start : privateMark.SourceRange.Start;
  const tail = nameUnit.SourceRange.End;
  const plainStart = head === null ? -1 : head.Index;
  const plainEnd = tail === null ? -1 : tail.Index;
  const nameStart = isStringName ? nameUnit.SourceRange.Start!.Index + 1 : plainStart;
  const nameEnd = isStringName ? nameUnit.SourceRange.End!.Index - 1 : plainEnd;
  if (nameStart >= 0 && nameEnd >= nameStart) {
    result.NameStart = nameStart;
    result.NameEnd = nameEnd;
  }
}
result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
// **修饰词各自的位置**（见 `ModifierSpans`）：它们不进 `Data`，位置要在这一趟记下来。
result.ModifierSpans = DeclarationModifierSpans(units, startIndex, index).join(",");
for (const item of TakeDeclarationDecorators(units, startIndex, index)) {
  result.AddAndCloseLast(item);
}
if (computedName) {
  result.AddAndCloseLast(nameUnit);
}
if (generator !== null) {
  result.AddAndCloseLast(generator);
}
if (privateMark !== null) {
  result.AddAndCloseLast(privateMark);
}
let i = index + 1;
while (i < parametersIndex) {
  const item = Get(units, i);
  // **计算名那一格不要收第二遍**（第 306 轮）——**只有「生成器记号 + 计算名」
  // 这个组合会撞上**：那时 `nameIndex` 是 `index + 1`（`*` 后面那一格），
  // 而上面 `computedName` 那一支已经把它收进去了，这个循环又从 `index + 1` 起步
  // ⇒ 同一个单元被收两次。
  //
  // **第二次收的后果不是「多一格名字」**：`AddAndCloseLast` 是**搬**（搬完那一格
  // 在父列表里就空了），再收一次得到的是一个**空的 `ArrayLiteral`**——
  // 实测产物：`<MethodDeclaration name=""><ArrayLiteral>[Symbol.iterator]</ArrayLiteral>
  // <SymbolToken>*</SymbolToken><ArrayLiteral></ArrayLiteral><Bracket startBracket="(">…`
  // （中间那个空 `ArrayLiteral` 就是它）。投影按 `WRAPPER_FIELDS` 把 `Bracket` 摊成
  // `parameters`，而那个空数组字面量**也**落在 `parameters` 里 ⇒ 降级层报
  // `unimplemented: parameter without a name`（**整份文件进不来**，
  // 而那句话听起来像「形参写错了」，判据 `c305-e2e-linked-list-ops`）。
  //
  // **判据必须带上 `computedName`**：`*g() {}` 那一档 `nameIndex` 也等于 `index + 1`，
  // 可名字（`Identifier`）**正是**靠这个循环收进去的——无条件跳过会把名字整格丢掉。
  if (computedName && i === nameIndex) {
    i = i + 1;
    continue;
  }
  if (!(item instanceof LineWrap)) {
    result.AddAndCloseLast(item!);
  }
  i = i + 1;
}
result.AddAndCloseLast(Get(units, parametersIndex)!);
if (tailStart <= tailEnd) {
  const returnType = result.CreateReturnType();
  for (let t = tailStart; t <= tailEnd; t++) {
    const item = Get(units, t);
    if (!(item instanceof LineWrap)) {
      returnType.AddAndCloseLast(item!);
    }
  }
  returnType.SignIn(Get(units, tailStart)!.SourceRange.Start!);
  returnType.SignOut(Get(units, tailEnd)!.SourceRange.End!);
  returnType.TryToClose();
}
let memberEnd = tailEnd >= 0 ? tailEnd : parametersIndex;
if (bodyIndex >= 0) {
  memberEnd = bodyIndex;
} else {
  // **收尾那个 `;` 跨 trivia 看**（第 827 轮）：`m(): void` 换行 `;` 与
  // `m(): void//c` 换行 `;` 里，`;` 前面隔着一个软换行 / 一条行注释 ——
  // 只看 `memberEnd + 1` 时它是那个 `LineWrap` ⇒ 不认 ⇒ 区间停在返回类型末尾、
  // 那个 `;` 掉在外面成了平级单元（实测 `gap-sweep-newline-iface-03` 与
  // `gap-sweep-linecomment-iface-06`：`MethodSignature` 产物 `[25,34)` vs TS `[25,39)`）。
  // 口径与 `Field.MemberEnd` 的「换行后面只有一条注释或一个 `;` 的不算边界」同源。
  const semicolonAt = SkipNextTrivia(units, memberEnd);
  const semicolon = Get(units, semicolonAt);
  if (semicolon instanceof SymbolToken && semicolon.Is(";")) {
    memberEnd = semicolonAt;
  }
}
// **返回类型与收尾那个 `;` 之间的 trivia 要搬进自己名下**（第 920 轮）：`tailEnd` 现在停在
// 最后一个实义单元上（见 `SignatureTailEnd` 那一节），而 `ReplaceCountAt` 会把
// `[startIndex, memberEnd]` 整段**抹掉**——夹在中间的那条注释不搬进节点就**整格消失**
//（实测 `gap-sweep-linecomment-iface-06`：`m(): void//c` 换行 `;` 里那条 `LineAnnotation`
// 从产物里没了，`xl:expect LineAnnotation` 当场红；同一格里 `Field` 是把它折进了类型标注）。
// 软换行照旧不搬：它是留不住的 trivia，别的规则也这么处理。
// **只在有返回类型段时搬**（`tailEnd >= 0`）：裸形参表签名（`interface I { m() }`）的
// `tailEnd` 是 `-1`，不挡的话这个循环会把名字与形参表**再收一遍**（`AddAndCloseLast` 是搬，
// 第二次收进来的是一个空壳）。
if (tailEnd >= 0) {
  for (let t = tailEnd + 1; t < memberEnd; t++) {
    const item = Get(units, t);
    if (item !== null && !(item instanceof LineWrap)) {
      result.AddAndCloseLast(item);
    }
  }
}
result.SignIn(Get(units, startIndex)!.SourceRange.Start!);
const endIndex = memberEnd;
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
if (bodyIndex >= 0) {
  const body = Get(units, bodyIndex) as Bracket;
  const methodBody = result.CreateBody();
  body.MoveDataTo(methodBody);
  methodBody.Sign(body);
  methodBody.TryToClose();
}
result.TryToClose();
return ReplaceCountAt(units, startIndex, endIndex - startIndex + 1, result);
```

# class MethodDeclaration extends IndependentToken

方法声明。

它由重组造出来、自己不消费字符，所以只继承 `IndependentToken` 的空 `Process`。

类名必须与产物里的标签名一致：`this.constructor.name` 就是 `<MethodDeclaration>` 的标签。

## method SegmentNames:()=>Map<string, Map<string, string>>

**本单元的段，投成目标语言形状时叫什么**：每个节点名各一张表，产物那边的分段名 → 目标语言的字段名。

**为什么要分两份**：这个 token 依上下文投成不同的节点（`MethodDeclaration`（同一个 token 的另一种形状） 与 `Constructor`（同一个 token 的另一种形状） 与 `MethodSignature`（同一个 token 的另一种形状） 与 `GetAccessor`（同一个 token 的另一种形状） 与 `SetAccessor`（同一个 token 的另一种形状）），而字段名未必相同——所以按节点名分档。

段名是**本单元自己的事实**（见 `Token.SegmentNames`）：这些段是这一个 token 切开来的，叫 `GenericType` / `children` 的名字只有在这一页才成立——所以它住在这一页，而不是投影层那张按 kind 分几十档的中央表里。**投影只读这一格**：`structuralProps` 拿它给字段名，查不到才落到那张还没搬完的表。

**形态与基类一致**（`## method` 而不是 `## property`）：基类那一格是 `## method` + 空表，写成属性会在派生类里报「类型不兼容」——两者只能同一形态。

```ts
return new Map([["MethodDeclaration", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])], ["Constructor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])], ["MethodSignature", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])], ["GetAccessor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])], ["SetAccessor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])]]);
```

## constructor:(template:Template)=>void

创建时把本类型的收尾规则挂上来（模板里没有专门给 `MethodDeclaration` 注册就用通用队列）。

理由与 `Class` / `Function` 的构造器相同：返回类型那一段
（`:` 与类型单元）是 `Process` 搬进来的，不给自己的队列，它就凑不成 `TypeDefine`。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## field name:string = ""

方法名。

## field NameStart:int = -1

名字在源码里的起点（闭区间下标）；只有计算名（`[Symbol.toPrimitive]()`）时是 `-1`。

**字符串名记的是引号里那一段**（与 `../field.xl.md` 的 `NameStart` 同一口径）：投影按
「名字左边那一格是不是引号」判出 `StringLiteral`，于是 `"a-b"()` 不必回原文 `indexOf` 猜。

**私有名 `#x` 从 `#` 算起**——`name` 记的是 `#x` 整个名字，投影合出来的是一个
`PrivateIdentifier`，区间要盖住那个 `#`（见 `../field.xl.md` 的 `NameStart`，同一个来由）。

## field NameEnd:int = -1

名字的终点（闭区间下标），与 `NameStart` 同进退。

## field modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare` / `accessor` / `async` / `get` / `set`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## field ModifierSpans:string = ""

每个修饰词自己的区间，`"起:止"` 用 `,` 连接（闭区间），与 `modifiers` **同序同长**；没有修饰词时空串。
来由与 `Class.ModifierSpans` 同一条：修饰词不进 `Data`，位置只有认下声明那一刻知道——
而成员的装饰器名里正带着同一个词（`@exported private d = 1`）。

## method CreateBody:()=>MethodBody

新建方法体段并挂到自己名下，返回新单元。

```ts
return this.Add(new MethodBody(this.Template));
```

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

返回类型单独成段是必须的：`TypeDefineCloseRule` 从 `:` 起贪婪地收，直到 `;` / `,` / 赋值符号为止——
方法体不是终止符，返回类型一旦与方法体同级，`TypeDefine` 就会把方法体整个吞进去
（见 `./return-type.xl.md`）。

```ts
return this.Add(new ReturnType(this.Template));
```

## property ReturnType:ReturnType | null

返回类型段：子单元列表里**第一个** `ReturnType`；这条声明没有返回类型标注时给 `null`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof ReturnType) {
    return item;
  }
}
return null;
```

## property Body:MethodBody

方法体段：子单元列表里**第一个** `MethodBody`。

### get

```ts
for (const item of this.Data) {
  if (item instanceof MethodBody) {
    return item;
  }
}
throw new Error("找不到匹配的子单元");
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格出哪个节点**（第 1002 轮）：`MethodDeclaration` 是**声明族**的一员，形状由
`ctx.Declaration` 给——它与通用支落在**同一份实现**（`projectDeclaration`）上，
所以「覆写了仍然与通用支逐字节相同」是结构上的事，不是巧合。

**为什么不在这里自己算 kind**：这一族**两半一起写**（`PrintAst` + `PrintDirectAst`，
见 `core/syntax/token.xl.md` 的 `PrintDirectAst`）——非直出版那条路照旧走投影层的
换 kind 规则与段名表，一个字都不改；只有直出版需要自己算（它不能被问第二次）。

```ts
  return ctx.Declaration(v);
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 1002 轮）：与上面的 `PrintAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

**这一页是「同一个产物标签、按上下文换 kind」最多的一页**：
接口 / 类型字面量里是 `MethodSignature`（`ctx.signature`）、
类体里那个叫 `constructor` 的是 `Constructor`（读 `ctx.parentKind`）、
`modifiers` 里带 `get` / `set` 的是 `GetAccessor` / `SetAccessor`，
其余才是 `MethodDeclaration`。四档判据**全部落在这一格自己的属性与上下文标记上**
（`name` / `modifiers` / `ctx.signature` / `ctx.parentKind`）——没有一处回原文查。

**回落到形状那一格是必须的**（不是「偷懒转手」）：算 kind 与造形状是同一件事的两半
（`projectDeclaration` 里换 kind 之后立刻就是 `structuralProps` 与三处收尾），
而「带坐标与尾部 trivia 剪裁」的造节点口径只能有一份（`astNode`）。
所以直出版把它算出来的 kind 与**这一格自己的造节点闭包**（第三格，来自 `ctx.Node`）交回去，
由那一份实现把形状造完——`projectNode` 认这一格时会**跳过「再问一次直出版」**，
否则就是自己问自己（见 `projectNode` 里 `ctx.awaitingDeclaration` 那一支）。

```ts
  // **这一个节点该出哪个 kind**：四条换 kind 规则按 context 逐条判。
  // 与 `projectDeclaration` 是**同一个顺序**（表达式位 → 构造 → 取值器 / 设值器 → 签名）：
  // 顺序反了，`class { get x() {} }` 那种「既是 get 又可能是签名」的写法就会两边不同。
  // **判据取属性、不转字符串**：`attrs` 上的值本来就是这个 token 自己记的字符串
  // （不到就取空串），调用全局 `String(...)` 反而会撞上同名的 token 类 `String`。
  const declaredName = v.name ?? "";
  const declaredModifiers = v.modifiers ?? "";
  let kind = "MethodDeclaration";
  if (ctx.expressionPosition === true) kind = "MethodDeclaration";
  else if (
    (ctx.parentKind === "ClassDeclaration" || ctx.parentKind === "ClassExpression") &&
    declaredName === "constructor"
  ) {
    // **判据是 `name` 属性、不是文本**（与 `projectDeclaration` 同一句理由）：
    // 方法单元自己没有 `value`，回原文取到的是整段方法体、不是名字。
    kind = "Constructor";
  } else if (declaredModifiers.split(",").includes("get")) {
    kind = "GetAccessor";
  } else if (declaredModifiers.split(",").includes("set")) {
    kind = "SetAccessor";
  }
  if (ctx.signature && kind === "MethodDeclaration") kind = "MethodSignature";
  // **形状交回共享实现**（第三格是这一格自己的造节点闭包、第四格是刚算出来的 kind）。
  return ctx.Declaration(v, undefined, ctx.Make(v), kind);
```
## method NameField:()=>string | undefined

**这一格自己的名字**（第 1006 轮）：名字就在本页的 `name` 字段上，所以由这一页回答——
投影那一层过去拿一张「哪些页把名字叫什么」的字符串名单逐个试
（`owner["name"]` / `owner["fieldName"]` / `owner["namespace"]`），现在只问这一格
（见 `typescript/print-ast-common.xl.md` 的 `tokenNameOf`）。

基类那一格答 `undefined`＝「名字不在字段上」（见 `core/syntax/token.xl.md`）；
`name` 为空时也答 `undefined`——那时名字可能在**子单元**里，交给投影那一层的下一站去问。

```ts
return this.name === "" ? undefined : this.name;
```

## method ToXmlString:()=>string

产出 XML：开标签上带 `name`、`modifiers` 与名字的两个下标（`nameStart` / `nameEnd`）。

与 `Method` 的 `<Method name="x">` 只在标签名与多出来的 `modifiers` 上不同——
调用点是 `Method`，声明点是 `MethodDeclaration`，两者靠标签名区分。

**`nameStart` / `nameEnd`**（第 987 轮五）：`ToDictionary` 一直在写这两个键、投影也一直在读它们
（「有这对字段就不做任何猜测」，见 `print-ast-common.xl.md` 的 `synthName`），
而 XML 从前没印——**两级出口的键名表必须一样**，这里补齐。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
 const spans = this.ModifierSpans === "" ? "" : ` modifierSpans="${this.ModifierSpans}"`;
return `<${name} range="${this.RangeOf()}" name="${this.name}" modifiers="${this.modifiers}" nameStart="${this.NameStart}" nameEnd="${this.NameEnd}"${spans}>${temp.join("")}</${name}>`;
```

## method ToDictionary:()=>Map<string, any>

产出 JSON 对象：类型名 + `name` / `modifiers` 两个声明字段，外加子单元。

键名与 `ToXmlString` 开标签上的两个属性同名、值同源。
`MethodDeclaration` 与 `Method` 的 JSON 只差在 `modifiers` 这个键上——与 XML 里靠标签名区分调用点与声明点同一回事。
子单元非空时才写 `children`（空节点只留 `type`）。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("name", this.name);
result.set("modifiers", this.modifiers);
// **修饰词各自的位置**（见 `ModifierSpans`）：投影直读，不再回原文 `indexOf` 猜。
if (this.ModifierSpans !== "") {
  result.set("modifierSpans", this.ModifierSpans);
}
// **名字的位置**（见 `NameStart` / `NameEnd`）：投影直读，不再回原文 `indexOf` 猜。
result.set("nameStart", this.NameStart);
result.set("nameEnd", this.NameEnd);
if (this.Data.length !== 0) {
  const children: Array<any> = [];
  for (const item of this.Data) {
    children.push(item.ToDictionary());
  }
  result.set("children", children);
}
return result;
```

## method Clone:()=>Token

克隆自身。

三个声明字段都要抄。

```ts
const result = new MethodDeclaration(this.Template);
result.Sign(this);
result.name = this.name;
result.NameStart = this.NameStart;
result.NameEnd = this.NameEnd;
result.modifiers = this.modifiers;
result.ModifierSpans = this.ModifierSpans;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
