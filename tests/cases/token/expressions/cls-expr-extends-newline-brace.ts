// xl:note 类表达式的继承子句写完、体在下一行（第 912 轮补的守卫）：`const A = class extends B` 换行 `{};` 是一条 `ClassExpression`
// xl:round 912
// 与 `gap-r907-class-expression-name-newline` 同一个根（`class` 后面还有内容时换行落在那一格上），
// 只是尾巴换成了 `extends B`——守卫 `ScanHead` 那一趟要跨过继承子句。
// xl:end
const A = class extends B
{};
