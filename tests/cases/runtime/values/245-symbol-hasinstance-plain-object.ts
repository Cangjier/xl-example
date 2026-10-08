// xl:title 自定义 Symbol.hasInstance（普通对象上）
// xl:round 7
// xl:judge stdout
// xl:end

class Even {
  static [Symbol.hasInstance](value: any): boolean {
    return typeof value === "number" && value % 2 === 0;
  }
}
console.log(4 instanceof Even, 5 instanceof Even, "4" instanceof Even);
console.log([2, 3, 4].filter((n) => n instanceof Even).join(","));
