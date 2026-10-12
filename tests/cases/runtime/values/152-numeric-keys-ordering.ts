// xl:title 属性枚举顺序：整数键在前升序，其余按插入序
// xl:round 323
// xl:judge stdout
// xl:end

const o: any = {};
o.z = 1; o["2"] = 2; o.a = 3; o["10"] = 4; o["1"] = 5;
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(o));
