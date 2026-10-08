// xl:title `continue` 那一跳也要重建环境：两种循环的每轮一格都经得起 `continue`
// xl:round 315
// xl:judge stdout
// xl:end

const fns: (() => number)[] = [];
for (let i = 0; i < 4; i++) { if (i === 1) continue; fns.push(() => i); }
console.log(fns.map((f) => f()).join(","));
const gns: (() => string)[] = [];
for (const ch of ["a", "b", "c"]) { if (ch === "b") continue; gns.push(() => ch); }
console.log(gns.map((f) => f()).join(","));
