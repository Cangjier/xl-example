// xl:title 类字段的计算名（实例与静态各一格）
// xl:round 323
// xl:judge stdout
// xl:end

const KEY = "value";
class Box {
  [KEY] = 1;
  ["static" + "Key"] = 2;
}
const b = new Box();
console.log(b.value, (b as any).staticKey, Object.keys(b).sort().join(","));
