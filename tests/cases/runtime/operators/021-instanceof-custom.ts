// xl:title instanceof 认 Symbol.hasInstance（静态方法优先）
// xl:judge stdout
// xl:end

class Even {
  static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
}
console.log(2 instanceof Even, 3 instanceof Even, "2" instanceof Even);
