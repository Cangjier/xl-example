# dependencies
```xl
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { DirectSession } from "./direct-build-session.xl.md"
import { DirectBuildMetrics } from "./direct-build-metrics.xl.md"
import { DirectBuildPlugins } from "./direct-build-plugins.xl.md"
```

# namespace cangjie

# class DirectBuildRouter

## static field Factories:Map<int, any> = new Map()

## static field Installed:bool = false

## static method Install:()=>void

```ts
if (DirectBuildRouter.Installed) {
  return;
}
DirectBuildRouter.Installed = true;
DirectBuildPlugins.Install();
```

## static method Register:(kind:int, factory:any)=>void

```ts
DirectBuildRouter.Factories.set(kind, factory);
```

## static method Create:(kind:int, shell:Token, context:SyntaxContext)=>DirectSession | null

```ts
if (!DirectBuildRouter.Installed) {
  DirectBuildRouter.Install();
}
const factory = DirectBuildRouter.Factories.get(kind);
if (factory === undefined) {
  return null;
}
// factory 是 session 类对象本身；Pos 由壳的 ShapeToken 口径给出，session 不反向 import statement-shape。
const session = new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell) as DirectSession;
DirectBuildMetrics.Sessions += 1;
return session;
```
