// xl:title Array.from 的 array-like 那一支（有 length 的对象与空对象）
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 `p709c-c06` · `p709c-c07` 两条同判定点的探针。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

probe(() => JSON.stringify(Array.from({ length: 2 } as any)));
probe(() => JSON.stringify(Array.from({} as any)));
