// xl:title 宿主 ABI：setTimeout（单文件 tsrun 只给微任务那一档）
// xl:judge stdout
// xl:want blocked
// xl:why `setTimeout` 这个全局名没登记：宿主 ABI 只接了微任务那一档，定时器整档还没有
// xl:end

setTimeout(() => { console.log("timer"); }, 0);
console.log("sync");
