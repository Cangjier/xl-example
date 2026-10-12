// xl:title Math 常量的属性描述符
// xl:round 795
// xl:judge stdout
// xl:end
// **按判定点并组（第 795 轮）**：吸收 `p709d-d01` · `d02` · `d03` 三条同判定点的探针。
const show = (v: any) => (v === null ? "null" : typeof v + ":" + String(v));
const probe = (f: any) => {
  try { console.log(show(f())); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); }
};

{
  const names = ["PI", "E", "LN2", "LN10", "LOG2E", "LOG10E", "SQRT2", "SQRT1_2"];
  let out = "";
  for (const n of names) { const d: any = Object.getOwnPropertyDescriptor(Math, n); out = out + n + "=" + d.writable + d.enumerable + d.configurable + " "; }
  console.log(out.trim());
}
probe(() => { const d: any = Object.getOwnPropertyDescriptor(Math, "PI"); return d.value > 3.14 && d.value < 3.15; });
probe(() => Object.getOwnPropertyDescriptor(Math, "PI").get === undefined);
