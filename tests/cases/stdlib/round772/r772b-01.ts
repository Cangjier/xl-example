// xl:title 空值接收者上的写 / 删 / 下标写：抛的是 TypeError
// xl:round 772
// xl:judge stdout
// xl:end
// 规范第一句是 `RequireObjectCoercible`：`null` / `undefined` 这两档要抛 `TypeError`，
// 而**别的原始值**（数字 / 字符串 / 布尔）才是「一声不响」——两个面一起钉住。
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (undefined).x = 1', show(() => { (undefined as any).x = 1; return "wrote"; }));
console.log('02 (null).x = 1', show(() => { (null as any).x = 1; return "wrote"; }));
console.log('03 (undefined)[0] = 1', show(() => { (undefined as any)[0] = 1; return "wrote"; }));
console.log('04 (null)[0] = 1', show(() => { (null as any)[0] = 1; return "wrote"; }));
console.log('05 delete (undefined).x', show(() => delete (undefined as any).x));
console.log('06 delete (null).x', show(() => delete (null as any).x));
console.log('07 delete (undefined)[0]', show(() => delete (undefined as any)[0]));
console.log('08 (1).x = 1（静默）', show(() => { (1 as any).x = 1; return "wrote"; }));
console.log('09 (1)[0] = 1（静默）', show(() => { (1 as any)[0] = 1; return "wrote"; }));
console.log('10 delete (1).x（真）', show(() => delete (1 as any).x));
console.log('11 字符串 length 只读（静默）', show(() => { const s: any = "abc"; s.length = 9; return s.length; }));
console.log('12 (undefined).x += 1', show(() => { (undefined as any).x += 1; return "wrote"; }));
