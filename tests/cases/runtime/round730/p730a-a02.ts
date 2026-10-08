// xl:title 匿名那三档的 inspect 拼法（`[X (anonymous)]`）
// xl:round 730
// xl:judge stdout
// xl:end
console.log(function* () {});
console.log(async () => {});
console.log(async function* () {});
console.log(function* () {}.constructor.name, (async () => {}).constructor.name);
