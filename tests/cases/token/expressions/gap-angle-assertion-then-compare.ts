// xl:note 尖括号断言后面再跟一次比较：断言只吃**一个一元表达式**，后面那次比较照旧折
// 第 890 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// 投影把 `<T>x` 与 `x > y` 都投了出来（TS 是 `(<T>x) > y` 一层套一层）——
// 断言没先成形的那一层现在由 `IsAngleAssertionHead` 挡住，剩下的交给 `foldBinaryFrom`。
<T>x > y
