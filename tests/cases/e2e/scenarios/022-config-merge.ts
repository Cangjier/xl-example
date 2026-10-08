// xl:title 配置深合并：递归 + 展开 + `JSON` 往返
// xl:round 305
// xl:judge stdout
// xl:end

type Config = Record<string, any>;
function merge(base: Config, over: Config): Config {
  const out: Config = { ...base };
  for (const key of Object.keys(over)) {
    const a = out[key];
    const b = over[key];
    out[key] = a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)
      ? merge(a, b)
      : b;
  }
  return out;
}
const base = { server: { host: "localhost", port: 80 }, debug: false, tags: ["a"] };
const user = { server: { port: 8080 }, debug: true, tags: ["b"] };
const merged = merge(base, user);
console.log(JSON.stringify(merged));
console.log(merged.server.host, merged.server.port, merged.tags.join(","), base.server.port);
