// xl:title 键序：整数键在前升序、字符串键按插入、Symbol 不进 Object.keys
// xl:round 7
// xl:judge stdout
// xl:end

const o: any = {};
o.b = 1; o["2"] = 2; o.a = 3; o["1"] = 4;
o[Symbol("s")] = 5;
console.log(Object.keys(o).join(","));
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length);
