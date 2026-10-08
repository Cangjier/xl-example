// xl:title getOwnPropertyNames 与 getOwnPropertySymbols 的镜像关系
// xl:round 371
// xl:judge stdout
// xl:end
const o: any = { a: 1, 2: 2 };
o[Symbol("x")] = 3;
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.getOwnPropertySymbols(o).length);
const arr = [1, 2];
console.log(Object.getOwnPropertyNames(arr).join(","));
