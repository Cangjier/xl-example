# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { Identifier } from "./identifier.xl.md"
import { Bracket } from "./bracket.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { SkipNextWrapSymbol, SkipNextTrivia } from "../text-common-util.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

关键字单元：把「在任意上下文都是关键字」的 `Identifier` 提升成一个 `Keyword`。它用得很少——关键字一般要结合具体上下文才算数，只有全上下文成立的关键字才值得单独成 unit。

`KeywordCloseRule` 写在 `Keyword` **之前**，与同目录其它 token 一致。

# class KeywordCloseRule extends CloseRule

`Previous` 认的是「内容被 `KeywordTemplate` 判定为关键字的 `Identifier`」。判定发生在字符块上，所以这一步只是**换个身份**：不产生新内容，只把普通字符块升级成关键字单元。

**判据与替换都抽到了 `Keyword` 的静态方法上**（第 487 轮）：解析期那一趟
（`Token.TryToClose` → `TokenFormer.ApplyCloseRules` → 本规则 `ApplyTo`）与这条规则走**同一份实现**，
所以「哪些词升级」「`as const` / `override` 两个例外」只有一处答案。

## static readonly field Instance:KeywordCloseRule = new KeywordCloseRule()

唯一的实例。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

转调 `Keyword.IsUpgradable`（判定器取自那个 `Identifier` **自己的**模板，见那一处）。

