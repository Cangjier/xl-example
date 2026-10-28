# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { TypeAliasDeclarationShape } from "../type-alias-declaration-shape.xl.md"
import { BodyGuideUtil } from "../body-guide-util.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

# class TypeAliasDeclarationMount

```txt
type T = { a: number; b?: string }   ← `type` 关键字关闭格就挂真壳（legacy 类名 / 同 Pos），
                                        名字 / 类型字面量成员 / 联合成员随后各自在闭合格成形
```

## static field MountCount:int = 0

## static method TryBuild:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (!StatementRouteUtil.IsDeclarationHost(host)) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
const headAt = ItemUtil.NextCode(host.Data, start);
if (headAt < 0 || headAt >= host.Data.length || headAt > tokenIndex) {
  return null;
}
const head = host.Data[headAt];
if (!(head instanceof Common) || !(head as Common).Is("type")) {
  return null;
}
// 名字必须已经到达（`type` 单独一个词不构成声明；route 已经判成本族，这里只做防御）。
const nameAt = ItemUtil.NextCode(host.Data, headAt + 1);
if (nameAt < 0 || nameAt >= host.Data.length || nameAt > tokenIndex) {
  return null;
}
if (!(host.Data[nameAt] instanceof Common)) {
  return null;
}
const shell = new TypeAliasDeclarationShape(host.Template);
shell.Incremental = true;
BodyGuideUtil.MountShell(host, start, tokenIndex, shell, context);
TypeAliasDeclarationMount.MountCount += 1;
// 本格已经吃掉、不会再被单独问一次：补一次逐格驱动，让名字关闭格从下一格起接上。
shell.ComputePossibleShapes(context, PossibleSource.Close);
return shell;
```
