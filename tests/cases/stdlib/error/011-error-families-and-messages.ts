// xl:title 错误家族的 name / message 与 instanceof
// xl:round 291
// xl:judge stdout
// xl:end

const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
console.log(errs.map((e) => e.name + ":" + e.message).join(" "));
console.log(errs.every((e) => e instanceof Error), errs[0] instanceof TypeError);
