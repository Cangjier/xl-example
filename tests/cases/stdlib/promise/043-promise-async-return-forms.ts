// xl:title async 函数的返回：同步值、await 顺序、隐式 undefined、返回 thenable
// xl:judge stdout
// xl:end

async function f() { return 1; }
async function g() { const v = await f(); return v + 1; }
async function h() {}
async function i() { return { then(res: (v: number) => void) { res(9); } }; }
const run = async () => {
  console.log(await f(), await g(), await h(), await i());
  const order: string[] = [];
  Promise.resolve().then(() => order.push("micro"));
  order.push("sync");
  await null;
  console.log(order.join(","));
};
run();
