// xl:title `Symbol` 的描述与 `typeof`
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = Symbol("d");
console.log(s.description, s.toString(), typeof s);
console.log(Symbol().description, Symbol.for("a") === Symbol.for("a"));
console.log(typeof Symbol.keyFor(Symbol("x")));
