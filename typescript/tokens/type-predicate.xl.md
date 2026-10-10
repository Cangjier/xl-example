# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt } from "../../core/extensions/list-extension.xl.md"
import { WordText, IsTypeContainerUnit, IsTriviaUnit, SkipNextTrivia, SkipPreviousTrivia } from "../text-common-util.xl.md"
import { Identifier } from "./identifier.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
import { MethodCloseRule } from "./method.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**类型谓词**：返回类型位上的 `x is T` / `this is T` / `asserts x is T` / `asserts x`
收成一个 `TypePredicate`。

TypeScript 那边它是一个**独立的类型节点**（`TypePredicate`：`parameterName` + 可选的
`assertsModifier` + 可选类型），本工程原来把这段留成 `TypeDefine` 里的散单元
（`<Identifier>x</Identifier><Keyword>is</Keyword><Identifier>string</Identifier>`），
`is` 只是一个关键词、**「这是类型谓词」这件事没有节点**。

**锚在容器的第一个实义单元上**（不是锚在 `is` 上）：`asserts x` 那一支根本没有 `is`
（TS 允许只断言「真」），只认 `is` 会漏掉它。判据因此是「这一格的内容**整体**长成谓词形状」。

**容器必须是类型容器，而且内容整段都是谓词**：参数标注 `x: unknown` 的内容只有一个词、
返回类型 `: Promise<void>` 也没有 `is`——两者都不成形，不会误伤。

# class TypePredicateCloseRule extends CloseRule

它永远不进 `Data`、不进 XML。

## static readonly field Instance:TypePredicateCloseRule = new TypePredicateCloseRule()

唯一的实例。

## constructor:()=>void

**把「这一格是不是谓词的括号」交给 `MethodCloseRule`**（第 957 轮）。

理由是一条时序：谓词那两条规则的闸门是「父亲是不是**类型容器**」
（`IsTypeContainerUnit`），而谓词的类型**套一层圆括号**时，**括号关闭那一刻**
这一格的父亲还不是类型容器（判据那一趟来晚了）；可 `MethodCloseRule` **恰恰在那一刻**
看到平级的 `[名字, is, (…)]`，于是把 `(` 当成实参表抢成一次调用
⇒ `x is (string)` / `asserts x is (A)` / `this is (A)` 那一族（23 条片段）整条谓词塌掉。
**那一趟没有办法把括号要回来**（`Process` 只能搬走还平级的那一段，而括号已经被装进
`Method` 里了），所以闸门必须下在**它前面**：把本规则挂到 `MethodCloseRule.PredicateShape` 上。

**判据只有一份**（第 875 轮那条规矩）：`IsPredicateAt` 是唯一实现，两处都只是转发。

**参数是「括号下标」**（本规则才认得出谓词的形状）：`MethodCloseRule` 手上那一格是
`(` **后面**跟着的括号，名字在它左边。往回两跳就是谓词开头那一格——
先跨 trivia 撞上 `is`，再跨一次 trivia 撞上名字；`asserts x` 那一档（没有 `is`）
由后面第二跳的 `.Is("is")` 挡掉，原样落在名字上。

```ts
super();
MethodCloseRule.PredicateShape = (units: Array<Token>, bracketIndex: number): boolean => {
  const wordAt = SkipPreviousTrivia(units, bracketIndex);
  let nameAt = wordAt;
  if (this.IsPredicateWord(Get(units, wordAt), "is")) {
    nameAt = SkipPreviousTrivia(units, wordAt);
  }
  return this.IsPredicateAt(units, nameAt);
};
```

## private method IsPredicateWord:(item:Token | null, text:string)=>bool

这个单元是不是那个词（`is` / `asserts`）。两种形态都认：还没升级的 `Identifier`
与已经升级的 `Keyword`（类型队列里 `KeywordCloseRule` 排在最后，通用队列里可能已经跑过）。

```ts
if (item === null) {
  return false;
}
if (item instanceof Identifier) {
  return item.Is(text);
}
if (item.constructor.name === "Keyword") {
  return WordText(item) === text;
}
return false;
```

## private method IsPredicateAt:(units:Array<Token>, index:int)=>bool

`index` 处的这一格内容是不是一个类型谓词的开头。

形状两种（`asserts` 可以带 `is`，也可以只断言名字）：

    [asserts] <name> is <type…>
    [asserts] <name>

`<name>` 是 `Identifier` 或 `this`（`this is T` 里的 `this` 在词法阶段是 `Keyword`）。

