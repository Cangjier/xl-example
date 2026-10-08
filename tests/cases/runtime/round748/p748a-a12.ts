// xl:title 对象字面量：访问器与数据成员同名、计算键、`__proto__`
// xl:round 748
// xl:judge stdout
// xl:end
const o: any = {
  get a() { return "get"; },
  set a(v) { console.log("set", v); },
  b: 2,
  ["c" + 1]: 3,
  "d": 4,
  1: "one",
};
console.log(o.a, o.b, o.c1, o.d, o[1]);
o.a = 9;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify({ ...o, a: 7 }));
const shorthand = { x: 1 };
console.log(JSON.stringify({ shorthand }));
