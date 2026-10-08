// xl:title 四种函数的 `length` / `name` 与形参口径（默认值 / 剩余 / 解构）
// xl:round 731
// xl:judge stdout
// xl:end
function named(a: number, b: number) { return a + b; }
console.log(named.length, named.name);
console.log((() => {}).length, JSON.stringify((() => {}).name));
console.log((function (a, b = 1) {}).length, (function (a, ...r: any[]) {}).length);
console.log((function ({ a, b }: any) {}).length, (function (a = 1) {}).length);
console.log((function* g(a: number) {}).name, (function* g(a: number) {}).length);
console.log((async function af(a: number, b: number) {}).name, (async function af(a: number, b: number) {}).length);
console.log((async (a: number) => {}).length, (async () => {}).name === "");
