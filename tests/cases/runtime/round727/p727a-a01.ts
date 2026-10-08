// xl:title `void` 后面跟对象字面量（第 727 轮收掉的根）
// xl:round 727
// xl:judge stdout
// xl:end
const a = void { v: 1 };
console.log(a);
console.log(void { v: 2 });
const arr = [void { v: 3 }, void { v: 4 }];
console.log(arr.length, arr[0], arr[1]);
