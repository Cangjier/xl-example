// xl:title 构造函数返回对象会顶替 this、返回原始值被忽略
// xl:judge stdout
// xl:end

function A(this: any) { this.v = 1; return { v: 99 }; }
function B(this: any) { this.v = 2; return 42; }
const a: any = new (A as any)();
const b: any = new (B as any)();
console.log(a.v, b.v);
