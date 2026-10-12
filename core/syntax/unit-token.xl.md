# dependencies
```xl
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { IComputePossibleShapes } from "./i-compute-possible-shapes.xl.md"
import { Source } from "./source.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

单元：能够「挂载」子单元的 token。它是 `Root` / `Statement` / `BlockToken` 这一族的共同父类，负责把「先问退出条件、再跑跳转队列、最后兜底」这套调度固定下来。

它同时实现 `IComputePossibleShapes`：`CatalogGuide` 指向**宿主在自己名下的**目录向导（默认 `null`）。这就是 basic token 上溯的终点——上溯逐层找 `IComputePossibleShapes`，且要求那个单元的 `CatalogGuide` 非空。

向导本身不继承任何东西、不在树里，所以它是一个**普通引用**，不是挂载的子单元：本单元的 `Data` 里装的仍是那批 basic token。

# class UnitToken extends Token implements IComputePossibleShapes

单元。

## field CatalogGuide:CatalogGuide | null = null

宿主在本单元名下的目录向导；`null` 表示没有。

它是普通引用而不是子单元——向导不进 `Data`、不进 XML。

普通单元默认没有，所以 basic token 上溯会**穿过**它们继续往上。

## method ComputePossibleShapes:()=>void

重算宿主在本单元名下的目录向导的候选，把自己作为宿主转交给它。

没向导时什么都不做——这正是「普通单元对上溯透明」的由来。

```ts
if (this.CatalogGuide !== null) {
  this.CatalogGuide.ComputePossibleShapes(this);
}
```

## method ComputePossibleShapesByIndex:(tokenIndex:int)=>void

按下标重算候选，把**自己（宿主）与下标**一起转交给向导的同名方法。

向导的方法要两个参数（宿主 + 下标），而接口这里是单参——两者的差由本方法补上。

```ts
if (this.CatalogGuide !== null) {
  this.CatalogGuide.ComputePossibleShapesByIndex(this, tokenIndex);
}
```

## constructor:(template:Template)=>void

以模板创建。挂载与退出这套调度不需要额外状态，构造器里只有转调。

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

判断当前字符是让本单元「退出」还是「前移」。

抽象方法，由各单元实现（如 `Root` 恒返回 `Undo`）。

```ts
throw new Error("abstract member: ExitOrPre");
```

## method Process:(context:SyntaxContext, source:Source)=>void

处理一个字符。

处理顺序：有挂载单元就转给它；否则先问 `ExitOrPre`，`Done` 就记下 `LastSource` 返回；再依次跑 `ProcessQueue` 里的跳转，哪个返回 `Done` 就返回；都不接手才走 `Default`；无论走哪条路都把 `LastSource` 设为当前字符。

整个流程包在 `try/catch` 里：任何异常都被包成 `SyntaxException`，范围取「前一个位置到当前位置」。注意用 `source.Pre()` 建范围时取出来的是前一个 `Source` 本身，不是字符。

```ts
try {
  if (this.MountedUnit !== null) {
    this.MountedUnit.Process(context, source);
    return;
  }
  if (this.ExitOrPre(context, source) === BranchStates.Done) {
    this.LastSource = source;
    return;
  }
  if (this.ProcessQueue !== null) {
    for (const item of this.ProcessQueue.Data) {
      if (item.Transit(context, this, source) === BranchStates.Done) {
        this.LastSource = source;
        return;
      }
    }
  }
  this.Default(context, source);
  this.LastSource = source;
} catch (e) {
  const previous = source.Pre();
  const range = new SourceRange(previous, source);
  throw SyntaxException.FromInner(range, e);
}
```
