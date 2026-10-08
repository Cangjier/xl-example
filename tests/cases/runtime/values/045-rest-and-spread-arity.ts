// xl:title 剩余参数收尾 · 展开传参 · 空剩余
// xl:judge stdout
// xl:end

function f(first: number, ...rest: number[]) { return first + "/" + rest.length + "/" + rest.join("+"); }
console.log(f(1), f(1, 2), f(1, 2, 3, 4));
const xs = [1, 2, 3];
console.log(Math.max(...xs), Math.max(0, ...xs, 9));
