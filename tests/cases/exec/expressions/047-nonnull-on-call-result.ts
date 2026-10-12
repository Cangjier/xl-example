// xl:title 非空断言落在调用结果上（`maybe()!.length`）
// xl:round 305
// xl:judge stdout
// xl:end

function maybe(): string | null { return "xyz"; }
console.log(maybe()!.length, maybe()?.length, maybe()!.toUpperCase());
