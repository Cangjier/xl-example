# dependencies
```xl
import { AreaAnnotation } from "./basic-tokens/area-annotation.xl.md"
import { Bracket } from "./basic-tokens/bracket.xl.md"
import { Common } from "./basic-tokens/common.xl.md"
import { LineAnnotation } from "./basic-tokens/line-annotation.xl.md"
import { RegexToken } from "./basic-tokens/regex-token.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状候选：`CatalogGuide` 目录里的一项。它判定已经攒下的单元是不是自己（`Compute`），在被选中时把自己建成对应的形状单元（`Build`），再把「建出来之后仍然需要继续成形」的括号交给 `BuildShapes`。

形状候选由目录共享，不持有跨次状态：判定用到的中间状态写进 `Compute` 的缓存参数。

# class PossibleShape

形状候选。

`Compute` 与 `Build` 都是抽象方法，写成抛错桩。

## method Compute:(units:Array<Token>, cache:Map<string, any>)=>ShapeStates

看已经攒下的单元能不能构成这个形状。

抽象方法，由各形状实现。缓存的键与值都由形状自己约定，调用方只负责把它传给同一个向导的每一次判定。

```ts
throw new Error("abstract member: Compute");
```

## method Build:(host:Token, catalog:CatalogGuide)=>Token

把这个形状建出来，**返回建好的那个单元**。

`host` 是向导的宿主——攒下这批子单元的那个单元。形状要顶替的是**它**，不是向导：向导不继承任何东西、根本不在树里。

返回值是给 `BuildShapes` 用的：要知道刚建出来的是什么，才能往下找还没成形的括号。

```ts
throw new Error("abstract member: Build");
```

## method BuildShapes:(catalog:CatalogGuide, built:Token)=>void

把刚建好的形状里「还该继续成形」的括号补上形状。

规则：`built` 的子树里若有一个 `Bracket`，而它的 `Data` **全是 basic token**，那它就是个还没成形的形状宿主——本方法为它新建一个 `CatalogGuide`，**以那个 `Bracket` 自己作宿主**、遍历它的 `Data`，逐个调 `ComputePossibleShapesByIndex`。

候选沿用 `catalog.PossibleShapes`：形状候选不持有跨次状态，同一个目录可以驱动多层。

（这条规则同时记在 `CatalogGuide.ComputePossibleShapesByIndex` 上。）

```ts
for (const bracket of PossibleShape.FindUnshapedBrackets(built)) {
  const nested = new CatalogGuide(bracket.Template, catalog.PossibleShapes);
  for (let index = 0; index < bracket.Data.length; index++) {
    nested.ComputePossibleShapesByIndex(bracket, index);
  }
}
```

## static method IsBasicToken:(token:Token)=>bool

是不是 basic token——`Template.BasicBranchQueue` 里那 5 个：区域注释 / 行注释 / 正则 / 括号 / 通用块。

```ts
return (
  token instanceof AreaAnnotation ||
  token instanceof LineAnnotation ||
  token instanceof RegexToken ||
  token instanceof Bracket ||
  token instanceof Common
);
```

## static method FindUnshapedBrackets:(built:Token)=>Array<Bracket>

在 `built` 的子树里找出「`Data` 全是 basic token」的括号，按先序返回。

`Data` 为空的括号不算——那里面没东西可成形。

```ts
const found: Bracket[] = [];
PossibleShape.Collect(built, found);
return found;
```

## private static method Collect:(token:Token, found:Array<Bracket>)=>void

先序遍历：命中的括号收进 `found`，然后继续往下走。

命中之后仍然往下递归——括号可以嵌套。

```ts
if (
  token instanceof Bracket &&
  token.Data.length !== 0 &&
  token.Data.every((item) => PossibleShape.IsBasicToken(item))
) {
  found.push(token);
}
for (const item of token.Data) {
  PossibleShape.Collect(item, found);
}
```
