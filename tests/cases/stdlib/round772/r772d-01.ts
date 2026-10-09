// xl:title `Promise` 静态方法自己那两格：`length` 与 `name`（第 773 轮收掉，这里当守卫）
// xl:round 772
// xl:judge stdout
// xl:end
// **第 772 轮登记的那条缺口在第 773 轮收掉了**（`globals.xl.md` 的 `InstallGlobals`：
// 八个静态走 `BuiltinHostRef` + `DefineBuiltinName`，`BuiltinArity` 那一列写着
// 「七个是一格、`withResolvers` 是零格」），`xl:want differ` / `xl:why` 按规矩撤掉，
// 这一条留着当守卫。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 Promise.all.length', show(() => Promise.all.length));
console.log('02 Promise.all.name', show(() => Promise.all.name));
console.log('03 Promise.allSettled.length', show(() => (Promise as any).allSettled.length));
console.log('04 Promise.race.length', show(() => Promise.race.length));
console.log('05 Promise.any.length', show(() => (Promise as any).any.length));
console.log('06 Promise.resolve.length', show(() => Promise.resolve.length));
console.log('07 Promise.reject.length', show(() => Promise.reject.length));
console.log('08 Promise.resolve.name', show(() => Promise.resolve.name));
console.log('09 Promise.race.name', show(() => Promise.race.name));
console.log('10 Promise.prototype.then.length', show(() => (Promise.prototype.then as any).length));
console.log('11 Promise.length', show(() => Promise.length));
console.log('12 Promise.name', show(() => Promise.name));
