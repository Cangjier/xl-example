// xl:title Error 的 cause 链
// xl:round 291
// xl:judge stdout
// xl:end

const inner = new Error("inner");
const outer = new Error("outer", { cause: inner });
console.log(outer.message, (outer as any).cause.message, outer.toString());
console.log(new Error("x").cause);
