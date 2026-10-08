// xl:title Symbol.keyFor / description 与注册表
// xl:round 647
// xl:judge stdout
// xl:end

const g = Symbol.for("shared");
console.log(Symbol.keyFor(g), g.description, Symbol.for("shared") === g);
console.log(Symbol.keyFor(Symbol("local")), Symbol("local").description);
const s = Symbol();
console.log(s.description, String(s));
