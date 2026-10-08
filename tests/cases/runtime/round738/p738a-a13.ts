// xl:title 逻辑链落在**实参 / 下标 / 模板插值**里（短路次序）
// xl:round 738
// xl:judge stdout
// xl:end
const log: string[] = [];
const s = (t: string, v: any) => { log.push(t); return v; };
function f(...xs: any[]) { return xs.join("|"); }
console.log(f(s("a", 0) && s("b", 1), s("c", 1) || s("d", 2)));
const o: any = { k: 7 };
console.log(o[s("e", "k") ?? "z"], [s("f", 0) || 5].length);
console.log("t=" + (s("g", 1) && "yes"));
console.log(log.join(","));
