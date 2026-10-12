// xl:title this 形参与类型谓词都是擦除的
// xl:round 371
// xl:judge stdout
// xl:end
function describe(this: { tag: string }, n: number): string { return this.tag + n; }
function isString(v: unknown): v is string { return typeof v === "string"; }
function assertNum(v: unknown): asserts v is number { if (typeof v !== "number") throw new Error("not num"); }
class Chain { v = 1; self(this: Chain): this { return this; } }
console.log(describe.call({ tag: "t" }, 1), isString("x"), isString(1));
try { assertNum("s"); } catch (e) { console.log((e as Error).message); }
console.log(new Chain().self().v, describe.length, isString.length);
