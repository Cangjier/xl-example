// xl:title 对象字面量里的函数值从属性名取名
// xl:round 330
// xl:judge stdout
// xl:end

const o = { f: () => 1, g: function () {}, "a-b": () => 2, ["c"]: () => 3 };
console.log(o.f.name, o.g.name, o["a-b"].name, o.c.name);
console.log({ n: null, f: () => 1 });
