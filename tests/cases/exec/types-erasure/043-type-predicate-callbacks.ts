// xl:title 类型谓词写在回调上（运行期就是个布尔函数）
// xl:round 371
// xl:judge stdout
// xl:end
const values: unknown[] = [1, "a", null, 2, undefined, "b"];
const isNum = (v: unknown): v is number => typeof v === "number";
const nums: number[] = values.filter(isNum);
const strs: string[] = values.filter((v): v is string => typeof v === "string");
console.log(nums.join(","), strs.join(","), values.filter(Boolean).length);
console.log(values.find(isNum), values.findIndex(isNum), values.every((v) => v !== 0));
