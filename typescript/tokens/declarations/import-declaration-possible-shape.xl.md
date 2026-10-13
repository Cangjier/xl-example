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

判到 `tokenIndex` 为止这一段能不能构成 `ImportDeclaration`；**判过的不再判**——进度记在 cache 的 `Scan` 键下，每次触发只折新来的那几格。

缓存值三个字段：`Start`（这一条的起点）、`At`（已经折到第几格）、`Stage`（档位）。档位只有四个数：

- `0` 还在等一个非 trivia 的头；
- `1` 头是 `import`，等下一格非 trivia；
- `2` 子句以 `{` 开头——是我的（`Accept`）；
- `3` 不是它（`Reject`）。

判据同前：头不是 `import` ⇒ `3`；`import` 后面紧跟 `(` ⇒ `3`（动态导入）；紧跟 `{` ⇒ `2`；其余留在 `1` —— `import a from …` 与 `import a = …` 要到 `from`/`=` 那一格才分得开，判据不提前认领。

`Start` 与缓存里记的不一致（上一条建完、或者被别的调用方搅了）就从头折：宁可多折一遍，不能拿上一条的状态判这一条。

**够不着的两种排除**：`import.meta` 与 `a.import` 里那个 `.` 是符号，而符号还没有单元，所以现在判不出来；等符号回来了，这两条要补进档位 `3`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.constructor.name;
const start = ItemUtil.ItemStart(units);
const state = cache.Get(name, "Scan");
let at = -1;
let stage = 0;
if (state !== null && state.Start === start && state.At <= tokenIndex) {
  at = state.At;
  stage = state.Stage;
}
for (let index = at + 1; index <= tokenIndex; index++) {
  at = index;
  const unit = units[index];
  if (unit.IsAnnotationToken) {
    continue;
  }
  if (stage === 0) {
    stage = unit instanceof Common && unit.Is("import") ? 1 : 3;
    continue;
  }
  if (stage === 1) {
    if (unit instanceof Bracket && unit.Is("(", ")")) {
      stage = 3;
    } else if (unit instanceof Bracket && unit.Is("{", "}")) {
      stage = 2;
    }
  }
}
cache.Set(name, "Scan", { Start: start, At: at, Stage: stage });
if (stage === 3) {
  return ShapeStates.Reject;
}
if (stage === 2) {
  return ShapeStates.Accept;
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide)=>Token

按下标建：只收到 `tokenIndex` 为止那一段。`tokenIndex` 落在当前这一条的起点之前时没有可收的单元，**原样返回宿主**。

**只签入，不签出、不关闭**：那一刻子句还没读完，收尾是这个形状自己的事——`ImportDeclarationShape.ExitOrPre` 在 `;` 或换行处签出并关闭。这里若先签出一次，它到行尾再签就会撞 `SourceRangeEndIsSetted`。

建出来的单元同时**挂在宿主身上**（`MountedUnit`）：后面的字符由它接着吃。签入取第一个被吃掉的单元的起点——前导注释也在里面，与 TS 节点的 `pos` 口径一致。

```ts
const start = ItemUtil.ItemStart(host.Data);
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
