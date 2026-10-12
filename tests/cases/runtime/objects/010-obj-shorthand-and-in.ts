// xl:title 对象简写 / 计算键 / `in` 与 `delete` 的组合
// xl:judge stdout
// xl:end

const k = "dyn";
const v = 5;
const o: any = { v, [k]: 1, m() { return 2; } };
console.log(o.v, o.dyn, o.m(), "v" in o, "nope" in o);
delete o.dyn;
console.log("dyn" in o, Object.keys(o).sort().join(","));
