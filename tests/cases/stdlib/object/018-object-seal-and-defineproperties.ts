// xl:title Object.seal 那一条与一次定义多个属性
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperties(o, { a: { value: 1, enumerable: true }, b: { value: 2, enumerable: false } });
console.log(o.a, o.b, Object.keys(o).join(","), Object.getOwnPropertyNames(o).join(","));
const s: any = Object.seal({ x: 1 });
s.x = 2;
console.log(s.x, Object.isSealed(s), Object.isFrozen(s));
