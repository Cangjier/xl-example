// xl:title `var` 每轮共享一格（与 `let` 对照）
// xl:judge stdout
// xl:end

const fns: any[] = [];
for (var i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
const lets: any[] = [];
for (let j = 0; j < 3; j++) lets.push(() => j);
console.log(lets.map((f) => f()).join(","));
