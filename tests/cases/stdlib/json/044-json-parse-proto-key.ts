// xl:title JSON.parse 的 __proto__ 键是普通自有属性
// xl:round 647
// xl:judge stdout
// xl:end

const o = JSON.parse('{"__proto__": {"x": 1}, "a": 2}');
console.log(Object.keys(o).join(","), JSON.stringify(o.a));
console.log(Object.getPrototypeOf(o) === Object.prototype);
