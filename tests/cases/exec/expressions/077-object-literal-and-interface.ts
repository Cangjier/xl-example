// xl:title 对象字面量喂给接口：多余的键与嵌套
// xl:round 371
// xl:judge stdout
// xl:end
interface Cfg { host: string; port: number; opts?: { debug: boolean } }
const a: Cfg = { host: "h", port: 1 };
const b: Cfg = { host: "h", port: 2, opts: { debug: true } };
const list: Cfg[] = [a, b];
console.log(a.port, b.opts!.debug, list.length);
console.log(JSON.stringify(list.map((c) => c.host)), Object.keys(a).join(","));
