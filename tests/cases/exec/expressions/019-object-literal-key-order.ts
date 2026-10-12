// xl:title 对象字面量的计算键：先算键再算值（含符号键访问器）
// xl:judge stdout
// xl:end

const order: string[] = [];
const next = (tag: string): string => { order.push(tag); return tag; };
const o: any = { [next("key")]: next("value") };
console.log(order.join(","), o.key);
const sym = Symbol("s");
const so: any = { get [sym]() { return "sym"; }, set [sym](v: string) { order.push("set:" + v); } };
console.log(so[sym]);
so[sym] = "x";
console.log(order.join(","));
