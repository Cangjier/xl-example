// xl:title `new.target` 与 `bind` 出来的构造
// xl:round 691
// xl:judge stdout
// xl:note 第 977 轮转绿（`xl:want differ` 按规矩撤掉，用例留着当守卫）：缺口原来是
//        **绑定函数被 `new` 时 `new.target` 丢了**——本仓给 `false`、Node 给 `true`。
//        根因两处：① 宿主通道上**没有地方放**「这一次 `new` 的是谁」（只有
//        `HostConstructing` 一位布尔与 `HostConstructThis` 一个实例），② `CallNative`
//        那一条**重入**开帧路根本不铺 `new.target` 那一格。修法是照 `HostConstructThis`
//        那条老办法再开一格 `HostConstructNewTarget`（`DoNew` 置上、调完还原、
//        进根集），宿主 ABI 加第六格，`BoundCall` 沿 `__boundTarget` 解到**原函数**
//        再交给目标，`CallNative` 三条开帧路各铺一格。
// xl:end
function F(this: any): any { console.log("target", new.target === F); }
function bare(): void { console.log("bare", new.target === undefined); }
bare();
new (F as any)();
const G: any = (F as any).bind(null);
new G();
