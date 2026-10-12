// xl:title 解构交换与嵌套默认值
// xl:round 330
// xl:judge stdout
// xl:end

let a = 1;
let b = 2;
[a, b] = [b, a];
console.log(a, b);
const { x: { y = 5 } = {}, z = 9 } = { z: 1 } as any;
console.log(y, z);
const [, second = "s", ...rest] = ["f", undefined, "t1", "t2"];
console.log(second, rest.join(","));
