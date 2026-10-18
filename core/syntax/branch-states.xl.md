# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

本目录（`core/syntax/`）是整个解析器的骨架。

# enum BranchStates

分支的跳转结果。它同时是「这次字符怎么处理」的唯一答案：调用方拿到它就知道该继续问下一个分支、该前进到下一个字符，还是该把当前字符重放。

- case Undo
未接手：本字符没有被消费，调用方需要继续问下一个分支。
- case Done
已接手：本字符已被消费，继续下一个字符。
- case Reload
处理过程中建出了形状：本字符没有被任何 token 吃掉，调用方要把它插回队首重放——新形状已经 mount，重放时自然落到它身上。
