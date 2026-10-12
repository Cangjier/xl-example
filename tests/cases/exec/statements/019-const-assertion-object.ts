// xl:title `as const` 落在对象与数组上
// xl:round 304
// xl:judge stdout
// xl:end

const cfg = { mode: "fast", retries: 3 } as const;
const dirs = ["up", "down"] as const;
console.log(cfg.mode, cfg.retries, dirs.join(","));
function use(d: typeof dirs[number]) { return d.toUpperCase(); }
console.log(use("up"));
