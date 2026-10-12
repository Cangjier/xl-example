# dependencies
```xl
import { CatalogGuideToken } from "./basic-tokens/catalog-guide-token.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状候选：`CatalogGuideToken` 目录里的一项。它判定已经攒下的单元是不是自己（`Compute`），在被选中时把自己建成对应的形状单元（`Build`）。

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

## method Build:(catalog:CatalogGuideToken)=>Token

把这个形状建出来并返回。

抽象方法，由各形状实现；返回的单元由 `CatalogGuideToken` 接管已经攒下的子单元、按向导覆盖的范围签入签出。

```ts
throw new Error("abstract member: Build");
```
