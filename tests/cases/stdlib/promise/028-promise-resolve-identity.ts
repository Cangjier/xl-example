// xl:title Promise.resolve 的身份与 thenable 采纳
// xl:round 371
// xl:judge stdout
// xl:end
const p = Promise.resolve(1);
console.log(Promise.resolve(p) === p);
const thenable = { then(res: (v: number) => void) { res(42); } };
Promise.resolve(thenable as any).then((v) => console.log("thenable", v));
Promise.resolve(2).then((v) => console.log("plain", v));
console.log("sync-first");
