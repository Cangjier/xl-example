// xl:title 类数组：靠 length + 下标就能被 Array.from 收，arguments 也是这一类
// xl:round 7
// xl:judge stdout
// xl:end

const like = { 0: "a", 1: "b", length: 2 };
console.log(Array.from(like).join(","), Array.prototype.slice.call(like).join(","));
function f() { return Array.from(arguments).join("+"); }
console.log(f(1, 2, 3), f.length);
