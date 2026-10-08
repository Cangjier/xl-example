// xl:title Object.create 的原型链与 hasOwnProperty
// xl:round 623
// xl:judge stdout
// xl:end

const proto = { greet() { return "hi"; } };
const o: any = Object.create(proto);
o.x = 1;
console.log(o.greet(), o.hasOwnProperty("x"), o.hasOwnProperty("greet"));
console.log(Object.getPrototypeOf(o) === proto, "greet" in o);
