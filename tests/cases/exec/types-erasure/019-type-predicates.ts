// xl:title 类型谓词不产生运行期东西
// xl:round 291
// xl:judge stdout
// xl:end

function isString(x: unknown): x is string { return typeof x === "string"; }
console.log(isString("a"), isString(1));
