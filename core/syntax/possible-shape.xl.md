# dependencies
```xl
import { SyntaxContext } from "./syntax-context.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { PossibleShapeCache } from "./possible-shape-cache.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状候选：`CatalogGuide` 目录里的一项。它判定已经攒下的单元是不是自己（`Compute`），在被选中时把自己建成对应的形状单元（`Build`）。

形状候选由目录共享，不持有跨次状态：判定用到的中间状态写进 `Compute` / `ComputeByIndex` 的缓存参数。

# class PossibleShape

形状候选。

`ComputeByIndex` 与 `BuildByIndex` 是抽象方法，写成抛错桩；`Compute` / `Build` 在基类里**转调**它们——每个形状只需要实现 ByIndex 那两条。

## method Compute:(units:Array<Token>, cache:PossibleShapeCache)=>ShapeStates

看已经攒下的单元能不能构成这个形状。

**基类转调 `ComputeByIndex`**：判全段就是判到最后一格为止，形状只实现那条。缓存是 `PossibleShapeCache`：形状在自己名下读写，调用方只负责把同一份传给同一个向导的每一次判定。

```ts
return this.ComputeByIndex(units, units.length - 1, cache);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

**猜这个下标之前的形状**：判定 `units[0..tokenIndex]`——**到这个下标为止已经攒下的那一段**（含该下标本身）能不能构成这个形状。

与 `Compute` 的差别是「判到哪儿为止」：`Compute` 判的是全段，本方法判的是**前缀**。

抽象方法，**基类不给实现**：前缀取到哪儿、看出什么算「是我」，每个形状都不一样，没有普适写法。

```ts
throw new Error("abstract member: ComputeByIndex");
```

## method Build:(host:Token, catalog:CatalogGuide)=>Token

把这个形状建出来，**返回建好的那个单元**。

**基类转调 `BuildByIndex`**：建全段就是建到最后一格为止，形状只实现那条。

```ts
return this.BuildByIndex(host, host.Data.length - 1, catalog);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

能不能现在建。默认可以；候选若还缺后续单元（例如语句还没走到关键字之后），返回 false 让目录继续等。

```ts
return true;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

按**一个下标**把这个形状建出来，**返回建好的那个单元**。

与 `Build` 的差别只有多知道一个下标：`host` 与 `catalog` 同款，`tokenIndex` 告诉它这次建的是「到这个下标为止」那一批。它服务的是向导「逐个喂子单元」那条路（`ComputePossibleShapesByIndex`）。

抽象方法，**基类不给实现**：建到哪儿、建成什么，只有形状自己知道。

```ts
throw new Error("abstract member: BuildByIndex");
```
