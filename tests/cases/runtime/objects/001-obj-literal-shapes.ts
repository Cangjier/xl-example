// xl:title 对象字面量的几种键：标识符、字符串、计算、简写
// xl:judge stdout
// xl:end

const k = "dyn";
const v = 4;
const o: any = { a: 1, "b-c": 2, [k]: 3, v, m() { return 5; }, get g() { return 6; } };
console.log(o.a, o["b-c"], o.dyn, o.v, o.m(), o.g);
console.log(Object.keys(o).join(","));
