# dependencies
```xl
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

**只有一个方法。** 判定「归不归我」、收尾「上一个同类 token 到此为止」、新开「这个字符起一个新 token」这三件事合成一个 `Transit`：它们共用同一个 `last`、同一份类型判断，拆成三个钩子只会让同一份判断在几处各写一遍。

原先的 `Condition` / `Success` / `Failed` 已经合并进来：`Failed` 当年只做「关掉自己那一类的上一个 token」，于是出现「`Condition` 说不归我、`Failed` 却要关」这种跨方法约定，收在一处之后不再有这种约定。

## method Transit:(context:SyntaxContext, unit:Token, source:Source)=>BranchStates

唯一入口。抽象方法，由各分支实现。

- `Done`：接住这个字符（已经把它收进某个 token，或挂好了新单元）；
- `Undo`：不归自己，调用方继续问下一个分支；
- `Reload`：处理过程中建出了形状，本字符要重放。

```ts
throw new Error("abstract member: Transit");
```
