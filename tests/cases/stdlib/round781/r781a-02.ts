// xl:title 错误的抛出与接住：`try` / `finally` / 承诺里的形状
// xl:round 781
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

t("01 error from function", () => { const boom = (): number => { throw new Error("boom"); }; try { return boom(); } catch (e: any) { return e.message; } });
t("02 finally runs", () => { const log: string[] = []; try { try { throw new Error("x"); } finally { log.push("f"); } } catch (e: any) { log.push("c"); } return log.join(","); });
t("03 return in try with finally", () => { const f = (): string => { try { return "t"; } finally { } }; return f(); });
t("04 finally overrides return", () => { const f = (): string => { try { return "t"; } finally { return "f"; } }; return f(); });
t("05 throw in finally", () => { try { try { throw new Error("a"); } finally { throw new Error("b"); } } catch (e: any) { return e.message; } });
t("06 nested catch rethrow", () => { let n = 0; try { try { throw new Error("x"); } catch (e: any) { n++; throw e; } } catch (e: any) { n++; } return n; });
t("07 async throw", () => { const p = (async () => { throw new Error("p"); })(); (p as any).catch(() => { }); return typeof (p as any).catch; });
t("08 promise reject error", () => { Promise.reject(new Error("r")).catch(() => { }); return "scheduled"; });
t("09 error identity", () => { const e = new Error("x"); try { throw e; } catch (got: any) { return got === e; } });
t("10 object with throw-ish fields", () => { try { throw { message: "m", name: "N" }; } catch (e: any) { return e.name + ":" + e.message; } });
