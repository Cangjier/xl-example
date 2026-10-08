// xl:title Error 的 cause / 各子族 / name 与 message
// xl:judge stdout
// xl:end

const e = new Error("outer", { cause: new Error("inner") });
console.log(e.message, (e.cause as Error).message);
const t = new TypeError("bad type");
console.log(t.name, t.message, t instanceof TypeError, t instanceof Error, t instanceof RangeError);
console.log(String(new RangeError("r")), String(new SyntaxError()));
