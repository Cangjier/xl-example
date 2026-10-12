// xl:title `arguments` 与形参的别名（松散模式）
// xl:round 779
// xl:judge stdout
// xl:want differ
// xl:why 松散模式下 `function sloppy(a) { a = 99 }` 之后 `arguments[0]` 在 JS 里是 **99**（形参与 `arguments` 是同一格的两个名字），本仓给 **1**——形参住在帧槽、`arguments` 是开帧时另造的数组，**两份存储**。与 `exec/functions/095-arguments-length` **同一条根**（那一条量的是 `.length` 那一半）；这一条把**严格模式那一半**（`"use strict"` 下**不**联动，两边都是 1）与函数自己的 `length` 钉在一起，收的时候两半一起对。
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
const NL = (label: string, f: any) => t(label, () => f.name + "/" + f.length);

function sloppy(a: number) { a = 99; return (arguments as any)[0]; }
t("01 sloppy aliasing", () => sloppy(1));
const strictFn = function (a: number) { "use strict"; a = 99; return (arguments as any)[0]; };
t("02 strict no aliasing", () => strictFn(1));
t("03 length of function", () => sloppy.length);
t("04 arguments in arrow", () => { const outer = function () { const g = () => (arguments as any).length; return g(); }; return outer(1, 2, 3); });
