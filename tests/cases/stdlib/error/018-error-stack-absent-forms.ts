// xl:title `Error` 的 `message` / `name` 与 `toString` 三种形态
// xl:round 305
// xl:judge stdout
// xl:end

console.log(String(new Error("m")), String(new TypeError("t")), String(new Error()));
