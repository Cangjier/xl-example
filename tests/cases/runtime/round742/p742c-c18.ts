// xl:title `throw` 一个**非 Error** 值再 `catch` 出来
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  try { if (x) throw { code: 7 }; return "no"; }
  catch (e: any) { return "code=" + e.code; }
}
console.log(f(1), f(0));
