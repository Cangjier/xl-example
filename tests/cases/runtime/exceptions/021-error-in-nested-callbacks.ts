// xl:title 回调里抛出的中断与捕获
// xl:round 291
// xl:judge stdout
// xl:end

try {
  [1, 2].forEach((v) => { if (v === 2) throw new Error("stop"); });
} catch (e: any) { console.log("caught", e.message); }
console.log("after");
