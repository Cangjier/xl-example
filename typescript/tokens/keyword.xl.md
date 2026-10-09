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
keyword.Value = item.TempToString();
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

## method ToXmlString:()=>string

产出 XML：`<Keyword>值</Keyword>`。

标签名是字面量，`Value` 直接拼进去，不做转义（连字符块那条路径不同）。

```ts
return `<Keyword>${this.Value}</Keyword>`;
```

## method ToDictionary:()=>Map<string, any>

产出 AST JSON 节点：类型名 + 关键字文本。

它是叶子：关键字文本在 `Value` 字段上，`Data` 里没有子单元，所以只写 `value`、不写 `children`。
`type` 按契约取 `this.constructor.name`，而 `ToXmlString` 的标签名是**写死的字面量 `Keyword`**——
这个类本身就叫 `Keyword`，两边实际一致，只是来路不同：XML 不看运行时类名，JSON 一律看。

```ts
const result: Map<string, any> = new Map();
result.set("type", this.constructor.name);
result.set("value", this.Value);
return result;
```

## method PrintAst:(ctx:any, v:any)=>any

**这一格是它自己出的**（第 77 轮）：关键字兜底身份在 TS 那边大多是 `XxxKeyword`
（`string` / `readonly` / `in`…），**表里没有的**才是 `Identifier`——同一个词在值位与类型位
可以是两种 kind，判据就是这个类自己的名字表（`KEYWORD_KIND`）。

```ts
const text = ctx.Text(v);
// **上下文关键字 `get` / `set` 一律按 `Identifier` 投**（第 67 轮）：TS 里它们**只有访问器位**
// 才是关键字，别处（`const set = 1;` / `f(set)` / `return get + 1;`）都是普通标识符。
// 原来的口径是「表里有就投关键字」，于是**引用位**的 `set` / `get` 被投成
// `SetKeyword` / `GetKeyword`——对拍尺子会当场点名（第 60 轮就是在 `set.xl.md` 里撞到的：
// 局部变量叫 `set`，产物里那一格成了 `SetKeyword`）。
// 访问器那两位由 `print-ast-common.xl.md` 的「按 `modifiers` 换 kind + 摘掉那个词」负责，
// 摘除**按文本**做（见那里的 `stripModifier`），所以这里投 `Identifier` 不影响它们。
const contextual = text === "get" || text === "set";
const kind = contextual ? undefined : ctx.KeywordKind(text);
return ctx.Node(kind === undefined ? "Identifier" : kind, { text }, v);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 抄 `Value` → `TryToClose()`。

```ts
const result = new Keyword(this.Template);
result.Sign(this);
result.Value = this.Value;
result.TryToClose();
return result;
```
