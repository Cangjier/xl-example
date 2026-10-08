// xl:title 三种立即调用：函数表达式 / 箭头 / 带实参
// xl:judge stdout
// xl:end

console.log((function () { return "fn"; })());
console.log((() => "arrow")());
console.log(((a: number, b: number) => a + b)(2, 3));
console.log((function (n: number) { return n * 2; })(21));
