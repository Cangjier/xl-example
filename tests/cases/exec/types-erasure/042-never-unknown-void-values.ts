// xl:title never / unknown / void 作为值位与返回位
// xl:round 371
// xl:judge stdout
// xl:end
function fail(msg: string): never { throw new Error(msg); }
function log(msg: string): void { console.log(msg); }
function parse(v: unknown): number { return typeof v === "number" ? v : 0; }
const v: unknown = "x";
console.log(parse(v), parse(2), log("logged"), parse(undefined));
try { fail("boom"); } catch (e) { console.log("caught", (e as Error).message); }
