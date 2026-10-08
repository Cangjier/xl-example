// xl:title 类的计算成员名与 Symbol.iterator
// xl:round 623
// xl:judge stdout
// xl:end

const key = "m";
class C {
  [key]() { return 1; }
  static [Symbol.iterator]() { return [1, 2][Symbol.iterator](); }
}
console.log(new C().m(), [...C].join(","));
