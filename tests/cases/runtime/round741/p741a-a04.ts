// xl:title 可选调用与**实参求值**（短路时不求值）
// xl:round 741
// xl:judge stdout
// xl:end
const log: string[] = [];
const f = (x: any) => { log.push("f" + x); return x; };
const o: any = null;
console.log(o?.m?.(f(1)), log.length);
const p: any = { m: (x: any) => f(x) };
console.log(p?.m?.(f(2)), log.join(","));
