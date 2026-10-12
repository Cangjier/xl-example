// xl:title Function.prototype.toString 给源码文本
// xl:judge stdout
// xl:end

function named(a: number): number { return a + 1; }
const arrow = (n: number) => n;
console.log(typeof named.toString(), named.toString().includes("named"));
console.log(arrow.toString().startsWith("(n"), String(named) === named.toString());
