// xl:title 函数的源码文本：三种写法的 toString
// xl:round 291
// xl:judge stdout
// xl:end

function f(a: number) { return a; }
console.log(f.toString().includes("function"), String(f) === f.toString());
console.log((() => 1).toString().includes("=>"));
const obj = { m() { return 1; } };
console.log(obj.m.toString().includes("m"));
