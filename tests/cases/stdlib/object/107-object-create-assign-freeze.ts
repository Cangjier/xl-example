// xl:title Object：create / assign / getPrototypeOf / hasOwn
// xl:round 9
// xl:judge stdout
// xl:end

const proto = { inherited: 1 };
const o = Object.create(proto);
o.own = 2;
console.log(o.inherited, o.own, Object.getPrototypeOf(o) === proto);
console.log(Object.hasOwn(o, "own"), Object.hasOwn(o, "inherited"), "inherited" in o);
console.log(JSON.stringify(Object.assign({}, { a: 1 }, { b: 2 })));
