// xl:title `Date` 的溢出规范化与比较
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

t("01 UTC overflow month", () => new Date(Date.UTC(2020, 12, 1)).toISOString());
t("02 UTC overflow day", () => new Date(Date.UTC(2020, 0, 32)).toISOString());
t("03 setUTCMonth overflow", () => { const d = new Date(Date.UTC(2020, 0, 31)); d.setUTCMonth(1); return d.toISOString(); });
t("04 ms truncation", () => new Date(1500).toISOString());
t("05 date compare", () => (new Date(1000) as any) > (new Date(999) as any));
t("06 parse date only", () => String(Date.parse("1970-01-01")));
t("07 parse invalid", () => String(Date.parse("nope")));
t("08 getUTC pieces", () => { const d = new Date(Date.UTC(2021, 5, 15, 10, 20, 30, 400)); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()].join(","); });
t("09 setUTCHours overflow", () => { const d = new Date(Date.UTC(2020, 0, 1)); d.setUTCHours(25); return d.toISOString(); });
t("10 UTC arity", () => Date.UTC.length);
t("11 valueOf vs getTime", () => new Date(7).valueOf() === new Date(7).getTime());
t("12 toISOString invalid", () => { try { return new Date(NaN).toISOString(); } catch (e: any) { return e.constructor.name; } });
