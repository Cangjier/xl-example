// xl:title INI 风格配置解析与类型强制
// xl:round 371
// xl:judge stdout
// xl:end
type Config = Record<string, Record<string, string | number | boolean>>;
function coerce(raw: string): string | number | boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.length > 0 && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}
function parseIni(text: string): Config {
  const out: Config = {};
  let section = "default";
  const problems: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith(";") || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) { section = line.slice(1, -1); out[section] = out[section] ?? {}; continue; }
    const eq = line.indexOf("=");
    if (eq < 0) { problems.push(line); continue; }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    out[section] = out[section] ?? {};
    out[section][key] = coerce(value);
  }
  if (problems.length > 0) out._problems = { lines: problems.join("|") };
  return out;
}
const ini = ["; comment", "name = app", "port = 8080", "debug = true", "", "[db]", "host = localhost", "pool = 5", "ratio = 0.5", "= broken"].join("\n");
const cfg = parseIni(ini);
console.log(Object.keys(cfg).join(","));
console.log(cfg.default.name, cfg.default.port, cfg.default.debug);
console.log(cfg.db.host, cfg.db.pool, cfg.db.ratio, typeof cfg.db.pool);
console.log(JSON.stringify(cfg._problems));
console.log(Object.keys(parseIni("")).length);
