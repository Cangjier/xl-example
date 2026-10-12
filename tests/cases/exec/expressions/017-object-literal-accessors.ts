// xl:title 对象字面量里的 get / set（含计算键）
// xl:judge stdout
// xl:end

let stored = 0;
const key = "v";
const o: any = {
  get v() { return stored; },
  set v(x: number) { stored = x * 2; },
  get [key + "2"]() { return stored + 1000; },
  n: 1,
};
o.v = 5;
console.log(o.v, o.v2, o.n, Object.keys(o).join(","));
