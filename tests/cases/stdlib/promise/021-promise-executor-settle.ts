// xl:title 执行器递出来的 `resolve` / `reject`：直接调、当值传出去、以及兑现值是承诺
// xl:round 318
// xl:judge stdout
// xl:end

function handOff(cb: (v: number) => void): void { cb(7); }
new Promise<number>((res) => { res(1); })
  .then((v) => { console.log("resolve", v); return v; })
  .then(() => new Promise<number>((_res, rej) => { rej(new Error("no")); }))
  .catch((e: any) => { console.log("reject", e.message); return 0; })
  .then(() => new Promise<number>((res) => { res(Promise.resolve(4) as any); }))
  .then((v) => { console.log("resolve-promise", v); return v; })
  .then(() => new Promise<number>((res) => { handOff(res); }))
  .then((v) => console.log("passed-as-value", v));
