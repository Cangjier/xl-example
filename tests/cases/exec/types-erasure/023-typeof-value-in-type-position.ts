// xl:title `typeof` 同时出现在值位与类型位
// xl:round 304
// xl:judge stdout
// xl:end

const cfg = { a: 1, b: "s" };
type Cfg = typeof cfg;
type Keys = keyof Cfg;
const k: Keys = "a";
console.log(typeof cfg, k in cfg, cfg[k]);
const t: typeof cfg.b = "x";
console.log(t, typeof t);
