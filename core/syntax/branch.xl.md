# dependencies
```xl
import { BranchConditionResult } from "./branch-condition-result.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次「跳转尝试」的抽象：处理一个字符时，依次问每个 `Branch` 要不要接手。

# class Branch

一次跳转尝试。

`Condition` 与 `Success` 是抽象方法，写成抛错桩；`Failed` 是供子类覆写的钩子，默认空实现，直接不写 ts 体。

## method Condition:(context:SyntaxContext, unit:Token, source:Source)=>BranchConditionResult

判断本次跳转是否成立，并给出 `Message` 号。

抽象方法，由各 token 里嵌套的 `Branch` 子类实现。

```ts
throw new Error("abstract member: Condition");
```

## method Success:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

条件成立时执行跳转：把字符加进单元、签入签出、或挂载新单元。

```ts
throw new Error("abstract member: Success");
```

## method Failed:(context:SyntaxContext, unit:Token, source:Source, result:BranchConditionResult)=>void

条件不成立时的钩子。

默认空实现，只有少数子类重写（如 `Common.Branch.Failed` 会关掉上一个单元）。这里不写 ts 体，打印器产出空方法。

## method Transit:(Context:SyntaxContext, Host:Token, Src:Source)=>BranchStates

执行一次跳转：条件成立走 `Success` 并返回 `Done`，否则走 `Failed` 并返回 `Undo`。

条件结果先取出来再分流：`Success` 与 `Failed` 都要拿到同一个 `Result`。

```ts
const Result = this.Condition(Context, Host, Src);
if (Result.Success) {
  this.Success(Context, Host, Src, Result);
  return BranchStates.Done;
}
this.Failed(Context, Host, Src, Result);
return BranchStates.Undo;
```
