// xl:title 逻辑赋值：&&= / ||= / ??= 的短路与返回值
// xl:round 7
// xl:judge stdout
// xl:end

const log: string[] = [];
const bump = () => { log.push("bump"); return "b"; };
const o: any = { a: 0 };
o.a ||= bump();
o.a &&= "kept";
console.log(o.a, log.join(","));
const p: any = { b: 0, c: null };
p.b ??= "dflt";
p.c ??= "dflt2";
p.missing ||= 5;
console.log(p.b, p.c, p.missing);
