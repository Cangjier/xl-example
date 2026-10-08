// xl:title `void` 后面跟括号字面量（第 726 轮登记、第 727 轮收掉）
// xl:round 726
// xl:judge stdout
// 第 726 轮把它登成缺口（`void` 在类型位还是一个词，无条件进豁免名单会坏掉 64 条），
// 第 727 轮补上 `IsValuePositionPrefix`（看 `void` 左边那一格是不是类型标注的冒号）之后
// 这一条**当场转绿**——`xl:want blocked` / `xl:why` 那几行按规矩删掉。
// xl:end
console.log(void { v: 1 });
console.log(void [1, 2]);
console.log(typeof void 0);
