// xl:title `delete` 后面跟方括号（下标删除照旧）
// xl:round 726
// xl:judge stdout
// xl:end
const o: any = { a: 1, b: 2 };
console.log(delete o["a"], JSON.stringify(o), "a" in o);
const arr: any = [1, 2, 3];
console.log(delete arr[1], 1 in arr, arr.length);
console.log(delete ({ x: 1 } as any)["y"]);
