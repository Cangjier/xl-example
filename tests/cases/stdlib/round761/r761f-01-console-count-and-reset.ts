// xl:title `console.count` / `console.countReset`：标签缺省、逐标签计数、重置
// xl:round 761
// xl:judge stdout
// xl:note 这一条钉的是第 761 轮**收掉的那一处**：两格原来**根本没挂**
// xl:note （`console.count()` 报 `cannot call a non-closure value`——那句话听起来像
// xl:note 「调用写错了」，其实是那一格没人挂）。现在是这一族里**唯一有状态的一对**：
// xl:note 标签缺省是 `"default"`、行文本是 `标签: 次数`、走 stdout，
// xl:note `countReset(标签)` 只清那一个（`countReset()` 清 `default`）。
// xl:note **状态挂在接收者自己的隐藏属性上**（这一层没有模块级可变量，
// xl:note 而规范里 `countMap` 本来就长在那个 `Console` 实例上）。
// xl:end
console.count();
console.count();
console.count("x");
console.count("x");
console.countReset("x");
console.count("x");
console.countReset();
console.count();
