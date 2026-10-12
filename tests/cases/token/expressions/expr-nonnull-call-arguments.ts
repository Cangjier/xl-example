// xl:note 非空断言当被调用者：`f!(1)` 那一对括号是这次调用自己的实参表（第 664 轮）
// xl:expect NotNull,Method
f!(1);
f!(1, 2);
a.b!(1);
