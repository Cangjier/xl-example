// xl:title `Symbol.toPrimitive` 的 hint
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { [Symbol.toPrimitive](hint: string) { return "hint:" + hint; } };
console.log(String(o));
console.log(`${o}`);
console.log(o + "");
try { console.log(+o); } catch (e: any) { console.log("unary", e.constructor.name); }
