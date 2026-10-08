// xl:title Symbol.for / keyFor / 作为键的唯一性
// xl:round 371
// xl:judge stdout
// xl:end
const a = Symbol.for("k");
const b = Symbol.for("k");
console.log(a === b, Symbol.keyFor(a), Symbol("k") === Symbol("k"), Symbol.keyFor(Symbol("k")));
const o: any = {};
o[a] = 1;
o["k"] = 2;
console.log(o[a], o["k"], JSON.stringify(o), Object.keys(o).join(","));
console.log(Symbol.for("k").toString(), a.description);
