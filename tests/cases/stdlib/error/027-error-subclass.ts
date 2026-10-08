// xl:title Error 子类：name / message / instanceof / cause
// xl:round 623
// xl:judge stdout
// xl:end

class MyError extends Error { constructor(m: string) { super(m); this.name = "MyError"; } }
const e = new MyError("boom");
console.log(e.name, e.message, e instanceof MyError, e instanceof Error);
const w = new Error("outer", { cause: new Error("inner") } as any);
console.log((w as any).cause.message);
