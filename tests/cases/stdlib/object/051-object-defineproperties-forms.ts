// xl:title defineProperties 一次装好几格
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = {};
Object.defineProperties(o, {
  a: { value: 1, enumerable: true },
  b: { value: 2, enumerable: false, writable: true },
  c: { get() { return 3; }, enumerable: true },
});
console.log(o.a, o.b, o.c, Object.keys(o).join(","));
