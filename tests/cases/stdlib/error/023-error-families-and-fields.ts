// xl:title Error 家族：name / message / instanceof / cause
// xl:round 371
// xl:judge stdout
// xl:end
const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("ref"), new EvalError("ev"), new URIError("u")];
console.log(errs.map((e) => e.name).join(","));
console.log(errs.map((e) => e instanceof Error).join(","));
console.log(new TypeError("t") instanceof TypeError, new TypeError("t") instanceof RangeError);
const withCause = new Error("outer", { cause: new Error("inner") });
console.log((withCause as any).cause.message, String(new Error("x")));
console.log(new Error().message === "", new Error("m").toString());
