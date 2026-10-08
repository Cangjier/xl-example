// xl:title 符号的 description / toString / 注册表
// xl:round 304
// xl:judge stdout
// xl:end

const a = Symbol("desc");
const b = Symbol();
console.log(a.description, b.description, a.toString(), String(a).length > 0);
console.log(Symbol.for("x") === Symbol.for("x"), Symbol.keyFor(Symbol.for("x")), Symbol.keyFor(a));
