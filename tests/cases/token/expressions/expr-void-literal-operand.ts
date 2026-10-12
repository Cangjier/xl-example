// xl:note `void` 后面跟对象 / 数组字面量（第 727 轮：值位前缀那一格）
// xl:expect UnaryOperator,ObjectLiteral,ArrayLiteral
// 第 727 轮：`void` 与 `delete` / `await` / `yield` 同源（都只可能做前缀），
// 但它多一道闸——`void` 同时是类型位的一个词（`function f(): void {`），
// 所以进豁免名单之前要问 `IsValuePositionPrefix`（看它左边那一格是不是类型标注的冒号）。
// 这一条钉的是**值位那一半**：`void { … }` / `void [ … ]` 各收成一个 `UnaryOperator`，
// 里面装的是**对象 / 数组字面量**，而不是块 / 下标。
console.log(void { v: 1 }, void [1, 2]);
const a = void { v: 2 };
const b = void [3];
function f(): void { const t = 1; }
