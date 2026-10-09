// xl:note 尖括号断言后面再跟一次比较：断言的那个 `>` 不折（这一格还差一层——断言本身没有先成形）
// xl:known-gap 断言与它右边那次比较同时出现时，投影把 `<T>x` 与 `x > y` 都投了出来（TS 是 `(<T>x) > y` 一层套一层）；本仓缺 BinaryExpression / LessThanToken / GreaterThanToken，多出重复的断言与二元节点
<T>x > y
