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

```txt
namespace Store {
  export interface Item { … }   ← 模块体括号，本入口给它挂声明目录
  export enum Kind { … }
  export type Id = number;
  const items: Item[] = [];
  export function add(item: Item): void { … }
}
```

## static field InstallCount:int = 0

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

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

```ts
return StatementRouteUtil.IsIncrementalShapesEnabled()
  && StatementRouteUtil.EnableShellExpressions
  && StatementRouteUtil.EnableNamespaceBodyDeclarations;
```

## static method Owns:(bracket:Token | null)=>bool

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
