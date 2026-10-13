# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { ImportDeclarationShape } from "./import-declaration-shape.xl.md"
```

# namespace cangjie

# class ImportDeclarationScan

`ImportDeclarationPossibleShape` 的判定状态：这一条判到哪儿了。

缓存里属于本形状的那个槽里放的就是它；建一次、之后就地改。

## field Start:int = -1

当前这一条的起点。缓存没命中时扫一次 `ItemUtil.ItemStart`，之后一直复用。

## field At:int = -1

已经折到第几格。

## field Stage:int = 0

档位：`0` 还在等头、`1` 头是 `import`、`2` 子句以 `{` 开头（是我的）、`3` 不是它。

# class ImportDeclarationPossibleShape extends PossibleShape

对应 `SyntaxKind.ImportDeclaration` 的写法：

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

判到 `tokenIndex` 为止这一段能不能构成 `ImportDeclaration`；**判过的不再判**——进度记在 `ImportDeclarationScan` 这一份状态里（cache 里属于本形状的那个槽），每次触发只折新来的那几格。

`ImportDeclarationScan` 就三个字段（`Start` / `At` / `Stage`），档位只有四个数：

- `0` 还在等一个非 trivia 的头；
- `1` 头是 `import`，等下一格非 trivia；
- `2` 子句以 `{` 开头——是我的（`Accept`）；
- `3` 不是它（`Reject`）。

判据同前：头不是 `import` ⇒ `3`；`import` 后面紧跟 `(` ⇒ `3`（动态导入）；紧跟 `{` ⇒ `2`；其余留在 `1` —— `import a from …` 与 `import a = …` 要到 `from`/`=` 那一格才分得开，判据不提前认领。

**状态对象建一次、之后就地在改**：缓存没命中时 `new` 一个、扫一次 `ItemUtil.ItemStart`，然后 `SetState` 写进去；命中之后 `Start` / `At` / `Stage` 全是就地改同一个对象——`SetState` 不再调，也不每次新建一个对象。**起点敢直接复用**，是因为向导每建完一条形状就把整份缓存清空——缓存里还留着状态，就一定是当前这一条的状态。

**够不着的两种排除**：`import.meta` 与 `a.import` 里那个 `.` 是符号，而符号还没有单元，所以现在判不出来；等符号回来了，这两条要补进档位 `3`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
let state = cache.GetState<ImportDeclarationScan>(name);
if (state === null) {
  state = new ImportDeclarationScan();
  state.Start = ItemUtil.ItemStart(units);
  state.At = state.Start - 1;
  cache.SetState(name, state);
} else if (state.At > tokenIndex) {
  state.At = state.Start - 1;
  state.Stage = 0;
}
for (let index = state.At + 1; index <= tokenIndex; index++) {
  state.At = index;
  const unit = units[index];
  if (unit.IsAnnotationToken) {
    continue;
  }
  if (state.Stage === 0) {
    state.Stage = unit instanceof Common && unit.Is("import") ? 1 : 3;
    continue;
  }
  if (state.Stage === 1) {
    if (unit instanceof Bracket && unit.Is("(", ")")) {
      state.Stage = 3;
    } else if (unit instanceof Bracket && unit.Is("{", "}")) {
      state.Stage = 2;
    }
  }
}
if (state.Stage === 3) {
  return ShapeStates.Reject;
}
if (state.Stage === 2) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

按下标建：只收到 `tokenIndex` 为止那一段。`tokenIndex` 落在当前这一条的起点之前时没有可收的单元，**原样返回宿主**。

**起点也不再扫**：判定那一步已经把它记在同一个状态槽里（`catalog.PossibleShapesComputeCache` 就是向导那份缓存）；只有绕过判定直接调 `Build`——缓存里没有状态——时才退回扫一次。

**只签入，不签出、不关闭**：那一刻子句还没读完，收尾是这个形状自己的事——`ImportDeclarationShape.ExitOrPre` 在 `;` 或换行处签出并关闭。这里若先签出一次，它到行尾再签就会撞 `SourceRangeEndIsSetted`。

建出来的单元同时**挂在宿主身上**（`MountedUnit`）：后面的字符由它接着吃。签入取第一个被吃掉的单元的起点——前导注释也在里面，与 TS 节点的 `pos` 口径一致。

```ts
const state = catalog.PossibleShapesComputeCache.GetState<ImportDeclarationScan>(this.constructor.name);
const start = state === null ? ItemUtil.ItemStart(host.Data) : state.Start;
if (start > tokenIndex) {
  return host;
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
const built = new ImportDeclarationShape(host.Template);
for (const item of consumed) {
  built.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin !== null) {
  built.SignIn(begin);
}
host.Data.splice(start, consumed.length, built);
built.Parent = host;
host.MountedUnit = built;
return built;
```
