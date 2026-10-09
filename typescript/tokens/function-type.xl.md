# dependencies
```xl
import { IndependentToken } from "../../core/syntax/independent-token.xl.md"
import { CloseRule } from "../../core/syntax/close-rule.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Get, ReplaceCountAt, SearchFront } from "../../core/extensions/list-extension.xl.md"
import { GetSkipPreviousWrapSymbol, IsTypeContainerUnit, SkipNextWrapSymbol, SkipPreviousTrivia, SkipPreviousWrapSymbol } from "../text-common-util.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Identifier } from "./identifier.xl.md"
import { IsDeclarationBoundary, IsStatementKeyword } from "./declaration-common.xl.md"
import { LamdaCloseRule } from "./lamda/lamda.xl.md"
import { ParsePipeline } from "../parse-pipeline.xl.md"
import { Statement } from "./statement.xl.md"
import { SymbolToken } from "./symbol-token.xl.md"
import { LineWrap } from "./line-wrap.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

**函数类型**：把类型位的 `(a: A) => B` 收成一个 `FunctionType` 单元。

它是**类型层**里最常见的一种构造（真实语料 4226 处，`: ` 后面的回调签名几乎全是它），
但一直只有两种下场：要么散成裸单元（没有节点），要么被 `LamdaCloseRule` 误收成 `Lamda`
——**值位标签**（实测 17 处：`Array<(a: A) => B>` 的类型实参、`x: ((a: A) => B)` 这种括号套括号）。
`<Lamda>` 的语义是「箭头函数」，函数类型戴上它就分不出「值」与「类型」了。

判据只有一句：**`=>` 左边那个 `(` 括号不是形参表**——也就是
`LamdaCloseRule.FindParameters` 给 `-1`。两边共用同一份判断（见 `lamda.xl.md` 的
`IsLambdaParameters`），不会出现「一边当形参表、另一边当函数类型」的错位。

`FunctionTypeCloseRule` 排在 `Lamda` **之前**：先由它把类型位的箭头认领走，
剩下的才是真正的箭头函数。

# class FunctionTypeCloseRule extends CloseRule

## static readonly field Instance:FunctionTypeCloseRule = new FunctionTypeCloseRule()

唯一的实例，注册进通用规则队列时用。

## method Previous:(template:Template, units:Array<Token>, index:int)=>bool

`index` 处是不是一段**函数类型**的 `=>`。

判据三条，缺一不可：

1. `index` 处是内容为 `=>` 的 `SymbolToken`；
2. 它左边（跳软换行）是一个 `(` 括号——裸形参的 `p => B` 只可能是箭头函数；
3. `LamdaCloseRule.FindParameters(units, index)` 给 `-1`（左边那段不是形参表）。

`FindParameters` 是 `LamdaCloseRule` 的实例方法，所以这里用 `Instance` 去问它。

**第 817 轮：往左那一格跨注释**。第 621 轮给 `FindParameters` 补上了「注释不是形参表的一部分」，
可这条判据自己的第 2 条（往左找形参括号）当时没跟上：`(a: number) /* c */ => string` 里
`=>` 左边紧邻的是注释 ⇒ 第 2 条当场判否 ⇒ 整条函数类型不成形（实测 `FunctionType` 整条缺、
括号留在外面当 `Bracket`）。`Process` 那一侧取 `firstIndex` 也是同一个问题（见下）。
两处一律走 `SkipPreviousTrivia`——**判据跨过什么，搬运就必须跨过什么**。

```ts
const current = Get(units, index);
if (!(current instanceof SymbolToken) || current.Is("=>") === false) {
  return false;
}
// **已经在 `FunctionType` 里面了就不再折**（第 509 轮）：折出来的单元**自己也会关一次**
// ⇒ 它自己的 `Data` 上又跑这一趟 ⇒ 同样的 `=>` 又被折一层 ——
// 探针实测（`tmp/recon/r509-ftype-probe.cjs`）：`abstract new () => A` 被折了 **8 次**
//（第 1 次容器是 `Statement`、之后 7 次容器都是 `FunctionType` 且 `queue=set`
// ⇒ 第 508 轮那道「没有队列就不进」的闸拦不住它），而对照态只折 **1 次**。
// 用**类名**判定而不是 `instanceof`（本文件引 `lamda`，再引它会绕出环，与 `statement.xl.md` 里 `Let` 同一条纪律）。
const owner = current.Parent;
if (owner !== null && owner.constructor.name === "FunctionType") {
  return false;
}
const firstIndex = SkipPreviousTrivia(units, index);
const first = Get(units, firstIndex);
if (!(first instanceof Bracket) || first.startBracket !== "(") {
  return false;
}
// **类型位里的 `(…) => R` 一律是函数类型**（第 66 轮）：参数表的**默认值**也可以是函数类型
// （`fn<F extends Function = (...args: any[]) => undefined>`、
// `Value extends (this: This, …) => any = (this: This, …) => any`，
// 见 `@types/node/test.d.ts:1858` 与 `lib.decorators.d.ts:81`），
// 那里的形参表与箭头函数长得一模一样，`FindParameters` 会认出来，
// 于是「左边不是形参表」这条判据把它挡在门外、谁都不收（实测 `FunctionType` 缺 3 处）。
// 类型位里不可能有箭头函数（`lamda.xl.md` 已按同一判据让路），所以这里直接成立；
// **类字段初始化式除外**：`f = (a: number): void => {}` 也是「类型容器（`Field`）里的 `=>`」，
// 那里是**值**、该由 `LamdaCloseRule` 收。例外只给 `Field` + 同一层有 `=`：
// 参数表的**默认值**（`<F = (a) => b>`）里也有 `=`，但它的父单元是 `TypeParameter`，
// 不是 `Field`——按「有 `=` 就放行」判会把它误让给箭头函数（实测 `Lamda in TypeParameter` 3 处）。
const fieldInitializer =
  current.Parent !== null &&
  current.Parent.constructor.name === "Field" &&
  this.HasAssignmentBefore(units, index);
if (fieldInitializer === false && IsTypeContainerUnit(current.Parent)) {
  return true;
}
return LamdaCloseRule.Instance.FindParameters(units, index) < 0;
```

## private method HasAssignmentBefore:(units:Array<Token>, index:int)=>bool

`index` 前面（同一层）有没有一个 `=`——有的话这一层是**值初始化式**（类字段 / 变量初始化），
不是类型标注。`=>` 是另一个符号，不会被误认（`Is("=")` 是整体比较）。

```ts
for (let i = 0; i < index; i++) {
  const item = Get(units, i);
  if (item instanceof SymbolToken && item.Is("=")) {
    return true;
  }
}
return false;
```

## method Process:(template:Template, units:Array<Token>, index:int)=>int

把「形参括号 + `=>` + 返回类型」整段收成一个 `FunctionType`，**返回新的下标**。

收集规则与 `type-define.xl.md` 的 `TypeDefine` 同一套（两处都是「一段类型文本要到哪里为止」）：

- 从 `index + 1`（即 `=>` 的右边）往后扫，遇到 `;` / `,` / 赋值符号就停在它**前一位**；
- **顶层 `?` / `:` 要分情况**（与 `as.xl.md` 同一条口径）：返回类型**自己**是条件类型时
  （`() => T extends U ? A : B`）那个 `?` 属于返回类型，必须继续收；判断办法是
  **沿途见过 `extends` 没有**。没见过就说明这个 `?` 是**外层**条件类型的
  （`F extends abstract new(…) => any ? F : undefined`），函数类型到此为止——
  少了这一条，外层那个条件类型会被整段吞进 `FunctionType`（实测 `@types/node/test.d.ts:2119`）。
- **遇到语句边界也停**（两条判据一起用，与 `type-assign.xl.md` 的 `AliasEnd` 同款）：
  `IsStatementKeyword(next) || IsDeclarationBoundary(next)` 认的是「换行后面已经是一条新声明」
  （`type A<in T> = (x: T) => void` 换行 `type B<out T> = () => T` 里，下一行的 `type` 必须算终点——
  只按 `Statement.IsLineBreakBoundary` 判时 `void` 是个 `Identifier`、而被判成「还能续接」，
  于是整条 `type B<…>` 会被吞进上一行的 `FunctionType`，实测把两个声明并成了一个）；
  再加上 `Statement.IsLineBreakBoundary` 兜住表达式内部那种受限产生式的边界；
- 一路没遇到终止符就收到列表末尾（`A |` 换行 `B` 这种合法折行因此不受影响）；
- 起始下标是 `firstIndex`（形参括号），终点取最后一个收集项——收集为空时退回 `=>` 自己那一格，
  免得 `SignOut` 取到 `undefined`。

**`|` / `&` 不终止**：`x: () => A | B` 的返回类型就是联合类型，`&` 同理。
**`=>` 也不终止**：`(a: A) => (b: B) => C` 是柯里化的函数类型，整段收进同一个节点即可
（右侧那段不会再被单独收一次——同一条规则在同一层只认最左边那个 `=>`）。

```ts
const current = Get(units, index);
if (current === null) {
  throw new Error("current 为空");
}
let firstIndex = SkipPreviousTrivia(units, index);
// **构造类型**：`new () => object` / `abstract new () => object` 的 `new` 贴在形参括号前面，
// 一起收进节点里（TS 那边是 `ConstructorType`，本工程按函数类型收——不然 `new` 会留在外面）。
const beforeParams = Get(units, SkipPreviousWrapSymbol(units, firstIndex));
if (beforeParams instanceof Identifier && beforeParams.Is("new")) {
  firstIndex = SkipPreviousWrapSymbol(units, firstIndex);
  const maybeAbstract = Get(units, SkipPreviousWrapSymbol(units, firstIndex));
  if (maybeAbstract instanceof Identifier && maybeAbstract.Is("abstract")) {
    firstIndex = SkipPreviousWrapSymbol(units, firstIndex);
  }
}
const first = Get(units, firstIndex);
if (first === null) {
  throw new Error("函数类型不满足格式要求：( … ) => T");
}
const items: Token[] = [];
let endIndex = index;
let sawExtends = false;
for (let i = index + 1; i < units.length; i++) {
  const item = Get(units, i);
  if (item === null) {
    throw new Error("item 为空");
  }
  if (item instanceof SymbolToken) {
    if (item.Is(";") || item.Is(",") || template.SymbolTemplate.IsAssignmentSymbol(item.TempToString())) {
      break;
    }
    if ((item.Is("?") || item.Is(":")) && sawExtends === false) {
      // 返回类型**自己**的条件类型（`() => T extends U ? A : B`）里那个 `?` 属于返回类型，
      // 收集途中见过 `extends` 就该继续；没见过说明这个 `?` 属于**外层**条件类型
      // （`F extends abstract new(…) => any ? F : undefined`），函数类型到此为止。
      break;
    }
  }
  if (item instanceof LineWrap) {
    const next = Get(units, SkipNextWrapSymbol(units, i));
    if (next === null || IsStatementKeyword(next) || IsDeclarationBoundary(next)) {
      break;
    }
    if (Statement.IsLineBreakBoundary(units, i)) {
      break;
    }
  }
  if (item instanceof Identifier && item.Is("extends")) {
    sawExtends = true;
  }
  if (!(item instanceof LineWrap)) {
    items.push(item);
    endIndex = i;
  }
}
const result = new FunctionType(template);
result.Parent = first.Parent;
result.SignIn(first.SourceRange.Start!);
result.SignOut(Get(units, endIndex)!.SourceRange.End!);
for (let i = firstIndex; i <= endIndex; i++) {
  const item = Get(units, i);
  if (item !== null && !(item instanceof LineWrap)) {
    result.AddAndCloseLast(item);
  }
}
result.TryToClose();
return ReplaceCountAt(units, firstIndex, endIndex - firstIndex + 1, result);
```

# class FunctionType extends IndependentToken

函数类型（类型位的 `(a: A) => B`）。

**类名必须与产物的标签名一致**：`constructor.name` 就是它的 XML 标签名。

它**没有**覆写 `ToXmlString`，XML 由基类产出：`<FunctionType>形参括号 + => + 返回类型的串接</FunctionType>`。

## method PrintAst:(ctx:any, v:any)=>any

函数类型 `(x: number) => string` → `FunctionType`（`parameters` + `type`，可选 `typeParameters`；
**从 `ts-ast.xl.md` 的 `projectFunctionType` 搬来**，第 188 轮）。

产物那边是平级单元：`[GenericType(类型参数表)?, Bracket(形参表), SymbolToken(=>), 返回类型]`。
形参要**摊平括号**（TS 那边 `parameters` 直接是 `Parameter`，没有括号那一层节点），
`=>` 之后是 `type`。

**类型参数表要单独提出来**（第 82 轮）：`<R, TArgs extends any[]>(fn: (…args: TArgs) => R) => R`
里那个 `GenericType` 装的是 `TypeParameter`——它在 TS 那边是 `FunctionType.typeParameters`，
**不是形参**。早先它跟形参表一起投出去（`GenericType` 自己的 `KIND_BY_TAG` 是 `TypeReference`），
于是那些类型参数与其上的约束整个丢掉（`@types/node/async_hooks.d.ts` 那种「泛型函数类型」成片）。

**`new` / `abstract new` 是构造类型**（第 98 轮）：TS 的 kind 是 `ConstructorType`
（`new () => T` 与 `abstract new () => T` 都是），而 `new` 这个词**不是子节点**
（`abstract` 才是 `modifiers` 里的节点）。照函数类型投会「缺 `ConstructorType` +
多出 `FunctionType` + 多出 `NewKeyword`」（实测 94 处）。

**形参之间的逗号不进 `parameters`**：括号的内容是 `[Parameter, SymbolToken(,), Parameter]`，
摊平后要按顶层逗号切。

```ts
  const kids = ctx.Kids(v);
  const arrowIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && ctx.TextOf(k) === "=>",
  );
  const before = arrowIndex < 0 ? kids : kids.slice(0, arrowIndex);
  const generic = before.find((k: any) => k.get("type") === "GenericType");
  const newUnit = before.find((k: any) => k.get("type") === "Keyword" && ctx.TextOf(k) === "new");
  const props: any = {};
  const params = [];
  for (const k of before) {
    if (k === generic || k === newUnit) continue;
    if (k.get("type") === "Keyword" && ctx.TextOf(k) === "abstract") {
      props.modifiers = [...(props.modifiers ?? []), ctx.Project(k)];
      continue;
    }
    if (k.get("type") === "Bracket") {
      for (const part of ctx.Split(ctx.UnwrapNodes(k), ",")) {
        for (const inner of part) params.push(inner);
      }
      continue;
    }
    params.push(k);
  }
  if (generic !== undefined) {
    const typeParams = ctx.UnwrapNodes(generic).filter((k: any) => k.get("type") === "TypeParameter");
    if (typeParams.length > 0) props.typeParameters = ctx.ProjectEach(typeParams);
  }
  props.parameters = ctx.ProjectEach(params);
  if (arrowIndex >= 0 && arrowIndex + 1 < kids.length) {
    props.type = ctx.TypeOf(kids.slice(arrowIndex + 1));
  }
  // **坐标在前**（第 199 轮）：搬家前是 `return { kind: "FunctionType", pos: v.start, end: v.end, ...props }`；
  // `ConstructorType` 走的是同一行（另一个分支的 `new (…) => T` 在共享层里也是坐标在前）。
  return ctx.NodeHead(newUnit === undefined ? "FunctionType" : "ConstructorType", props, v);
```

## constructor:(template:Template)=>void

转调基类构造器，**并且把类型队列装上**。

理由与 `type-define.xl.md` 的同名构造器完全相同：本单元是收尾规则建出来的，
它的内容（形参括号与返回类型）**没有**被外层再扫一遍，`KeywordCloseRule` 排在通用队列最后，
轮不到里面的词——`(a: A) => void` 的 `void`、`(this: T) => typeof x` 的 `this` / `typeof`
于是停在 `Identifier` 上（用例 `type-fn-generic-arg` / `type-fn-union-member` / `type-ref-fn-arg`
钉住的就是这三处）。

装的是**类型队列**而不是通用队列：通用队列里的 `TernaryOperatorCloseRule` 会把条件类型
`T extends U ? A : B` 收成表达式三元。

```ts
super(template);
ParsePipeline.InitialKeywordCloseRuleQueue(this);
```

## method Clone:()=>Token

克隆自身。

顺序是 `Sign(this)` → 把 `Data` 里每个子单元克隆后整批加入 → `TryToClose()`；批量加入用 `AddRange`。

```ts
const result = new FunctionType(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
