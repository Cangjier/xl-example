# dependencies
```xl
import { Bracket } from "../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ClassDeclarationPossibleShape } from "../class-declaration-possible-shape.xl.md"
import { InterfaceDeclarationPossibleShape } from "../interface-declaration-possible-shape.xl.md"
import { FunctionDeclarationPossibleShape } from "../function-declaration-possible-shape.xl.md"
import { EnumDeclarationPossibleShape } from "../enum-declaration-possible-shape.xl.md"
import { ModuleDeclarationPossibleShape } from "../module-declaration-possible-shape.xl.md"
import { TypeAliasDeclarationPossibleShape } from "../type-alias-declaration-possible-shape.xl.md"
import { BlockBodyWaitingPossibleShape } from "../../statements/block-possible-shape.xl.md"
import { BlockPossibleShape } from "../../statements/block-possible-shape.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class NamespaceBodyDeclarationMount

**[S3:NAMESPACE-BODY] 模块体（`ModuleBlockShape` 的 `{`…`}` 宿主）内的声明族挂载入口。**

```txt
namespace Store {
  export interface Item { … }   ← 模块体括号，本入口给它挂声明目录
  export enum Kind { … }
  export type Id = number;
  const items: Item[] = [];
  export function add(item: Item): void { … }
}
```

**0. 为什么必须有这个入口**

WP-S3 的 R3-1：声明族候选原本是**根层限定**——`interface-declaration-mount.xl.md` /
`type-alias-declaration-mount.xl.md` 用 `host.Parent !== null` 一句话把模块体排除在外。而模块体在
增量路径里**从来没有目录**：

- `ModuleDeclarationPossibleShape.BuildByIndex` 提前挂出 `ModuleDeclarationShape` 壳，它的
  `CatalogGuide` 只有终结候选 `ModuleDeclarationEndPossibleShape`（`[]` + end），**没有体目录挂载点**；
- 体 `{` 因此只是一只 `Bracket`，`Bracket.Transit` 通知到的宿主（`ModuleDeclarationShape`）上
  没有 `OnBracketCreatedEvent` 实现 ⇒ `CatalogGuide` 恒为 `null`。

于是体内五类声明全部落到「无候选」：token 以 `Common` / `Symbol` / `Bracket` 平铺
（`namespace-store` 的 D3/D4），`FunctionDeclarationShape` 380 步内 0 次，最后在
`"number"` 的收尾引号那一格抛 `增量变量形状未支持`（char 379）。

本入口就是那个**缺失的挂载点**：给模块体括号挂一份**声明目录**。它只挂目录、不建树——
拾取与建树仍走既有通道（`StatementShape` 壳 + `StatementBuilder`），所以 EOF 树与 legacy 同源。

**1. 目录内容与顺序（顺序是硬要求）**

目录 = **先声明族、后块体语句族**：

1. `ClassDeclarationPossibleShape` / `InterfaceDeclarationPossibleShape` /
   `FunctionDeclarationPossibleShape` / `EnumDeclarationPossibleShape` /
   `ModuleDeclarationPossibleShape` / `TypeAliasDeclarationPossibleShape`——六族 legacy 声明候选
   （与根目录 `SourceFileShape.CreatePossibleShapes` 同一批类、同一个让位判据）；
2. 然后是 `BlockPossibleShape.CreateBodyPossibleShapes()`——块体语句目录
   （变量三层 / 根表达式 / 控制流 / 块 / `await` / `yield` / **通用声明壳**
   `DeclarationStatementPossibleShape`）。

**为什么声明族必须排在前**：`export interface` / `export function` / `export class` 的**首个代码单元
是 `export`**，route 判 `ShellDeclarationFamily`；通用声明壳在根层就是靠这一格建壳、再在
`BuildByIndex` 里依次问 `ImportExportDeclarationMount` / `InterfaceDeclarationMount` /
`TypeAliasDeclarationMount`。把块体目录排在前面不会改变「每个候选都被求值」这件事，但会改变
`CatalogGuide.Candidates` 的下标序，进而改变「只剩一个候选」时先建谁——实测（本 WP 第 2 回合）
把声明族放到块体目录之后时 `export interface` 由通用声明壳接管、接口壳退到 `}` 收口那一格，
首见格从 42 退到 102。顺序在这里是**可观测的正确性条件**，不是风格。

**为什么不用 `SourceFileShape.CreatePossibleShapes()` 整份复用**：那份目录还带着
`ImportDeclarationPossibleShape` / `ExportDeclarationPossibleShape` /
`ImportEqualsDeclarationPossibleShape` / `ExportAssignmentPossibleShape` /
`NamespaceExportDeclarationPossibleShape`——它们只对**根层**成立（`import x from "m"` 在 namespace
体内非法，`export =` / `export as namespace` 也只有模块顶层合法）。放进模块体目录会与通用声明壳
在同一格双 Accept。根层限定那一半由 `StatementRouteUtil.IsRootDeclarationHost` 回答，
本文件一个字都不重写。

**不挂 `BlockPossibleShape` 自己**：模块体里 `{ … }` 是**块语句**，但块体目录已经带
`BlockPossibleShape` 条目；再单独加一份会得到两个同族候选（同格同时 Accept ⇒ `Candidates.size > 1`
永远等不到唯一候选）。

**2. 门控**

- `StatementRouteUtil.IsIncrementalShapesEnabled()`（总闸）与 `EnableShellExpressions` 都开；
- `StatementRouteUtil.EnableNamespaceBodyDeclarations` 开（默认 `true`）。
  关掉任一条 ⇒ 模块体括号不挂目录 ⇒ 体内逐字节回到本 WP 之前的行为。

**3. 收口**

模块体的收口仍由 `ModuleDeclarationEndPossibleShape` 负责：`}` 闭合那一格它 Accept，
`ModuleDeclarationShape.FromUnits` 把壳里的单元交给 legacy `ModuleBlockShape.FromBracket`。
`FromBracket` 见到体括号里有**已建形状**时走 `StatementBuilder.CollectBodyStatements`
收集通道（与函数体 `BuildBlock` 同一条），不再按 raw 单元逐条 `BuildMember`——这条分支是
`module-block-shape.xl.md` 的 `[S3:NAMESPACE-BODY]` 段，归属本 WP。

## static field InstallCount:int = 0

只读计数：模块体括号挂上声明目录的次数（与 `StatementRouteUtil.NamespaceBodyDeclarationMountCount`
同步 +1；本字段只为本文件的自证方便）。

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

模块体声明目录（声明族在前、块体语句族在后；见上文 §1 的顺序理由）。同一进程里只建一份。

```ts
if (NamespaceBodyDeclarationMount.CreatePossibleShapesCache === null) {
  const shapes:Array<PossibleShape> = [
    new ClassDeclarationPossibleShape(),
    new InterfaceDeclarationPossibleShape(),
    new FunctionDeclarationPossibleShape(),
    new EnumDeclarationPossibleShape(),
    new ModuleDeclarationPossibleShape(),
    new TypeAliasDeclarationPossibleShape(),
  ];
  for (const shape of BlockPossibleShape.CreateBodyPossibleShapes()) {
    shapes.push(shape);
  }
  NamespaceBodyDeclarationMount.CreatePossibleShapesCache = shapes;
}
return NamespaceBodyDeclarationMount.CreatePossibleShapesCache;
```

## static method IsEnabled:()=>bool

三条门控的唯一判据（`Install` 与 `Owns` 各问一次，逐字同源）。

```ts
return StatementRouteUtil.IsIncrementalShapesEnabled()
  && StatementRouteUtil.EnableShellExpressions
  && StatementRouteUtil.EnableNamespaceBodyDeclarations;
