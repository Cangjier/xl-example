// xl:title void / delete 的返回值与副作用
// xl:round 623
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
console.log(void 0, delete o.a, o.a, delete (o as any).z);
const arr = [1, 2, 3];
delete arr[1];
console.log(arr.length, 1 in arr);
