// xl:note 链**中间**的调用之后再取成员仍属同一条链：`CjcliHost.Fs().readFileSync(p)` 一次收完，
// 于是外层那次调用（`CallExpression`）拿得到被调用者。原来链在第一次调用处被截断，
// 外层调用整段消失（实测真实语料 `CallExpression` 缺 1263 里的最大一块）。
// xl:expect PropertyAccess:1,Method:2
const content = CjcliHost.Fs().readFileSync(path, "utf8");