```

## static method Owns:(bracket:Token | null)=>bool

本格要不要给这只括号挂目录：只有**模块体 `{`**（父单元是 `ModuleDeclarationShape`）才挂。
判据转发 `StatementRouteUtil.IsDeclarationHost`，不在这里写第二份宿主判据。

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return false;
}
if ((bracket as Bracket).StartBracketChar !== "{") {
  return false;
}
return StatementRouteUtil.IsDeclarationHost(bracket);
```

## static method Install:(bracket:Token)=>bool

给模块体括号挂声明目录。返回 `true` = 这一次真的挂上了（调用方据此计数）。

**幂等**：括号已经有 `CatalogGuide` 时不覆盖——那说明别的挂载点（块体目录 / 子句块目录）先到了，
按「先到先得」保持原判据，本入口只补空缺（`function-declaration-shape.xl.md` 的
`[WP-S1]` 段是同一手法）。

```ts
if (!NamespaceBodyDeclarationMount.IsEnabled()) {
  return false;
}
if (!NamespaceBodyDeclarationMount.Owns(bracket)) {
  return false;
}
const body = bracket as Bracket;
if (body.CatalogGuide !== null) {
  return false;
}
body.CatalogGuide = new CatalogGuide(
  NamespaceBodyDeclarationMount.CreatePossibleShapes(),
  new BlockBodyWaitingPossibleShape());
NamespaceBodyDeclarationMount.InstallCount += 1;
StatementRouteUtil.NamespaceBodyDeclarationMountCount += 1;
return true;
```
