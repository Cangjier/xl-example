// xl:title `let` 每轮一个新绑定、`var` 不是
// xl:round 691
// xl:judge stdout
// xl:end
const fs1: any[] = [];
for (let i = 0; i < 3; i++) fs1.push(() => i);
console.log(fs1.map((f: any) => f()).join(","));
const fs2: any[] = [];
for (var j = 0; j < 3; j++) fs2.push(() => j);
console.log(fs2.map((f: any) => f()).join(","));
