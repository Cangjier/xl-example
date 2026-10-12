// xl:title `Promise` 那一族的实参校验
// xl:round 771
// xl:judge stdout
// xl:want differ
// xl:why 两个根：`Promise.all(1)` / `Promise.race({})` 在 JS 里**返回一个被拒的承诺**（错误在微任务里、不在同步那一趟），本仓**同步抛**；`Promise.resolve.call(null, 1)` 在 JS 里抛 `TypeError: PromiseResolve called on non-object`（接收者不是构造函数），本仓照旧兑现一个承诺
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?");
  }
};
console.log('01 (Promise.all as any)(1).catch((e: any)', show(() => (Promise.all as any)(1).catch((e: any) => e.constructor.name)));
console.log('02 (Promise.all as any)(null).catch((e: a', show(() => (Promise.all as any)(null).catch((e: any) => e.constructor.name)));
console.log('03 (Promise.race as any)({}).catch((e: an', show(() => (Promise.race as any)({}).catch((e: any) => e.constructor.name)));
console.log('04 (Promise.resolve as any).call(null, 1)', show(() => (Promise.resolve as any).call(null, 1)));
