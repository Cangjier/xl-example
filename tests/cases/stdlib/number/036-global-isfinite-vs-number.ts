// xl:title 全局 `isFinite` 会转换，`Number.isFinite` 不会
// xl:round 305
// xl:judge stdout
// xl:end

console.log(isFinite("1"), Number.isFinite("1"), isNaN("x"), Number.isNaN("x"));
