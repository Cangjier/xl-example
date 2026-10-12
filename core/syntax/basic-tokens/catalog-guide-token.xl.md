# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { BranchStates } from "../branch-states.xl.md"
import { ReloadMessage } from "../messages/reload-message.xl.md"
import { PossibleShape } from "../possible-shape.xl.md"
import { ShapeStates } from "../shape-states.xl.md"
import { Source } from "../source.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { UnitToken } from "../unit-token.xl.md"
import { Template } from "../templates/template.xl.md"
import { Sequence } from "../templates/sequence.xl.md"
import { AreaAnnotation } from "./area-annotation.xl.md"
import { Bracket } from "./bracket.xl.md"
import { Common } from "./common.xl.md"
import { LineAnnotation } from "./line-annotation.xl.md"
import { RegexToken } from "./regex-token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

形状目录向导：先当成「还不知道是哪种形状」的宿主，用 basic tokens 的跳转队列把一串子单元攒在自己名下。每有一个子单元关闭就问一遍目录里的候选（`PossibleShape.Compute`），被拒的候选逐个出局；只剩一个候选、或某个候选直接「接受」时，把它交给 `PossibleShape.Build` 建成形状单元并顶替自己。

它只带 basic tokens 的跳转队列。队列处理不了的字符交给兜底：把已经攒下的子单元按原顺序还给父单元（溶解），并把当前字符插回队首重新处理。

# class CatalogGuideToken extends UnitToken

形状目录向导。

## static readonly field Catalog:Array<PossibleShape> = []

形状目录。语言层往这里登记候选，每个向导实例构造时拷一份。

## static method Register:(shape:PossibleShape)=>void

往目录里登记一个候选；已经在目录里就抛错。

```ts
if (CatalogGuideToken.Catalog.includes(shape)) {
  throw new Error("CatalogGuideToken: the shape is already registered");
}
CatalogGuideToken.Catalog.push(shape);
```

## static method CreateBranchQueue:()=>Sequence<Branch>

本类的跳转队列：basic tokens 的分支，相对顺序与通用队列一致。

```ts
return new Sequence<Branch>([
  AreaAnnotation.JumpIn,
  LineAnnotation.JumpIn,
  RegexToken.JumpIn,
  Bracket.JumpIn,
  Common.AppendIn,
]);
```

## field PossibleShapes:Array<PossibleShape> = []

本次尝试剩下的候选。构造时从 `Catalog` 拷一份，判定过程中被拒的逐个去掉。

## field PossibleShapesComputeCache:Map<string, any> = new Map()

候选判定的缓存。键与值都由形状自己约定，同一向导的所有判定共用这一份。

## private field PendingCompute:bool = false

「有子单元关闭过、需要重算」的标记。

## constructor:(template:Template)=>void

以模板创建：取本类的跳转队列、不设重组队列，并把目录拷进 `PossibleShapes`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor, (defaultValue: any) => CatalogGuideToken.CreateBranchQueue());
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor, null);
this.PossibleShapes.push(...CatalogGuideToken.Catalog);
```

## method NotifyClosed:()=>void

子单元关闭的通知：只把待算标记置真，不再往上转。

```ts
this.PendingCompute = true;
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符：有待算标记就先结算，结算后自己已经不在树上时把当前字符插回队首、交给父单元，否则走基类的调度。

```ts
if (this.PendingCompute) {
  this.PendingCompute = false;
  this.ComputePossibleShapes();
  if (!this.IsAttached()) {
    context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
    return;
  }
}
super.Process(context, source);
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

本单元不因某个字符而退出。

```ts
return BranchStates.Undo;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

跳转队列没接手的字符：先结算已经攒下的部分，仍未离场就把子单元还给父单元，再把当前字符插回队首重新处理。

```ts
this.ComputePossibleShapes();
if (this.IsAttached()) {
  this.Dissolve();
}
context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
```

## protected method Close:()=>void

关闭：先结算——有候选「接受」或只剩一个候选就建成形状，一个候选都不剩就溶解；结算完还在树上且仍有多个候选时抛错。

```ts
if (this.IsAttached()) {
  this.ComputePossibleShapes();
  if (this.IsAttached() && this.PossibleShapes.length > 1) {
    throw new Error(`CatalogGuideToken: 形状不确定：${this.DescribeCandidates()}`);
  }
}
this.Closed = true;
```

## method ComputePossibleShapes:()=>void

问一遍剩下的候选，把被拒的去掉，然后按结果行动：有候选「接受」就立刻建它，否则只剩一个候选就建它，一个候选都不剩就把子单元还给父单元。

```ts
const remain: PossibleShape[] = [];
let target: PossibleShape | null = null;
for (const item of this.PossibleShapes) {
  const state = item.Compute(this.Data, this.PossibleShapesComputeCache);
  if (state === ShapeStates.Reject) {
    continue;
  }
  if (state === ShapeStates.Accept && target === null) {
    target = item;
  }
  remain.push(item);
}
this.PossibleShapes = remain;
if (target === null && remain.length === 1) {
  target = remain[0];
}
if (target !== null) {
  this.BuildShape(target);
  return;
}
if (remain.length === 0) {
  this.Dissolve();
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

## private method Dissolve:()=>void

溶解：子单元按原顺序留在父单元的同一位置上，自己退出，父单元的挂载位清空。

```ts
const parent = this.Parent;
if (parent === null) {
  return;
}
const index = parent.Data.indexOf(this);
if (index === -1) {
  return;
}
for (const item of this.Data) {
  item.Parent = parent;
}
parent.Data.splice(index, 1, ...this.Data);
this.Data.length = 0;
if (parent.MountedUnit === this) {
  parent.MountedUnit = null;
}
```

## private method IsAttached:()=>bool

自己是不是还在父单元的子单元里。

```ts
return this.Parent !== null && this.Parent.Data.includes(this);
```

## private method DescribeCandidates:()=>string

把剩下的候选按类名列成一行。

```ts
const names: string[] = [];
for (const item of this.PossibleShapes) {
  names.push(item.constructor.name);
}
return names.join(", ");
```

## method Clone:()=>Token

克隆：不实现，调用即抛错。

```ts
throw new Error("抽象成员未实现");
```
