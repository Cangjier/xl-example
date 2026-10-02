# dependencies
```xl
import { IndependentToken } from "../../../core/syntax/independent-token.xl.md"
import { Reorganization } from "../../../core/syntax/reorganization.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../../core/extensions/list-extension.xl.md"
import { DeclarationModifiers, DeclarationStart, IsDeclarationTailStop, ScanDeclarationBody, ScanDeclarationTailEnd, TakeDeclarationDecorators } from "../declaration-common.xl.md"
import { SkipNextWrapSymbol, SkipPreviousWrapSymbol, WordText, GetSkipNextWrapSymbol } from "../../text-common-util.xl.md"
import { Bracket } from "../bracket.xl.md"
import { BracketNameText } from "../field.xl.md"
import { ArrayLiteral } from "../json/array-literal.xl.md"
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
- 其余 → 调用（`MethodReorganization` 接手）。

这也是本规则必须排在 `MethodReorganization` **之前**的原因（见 `../parse-pipeline.xl.md`）：
`Method` 一旦先成形，名字与参数就都被它装走了，这里再也看不到「名字 + `(`」。

**没有方法体的成员签名也收**：`abstract f(): void;` / 接口里的 `m(): void` / 重载签名
`calls(exact?: number): () => void;` 都是**成员签名**，它们该有自己的节点。

原来这一条不收，理由是「括号后面是 `;`，与一条以 `;` 收尾的调用语句完全同形」。
那个理由只在**语句位置**成立：在类体 / 接口体里，直接成员不可能是调用语句——
`f(1);` 只能是某个字段初始化式的一部分，而那种情况下 `Field`（排在方法声明之后，但它的起点更靠左）
会先把整条 `x = f(1);` 收走，`f` 根本轮不到这里。

所以判据是**父单元**：只有 `ClassBody` / `InterfaceBody` 的直接成员才允许无体形状，
其余位置仍然要 `{` 才收——`foo(a);` 这类语句不会因此变成假的方法声明。

`MethodDeclarationReorganization` 写在 `MethodDeclaration` **之前**。

# class MethodDeclarationReorganization extends Reorganization

## static readonly field Instance:MethodDeclarationReorganization = new MethodDeclarationReorganization()

唯一的实例，注册进通用重组队列时用。

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
`in` 可能还是 `Identifier`（`KeywordReorganization` 排在队列尾部，还没跑过它），
只认 `Keyword` 会漏（第 75 轮实测）。

实测（同一条根因）：`{ name: e(z) in o ? { k: 1 } : g }` 里 `e(z)` 会被收成
`MethodDeclaration`、三元整个消失；`f(x)[0] ? { … } : g` 那种**下标**同理
（下标是括号、不是运算符，所以另有一条 Bracket 判定）。

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

> 那条体括号（`{`）**前面紧邻的括号**必须与**当前签名的参数表**原文相同。

理由：`f(a: string): void` 与 `f(a: number): void` 的参数表原文不同，
所以第一条签名看到「`{` 前面的参数表是 `(a: any)`」就知道那个体不是自己的（返回 `-1`）；
而真正的实现体（同名同参）前面就是同一个参数表原文，照常成立。

**这一条试过三种写法，只有它没有净回归**：
- 「见过 `:` 后一跨换行就否决」→ 打掉接口里成片的多行重载与一行一条的 `get x(): number`
  （实测真缺 18 → 37 / 41，两次都是净回归）；
- 「换行后面是『一个词 + `(`』就算下一条签名」→ 把**带体的 getter**里的
  `return (this.Y as String)!` 误判成下一条签名（`return` 被当成方法名），
  于是 `NotNull` 真缺从 0 涨到 3；
- 原文比较只看**参数表**这一小段，既不依赖换行、也不依赖 `return` 这类词。

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
    if (item.startBracket === "(" && this.ParameterText(item) !== this.ParameterText(parameters)) {
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

**已知缺口：类里「无体的重载签名」后面跟着带体的实现时，前几条会被并掉。**
形状是 `class A {` 换行 `  f(a: string): void` 换行 `  f(a: number): void` 换行
`  f(a: any) {}` 换行 `}`。

第二条签名往前找体时会跨过换行撞上**第三条的 `{`**，于是三条只出 1 个 `MethodDeclaration`。
（不带实现体的两条 `f(a: string): void` / `f(a: number): void` 是**对的**，出 2 个。）

试过在这里加「跨行且没见过 `{` 就判没有体」的守卫与它的两种收窄版，**都是净回归**：
把接口里成片的多行重载（`lib.dom.d.ts` 的 `addEventListener<…>(…)`）、
`get x(): number` / `set x(v: number)` 这类一行一条的签名一起打掉，
全语料「成员·方法类」真缺从 18 涨到 37 / 41（用例集因为是绿的所以看不出来，
是 `tests/parse/gap-dashboard.mjs` 的逐节点对账抓出来的）。已回退。

要修得先能**区分「体在下一行」与「下一条成员」**——只往前看是分不出来的
（`m(): T` 换行 `{ }` 与 `m(): T` 换行 `m2(): T` 在扫描到那里时长得一样）。
可行的方向：在 `Process` 侧先把「同一行内的 `: 类型`」标成一段（例如让 `TypeDefine` 带上
「以换行收尾」的标记），`BodyIndex` 据此判断成员边界，而不是重新猜。

## private method ParameterIndex:(units:Array<Token>, index:int)=>int

取参数表括号的下标：`index` 是方法名，名字后面允许夹一个**可选标记 `?`** 与一段类型参数段（`GenericType`），
再往后就是 `(` 括号。形状不对时返回 `-1`。

`?` 排在最前：TypeScript 的可选成员签名写作 `m?()` / `m?<T>()`，`?` 在类型参数之前。
没有这个 `?`，接口里的可选方法签名就永远匹配不上（`Get(units, i)` 拿到的是 `SymbolToken("?")` 而不是括号）。

**`*` 是生成器方法**（`class C { *g() {} }`）：它在**名字前面**，所以由 `Process` 在头部先吃掉、
而这里只需要知道「名字之后」的形状——`*` 不在名字之后，`ParameterIndex` 因此不用为它加分支。
（`Previous` 那一侧用 `GeneratorMark` 先把游标越过 `*`，见 `Previous` 的说明。）

`Previous` 与 `Process` 共用它。

```ts
let i = SkipNextWrapSymbol(units, index);
const mark = Get(units, i);
if (mark instanceof SymbolToken && mark.Is("?")) {
  i = SkipNextWrapSymbol(units, i);
}
if (Get(units, i) instanceof GenericType) {
  i = SkipNextWrapSymbol(units, i);
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

```ts
let tailEnd = -1;
let i = parametersIndex + 1;
while (i < units.length) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && (item.Is(";") || item.Is(","))) {
    break;
  }
  if (item instanceof LineWrap) {
    const previous = Get(units, i - 1);
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
全语料「成员·方法类」真缺从 18 涨到 41（用例集是绿的，靠
`tests/parse/gap-dashboard.mjs` 的逐节点对账才抓出来）。判据只能看**尾部之后是什么**。

```ts
const current = Get(units, index);
if (current === null) {
  return false;
}
const parent = current.Parent;
if (!(parent instanceof ClassBody) && !(parent instanceof InterfaceBody) && !(parent instanceof TypeLiteralBody)) {
  return false;
}
const tailEnd = this.SignatureTailEnd(units, parametersIndex);
const afterTail = Get(units, tailEnd >= 0 ? tailEnd + 1 : parametersIndex + 1);
if (afterTail === null || afterTail instanceof LineWrap) {
  return true;
}
return afterTail instanceof SymbolToken && (afterTail.Is(";") || afterTail.Is(","));
```

## private method AfterAssignment:(template:Template, units:Array<Token>, nameIndex:int)=>bool

`nameIndex` 处的名字是不是落在一个**赋值号右边**——也就是「字段 / 变量的初始化式」而不是成员声明。

**为什么必须有这一条**：`IsMemberSignature` 只问「名字的父单元是不是成员体」，而字段初始化式里的名字
**也在**成员体里。于是 `class C { A = new C("x"); }` 里那个 `C("x")` 会被本规则认成一条
`name(...)` 形式的方法签名，**并且因为它排在 `NewReorganization` 之前，构造器名被抢走之后
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

取方法名的文本：`Identifier` 直接取；**字符串字面量名字**（`"m"() { }`）取它第一个 `ConstString` 子单元的文本。

TypeScript 允许成员名写成字符串字面量（`class C { "m"() { } }`），
与 `Field` 那边的 `NameText` 是同一套处理——只认 `Identifier` 时这些成员整个丢掉。

```ts
if (unit instanceof Identifier) {
  return unit.TempToString();
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

**成员位置反而要放开禁用表**：`class A { delete() {} if() {} for() {} new() {} }` /
`interface I { for(): void }` 里的方法名正是关键字——它们是**成员名**，不存在
「`if (x)` 被误当成调用」的风险（那个风险只属于表达式位）。所以名字的父单元是成员体时不再查
`MethodNameTemplate`，只查语句位的那一支。

**但类型运算符在成员位也绝不是方法名**（第 66 轮补）：`readonly` 后面跟一个括号是
**类型位**的写法（`readonly (A | B)[]`），不是「名叫 `readonly` 的方法」。
放开禁用表的那一支必须单独挡这一次，否则实测
`interface ResolvedProjectReference { references?: readonly (ResolvedProjectReference | undefined)[] }`
整条成员被收成一个 `<MethodDeclaration name="readonly">`，那个 `[]` 还被当成返回类型
（产物里多出一个 `<ArrayLiteral>` 挂在 `ReturnType` 下）——成员名 `references`、
数组类型、括号类型、联合四种结构全塌（真实语料 `typescript.d.ts` 4 处）。

**只挡这五个词**：`readonly` / `keyof` / `unique` / `asserts` / `infer`。
`IsTypeModifier` 里的 `new` / `abstract` / `typeof` **不能**照抄着一起挡——
`class A { new() {} }` 里的 `new` 是**合法的方法名**（`lex-keyword-method-name.ts` 钉住这一条），
挡掉之后那个 `{}` 会退化成 `<ObjectLiteral>`（`cases:dashboard` 当场多一处）。
成员位的构造签名 `new (): A` 由排在本规则之前的 `SignatureReorganization` 认领，不靠这里。

**计算成员名 `[`m`]()` / `[x]()` 也算名字**：它是一个 `[` 括号，
名字由 `field.xl.md` 的 `BracketNameText` 拼出来（与 `[key: string]` 索引签名同一套）。
不认这一支时那个 `[...]` 会被收成 `ArrayLiteral`，整条方法声明散架。

```ts
let nameIndex = index;
const generator = this.GeneratorMark(units, index);
if (generator !== null) {
  nameIndex = SkipNextWrapSymbol(units, index);
}
const current = Get(units, nameIndex);
const isPrivateName = current instanceof SymbolToken && current.Is("#");
if (isPrivateName) {
  nameIndex = SkipNextWrapSymbol(units, nameIndex);
}
const name = Get(units, nameIndex);
const isComputedName = (name instanceof Bracket && name.startBracket === "[") || name instanceof ArrayLiteral;
if (isComputedName === false && !(name instanceof Identifier) && !(name instanceof String)) {
  return false;
}
const inMemberBody =
  name !== null &&
  (name.Parent instanceof ClassBody || name.Parent instanceof InterfaceBody || name.Parent instanceof TypeLiteralBody);
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
    return false;
  }
}
if (name instanceof Identifier && name.Is("import")) {
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
if (afterParameters instanceof SymbolToken && afterParameters.IsAny(MethodDeclarationReorganization.ValueOperators)) {
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
if (afterParameters !== null && (afterParameters instanceof Identifier || afterParameters.constructor.name === "Keyword") && MethodDeclarationReorganization.ValueKeywordTexts.includes(WordText(afterParameters))) {
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
- 参数表括号作为子单元留着；参数括号的内容已经由它自己的重组队列啃过
  （`(` 括号有队列，见 `../bracket.xl.md` 的 `Use`），不重复处理。
- 返回类型段（`:` 与类型单元）单独搬给 `ReturnType` 并 `TryToClose()`——**必须自成一段**，
  否则 `TypeDefine` 会从 `:` 一路吞到方法体里去（见 `./return-type.xl.md`）。
  它的边界由 `ScanDeclarationBody` / `ScanDeclarationTailEnd` 给出（见 `../declaration-common.xl.md`）。
- 名字与方法体之间搬进去的子单元里，软换行**不进树**（与 `Class` / `Function` 一致：
  它们本来就会被 `WrapSymbolReorganization` 摘掉，这里先一步跳过，免得落进一个不跑重组的单元里）。
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
  nameIndex = SkipNextWrapSymbol(units, index);
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
result.modifiers = DeclarationModifiers(units, startIndex, index).join(",");
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
  const semicolon = Get(units, memberEnd + 1);
  if (semicolon instanceof SymbolToken && semicolon.Is(";")) {
    memberEnd = memberEnd + 1;
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

## constructor:(template:Template)=>void

创建时把本类型的重组规则挂上来（模板里没有专门给 `MethodDeclaration` 注册就用通用队列）。

理由与 `Class` / `Function` 的构造器相同：返回类型那一段
（`:` 与类型单元）是 `Process` 搬进来的，不给自己的队列，它就凑不成 `TypeDefine`。

```ts
super(template);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## field name:string = ""

方法名。

## field modifiers:string = ""

声明前面的修饰词（`public` / `private` / `protected` / `static` / `readonly` / `abstract` / `override` /
`declare` / `accessor` / `async` / `get` / `set`），按源码顺序用 `,` 连接；没有修饰词时是空串。

## method CreateBody:()=>MethodBody

新建方法体段并挂到自己名下，返回新单元。

```ts
return this.Add(new MethodBody(this.Template));
```

## method CreateReturnType:()=>ReturnType

新建返回类型段并挂到自己名下，返回新单元。

返回类型单独成段是必须的：`TypeDefineReorganization` 从 `:` 起贪婪地收，直到 `;` / `,` / 赋值符号为止——
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

## method ToXmlString:()=>string

产出 XML：开标签上带 `name` 与 `modifiers` 两个属性。

与 `Method` 的 `<Method name="x">` 只在标签名与多出来的 `modifiers` 上不同——
调用点是 `Method`，声明点是 `MethodDeclaration`，两者靠标签名区分。

```ts
const name = this.constructor.name;
const temp: string[] = [];
for (const item of this.Data) {
  temp.push(item.ToXmlString());
}
return `<${name} name="${this.name}" modifiers="${this.modifiers}">${temp.join("")}</${name}>`;
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

两个声明字段都要抄。

```ts
const result = new MethodDeclaration(this.Template);
result.Sign(this);
result.name = this.name;
result.modifiers = this.modifiers;
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
