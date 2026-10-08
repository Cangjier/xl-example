// xl:title 类型谓词函数：运行期就是一个返回布尔的函数
// xl:round 330
// xl:judge stdout
// xl:end

function isString(value: unknown): value is string {
  return typeof value === "string";
}
const items: unknown[] = ["a", 1, "b", null];
console.log(items.filter(isString).join(","));
console.log(isString("x"), isString(1));
