// xl:title ?? 只在 null / undefined 上换路、|| 在假值上换路
// xl:judge stdout
// xl:end

const values: any[] = [0, "", false, NaN, null, undefined, 1];
for (const v of values) console.log(v ?? "d", v || "d");
