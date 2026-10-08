// xl:title 对象字面量里的计算键写成 symbol 变量
// xl:round 678
// xl:judge stdout
// xl:end

const s = Symbol("k");
let i = 0;
const o: any = {
  [s]: "sym",
  ["str" + i]: "dyn",
  [1 + 1]: "num",
};
console.log(o[s], o.str0, o[2]);
console.log(Object.keys(o).sort().join(","));
