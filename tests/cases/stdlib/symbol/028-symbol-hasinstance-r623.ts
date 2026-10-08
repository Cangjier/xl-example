// xl:title instanceof 走 Symbol.hasInstance
// xl:round 623
// xl:judge stdout
// xl:end

class Even {
  static [Symbol.hasInstance](x: any) { return typeof x === "number" && x % 2 === 0; }
}
console.log(2 instanceof Even, 3 instanceof Even);
