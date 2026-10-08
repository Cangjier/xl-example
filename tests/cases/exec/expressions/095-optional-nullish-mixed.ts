// xl:title 可选链与空值合并混用：?? 的优先级与括号的必要性
// xl:round 7
// xl:judge stdout
// xl:end

const cfg: any = { a: { b: null }, c: 0, d: false, e: "" };
console.log(cfg?.a?.b ?? "dflt", cfg?.c ?? "dflt", cfg?.d ?? true, cfg?.e ?? "dflt");
console.log((cfg?.missing ?? "m") === "m", (cfg.a?.b || "or") === "or");
const n: any = { v: 0 };
console.log(n?.v ?? -1, (n?.v || -1), n?.v === 0 ? "zero" : "notzero");
