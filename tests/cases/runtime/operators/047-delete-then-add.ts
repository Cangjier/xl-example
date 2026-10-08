// xl:title 删除后再加：键序与 hasOwnProperty
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2, c: 3 };
delete o.b;
o.b = 9;
console.log(Object.keys(o).join(","), o.b, o.hasOwnProperty("b"));
