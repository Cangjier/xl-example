// xl:title JSON.parse 的 reviver：自底向上、改名、删键
// xl:judge stdout
// xl:end

const order: string[] = [];
const out: any = JSON.parse('{"a":{"b":1},"c":2}', (k: string, v: any) => { order.push(k); return typeof v === "number" ? v * 10 : v; });
console.log(order.join(","), out.a.b, out.c);
const dropped: any = JSON.parse('{"keep":1,"drop":2}', (k: string, v: any) => (k === "drop" ? undefined : v));
console.log(JSON.stringify(dropped));
