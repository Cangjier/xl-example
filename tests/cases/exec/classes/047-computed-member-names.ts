// xl:title 计算成员名：对象字面量与类里的 [expr]、方法简写
// xl:round 7
// xl:judge stdout
// xl:end

const k = "dyn";
const n = 1;
const o = { [k]: 1, ["a" + n]: 2, [`t${n}`]: 3, ["m"]() { return "m"; } };
const c = class { ["p"] = 4; [k]() { return 5; } };
const inst: any = new c();
console.log(o.dyn, o.a1, o.t1, o.m(), inst.p, inst.dyn());
