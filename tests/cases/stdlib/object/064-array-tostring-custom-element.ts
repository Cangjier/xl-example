// xl:title `Array.prototype.toString` 该问每个元素的 `toString`
// xl:round 305
// xl:judge stdout
// xl:end

class C { toString() { return "C!"; } }
console.log([new C(), 1].toString(), [new C()].join("-"));
