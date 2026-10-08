// xl:title typeof 每一种值（含类表达式）
// xl:judge stdout
// xl:end

console.log(typeof 1, typeof "s", typeof true, typeof undefined, typeof null);
console.log(typeof {}, typeof [], typeof (() => 1), typeof Symbol("x"));
const f = function named() { return 1; };
console.log(typeof f, typeof class C { }, typeof console.log);
