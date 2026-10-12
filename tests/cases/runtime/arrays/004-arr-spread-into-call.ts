// xl:title 展开进调用：`f(...xs)`、`Math.max(...xs)`、混合实参
// xl:judge stdout
// xl:end

function add3(a: number, b: number, c: number): number { return a + b + c; }
const xs = [1, 2, 3];
console.log(add3(...xs), Math.max(...xs), Math.max(0, ...xs, 9));
function rest(...parts: number[]): number { return parts.length; }
console.log(rest(...xs, 4, 5));
