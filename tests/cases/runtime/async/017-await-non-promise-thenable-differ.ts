// xl:title `await` 一个 thenable 对象（不是 Promise）
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `await` 一个**不是 Promise 的 thenable** 时该**调它的 `then`**（JS 的
//       `PromiseResolve` 那一支，给 `then` 两个回调），本仓原样把那个对象交回：
//       脚本看到的是 `{ then: [Function: then] }` 而不是解析出来的值。要做。
// xl:end

const thenable: any = { then(resolve: any) { console.log("then called"); resolve(7); } };
async function f(): Promise<void> {
  const v = await thenable;
  console.log("got", v);
}
f();
console.log("sync");
