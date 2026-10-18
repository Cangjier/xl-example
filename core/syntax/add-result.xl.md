# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

一次「加子单元」的结果：**为什么**是那个结论，以及**结果**是什么。

# class AddResult<Item>

`Token.AddAndCloseLast` 与 `Token.AddToMounted` 的返回值。

**判据只看 `State`**：它说明关闭上一个子单元时发生了什么，是调用方该依据的原因。`Created` 是结果——`State` 为 `Built` 时它一定是 `null`，但反过来不成立，别拿它当判据。

## field Created:Item | null = null

真正加进树的那个单元；`State` 为 `Built` 时是 `null`——**没加**。

## field State:CloseStates = CloseStates.Nothing

关闭上一个子单元的结果。`Built` 表示关闭过程中建出了形状，因此本次的字符不该再建 token，要 reload 给新形状重吃。

## constructor:(created:Item | null, state:CloseStates)=>void

以「加进去的单元」与「关闭的结果」创建。

```ts
this.Created = created;
this.State = state;
```
