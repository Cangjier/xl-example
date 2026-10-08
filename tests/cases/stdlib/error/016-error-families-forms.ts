// xl:title 五个错误族的 name / message / instanceof
// xl:round 304
// xl:judge stdout
// xl:end

const errs = [new Error("e"), new TypeError("t"), new RangeError("r"), new SyntaxError("s"), new ReferenceError("f")];
console.log(errs.map((e) => e.name).join(","));
console.log(errs.map((e) => e instanceof Error).join(","));
console.log(String(errs[2]), errs[3].message);
