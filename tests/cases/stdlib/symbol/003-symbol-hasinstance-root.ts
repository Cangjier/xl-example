// xl:title Symbol.hasInstance：自定义 instanceof
// xl:judge stdout
// xl:end

class Even {
  static [Symbol.hasInstance](v: any) { return typeof v === "number" && v % 2 === 0; }
}
console.log(2 instanceof (Even as any), 3 instanceof (Even as any));
