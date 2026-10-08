// xl:title 删掉再插回来：键的次序跟着变
// xl:round 304
// xl:judge stdout
// xl:end

const o: any = { a: 1, b: 2, c: 3 };
delete o.b;
o.b = 9;
o[2] = "two";
o[1] = "one";
console.log(Object.keys(o).join(","), JSON.stringify(o));
