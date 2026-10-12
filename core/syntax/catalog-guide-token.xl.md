# dependencies
```xl
import { Branch } from "./branch.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { PossibleShape } from "./possible-shape.xl.md"
import { ShapeStates } from "./shape-states.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { UnitToken } from "./unit-token.xl.md"
import { Template } from "./templates/template.xl.md"
import { Sequence } from "./templates/sequence.xl.md"
import { AreaAnnotation } from "./basic-tokens/area-annotation.xl.md"
import { Bracket } from "./basic-tokens/bracket.xl.md"
import { Common } from "./basic-tokens/common.xl.md"
import { LineAnnotation } from "./basic-tokens/line-annotation.xl.md"
import { RegexToken } from "./basic-tokens/regex-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录向导：先当成「还不知道是哪种形状」的宿主，用 basic tokens 的跳转队列把一串子单元攒在自己名下。

只有一条触发路径：basic token 关闭时向上通知，落到本单元的 `NotifyClosed`，由它问一遍目录里的候选（`PossibleShape.Compute`）；被拒的候选逐个出局，**当且仅当只剩一个候选**时把它交给 `PossibleShape.Build` 建成形状单元并顶替自己，一个候选都不剩就抛错。

处理字符的方式与 `UnitToken` 一致：本单元不覆写 `Process` 与 `Default`。

# class CatalogGuideToken extends UnitToken

形状目录向导。

## static readonly field BranchQueue:Sequence<Branch> = new Sequence<Branch>([AreaAnnotation.JumpIn, LineAnnotation.JumpIn, RegexToken.JumpIn, Bracket.JumpIn, Common.AppendIn])

本类的跳转队列：basic tokens 的分支，相对顺序与通用队列一致。

## field PossibleShapes:Array<PossibleShape> = []

本次尝试剩下的候选。构造时从传入的候选拷一份，判定过程中被拒的逐个去掉。

## field PossibleShapesComputeCache:Map<string, any> = new Map()

候选判定的缓存。键与值都由形状自己约定，同一向导的所有判定共用这一份。

## constructor:(template:Template, shapes:Array<PossibleShape>)=>void

以模板与候选目录创建：取本类的跳转队列，并把候选拷进 `PossibleShapes`。

```ts
super(template);
this.ProcessQueue = CatalogGuideToken.BranchQueue;
this.PossibleShapes.push(...shapes);
```

## method NotifyClosed:()=>void

子单元关闭的通知：问一遍候选。

```ts
this.ComputePossibleShapes();
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

本单元不因某个字符而退出。

```ts
return BranchStates.Undo;
```

## protected method Close:()=>void

关闭本单元：打个标记，然后把最后一个子单元也关掉。

最后一个子单元可能不存在，所以先判空再关。

```ts
this.Closed = true;
const last = this.Last();
if (last !== null) {
  last.TryToClose();
}
```

## method ComputePossibleShapes:()=>void

问一遍剩下的候选，把被拒的去掉，然后按**个数**行动：只剩一个就建它，一个都不剩就抛错，还有多个就继续等后面的单元。

「接受」与「不确定」在这一次判定里同义——建不建只看剩下几个候选。

```ts
const remain: PossibleShape[] = [];
for (const item of this.PossibleShapes) {
  const state = item.Compute(this.Data, this.PossibleShapesComputeCache);
  if (state === ShapeStates.Reject) {
    continue;
  }
  remain.push(item);
}
this.PossibleShapes = remain;
if (remain.length === 1) {
  this.BuildShape(remain[0]);
  return;
}
if (remain.length === 0) {
  throw new Error(`CatalogGuideToken: 没有候选形状可以构成（已攒 ${this.Data.length} 个子单元）`);
}
```

## private method BuildShape:(shape:PossibleShape)=>void

建形状：`Build` 拿到的单元接住已经攒下的子单元、按本单元覆盖的范围签入签出，然后顶替自己；建成的形状不再接收字符，父单元的挂载位一并清掉。

```ts
const parent = this.Parent;
const start = this.SourceRange.Start;
const end = this.SourceRange.End ?? this.LastSource;
const built = shape.Build(this);
if (start !== null) {
  built.SignIn(start);
}
this.MoveDataTo(built);
if (end !== null) {
  built.SignOut(end);
}
this.Replace(built);
if (parent !== null && parent.MountedUnit === built) {
  parent.MountedUnit = null;
}
```
