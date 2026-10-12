// xl:title 闭包里的 this 与方法调用
// xl:round 291
// xl:judge stdout
// xl:end

const obj = { v: 10, get() { return () => this.v; } };
console.log(obj.get()());
const o = { n: 1, inc() { this.n++; return this; } };
console.log(o.inc().inc().n, o.n);
