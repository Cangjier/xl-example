// xl:title `Error` 的 `cause` 选项
// xl:round 691
// xl:judge stdout
// xl:end
const e: any = new Error("outer", { cause: 42 });
console.log(e.message, e.cause);
console.log("cause" in e);
