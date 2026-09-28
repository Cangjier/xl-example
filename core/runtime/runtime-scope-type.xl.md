# namespace cangjie

Cangjie 执行器的运行时作用域模型：`RuntimeScope` 用类型标记自己在控制流中的角色，跳转类步骤（`break` / `continue` / `return` / 异常）据此寻找目标作用域。

# enum RuntimeScopeType

运行时作用域类型。

- case Common
普通块作用域。
- case Loop
循环体作用域，`break` / `continue` 的目标。
- case Return
函数返回作用域，`return` 的目标。
- case Try
`try` 作用域，异常跳转的目标。