```ts
return Keyword.IsUpgradable(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

转调 `Keyword.UpgradeAt`：把这个 `Identifier` 换成一个 `Keyword`，**返回新的下标**。

```ts
return Keyword.UpgradeAt(units, index);
```

# class Keyword extends IndependentToken

关键字。

单元值类型是单字符的 `string`。

它覆写了 `ToXmlString`，且标签名是**写死的 `Keyword`**（不是运行时类名）——这一点与大多数 token 不同。

**三个静态方法都在这个类上**（第 487 轮抽出）：判据 `IsUpgradable`、替换 `UpgradeAt`、
解析期那一趟（`Token.TryToClose` → `ApplyCloseRules`）也用这一份。

## field IsKeywordUnit:bool = true

**我这一格是不是一个关键字单元**（第 1096 轮）：关键字就是这一页，所以常量答 `true`——
口径与理由见 `core/syntax/token.xl.md` 的 `IsKeywordUnit`。它与下面那一格 `IsNameNode`
（关键字也能当名字，第 1057 轮）不是同一问。

## field IsNameNode:bool = true

**我这一格能不能当「一个名字」**（第 1057 轮）：关键字答 `true`——`in` / `instanceof`
那几个词既是运算符，也在名字位上出现（限定名的右半、成员名、绑定名），所以
`Token.IsNameNode` 这一格由**这一页**显式声明并给出自己的值（构造时就赋好）。

判据过去在投影层（`print-ast-common.xl.md` 的 `isNameNode`：`Tag` 是 `Identifier` 或 `Keyword`），
而那两个名字**就是这一页与 `Identifier` 那一页自己的类名**——所以它本来就该由这两页各自答；
投影那一侧只读属性（`node.IsNameNode`），不再比类名。

## field IsOperatorUnit:bool = false

**我这一格能不能当「一个运算符」**（第 1062 轮）：关键字里只有 `in` / `instanceof`
这两个词算——所以这一格由**这一页**按自己的正文答（在 `SetValue` 里赋好）。
过去它是投影层的一个现场判据（`print-ast-common.xl.md` 的 `isOperatorUnit`），
而「我这一格的正文是什么」只有这一页知道。

## field OperatorWordKind:string = ""

**我这一格的正文是词形运算符的话，它在 TS 那边叫什么**（第 1106 轮）：`in` / `instanceof`
两态各自答 `InKeyword` / `InstanceOfKeyword`，其余（含正文还是空串的默认态）答**空串**。
判据与赋值点与上一格**同一趟**（`SetValue` 里紧跟着那一行）。

**这一页不另立一份词表**：上一格答「是不是那两个词」，而「是的话叫什么」本页早已有答案
——`KeywordKind` 就是按 `Value` 查 `KEYWORD_KIND` 得到的那个 `SyntaxKind` 名，
所以这一格读的是**本页自己的另一格**（`this.KeywordKind`），这两条词的 kind 仍然只有一处声明。
口径见 `../core/syntax/token.xl.md` 的 `OperatorWordKind`。

## field IsPrefixOperatorUnit:bool = false

**我这一格是不是一个前缀运算符**（第 1062 轮）：关键字里是 `typeof` / `void` /
`delete` / `await` 这四个词（`!x` / `-x` 那些在产物里是 `UnaryOperator` 单元或裸符号，
由那两页各自答），同样在 `SetValue` 里按正文赋好。

## field IsTypeParameterModifier:bool = false

**我这一格是不是类型参数的修饰词**（第 1062 轮）：关键字里是 `in` / `const` 这两个词
（`out` **不在这一页的名单里**：它词法上是标识符，所以那一格由 `Identifier` 那一页答——
两张名单各写自己认得的词，不是同一份名单抄两遍）。

## field IsChainBaseNode:bool = true

**我这一格能不能当一条链的基名**（投影侧那一问；第 1075 轮）：关键字**默认能**，
只有那几个自己就开始一种构造的词不算（`return` / `throw` / `case` / `default` / `else` /
`do` / `break` / `continue` / `yield` / `typeof` / `void` / `in` / `instanceof` / `new` /
`import` / `await` / `super`）——所以这一格由**这一页**按自己的正文答（在 `SetValue` 里赋好）。

**为什么默认 `true`**：与 `Identifier` 那一页同一条口径——`Value` 还是空串时投影读到的文本
就是空串，而空串不在那份名单里 ⇒ 那时的答案是 `true`。

判据过去在投影层（`print-ast-common.xl.md` 的 `IsChainBaseNode`：`Tag` 是 `Keyword` 就回读
`node.value` 排掉那串词）——而「我这一格的正文是什么」只有这一页知道。**这是同一句话的
第三处落点**（`Identifier` 那一页按自己的正文答同一问），两页各写自己认得的词，
与 `IsTypeParameterModifier` 那一格同一条口径。

## field IsNewKeyword:bool = false

**我这一格的正文是不是 `new` 那个词**（第 1118 轮）：是的话答 `true`，
在 `SetValue` 里与上面那几格**同一趟**赋好（判据同样是这一页自己的正文）。
口径与理由见 `../core/syntax/token.xl.md` 的 `IsNewKeyword`——
过去投影层的三处 `k.TextValue === "new"` 现在都读这一格。

## field IsAsyncKeyword:bool = false

**我这一格的正文是不是 `async` 那个词**（第 1118 轮）：同上一格，同一趟赋好。
（`async` 在本工程里多数时候停在 `Identifier` 上，所以那一页也答同一问——两页各写
自己认得的词，与 `IsTypeParameterModifier` 同一条口径。）

## field IsAbstractKeyword:bool = false

**我这一格的正文是不是 `abstract` 那个词**（第 1118 轮）：同上一格，同一趟赋好。

## field IsImportKeyword:bool = false

**我这一格的正文是不是 `import` 那个词**（第 1118 轮）：同上一格，同一趟赋好
（投影层 `new.target` / `import.meta` 那一支要的就是它）。

## field IsAsKeyword:bool = false

**我这一格的正文是不是 `as` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（投影层 `import { a as b }` 那一支要的就是它）。口径见
`../core/syntax/token.xl.md` 的 `IsAsKeyword`。

## field IsWithKeyword:bool = false

**我这一格的正文是不是 `with` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（投影层 `with (obj) { … }` 那一支要的就是它）。

## field IsExportKeyword:bool = false

**我这一格的正文是不是 `export` 那个词**（第 1119 轮）：同上一格，同一趟赋好。

## field IsDefaultKeyword:bool = false

**我这一格的正文是不是 `default` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（与上一格一起决定 `ExportKeyword` / `DefaultKeyword` 两态）。

## field IsDeclareKeyword:bool = false

**我这一格的正文是不是 `declare` 那个词**（第 1124 轮）：同上一格，同一趟赋好
（投影层「`export` / `declare` / `default` 前缀 + 一条声明」那两支要的就是它）。
口径与理由见 `../core/syntax/token.xl.md` 的 `IsDeclareKeyword`——它与本页
`IsDeclareWord`（`const` / `let` / `var`）**不是同一问**：那一格答「是不是一个声明词」，
这一格答「是不是 `declare` 这一个词」。

## field IsExtendsKeyword:bool = false

**我这一格的正文是不是 `extends` 那个词**（第 1119 轮）：同上一格，同一趟赋好
（投影层条件类型 `T extends U ? X : Y` 那一支要的就是它）。

## field IsTypeKeyword:bool = false

**我这一格的正文是不是 `type` 那个词**（第 1120 轮）：同上一格，同一趟赋好
（投影层导出子句 `export { type A }` / `export type { B }` 那一支要的就是它）。

## field IsIsKeyword:bool = false

**我这一格的正文是不是 `is` 那个词**（第 1120 轮）：同上一格，同一趟赋好
（投影层类型谓词 `x is T` / `asserts x is T` 那一支要的就是它；`is` 不是本工程的
关键字、多数时候停在 `Identifier` 上，所以两页各写自己认得的词）。

## field IsDeclareWord:bool = false

**我这一格的正文是不是一个声明词**（第 1121 轮）：同上一格，同一趟赋好——本页认
`const` / `let` / `var` 三个（`using` 不是本工程的关键字，由 `Identifier` 那一页认），
投影层 `ctx.HeadDeclare` 认出「名字那一格」与「列表的起点」要的就是它。
口径与理由见 `../core/syntax/token.xl.md` 的 `IsDeclareWord`。

## static method IsUpgradable:(units:Array<Token>, index:int)=>bool

`index` 处的 `Identifier` 的内容是不是关键字。

判定器取自那个 `Identifier` **自己的**模板，而不是 `Previous` 的入参 `template`。

**`as const` 是唯一的例外**（第 62 轮补）：`const` 在 `KeywordTemplate` 里是关键词，
可它在 `as const` 里是 TypeScript 的**字面量类型标记**，不该升级——升了之后
`x as const satisfies B` 的用例当场从通过变失败（`as` 节点挂类型队列，
关键词升级就在那一趟里跑，所以要在这儿挡住；判定用类名，避免绕出环）。

**装饰器名字位同样不算关键字**：`@readonly` / `@override` 是「拿一个名字当表达式」，
TS 那边那个词就是 `Identifier`。这一档与 `as const` 同一个形状——同一个词换个位置就不是关键字。
**枚举成员**同理：`enum E { readonly = 1 }` 那两格是成员名与初始化式里的引用，都是普通标识符。

```ts
const unit = Get(units, index);
if (unit instanceof Identifier && unit.Parent !== null && unit.Parent.constructor.name === "As" && unit.Is("const")) {
  return false;
}
// **装饰器名字位上不升级**：`@readonly` 是「拿一个名字当表达式」，TS 那边它就是 `Identifier`，
// 而关键字表里有 `readonly`——升了之后投影把 `Decorator.expression` 投成 `ReadonlyKeyword`
// （实测 `@readonly readonly x = 1`：缺 `Identifier` 1 + 多出 `ReadonlyKeyword` 1）。
// 判据看**直接父亲**：装饰器的子单元都是值表达式（名字链 / 实参括号 / 括号表达式），
// 而括号表达式里那一层已经换了父亲（括号或运算符）⇒ 照旧升级。
if (unit instanceof Identifier && unit.Parent !== null && unit.Parent.constructor.name === "Decorator") {
  return false;
}
// **枚举成员里也不升级**：`enum E { readonly = 1, async = 2 }` 的名字与初始化式里的引用都是
// **普通标识符**（TS 那边是 `Identifier`），而这两个词都在关键字表里——升了之后投影整类报
// 「缺 `Identifier` 2 + 多出 `ReadonlyKeyword` / `AsyncKeyword` 2」（实测）。
if (unit instanceof Identifier && unit.Parent !== null && unit.Parent.constructor.name === "EnumMember") {
  return false;
}
// **`override` 是「上下文关键字」**（第 383 轮）——与上面 `as const` 那一格**同一个形状**
// （都是「这个词在别的位置上不是关键字」，所以判据也放在同一处）。
//
// 它只在**类成员 / 形参的修饰位**上才是关键字（`override foo() {}`），
// 而它同时是一个**完全合法的变量名**——判据 `c371-e2e-permissions-matrix` 里
// 就是这么写的：`const override = overrides[key];`。
// **少了这一条会怎样**：`const override = 1; console.log(override + 1)` 里
// **声明处**那个词活在 `Let.fieldName` 这个**属性**上（不受影响），
// 而**使用处**被升成 `Keyword` ⇒ 降级层报
// `unimplemented: expression OverrideKeyword`（**整份文件进不来**）。
//
// **判据看后一个有意义的单元**：
//   · 修饰位后面一定跟着一个**名字**——`Identifier`、引号名（`String`）、
//     生成器那个 `*`；
//   · 值位后面跟着的是 `=` / 运算符 / `;` / `,` / `[` 那一类。
// **`[` 不算名字**（第一版把它算进去了，当场踩到）：`override && override[action]`
// 里那个 `override` 后面也是 `[`，可那是**下标访问** 不是计算成员名——
// 它一被算成名字就又升成 `Keyword`（判据 `c371-e2e-permissions-matrix` 第二次红的就是它）。
// **计算成员名那一档今天让掉**：`override [k]()` 在真实语料里很少，
// 而它的**修饰词收集是按文本做的**（`declaration-common.xl.md` 的 `IsDeclarationModifier`），
// 所以让掉只影响那个 `OverrideKeyword` **节点**，不影响「成员还是成员」。
// **只在「后一格是名字」时升级**——`override: number`（一个叫 `override` 的成员）
// 后面是 `:` ⇒ 也不升级（TS 那边它是一个属性名）。
if (unit instanceof Identifier && unit.Is("override")) {
  const after = Get(units, SkipNextWrapSymbol(units, index));
  if (after === null) {
    return false;
  }
  if (after instanceof Identifier) {
    return true;
  }
  if (after.constructor.name === "String") {
    return true;
  }
  if (after instanceof SymbolToken && after.TempToString() === "*") {
    return true;
  }
  return false;
}
// **`async` 只在 `function` 前面升级**（第 842 轮）：它与 `override` 同一档 ——
// **上下文关键字**。TS 那边只有「`async` 紧跟 `function`」这一种写法才把它收成修饰词
// （`AsyncKeyword` 节点），其余位置（`async;` / `x = async;` / `async(1)`）那个词都是
// **普通 `Identifier`**。
//
// **少了这一条会怎样**（实测）：`async` 换行（或夹一条行注释）`function f() { … }` 里
// 语句层已经按 ASI 把 `async` 收成**单独一条壳**（TS 那边正是
// `ExpressionStatement > Identifier`），可它一升级就投成 `AsyncKeyword`
// ⇒ 那一格「缺 `Identifier` 1 + 多出 `AsyncKeyword` 1」
//（`gap-sweep-{newline,linecomment}-async-01` 两条）。同一个形状还能量出
// `async;` / `x = async;` / `async(1);` 三格（本轮探针，不在语料里）。
//
// **为什么只看 `function`**：另外两档都不靠这个 `Keyword` 单元 ——
// 箭头那一档（`async (x) => x`）由 `Lamda.IsAsync` 从**前一个 `Identifier`** 认出来
//（`lamda/lamda.xl.md`，它问的正是 `instanceof Identifier`），
// 方法与函数头那一档由 `modifiers` 那一列**按文本**收
//（`print-ast-common.xl.md` 的 `["async", "AsyncKeyword"]`，`async function f() {}`
// 的产物里那个词**根本不在 `Data` 里**：`<Function modifiers="async">`）——
// 所以不升级一个字都不影响它们，只把那几格**多出来的** `AsyncKeyword` 去掉。
//
// **`await` 这一轮不动**：它在值位被判成关键字的那几格（`await;` 那种裸写）
// 同样与 TS 不符（本轮探针实测），可它的投影侧还有 `AwaitExpression` 那一族
// 靠「前导 `Keyword(await)`」成形（`print-ast-common.xl.md` 的三处），
// 动它要先量清那三处，不塞进这一轮。
if (unit instanceof Identifier && unit.Is("async")) {
  const after = Get(units, SkipNextTrivia(units, index));
  let word = "";
  if (after instanceof Identifier) {
    word = after.TempToString();
  } else if (after instanceof Keyword) {
    word = after.Value;
  }
  return word === "function";
}
// **`declare` / `abstract` 只在后面确实跟着「要被修饰的东西」时才升级**（第 848 轮）：
// 这两个词都是**上下文关键字** —— `abstract` 换行 `class A {}`、`declare` 换行
// `module "m" {}`、`declare;` 在 TS 那边那个词都是**普通 `Identifier`**
// （`ExpressionStatement > Identifier`）：语句层已经按 ASI 把它收成**单独一条壳**
// （于是本单元后面**什么都没有**），而 `;` 不是「能被修饰的东西」。
//
// **判据与 `override` / `async` 同一档**（看后一个实义单元）：只有 Identifier /
// 引号名 / 关键字这一档才算「后面有个东西」，`;` / `=` / `)` 这些一律不算。
// **同行的写法一个字都不误伤**：`abstract class A {}` / `declare module "m" {}` /
// `declare const a = 1` 里那个词后面就是同一个壳里的 `class` / `module` / `const`。
//
// **少了这一条会怎样**（实测十条片段同形）：那一格「缺 `Identifier` 1 +
// 多出 `AbstractKeyword` / `DeclareKeyword` 1」——`gap-sweep-newline-decl-abstract-01`
// 与 `gap-sweep-newline-mod-declare-01` 就是其中两条（顶层与函数体里各量到一格）。
if (unit instanceof Identifier && (unit.Is("declare") || unit.Is("abstract"))) {
  const after = Get(units, SkipNextTrivia(units, index));
  if (after === null) {
    return false;
  }
  if (after instanceof Identifier || after instanceof Keyword) {
    return true;
  }
  // **抽象构造签名那一格**（第 848 轮实测的第二处）：`interface I { abstract new (): A }` 里
  // 后面跟的是 `New` **单元**（整条 `new (): A`），不是词——它同样是被修饰的东西
  //（少了这一格 `decl-interface-abstract-construct-signature` 当场从 `Keyword` 掉成 0 个）。
  if (after.constructor.name === "New") {
    return true;
  }
  return after.constructor.name === "String";
}
return unit instanceof Identifier && unit.Template.KeywordTemplate.IsKeyword(unit.TempToString());
```

## static method UpgradeAt:(units:Array<Token>, index:int)=>int

把这个 `Identifier` 换成一个 `Keyword`，**返回新的下标**。

要点：

- 新单元用的是**被替换单元自己的** `Template`（`commonUnit.Template`），不是 `Process` 的入参 `template`——不要「顺手」改成入参。
- 它的范围直接沿用那个 `Identifier` 的起止。
- **`Parent` 要自己抄**（第 66 轮补）：`ReplaceCountAt` 只做 `splice`，**不设 `Parent`**（`Token.Add` 才设），
  所以不抄的话这个 `Keyword` 的 `Parent` 永远是 `null`。别的规则大多只读自己的 `Data`，
  这条一直是隐性的；类型层那两条规则（`type-operator.xl.md` / `type-bracket.xl.md`）**要看父亲是哪一类容器**，
  于是当场暴露：`type A = keyof typeof h` 里外层 `keyof` 被问到时 `Parent` 是 `null`、
  `IsTypeContainerUnit` 给否，**两层只成了一层**（实测产物是 `<Keyword>keyof</Keyword><TypeQuery>…`）。
  抄的是被替换单元的 `Parent`，所以「还没挂上去（`Parent === null`）」这个信号原样保留——
  `unary-operator.xl.md` 的第 57 轮判据（`Parent === null` 的 `typeof` 不折一元运算）不受影响。
- 四个参数的 `ReplaceAt` 重载叫 `ReplaceCountAt`，返回的 `index` 就是新下标；被替换掉的 `Identifier` 交给 GC。
- `Get` 的结果直接断言成 `Identifier`。

```ts
const commonUnit = Get(units, index) as Identifier;
const keyword = Keyword.FromIdentifier(commonUnit.Parent, commonUnit);
return ReplaceCountAt(units, index, 1, keyword);
```

## static method FromIdentifier:(owner:Token | null, item:Identifier)=>Keyword

把一个内容为关键字的 `Identifier` 造成 `Keyword` 单元——**一份答案**。

三个调用方：

- `Keyword.UpgradeAt`（**替换那一格**）：重组那条规则与解析期那一趟都走它；
- `HeritageClause.Take`（**解析期**那一趟）：类头 / 接口头在 `{` 那一刻整理时，
  子句词当场升成 `<Keyword>`，所以 `HeritageClause` 自己**不用挂规则队列**。

范围沿用那个 `Identifier` 的起止；新单元用**被替换单元自己的** `Template`；
`Parent` 由调用方给（`ReplaceCountAt` 只做 `splice`、**不设** `Parent`，
所以「还没挂上去（`Parent === null`）」这个信号原样保留——
`unary-operator.xl.md` 第 57 轮那条判据靠的正是它）。

```ts
const keyword = new Keyword(item.Template);
keyword.Parent = owner;
keyword.SignIn(item.SourceRange.Start!);
keyword.SignOut(item.SourceRange.End!);
keyword.SetValue(item.TempToString());
keyword.TryToClose();
return keyword;
```

## constructor:(template:Template)=>void

转调基类构造器。

```ts
super(template);
```

## field Value:string = ""

关键字文本，从被替换的 `Identifier` 抄过来。

## method SetValue:(text:string)=>void

**记下正文，并把由它派生的那几格一起赋好**（第 1042 / 1062 轮）。

`Value` 是这一页**唯一的输入**，而 `KeywordKind` / `StatementKind` / `StatementField` /
`IsStatementNode` / `IsOperatorUnit` / `OperatorWordKind` / `IsPrefixOperatorUnit` /
`IsTypeParameterModifier` / `IsNewKeyword` / `IsAsyncKeyword` / `IsAbstractKeyword` /
`IsImportKeyword` / `IsAsKeyword` / `IsWithKeyword` / `IsExportKeyword` / `IsDefaultKeyword` /
`IsDeclareKeyword` / `IsExtendsKeyword` / `IsTypeKeyword` / `IsIsKeyword` / `IsDeclareWord` 都是它的函数
（前四格查本页那两张词汇表，后十四格比正文里的那几个词）
——所以赋值只有**这一个入口**：
`UpgradeAt` 与 `Clone` 都走它。**为什么要有这一格**：第 1042 轮把那四格从方法改成属性之后，
「谁保证它们与 `Value` 同步」就成了这一页自己的责任；两处赋值点各写几行就会漂，
收成一个入口才与「同一份事实一处声明」同一条口径。

```ts
this.Value = text;
this.KeywordKind = KEYWORD_KIND.get(text);
const kind = KEYWORD_STATEMENT_KINDS.get(text);
this.StatementKind = kind;
this.StatementField =
  kind === undefined ? undefined : (kind === "ReturnStatement" || kind === "ThrowStatement" ? "expression" : "label");
this.IsStatementNode = KEYWORD_STATEMENT_KINDS.has(text);
// **三格小判据都是「我这一格的正文是什么」的函数**（第 1062 轮）：与上面那几格同一趟赋好。
this.IsOperatorUnit = text === "in" || text === "instanceof";
// **第 1106 轮**：同一份事实的第二个出口——是那两个词的话，名字也从本页那一格抄过来
// （「是的话叫什么」本页早就有答案，见 `KeywordKind`）。
this.OperatorWordKind = this.IsOperatorUnit ? (this.KeywordKind ?? "") : "";
this.IsPrefixOperatorUnit =
  text === "typeof" || text === "void" || text === "delete" || text === "await";
this.IsTypeParameterModifier = text === "in" || text === "const";
// **第 1118 轮**：投影层那几处 `k.TextValue === "new"` / `"import"` 收成属性读——
// 判据仍是这一页自己的正文，所以与上面那几格**同一趟**赋好。
this.IsNewKeyword = text === "new";
this.IsAsyncKeyword = text === "async";
this.IsAbstractKeyword = text === "abstract";
this.IsImportKeyword = text === "import";
// **第 1119 轮**：`as` / `with` / `export` / `default` 四格同一趟赋好
// （投影层的导入导出那几支按它们分辨形状）。
this.IsAsKeyword = text === "as";
this.IsWithKeyword = text === "with";
this.IsExportKeyword = text === "export";
this.IsDefaultKeyword = text === "default";
// **第 1124 轮**：`declare` 那一格同一趟赋好（投影层那两处按固定字面量比正文的前缀词表）。
this.IsDeclareKeyword = text === "declare";
this.IsExtendsKeyword = text === "extends";
// **第 1120 轮**：`type` / `is` 两格同一趟赋好（导出子句那个标志词与类型谓词那个词）。
this.IsTypeKeyword = text === "type";
this.IsIsKeyword = text === "is";
// **第 1121 轮**：声明词那一格也是同一份正文的函数——本页认 keyword 那一态的三个词
// （`using` 停在 `Identifier` 上，由那一页认），投影层 `ctx.HeadDeclare` 读这一格。
this.IsDeclareWord = text === "const" || text === "let" || text === "var";
// **第 1075 轮**：投影侧那一问（这一格能不能当链的基名）也是同一份正文的函数——同一趟赋好。
this.IsChainBaseNode = !(
  text === "return" ||
  text === "throw" ||
  text === "case" ||
  text === "default" ||
  text === "else" ||
  text === "do" ||
  text === "break" ||
  text === "continue" ||
  text === "yield" ||
  text === "typeof" ||
  text === "void" ||
  text === "in" ||
  text === "instanceof" ||
  text === "new" ||
  text === "import" ||
  text === "await" ||
  text === "super"
);
```

## method ToXmlString:()=>string

产出 XML：`<Keyword>值</Keyword>`。

标签名是字面量，`Value` 直接拼进去，不做转义（连字符块那条路径不同）。

```ts
return `<Keyword range="${this.RangeOf()}">${this.Value}</Keyword>`;
```

## property value:string

`value` 这一格**由这一页自己声明**（第 1018 轮）：投影读的就是这一页自己的这一格。

### get

```ts
return this.Value;
```

## method PrintDirectAst:(ctx:any, v:any)=>any

**第三个出口的直出版**（第 992 轮）：与上面的 `PrintDirectAst` 出**同一个答案**，
但只许用这个 token 自己的属性、子单元与 `Parent`（不回原文查）——
口径与两条判据见 `core/syntax/token.xl.md` 的 `PrintDirectAst`。

```ts
  // **文本读 token 自己的 `Value`**（第 992 轮）：关键字兜底身份的正文就记在那一格上
  // （投影读的 `value` 与它同源），不必回原文切。
  const text = this.Value;
  // 上下文关键字 `get` / `set` 一律按 `Identifier` 投（理由见上面的 `PrintDirectAst`）。
  const contextual = text === "get" || text === "set";
  const kind = contextual ? undefined : this.KeywordKind;
  return ctx.Node(kind === undefined ? "Identifier" : kind, { text }, v);
```


## field StatementKind:string | undefined = undefined

**我这一格是不是「语句头」**（第 1027 轮）——是的话答那条语句在 TS 那边的 kind，不是的话答 `undefined`。

`return a + b` 这一族在产物里是**一个 `Keyword` 加一段平级兄弟**，而 TS 那边是**一个语句节点包住表达式**。
「哪几个词能当语句头、各自叫什么节点」说的就是**这一页自己的事实**（词住在我这里，
`Value` 就是那个词），所以由我记；过去它住在投影层那一张按文本查的
`KEYWORD_STATEMENT_KINDS` 里——同一份事实被声明了两遍，且改一个词要跑两个地方。
基类默认 `undefined`（不决定语句 kind），覆写只此一页。

**第 1042 轮起它是属性**：值在 `SetValue` 记下正文那一刻就从词汇表查好（与 `KeywordKind` /
`StatementField` / `IsStatementNode` 同一趟），投影直读。

## field KeywordKind:string | undefined = undefined

**我这个词在 TS 那边是哪个 kind**（第 1028 轮）——查得到就答那个 `SyntaxKind` 名，查不到答 `undefined`
（＝投影按 `Identifier` 投它）。

键是**我这一页的 `Value`**、值是「我这个词在 TS 词汇表里叫什么」：两样都是这一页自己的事实。
过去它住在投影层那一张按文本查的 `KEYWORD_KIND` 里（44 档），于是同一份词汇被声明了两遍，
改一个词要跑两个地方；现在与 `StatementKind()` 同一形态——**投影问这一格，不替它记第二遍**。

**它不是 `AstKind`** ✗：上下文关键字 `get` / `set` 在投影里按 `Identifier` 投
（见上面的 `PrintDirectAst`），所以「我这个词对应哪个关键字 kind」与「我这一格投成哪个节点」
是两件事，由这一格单独记。

**第 1042 轮起它是属性**：值在 `SetValue` 记下正文那一刻查好；`PrintDirectAst` 直读
（`this.KeywordKind`），不再问「有没有这一格」。

## field StatementField:string | undefined = undefined

**我这一格当语句头时，载荷进哪个字段**（第 1037 轮）：`return` / `throw` 那句话的载荷在
TS 那边叫 `expression`，`break` / `continue` / `debugger` 叫 `label`——两份都由**本页的
关键字词汇表**（`KEYWORD_STATEMENT_KINDS`）定，所以这一格只读那一张表，不另立名单。
不是语句头（`StatementKind` 是 `undefined`）时也是 `undefined`。

过去它是投影层的一张按**语句 kind** 查的集合（`KEYWORD_STATEMENT_EXPRESSION`），
可那些 kind 名就是这张词汇表的**值**、词又住在我这里——同一份事实两处声明，
改一个词要跑两个地方（与 `StatementKind` / `KeywordKind` 第 1027 / 1028 轮搬家同一条理由）。

**第 1042 轮起它是属性**：与 `StatementKind` 同一次查表的两个出口，都在 `SetValue` 里赋好。

## field IsStatementNode:bool = false

**我这一格投出来的是不是一条「语句节点」**（第 1039 轮）：`return` / `throw` / `break` /
`continue` / `debugger` 这五个词把整条语句定下来（`StatementKind` 的同一张词汇表），
所以它们是语句节点；别的关键字（`export` / `declare` / `if`…）不是。

判据原本写成投影层的一个 `# private const STATEMENT_KINDS:Set<string>`
（`typescript/print-ast-common.xl.md`）——单子单元的语句壳**不再套** `ExpressionStatement`，
而「哪些词自己就是一条语句」是**本页词汇表**回答的事（与 `StatementKind` / `StatementField`
同一来源），所以由本页记，投影那一侧不再存第二份。

**第 1042 轮起它是属性**：值在 `SetValue` 记下正文那一刻一起赋好（`KEYWORD_STATEMENT_KINDS`
那一次查表的第三个出口），投影直读。

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → **`SetValue` 把正文与由它派生的那几格一起抄过来** → `TryToClose()`。
抄的是 `SetValue` 而不是单个 `Value`：克隆体的那四格由此与正文**同源**，不会一个抄到、一个留在默认值。

```ts
const result = new Keyword(this.Template);
result.Sign(this);
result.SetValue(this.Value);
result.TryToClose();
return result;
```

# private const KEYWORD_STATEMENT_KINDS:Map<string, string>

**哪几个关键字把整条语句定下来**（第 34 轮那一族，第 1027 轮从投影层搬到这里）。

这一族在产物里是**一个 `Keyword` 加一段平级兄弟**（`return a + b` ⇒ `Keyword(return)` + `BinaryOperator`），
而 TS 是**一个语句节点包住表达式**。早先它们一律掉进 `ExpressionStatement` 分支、
只投影第一个单元，于是「头一个 `Keyword` 变成 Identifier、后面整段子树消失」——
真实语料 `ReturnStatement` 缺 1722 处，连带里面的 `BinaryExpression` / `CallExpression` /
`Identifier` 一起缺。

**为什么住在这一页**：键是**我这一页的 `Value`**、值是「我这一格投出来的语句叫什么」——
两样都是这一页自己的事实（与 `Value` / `StatementKind` 同源）。投影只问 `StatementKind()` 这一格，
不替它记第二遍。

```ts
new Map([
  ["return", "ReturnStatement"],
  ["throw", "ThrowStatement"],
  ["break", "BreakStatement"],
  ["continue", "ContinueStatement"],
  ["debugger", "DebuggerStatement"],
])
```

# private const KEYWORD_KIND:Map<string, string>

**关键字词汇表**：`Value` → 它在 TS 词汇表里的 `SyntaxKind` 名（第 1028 轮从投影层搬到这里）。

这一格是 `KeywordKind()` 要读的那份词汇——键与值都是**这一页自己的事实**
（词住在我这里，`Value` 就是那个词）。搬过来之前它叫 `KEYWORD_KIND`、住在
`typescript/print-ast-common.xl.md`，而投影对它的用法只有一处（`Keyword.PrintDirectAst`
拿自己的 `Value` 去查），于是同一份词汇在两个地方各有一份声明：改一个词要跑两个地方，
而投影那一份的读者其实只有这一个 token 页。

```ts
new Map([
  ["string", "StringKeyword"], ["number", "NumberKeyword"], ["boolean", "BooleanKeyword"],
  ["void", "VoidKeyword"], ["any", "AnyKeyword"], ["unknown", "UnknownKeyword"],
  ["never", "NeverKeyword"], ["object", "ObjectKeyword"], ["symbol", "SymbolKeyword"],
  ["bigint", "BigIntKeyword"], ["undefined", "UndefinedKeyword"], ["null", "NullKeyword"],
  ["true", "TrueKeyword"], ["false", "FalseKeyword"], ["readonly", "ReadonlyKeyword"],
  ["typeof", "TypeOfKeyword"], ["keyof", "KeyOfKeyword"], ["unique", "UniqueKeyword"],
  ["infer", "InferKeyword"], ["extends", "ExtendsKeyword"], ["this", "ThisKeyword"],
  ["abstract", "AbstractKeyword"], ["declare", "DeclareKeyword"], ["export", "ExportKeyword"],
  ["import", "ImportKeyword"], ["new", "NewKeyword"], ["async", "AsyncKeyword"],
  ["await", "AwaitKeyword"], ["static", "StaticKeyword"], ["public", "PublicKeyword"],
  ["private", "PrivateKeyword"], ["protected", "ProtectedKeyword"], ["override", "OverrideKeyword"],
  ["get", "GetKeyword"], ["set", "SetKeyword"], ["default", "DefaultKeyword"],
  ["as", "AsKeyword"], ["satisfies", "SatisfiesKeyword"],
  // **`in` / `instanceof` 是 `Keyword`、也是 TS 的语义子节点**（`BinaryExpression` 的
  // `operatorToken` 就是它们）。漏了这两条时它们被投成 `Identifier`：
  // 真实语料 `InstanceOfKeyword` 缺 878 处（第 34 轮修）。
  ["in", "InKeyword"], ["instanceof", "InstanceOfKeyword"], ["asserts", "AssertsKeyword"],
  // **`super` 也在这里**（第 98 轮）：`super.x` 的产物把 `super` 记成 `<Keyword>`，
  // 而它在 TS 那边永远是 `SuperKeyword`（不可能是标识符名）。
  ["super", "SuperKeyword"],
])
```
