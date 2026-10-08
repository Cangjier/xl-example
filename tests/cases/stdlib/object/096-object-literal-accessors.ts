// xl:title 对象字面量的 getter / setter / 简写 / 计算键
// xl:round 623
// xl:judge stdout
// xl:end

let store = 0;
const k = "dyn";
const o = {
  a: 1,
  get g() { return store; },
  set g(v: number) { store = v; },
  [k]: 2,
  m() { return this.a; },
};
o.g = 7;
console.log(o.g, o.dyn, o.m(), Object.keys(o).join(","));
