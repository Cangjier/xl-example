// xl:title Object.setPrototypeOf 之后方法的归属变了
// xl:round 304
// xl:judge stdout
// xl:end

const proto = { greet() { return "hi " + this.name; } };
const o: any = { name: "kim" };
Object.setPrototypeOf(o, proto);
console.log(o.greet(), Object.getPrototypeOf(o) === proto, Object.keys(o).join(","));
