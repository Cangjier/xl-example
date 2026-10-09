// xl:title 键的顺序：整数键在前、字符串键按插入、符号最后
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = {};
o.b = 1; o["2"] = 2; o.a = 3; o["1"] = 4; o["01"] = 5;
console.log(Object.keys(o).join(","));
o[Symbol("s")] = 6;
console.log(Object.keys(o).join(","), Object.getOwnPropertySymbols(o).length);
console.log(JSON.stringify(Object.entries(o)));
