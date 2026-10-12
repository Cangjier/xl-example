// xl:title `never` / `void` / `unknown` 标注下的值照跑
// xl:round 305
// xl:judge stdout
// xl:end

function fail(): never { throw new Error("nope"); }
function nothing(): void { console.log("void fn"); }
let u: unknown = 5;
nothing();
try { fail(); } catch (e) { console.log("caught"); }
console.log(typeof u, (u as number) + 1);
