# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketCreatePossibleHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class BracketCreatePossibleTrigger extends BracketCreatePossibleHook

**T2：`BracketCreate` 触发源的具体实现，core 只留接口。**

`Bracket.Transit` 在 `BracketRoleHook`（角色目录）之后调用 `OnBracketCreatedPossible` 一次。本类按顺序做两件事：

1. **新括号自己**：`CatalogGuide !== null`（角色机制刚装上的成员 / 块体目录）时问一次。
   此刻 `Data` 还是空的，`CatalogGuide.ComputePossibleShapes` 取 `Data.length - 1 = -1` 直接 `Nothing`，
   不建任何形状；**不替它装目录**（角色机制没装就跳过）。
2. **父宿主**：实现了 `IComputePossibleShapes` 且挂着**带终结候选**（`EndPossible !== null`）的向导时问一次。
   `EndPossible` 这个前置与 `Bracket.OnBracketCreatedEvent` 里那条旧窄触发同一条安全判据：候选全灭时
   向导返回 `Waiting` 而不是抛「没有候选形状可以构成」；`BracketCatalogInstaller` 装的向导一律配
   `WaitingEndPossible`（永不 `Accept`），所以也不会踩「终结候选与其它候选同时成立」。

两次都显式传 `PossibleSource.BracketCreate`。同一格的重复触发由 `CatalogGuide` 的双 build 守卫拦下
（`LastBuildTokenIndex` / `LastBuildDataLength`）：开关打开时旧窄触发已经被本钩子接管，不会在同一格问两次。

**默认不装**：`EnsureInstalled` 只在 `StatementRouteUtil.EnableBracketCreatePossible` 为真时才把本类挂到
`BracketCreatePossibleHook.Current` 上；开关为假时 `Current` 恒为 `null`，默认路径只多一次 `null` 比较。

## static field Installed:bool = false

本类是否已经挂到 `BracketCreatePossibleHook.Current` 上（只用于探针断言；`Current !== null` 才是权威）。

## static method EnsureInstalled:()=>void

**幂等装配点**。开关为真且还没装时才装一次；开关为假时**什么都不做**（不建实例、不动静态字段）。

调用点：`SourceFileShape` 的构造器（每次解析都会经过，早于任何一只括号）。

```ts
if (!StatementRouteUtil.EnableBracketCreatePossible) {
  return;
}
if (BracketCreatePossibleHook.Current !== null) {
  return;
}
BracketCreatePossibleHook.Current = new BracketCreatePossibleTrigger();
BracketCreatePossibleTrigger.Installed = true;
```

## method OnBracketCreatedPossible:(host:Token, bracket:Token, context:SyntaxContext)=>void

`host` 是新括号的宿主，`bracket` 是刚建出来的括号（目录可能已由角色机制装上）。

```ts
if (!StatementRouteUtil.EnableBracketCreatePossible) {
  return;
}
if (!(bracket instanceof Bracket)) {
  return;
}
const mounted = bracket as Bracket;
const bracketStart = mounted.StartBracketChar;
StatementRouteUtil.BracketCreatePossibleCount += 1;
// 1) 新括号自己：有目录才问，绝不替它装目录。Data 为空 ⇒ ComputePossibleShapes 直接 Nothing。
if (mounted.CatalogGuide !== null) {
  StatementRouteUtil.BracketCreateSelfCount += 1;
  mounted.ComputePossibleShapes(context, PossibleSource.BracketCreate);
}
// 2) 父宿主：严格沿用 `Bracket.OnBracketCreatedEvent` 旧窄触发的安全判据（`{` + EndPossible 非空）。
// 放宽字符集（`(` / `[`）会提前建出宿主形状（实测 `SourceRange is not set` / `括号内没有表达式`），
// 那是 T3/T5 让候选按来源收紧之后的事；T2 只把来源从 Close 换成 BracketCreate，触发范围不动。
if (bracketStart === "{" && host instanceof Bracket) {
  const parent = host as unknown as IComputePossibleShapes;
  if (parent.CatalogGuide !== null && parent.CatalogGuide.EndPossible !== null) {
    StatementRouteUtil.BracketCreateParentCount += 1;
    parent.ComputePossibleShapes(context, PossibleSource.BracketCreate);
  }
}
```
