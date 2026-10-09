// xl:title `JSON.parse` 的 reviver / `this` / 边界
// xl:round 779
// xl:judge stdout
// xl:end
const S = (v: any): string => {
  try {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "function") return "fn:" + v.name;
    if (v === undefined) return "undefined";
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return String(v);
  } catch (e) { return "<unprintable>"; }
};
const t = (label: string, f: () => any) => {
  try { console.log(label + " = " + S(f())); }
  catch (e) { console.log(label + " ! " + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?")); }
};

t("01 reviver value", () => JSON.parse('{"a":1}', (k: string, v: any) => typeof v === "number" ? v * 2 : v).a);
t("02 reviver order", () => { const log: string[] = []; JSON.parse('{"a":{"b":1}}', (k: string, v: any) => { log.push(k); return v; }); return log.join(","); });
t("03 reviver array order", () => { const log: string[] = []; JSON.parse('[1,[2]]', (k: string, v: any) => { log.push(k); return v; }); return log.join(","); });
t("04 reviver this", () => { const seen: string[] = []; JSON.parse('{"a":1}', function (this: any, k: string, v: any) { seen.push(typeof this); return v; }); return seen.join(","); });
t("05 reviver delete key", () => JSON.stringify(JSON.parse('{"a":1,"b":2}', (k: string, v: any) => k === "b" ? undefined : v)));
t("06 reviver non-callable", () => { try { return JSON.parse("1", 5 as any); } catch (e: any) { return e.constructor.name; } });
t("07 leading space", () => JSON.parse("  [1]").length);
t("08 trailing space", () => JSON.parse("[1]  ").length);
t("09 exponent", () => JSON.parse("1e3"));
t("10 neg zero", () => String(JSON.parse("-0")));
t("11 unicode escape", () => JSON.parse('"\\u0041"'));
t("12 deep object", () => JSON.parse('{"a":{"b":{"c":1}}}').a.b.c);
t("13 raw control throws", () => { try { JSON.parse("\"a\nb\""); return "no-throw"; } catch (e: any) { return e.constructor.name; } });
