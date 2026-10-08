// xl:title 计算键与取值顺序（键先于值、从左到右）
// xl:round 371
// xl:judge stdout
// xl:end
const log: string[] = [];
function key(name: string): string { log.push("key:" + name); return name; }
function val(name: string, v: number): number { log.push("val:" + name); return v; }
const o = { [key("a")]: val("a", 1), [key("b")]: val("b", 2) };
console.log(log.join(","), JSON.stringify(o));
log.length = 0;
const arr = [val("x", 1), val("y", 2)];
console.log(log.join(","), arr.join(","));
log.length = 0;
class C { [key("m")](): number { return val("m", 3); } }
console.log(log.join(","), new C().m());
const spread = { ...(val("s", 0), { k: 1 }) };
console.log(JSON.stringify(spread));
