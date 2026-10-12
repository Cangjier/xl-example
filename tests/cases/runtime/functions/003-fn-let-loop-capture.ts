// xl:title `let` 每次迭代一格：闭包各拿各的 i
// xl:judge stdout
// xl:end

const fns: Array<() => number> = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f()).join(","));
