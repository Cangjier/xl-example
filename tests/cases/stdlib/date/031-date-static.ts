// xl:title Date.now / parse / UTC 与 Date.UTC 的越界归一
// xl:round 623
// xl:judge stdout
// xl:end

console.log(Date.UTC(2020, 12, 1));
console.log(Date.UTC(2020, 0, 32));
console.log(typeof Date.now() === "number");
console.log(Date.parse("2020-01-02T03:04:05.006Z"));
