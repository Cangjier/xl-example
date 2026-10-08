// xl:title 错误家族的 instanceof 与 instanceof Error
// xl:judge stdout
// xl:end

const e = new TypeError("x");
console.log(e instanceof TypeError, e instanceof Error, e instanceof RangeError);
try { null.x; } catch (err: any) { console.log(err instanceof TypeError, err.name); }