**`is` 后面那一段不设限**：TS 的 `TypePredicate.type` 可以是联合 / 交叉 / 函数类型
（`x is A | B`），所以本规则整段收下，让 `TypePredicate` 自己挂通用队列把里面的类型继续成形
（与 TS 的 `TypePredicate > UnionType` 一对一）。

**每一格都走 trivia 口径**（第 869 轮）：`asserts /* c */ this is A` / `x /* c */ is string`
是合法排法（与 `Previous` 那一边同一件事，见「相邻的那一格一律走 trivia」那条硬规矩），
原来一路 `+ 1` / `+ 2` 数下标，撞上注释就判不出谓词形状——实测两处：`x /* c */ is string`
（缺 `TypePredicate` / `StringKeyword`）与 `asserts /* c */ this is A`（缺 5 多 2）。

```ts
const first = Get(units, index);
if (first === null) {
  return false;
}
let cursor = index;
if (this.IsPredicateWord(first, "asserts")) {
  cursor = SkipNextTrivia(units, cursor);
}
const name = Get(units, cursor);
if (name === null) {
  return false;
}
if (!(name instanceof Identifier) && name.constructor.name !== "Keyword") {
  return false;
}
const word = WordText(name);
if (word === "" || word === "asserts" || word === "is") {
  return false;
}
const nextAt = SkipNextTrivia(units, cursor);
const next = Get(units, nextAt);
if (next === null) {
  // `asserts x`：整段到这里结束（单独的 `x` 不是谓词——所以必须见过 `asserts`）
  return cursor > index;
}
if (this.IsPredicateWord(next, "is") === false) {
  return false;
}
return Get(units, SkipNextTrivia(units, nextAt)) !== null;
```

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是谓词的开头。

四条：`index` 是容器里的**第一个实义单元**或者是**某个标记词右边那一格**；容器是类型容器
（`TypeDefine` / `ReturnType` / `TypeParameter` / `TypeAssign` … 都在白名单里）；
**已经在谓词里的不再收**；这一格内容整体长成谓词形状。
这两条「起点」判定与「这一格长成什么形状」那一段**都跨 trivia**（第 869 轮）——
注释与软换行在类型位里是同一件事，撞上就判不出形状。

**标记词那一支原来只认 `=>`**（第 680 轮补上另两个）：它给的是**函数类型的返回位**
（`(value: T, …) => value is S`），而同一个形状在另外两处**一模一样**——

    type T = asserts x is A;                    // 类型别名：`=` 右边就是类型位
    function f<X extends asserts x is A>(…)     // 泛型约束：`extends` 右边就是类型位

两处都不是「容器的第一个实义单元」（`=` / `extends` 在它左边），原来于是整段落成散单元
（实测 `type-asserts-toplevel` 缺 5 多 2、`type-param-asserts-constraint` 缺 5 多 2）。
**判据不是「左边是哪个词」，而是「左边那一格是不是一个引出一个类型的标记」**：
`=>` / `=` 是符号，`extends` 是词（`WordText` 统一取文本），三个都收。
剩下的两头由别处管着：`asserts` 只在类型位合法（值位的 `asserts` 是普通标识符），
而调用点只有类型容器那一支——`x = asserts y is A`（值位）里 `=` 的父亲是 `Statement`，
不在白名单里，一格都不会误收。

