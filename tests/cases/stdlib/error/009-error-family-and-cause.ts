// xl:title 错误家族：四类 + cause + instanceof 的层级
// xl:judge stdout
// xl:end

const e = new TypeError("t");
const s = new SyntaxError("s");
const r = new RangeError("r");
const c = new Error("outer", { cause: new Error("inner") });
console.log(e instanceof Error, e instanceof TypeError, s.name, r.name);
console.log(c.message, c.cause.message, c.cause instanceof Error);
console.log(Object.prototype.toString.call(e), e.toString(), s.toString());
