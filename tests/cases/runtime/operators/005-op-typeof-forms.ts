// xl:title `typeof` 的**各种操作数形状**（标识符 / 字面量 / 对象 / 数组 / 函数）
// xl:judge stdout
// xl:end

console.log(typeof 1, typeof "s", typeof true, typeof undefined, typeof null);
console.log(typeof {}, typeof [], typeof (() => 1), typeof console);
const named = 5;
console.log(typeof named);
