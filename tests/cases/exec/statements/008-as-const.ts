// xl:title `as const`：字面量数组/对象照常跑
// xl:judge stdout
// xl:end

const dirs = ["up", "down"] as const;
const cfg = { level: 2, name: "x" } as const;
console.log(dirs[0], dirs.length, dirs.join(","), cfg.level, cfg.name);
