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

# class Branch<ValueType = any>

一次跳转尝试。

类型参数带默认值 `any`，因为 `extends` 只接受裸名字（M29）：各 token 里嵌套的 `Branch` 子类要写 `extends Branch`，C# 的 `Branch<char>` 在 ts 侧实例化成 `Branch<any>`。

原 C# 侧是 `public abstract class Branch<ValueType>`：`Condition` 与 `Success` 是抽象方法，`Failed` 是 `virtual` 且默认空实现。按 M13，xl 没有 `abstract` / `virtual` 标记——抽象的写成抛错桩，默认空的直接不写 ts 体（M30）。

## method Condition:(context:SyntaxContext<ValueType>, unit:Token<ValueType>, source:Source<ValueType>)=>BranchConditionResult

判断本次跳转是否成立，并给出 `Message` 号。

原 C# 是 `public abstract`，由各 token 里嵌套的 `Branch` 子类实现。

```ts
throw new Error("abstract member: Condition");
```

## method Success:(context:SyntaxContext<ValueType>, unit:Token<ValueType>, source:Source<ValueType>, result:BranchConditionResult)=>void

条件成立时执行跳转：把字符加进单元、签入签出、或挂载新单元。

原 C# 是 `public abstract`。

```ts
throw new Error("abstract member: Success");
```

## method Failed:(context:SyntaxContext<ValueType>, unit:Token<ValueType>, source:Source<ValueType>, result:BranchConditionResult)=>void

条件不成立时的钩子。

原 C# 是空的 `virtual` 方法，只有少数子类重写（如 `Common.Branch.Failed` 会关掉上一个单元）。这里按 M30 不写 ts 体，打印器产出空方法。

## method Transit:(Context:SyntaxContext<ValueType>, Host:Token<ValueType>, Src:Source<ValueType>)=>BranchStates

执行一次跳转：条件成立走 `Success` 并返回 `Done`，否则走 `Failed` 并返回 `Undo`。

原 C# 用 `Condition(...) is BranchConditionResult Result && Result is { Success: true }` 判定；`Result` 在 `else` 分支里同样可见，所以 ts 侧先取出来再分流。

```ts
const Result = this.Condition(Context, Host, Src);
if (Result.Success) {
  this.Success(Context, Host, Src, Result);
  return BranchStates.Done;
}
this.Failed(Context, Host, Src, Result);
return BranchStates.Undo;
```
