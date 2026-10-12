// xl:title 属性的枚举顺序：整数键在前且升序，其余按写入
// xl:judge stdout
// xl:end

const o: any = { b: 1, 2: 2, a: 3, 1: 4, c: 5 };
console.log(Object.keys(o).join(","));
console.log(JSON.stringify(Object.keys(o)));
const p: any = {};
p.z = 1;
p[0] = 2;
p.y = 3;
console.log(Object.keys(p).join(","));
