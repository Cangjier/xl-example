// xl:title 微任务的顺序：同步先跑完，再按排队的先后
// xl:judge stdout
// xl:end

console.log("1");
Promise.resolve().then(() => console.log("3"));
Promise.resolve().then(() => { console.log("4"); Promise.resolve().then(() => console.log("5")); });
console.log("2");
