// xl:note 第 869 轮普查量出的缺口（unique-symbol-newline-4）：这一条钉的是上面那条根因的一个落点
// 第 873 轮转绿（`xl:known-gap` 按规矩撤掉，用例留着当守卫）：缺口原来是
// `unique` 与 `symbol` 之间的换行：`unique symbol` 是**两个字连排**的类型运算符，换行那一刻两半都被拆开
declare const s: unique 
 symbol;
