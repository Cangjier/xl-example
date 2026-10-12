// xl:title Object.hasOwn / hasOwnProperty / in 三者口径
// xl:round 371
// xl:judge stdout
// xl:end
const proto = { inherited: 1 };
const o: any = Object.create(proto);
o.own = 2;
console.log(Object.hasOwn(o, "own"), Object.hasOwn(o, "inherited"), Object.hasOwn(o, "toString"));
console.log(o.hasOwnProperty("own"), o.hasOwnProperty("inherited"));
console.log("inherited" in o, "toString" in o, "nope" in o);
console.log(Object.hasOwn([1], "0"), Object.hasOwn([1], "length"));
