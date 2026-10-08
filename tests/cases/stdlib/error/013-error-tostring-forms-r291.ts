// xl:title 错误的 toString 与 String()
// xl:round 291
// xl:judge stdout
// xl:end

const e = new Error("boom");
console.log(e.toString(), String(e), e.message);
console.log(new TypeError("bad").toString());
