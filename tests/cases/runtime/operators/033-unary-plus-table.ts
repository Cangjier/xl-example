// xl:title 一元 `+` 的转换表（空数组 0、单元素数组取值、非数字串是 NaN）
// xl:round 305
// xl:judge stdout
// xl:end

const vals: any[] = ["5", true, null, undefined, [], [7], "", "x"];
console.log(vals.map((v) => +v).join(","));