```ts
const current = Get(units, index);
if (current === null || current.Parent === null) {
  return false;
}
// **已经在谓词里就不再收**：本节点挂通用队列，收完之后它那一趟会再看到同一段
// （与 `optional-call.xl.md` 的守卫同一个理由）。
if (current.Parent.constructor.name === "TypePredicate") {
  return false;
}
// **条件类型里也不收**：`x is A extends B ? C : D` 的谓词在外层就已经收好了，
// 条件类型那一趟再进来一次就会与条件类型规则互相套娃（实测爆栈）。
if (current.Parent.constructor.name === "ConditionalType") {
  return false;
}
if (IsTypeContainerUnit(current.Parent) === false) {
  return false;
}
// **起点两处**：容器的第一个实义单元（返回类型位 / 类型别名位），
// 或者**紧跟一个引出类型的标记**（`=>` / `=` / `extends`）。
// **两处都走 trivia 口径**（第 869 轮）：`function f(x): /* c */ x is T { … }` 里
// 那个注释是容器里的第一格——原来只跳过 `LineWrap` ⇒ `isFirst` 当场变假、再往左又撞上注释
// ⇒ 整段谓词不成形（实测 `type-predicate-comment-3`：缺 `TypePredicate` / `StringKeyword`、
// 多一个 `TypeReference`）。
let isFirst = true;
for (let i = 0; i < index; i++) {
  if (!IsTriviaUnit(Get(units, i))) {
    isFirst = false;
  }
}
if (isFirst === false) {
  const before = Get(units, SkipPreviousTrivia(units, index));
  let beforeText = "";
  if (before instanceof SymbolToken) {
    beforeText = before.TempToString();
  } else if (before !== null) {
    beforeText = WordText(before);
  }
  if (beforeText !== "=>" && beforeText !== "=" && beforeText !== "extends") {
    return false;
  }
}
return this.IsPredicateAt(units, index);
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把整段收成一个 `TypePredicate`，**返回新的下标**。

**`Replace` 之前不许先 `Add`**（`type-bracket.xl.md` 记过这个坑）：`Token.Replace` 读的是
`this.Parent.Data`，先 `AddAndCloseLast` 会把 `Parent` 改成新节点。
这里要搬走一整段，所以统一用 `ReplaceCountAt`（只做 `splice`、不看 `Parent`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("TypePredicateCloseRule.Process: current is null");
}
const result = new TypePredicate(current.Template);
result.SignIn(current.SourceRange.Start!);
result.SignOut(Get(units, units.length - 1)!.SourceRange.End!);
for (let i = index; i < units.length; i++) {
  const item = Get(units, i);
  if (item !== null) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, index, units.length - index, result);
```

# class TypePredicate extends IndependentToken

类型谓词（`x is T` / `this is T` / `asserts x is T` / `asserts x`）。类名必须与产物的标签名一致。

内容直接装在自己身上：可选的 `asserts`、参数名、`is`、以及类型（若写了）。

## method PrintAst:(ctx:any, v:any)=>any

类型谓词 `value is T` / `asserts value is T` / `asserts value` → `TypePredicate`
（**从 `ts-ast.xl.md` 的 `projectTypePredicate` 搬来**，第 186 轮）。

产物那边三种身份（`asserts` 是 `AssertsKeyword`、参数名是 `Identifier`、`is` 是 `Keyword`）
全挤在**平级的子单元**里，而 TS 那边它们是两个具名字段（`parameterName` / `type`，
`asserts` 时多一个 `assertsModifier`）——不分开时整族都只投出「一串 `Identifier`」
（真实语料 `TypePredicate` 的 `is` / 类型实参全对不上，`TypeReference` 有 360 处缺在它下面）。

`is` 在产物里的词法身份不固定（`Keyword` 或 `Identifier`），两种都认；
谓词里的类型**走类型位投影**（`T` ⇒ `TypeReference > Identifier`）。

**`is` 不进子字段**（第 76 轮实测）：TS 的 `TypePredicate` 只有
`parameterName` / `type`（+ `asserts` 时的 `assertsModifier`）三格，
`is` 是词法记号、`ts.forEachChild` **不会**访问它——留着一个 `isKeyword`
会让这一整类（382 处）的字段名多出一格。位置仍然算出来（那个 `i++`）。

```ts
  const kids = ctx.Kids(v);
  const props: any = {};
  let i = 0;
  if (i < kids.length && kids[i].get("type") === "Keyword" && ctx.TextOf(kids[i]) === "asserts") {
    props.assertsModifier = ctx.Project(kids[i]);
    i++;
  }
  if (i < kids.length && ctx.IsNameNode(kids[i])) {
    props.parameterName = ctx.Project(kids[i]);
    i++;
  }
  if (i < kids.length && ctx.TextOf(kids[i]) === "is") {
    i++;
  }
  if (i < kids.length) {
    const type = ctx.TypeExpression(kids.slice(i));
    if (type !== undefined) props.type = type;
  }
  return ctx.NodeHead("TypePredicate", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，并挂**通用队列**——谓词里的类型要继续成形
（`x is A | B` 是 `TypePredicate > UnionType`，`x is (…)=>void` 是函数类型……）。
通用队列**包含**类型队列的全部成员，所以挂它不会丢东西。

```ts
super(template);
this.CloseRuleQueue = template.CloseRuleTemplate.Get(this.constructor);
```

## method Clone:()=>Token

克隆自身。

```ts
const result = new TypePredicate(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
