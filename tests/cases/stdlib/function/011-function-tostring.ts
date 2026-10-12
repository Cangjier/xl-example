// xl:title `Function.prototype.toString` 给的是源码文本吗
// xl:round 691
// xl:judge stdout
// xl:end
function f(a: any): any { return a; }
console.log(typeof f.toString(), f.toString().length > 0);
console.log(String(f).includes("function"));
console.log(typeof (() => 1).toString());
