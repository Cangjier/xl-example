# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

本目录（`core/syntax/`）是整个解析器的骨架。

# enum BranchStates

分支的跳转结果。

- case Undo
未执行：条件不成立，本字符没有被消费，调用方需要回退。
- case Done
已执行：条件成立，本字符已被消费，继续下一个字符。
