// xl:title 整数字面量键排在前面，且按数值升序
// xl:round 691
// xl:judge stdout
// xl:end
const o: any = { b: 1, 2: 2, a: 3, 1: 4 };
console.log(Object.keys(o).join(","));
console.log(Object.values(o).join(","));
console.log(JSON.stringify(Object.entries(o)));
