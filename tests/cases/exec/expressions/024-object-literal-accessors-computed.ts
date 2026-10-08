// xl:title 对象字面量里的访问器与计算键访问器
// xl:judge stdout
// xl:end

let store = 1;
const suffix = "X";
const o = {
  get plain() { return store; },
  set plain(v: number) { store = v; },
  get ["key" + suffix]() { return store * 10; },
  set ["key" + suffix](v: number) { store = v / 10; },
};
o.plain = 4;
console.log(o.plain, o.keyX);
o.keyX = 100;
console.log(store, Object.keys(o).join(","));
