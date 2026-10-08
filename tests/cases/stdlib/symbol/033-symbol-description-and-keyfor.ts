// xl:title Symbol.description / keyFor：注册表里的与临时的分开
// xl:judge stdout
// xl:end

const a = Symbol("x");
const b = Symbol();
const c = Symbol.for("reg");
console.log(a.description, b.description, c.description, Symbol.keyFor(c), Symbol.keyFor(a));
console.log(Symbol.for("reg") === c, Symbol("reg") === a, typeof a);
