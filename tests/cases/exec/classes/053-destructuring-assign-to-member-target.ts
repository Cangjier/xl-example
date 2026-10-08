// xl:title 解构赋值的目标是成员 / 下标（交换写法）
// xl:round 8
// xl:judge stdout
// xl:end

const a = [1, 2];
[a[0], a[1]] = [a[1], a[0]];
console.log(a.join(","));
