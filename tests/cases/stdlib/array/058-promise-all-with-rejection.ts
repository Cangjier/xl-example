// xl:title `Promise.all` 里有一项被拒绝
// xl:round 305
// xl:judge stdout
// xl:end

Promise.all([Promise.resolve(1), Promise.reject(new Error("no"))]).catch((e) => console.log("caught", (e as Error).message));
console.log("sync");
