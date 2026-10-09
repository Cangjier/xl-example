// xl:title 閿欒瀹舵棌鐨勫舰鐘讹細`cause` / `AggregateError` / 鏍囩 / 鍘熷瀷閾?// xl:round 781
// xl:judge stdout
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

t("01 cause", () => { const e: any = new Error("a", { cause: 5 }); return String(e.cause); });
t("02 cause absent", () => String(new Error("a").cause));
t("03 aggregate errors", () => { const e: any = new AggregateError([1, 2], "m"); return e.errors.join(",") + ":" + e.message + ":" + e.name; });
t("04 aggregate length", () => AggregateError.length);
t("08 toString", () => String(new TypeError("t")));
t("09 toString no message", () => String(new TypeError()));
t("10 stack typeof", () => typeof new Error("x").stack);
t("11 name writable", () => { const e: any = new Error("x"); e.name = "Custom"; return String(e); });
t("12 message own prop", () => Object.prototype.hasOwnProperty.call(new Error("x"), "message"));
t("13 error in array", () => [new Error("a")].map(e => e.message).join(","));
t("14 isError", () => Error.isError(new Error("x")) + ":" + Error.isError({}));
t("15 throw non-error", () => { try { throw "s"; } catch (e: any) { return typeof e; } });
t("16 rethrow", () => { try { try { throw new RangeError("r"); } catch (e: any) { throw e; } } catch (e: any) { return e.constructor.name; } });
t("17 error proto chain", () => Object.getPrototypeOf(TypeError) === Error);
t("18 cause with nested", () => { const inner = new Error("i"); const e: any = new Error("o", { cause: inner }); return e.cause.message; });
