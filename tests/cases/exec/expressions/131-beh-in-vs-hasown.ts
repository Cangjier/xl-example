// xl:title in 走原型链、hasOwnProperty 只认自己的
// xl:round 678
// xl:judge stdout
// xl:end

const proto = { p: 1 };
const o: any = Object.create(proto);
o.own = 2;
console.log("p" in o, "own" in o, "none" in o);
console.log(Object.prototype.hasOwnProperty.call(o, "p"), Object.prototype.hasOwnProperty.call(o, "own"));
console.log(o.hasOwnProperty("own"), o.hasOwnProperty("p"));
