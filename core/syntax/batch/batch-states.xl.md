# namespace cangjie

批次层的返回状态：宿主消费完一个批次后告诉驱动「接下来怎么走」。

# class BatchStates

（契约草案写作 `enum BatchStates`；本包按仓库现有 xl 写法用「静态整型常量类」表达同一组常量，
语义与 `enum` 一致：`0..3`，可直接与 `===` 比较。WP-7 删分支时一并清理。）

## static field Done:int = 0

正常：批次已消费完，`BatchFrom` 清空；字符重放没有新增。

## static field NeedMore:int = 1

item 还没到齐：批次保留，下一批从 `To` 继续。

## static field Reload:int = 2

消费过程中建出了形状/挂载改变了字符归属：清空批次，由驱动压 `ReloadMessage` 重放。

## static field Undo:int = 3

探测型调用或容器交接失败：批次交回调用方处理。

## static method IsValid:(state:int)=>bool

是不是本层定义的四个状态之一（断言用）。

```ts
return state >= 0 && state <= 3;
```
