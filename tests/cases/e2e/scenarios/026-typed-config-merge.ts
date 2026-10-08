// xl:title 端到端：带默认值的三层配置合并
// xl:round 323
// xl:judge stdout
// xl:end

interface Cfg { host: string; port: number; tls: { on: boolean; cert?: string }; tags: string[] }
const defaults: Cfg = { host: "localhost", port: 80, tls: { on: false }, tags: ["base"] };
const env: Partial<Cfg> = { port: 8080, tls: { on: true, cert: "c.pem" } };
const user: Partial<Cfg> = { host: "example.com", tags: ["user"] };

function merge(...parts: Partial<Cfg>[]): Cfg {
  const out = JSON.parse(JSON.stringify(defaults)) as Cfg;
  for (const p of parts) {
    for (const k of Object.keys(p) as (keyof Cfg)[]) {
      const v = p[k];
      if (v !== undefined) (out as any)[k] = v;
    }
  }
  return out;
}
const cfg = merge(env, user);
console.log(cfg.host, cfg.port, cfg.tls.on, cfg.tls.cert);
console.log(cfg.tags.length, JSON.stringify(Object.keys(cfg).sort()));
