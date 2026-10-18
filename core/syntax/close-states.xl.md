# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

关闭的结果。

# enum CloseStates

`Token.Close` 与 `Token.TryToClose` 的返回值。

- case Nothing
关闭过程中没有建出形状。
- case Built
关闭过程中建出了形状：当前这个字符不该再建 token，应该 reload 给新形状重吃。
