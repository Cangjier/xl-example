// xl:title defineProperties 一次装多格，以及属性名重复时的次序
// xl:round 678
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperties(o, {
  a: { value: 1, enumerable: true },
  b: { get() { return "b"; }, enumerable: true },
});
console.log(o.a, o.b, Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
