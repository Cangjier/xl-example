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

## field Result:BranchConditionResult = new BranchConditionResult()

**这一格跳转条件的「草稿纸」**（第 1205 轮，用户口径 1.2「提升 parse 效率」）：
每一次 `Condition` 都往这一格上写答案并把它 `return` 出去——**一条 `Branch` 实例一份**，
不再每问一次就 `new` 一个。

**为什么可以共用一份**（三件事都在这一页上，要一起读才成立）：

1. `Transit` 是**唯一**的调用点（`UnitToken.ProcessChar` 那一趟，外加 `IfSetBranch` 自己那两处），
   而它拿到答案之后**立刻**读 `Result.Success`、紧接着才调 `Success` / `Failed`
   ——中间没有第二次 `Condition` 插队的余地；
2. 各页的 `Condition` **只写不读**（全仓读 `Message` 的只有两处，都在 `Success` 的**第一句**：
   `CommonBranch` 与 `SymbolBranch`），所以嵌套再进来把这一格重写时，外面那次要读的那一格
   早就读走了；
3. `Condition` 里**没有一处会再跑解析**（判据只用「已经读到的东西」——本工程那条铁律），
   所以「写了一半被另一次跳转改写」这条路上根本没有车。

**实测**（`tmp/r1205-transit.mjs`，挂在编译产物的 `Branch.prototype.Transit` 上，
跑 `node_modules/typescript/lib/typescript.d.ts` 一份）：`Transit` 走 **6935798** 次，
其中成立 **346351** 次、不成立 **6589447** 次（**95.0%**）——这一格省掉的是每份
**659 万个临时对象**。

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

默认空实现，只有少数子类重写（如 `Identifier.Branch.Failed` 会关掉上一个单元）。这里不写 ts 体，打印器产出空方法。

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
