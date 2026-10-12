// xl:title `console.assert`：条件为真一声不响、为假印到 stderr、前缀那两格
// xl:round 762
// xl:judge stdout
// xl:note 这一条钉的是第 762 轮**收掉的那一处**（第 761 轮量出来的十五个缺名字里代价最小的一格）：
// xl:note 条件为真**一声不响**、为假才往 **stderr** 印 `Assertion failed`。
// xl:note **前缀那两格**：没有消息实参时印的是 `Assertion failed`（没有冒号）、
// xl:note 有消息时是 `Assertion failed: ` 再跟渲染出来的那一行；前缀**不进**渲染
// xl:note （`%` 说明符只看消息实参）。
// xl:note **收法**：把 `log` 那一族的渲染那一趟抽成 `FormatConsoleLine`——
// xl:note `assert` 要的是**同一份口径**，照抄一份就是第二份会漂的答案。
// xl:end
console.assert(true, "no");
console.assert(1, "no");
console.assert(false, "yes %s", "arg");
console.assert(0);
console.assert(false);
console.assert(false, { a: 1 });
console.assert(false, "100%");
console.assert();
console.log("after");
