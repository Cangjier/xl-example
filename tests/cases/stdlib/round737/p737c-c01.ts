// xl:title `Array.prototype` 上那些**返回迭代器**的方法
// xl:round 737
// xl:judge stdout
// xl:end
console.log([1, 2].keys ? "keys" : "no", [...[1, 2].keys()].join(","));
console.log(typeof [][Symbol.iterator], typeof "s"[Symbol.iterator], typeof new Map()[Symbol.iterator]);
console.log([...new Set([1, 2])].join(","), [..."ab"].join(","));
console.log([...new Map([[1, 2]])][0].join(":"), [...[1, 2].entries()].length);
