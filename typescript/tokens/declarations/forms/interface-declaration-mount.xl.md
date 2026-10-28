# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { InterfaceDeclarationShape } from "../interface-declaration-shape.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationMount

```txt
interface I { a: number }   ← 在名字那一格挂 InterfaceDeclarationShape（legacy 最终类名 / 同 Pos）
```

## static field MountCount:int = 0

## static method TryBuild:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
// [S3:NAMESPACE-BODY] 宿主判据参数化：根层与**模块块**都是声明宿主（唯一判据在
// `StatementRouteUtil.IsDeclarationHost`）。本 WP 之前这里是 `host.Parent !== null` ——
// 那一句就是「namespace 体内的 interface 永远不建壳」的全部原因。
if (!StatementRouteUtil.IsDeclarationHost(host)) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt < 0 || headAt >= host.Data.length || headAt > tokenIndex) {
  return null;
}
const head = host.Data[headAt];
if (!(head instanceof Common)) {
  return null;
}
if (!(head as Common).Is("interface")) {
  return null;
}
// 名字必须已经到达（`interface` 单独一个词不构成声明；route 已经判成本族，这里只做防御）。
const nameAt = ItemUtil.NextCode(host.Data, headAt + 1);
if (nameAt < 0 || nameAt >= host.Data.length || nameAt > tokenIndex) {
  return null;
}
if (!(host.Data[nameAt] instanceof Common)) {
  return null;
}
const shape = new InterfaceDeclarationShape(host.Template);
return InterfaceDeclarationMount.Mount(host, shape, start, tokenIndex, context);
```

## private static method Mount:(host:Token, shape:InterfaceDeclarationShape, start:int, tokenIndex:int, context:SyntaxContext)=>InterfaceDeclarationShape

```ts
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, consumed.length);
for (const item of consumed) {
  shape.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shape.SignIn(begin);
}
// C1 口径：Pos = 前一个非 trivia 单元的 EndIndex（根层首条语句为 0）。
shape.Pos = pos;
host.Data.splice(start, 0, shape);
shape.Parent = host;
host.MountedUnit = shape;
InterfaceDeclarationMount.MountCount += 1;
// 本格已经吃掉、不会再被单独问一次：补一次目录计算，让接口体 / heritage 从这一格起建。
shape.ComputePossibleShapes(context, PossibleSource.Close);
return shape;
```
