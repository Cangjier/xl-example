// xl:title never / unknown / void / any 四个特殊类型
// xl:judge stdout
// xl:end

function fail(msg: string): never { throw new Error(msg); }
function logIt(v: unknown): void { console.log("v", v); }
const a: any = 1;
logIt(a);
logIt(undefined);
console.log(typeof fail, a, typeof logIt);
try { fail("boom"); } catch (e) { console.log((e as Error).message); }
