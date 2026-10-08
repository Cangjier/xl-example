// xl:title `Promise.try`：同步返回值兑现
// xl:round 330
// xl:judge stdout
// xl:end

const p = Promise.try(() => 41 + 1);
p.then((v) => console.log("value", v));
console.log(typeof p.then);
