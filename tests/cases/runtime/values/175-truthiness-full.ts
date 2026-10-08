// xl:title 真假值表：所有原始值与包装对象
// xl:round 371
// xl:judge stdout
// xl:end
const vals: any[] = [undefined, null, false, true, 0, -0, 1, NaN, "", "0", "false", [], [0], {}, function () {}, new Boolean(false), new Number(0), new String("")];
console.log(vals.map((v) => (v ? "T" : "F")).join(""));
console.log(Boolean(new Boolean(false)), !!new Boolean(false), Boolean(new String("")));
