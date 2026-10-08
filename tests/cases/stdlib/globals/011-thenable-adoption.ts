// xl:title `async` 返回一个 thenable：该被采纳
// xl:round 305
// xl:judge stdout
// xl:end

async function f() {
  return { then(res: any) { res(42); } } as any;
}
f().then((v) => console.log("v", v));
console.log("sync");
