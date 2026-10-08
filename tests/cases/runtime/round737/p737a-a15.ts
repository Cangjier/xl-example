// xl:title `Promise` 的静态形状：`allSettled` / `any` / `withResolvers` / `try`
// xl:round 737
// xl:judge stdout
// xl:end
console.log(typeof (Promise as any).allSettled, typeof (Promise as any).any, typeof (Promise as any).withResolvers, typeof (Promise as any).try);
Promise.allSettled([1, Promise.reject(new Error("x"))]).then((r: any) => {
  console.log(r.length, r[0].status, r[0].value, r[1].status, r[1].reason.message);
});
Promise.any([Promise.reject(new Error("a")), Promise.reject(new Error("b"))]).catch((e: any) => {
  console.log(e.constructor.name, e.errors.length, e.message);
});
