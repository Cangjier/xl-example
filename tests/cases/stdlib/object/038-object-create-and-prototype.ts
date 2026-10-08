// xl:title Object.create 的继承读，与自有 / 继承两种判据
// xl:round 291
// xl:judge stdout
// xl:end

const proto = { greet() { return "hi"; } };
const o: any = Object.create(proto);
o.n = 1;
console.log(o.greet(), o.n, Object.getPrototypeOf(o) === proto);
console.log(Object.keys(o).join(","), "greet" in o, o.hasOwnProperty("greet"));
