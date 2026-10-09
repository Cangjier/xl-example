// xl:title `JSON.stringify` 的缩进与值域边角
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

t("01 empty obj space", () => JSON.stringify({}, null, 2));
t("02 empty arr space", () => JSON.stringify([], null, 2));
t("03 nested array space", () => JSON.stringify([[1]], null, 1));
t("04 space string", () => JSON.stringify({ a: 1 }, null, "--"));
t("05 space clamp 10", () => JSON.stringify({ a: 1 }, null, 100).length);
t("06 replacer array", () => JSON.stringify({ a: 1, b: 2, c: 3 }, ["a", "c"] as any));
t("07 replacer array order", () => JSON.stringify({ c: 3, a: 1 }, ["a", "c"] as any));
t("08 toJSON with key", () => JSON.stringify({ a: { toJSON(k: string) { return "k:" + k; } } } as any));
t("09 toJSON non-callable", () => JSON.stringify({ a: { toJSON: 5 } } as any));
t("10 nested undefined prop", () => JSON.stringify({ a: { b: undefined }, c: 1 }));
t("11 undefined in array", () => JSON.stringify([undefined, function () { }, Symbol("s")]));
t("12 symbol value prop", () => JSON.stringify({ a: Symbol("s"), b: 1 }));
t("13 boolean/null wrappers", () => JSON.stringify([new Number(1), new String("a"), new Boolean(false)] as any));
t("14 key order integer", () => JSON.stringify({ b: 1, 2: 2, a: 3, 1: 4 }));
t("15 escaping slash", () => JSON.stringify("a/b"));
t("16 escaping del", () => JSON.stringify("\u007f"));
