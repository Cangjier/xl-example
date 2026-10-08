// xl:title `Error.isError`：只有错误对象给真
// xl:round 330
// xl:judge stdout
// xl:end

console.log(Error.isError(new Error("x")), Error.isError(new TypeError("y")));
console.log(Error.isError({}), Error.isError("Error"), Error.isError(null));
