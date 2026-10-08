// xl:title 类表达式：赋给变量、当返回值、当场 new
// xl:judge stdout
// xl:end

const C = class { n = 1; get(): number { return this.n; } };
console.log(new C().get());
function make(k: number) { return class { v = k; }; }
console.log(new (make(5))().v);
console.log(new (class { z = 9; })().z);
