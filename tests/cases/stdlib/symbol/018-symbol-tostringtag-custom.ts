// xl:title 自定义 `Symbol.toStringTag` 影响 `Object.prototype.toString`
// xl:round 305
// xl:judge stdout
// xl:end

class C { get [Symbol.toStringTag]() { return "Custom"; } }
console.log(Object.prototype.toString.call(new C()), String(new C()));
