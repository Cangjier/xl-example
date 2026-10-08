// xl:title 静态计算名字段：类上可读、实例上不可读
// xl:round 323
// xl:judge stdout
// xl:end

const KEY = "count";
function makeKey() { return KEY; }
class Counter {
  static [makeKey()] = 10;
  static [KEY + "_next"] = 11;
}
console.log((Counter as any).count, (Counter as any).count_next, (new Counter() as any).count);
