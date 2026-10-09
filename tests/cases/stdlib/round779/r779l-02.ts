// xl:title `Array.from` / 迭代器 / 静态的边角
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

t("01 from mapFn this", () => { const out: number[] = []; Array.from([1], function (this: any, v: number) { out.push(v + this.n); return v; }, { n: 5 }); return out.join(","); });
t("02 from iterable", () => Array.from(new Map([[1,2]])).length);
t("03 from string surrogate", () => Array.from("\u{1F600}").length);
t("04 from arraylike", () => Array.from({ length: 3, 1: "x" } as any).join(","));
t("05 from non-iterable throws", () => { try { return Array.from(5 as any).length; } catch (e: any) { return e.constructor.name; } });
t("06 of no args", () => Array.of().length);
t("07 isArray prototype", () => Array.isArray(Array.prototype));
t("08 constructor with one number", () => new Array(3).length);
t("09 constructor with string", () => new Array("3" as any).length);
t("10 from map throws", () => { try { Array.from([1], () => { throw new RangeError("r"); }); return "no"; } catch (e: any) { return e.constructor.name; } });
t("11 keys of array", () => [...[ "a","b"].keys()].join(","));
t("12 entries of hole", () => [...[1,,3].entries()].map(e => e.join(":")).join("|"));
t("13 values", () => [...[1,2].values()].join(","));
t("14 iterator of iterator", () => [...[1,2][Symbol.iterator]()].join(","));
