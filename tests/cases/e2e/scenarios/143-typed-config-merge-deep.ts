// xl:title 配置深合并：数组策略、默认值、来源优先级
// xl:round 371
// xl:judge stdout
// xl:end
type Cfg = Record<string, unknown>;
function isPlain(v: unknown): v is Cfg {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function deepMerge(base: Cfg, override: Cfg, options: { arrayStrategy: "replace" | "concat" } = { arrayStrategy: "replace" }): Cfg {
  const out: Cfg = { ...base };
  for (const key of Object.keys(override)) {
    const a = out[key];
    const b = override[key];
    if (isPlain(a) && isPlain(b)) out[key] = deepMerge(a, b, options);
    else if (Array.isArray(a) && Array.isArray(b) && options.arrayStrategy === "concat") out[key] = a.concat(b);
    else out[key] = b;
  }
  return out;
}
const defaults: Cfg = { app: { name: "svc", port: 80, opts: { tls: false, retries: 3 } }, list: [1, 2] };
const env: Cfg = { app: { port: 8080, opts: { tls: true } }, list: [3] };
const merged = deepMerge(defaults, env);
console.log(JSON.stringify(merged));
console.log(JSON.stringify(deepMerge(defaults, env, { arrayStrategy: "concat" }).list));
console.log(JSON.stringify(defaults.app));
const three = deepMerge(deepMerge(defaults, { app: { name: "a" } }), { app: { port: 1 } });
console.log(JSON.stringify(three.app));
console.log(isPlain([]), isPlain(null), isPlain({}));
