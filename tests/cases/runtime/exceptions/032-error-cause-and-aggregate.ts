// xl:title Error.cause 与 AggregateError.errors
// xl:round 651
// xl:judge stdout
// xl:end

const inner = new Error("inner");
const outer = new Error("outer", { cause: inner });
console.log(outer.message, (outer as any).cause === inner, (outer as any).cause.message);
const agg = new AggregateError([new Error("a"), new Error("b")], "many");
console.log(agg.errors.length, agg.errors.map((e: any) => e.message).join(","), agg.message);
