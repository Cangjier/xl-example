// xl:title 可选调用与**括号**（`(o?.m)()` 与 `o?.m?.()` 的差别）
// xl:round 741
// xl:judge stdout
// xl:end
const o: any = { m() { return 7; } };
console.log((o?.m)());
const n: any = null;
try { (n?.m)(); } catch (e: any) { console.log("caught", (e as any).constructor.name); }
