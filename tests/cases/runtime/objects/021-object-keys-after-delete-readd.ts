// xl:title `delete` 之后再写回同一个键：它排到**最后**
// xl:round 305
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2, c: 3 };
delete o.b;
o.b = 4;
console.log(Object.keys(o).join(","));
