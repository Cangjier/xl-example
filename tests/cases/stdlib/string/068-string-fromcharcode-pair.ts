// xl:title `fromCharCode` 拼代理对 与 `fromCodePoint` 一个码位
// xl:round 305
// xl:judge stdout
// xl:end

console.log(String.fromCharCode(0xd83d, 0xde00), String.fromCodePoint(0x1f600), String.fromCharCode(0x41));
