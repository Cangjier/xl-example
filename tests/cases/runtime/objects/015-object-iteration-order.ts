// xl:title 整数键在前、插入序在后的枚举顺序
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = {};
o.b = 1; o["2"] = 2; o.a = 3; o["1"] = 4;
console.log(Object.keys(o).join(","), JSON.stringify(o));
