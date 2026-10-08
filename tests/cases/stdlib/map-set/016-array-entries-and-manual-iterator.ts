// xl:title 数组的 keys / values / entries 与手写 next() 循环
// xl:judge stdout
// xl:end

const xs = ["a", "b"];
console.log([...xs.keys()].join(","), [...xs.values()].join(","));
console.log(JSON.stringify([...xs.entries()]));
const it = xs.entries();
let step = it.next();
while (!step.done) { console.log(step.value[0], step.value[1]); step = it.next(); }
