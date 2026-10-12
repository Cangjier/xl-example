// xl:title 对象字面量里的方法用 `super` 取原型上的同名方法
// xl:round 323
// xl:judge stdout
// xl:end

const proto = { greet() { return "hi"; } };
const o = { __proto__: proto, greet() { return super.greet() + "!"; } };
console.log(o.greet());
