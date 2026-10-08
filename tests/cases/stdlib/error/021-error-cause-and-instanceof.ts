// xl:title 错误链：`cause`、家族与 `instanceof`
// xl:round 331
// xl:judge stdout
// xl:end

const root = new TypeError("bad type");
const wrapped = new Error("outer", { cause: root });
console.log(wrapped.message, wrapped.cause.message);
console.log(wrapped instanceof Error, root instanceof TypeError, root instanceof Error);
console.log(wrapped.name, root.name);
