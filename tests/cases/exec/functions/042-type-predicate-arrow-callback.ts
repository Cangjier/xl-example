// xl:title 类型谓词箭头当 `filter` 回调
// xl:round 305
// xl:judge stdout
// xl:end

const xs: (string | null)[] = ["a", null, "b"];
const isStr = (v: string | null): v is string => typeof v === "string";
console.log(xs.filter(isStr).join(","));
