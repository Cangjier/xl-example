// xl:title 循环里的 let 捕获 + 微任务顺序
// xl:round 7
// xl:judge stdout
// xl:end

const out: number[] = [];
for (let i = 0; i < 3; i++) {
  Promise.resolve(i).then((v) => out.push(v));
}
const vars: number[] = [];
for (var j = 0; j < 3; j++) {
  Promise.resolve().then(() => vars.push(j));
}
Promise.resolve().then(() => {
  console.log(out.join(","), vars.join(","));
});
