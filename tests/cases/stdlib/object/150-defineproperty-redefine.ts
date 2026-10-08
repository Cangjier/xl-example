// xl:title `defineProperty` 重定义不可配置属性的那几档
// xl:round 691
// xl:judge stdout
// xl:note 第 691 轮**当天就收掉了**：这一条是那轮普查里量出来的缺口（原样写着「要做」），
//       同一轮的 `DefineOwnFromDescriptor` 补上 `ValidateAndApplyPropertyDescriptor`
//       那一段之后就转绿——**缺口登记与修复在同一条用例上闭环**。
//       顺带收掉同一处的另外三档：`preventExtensions` 上新建一格、冻结之后的**同值**改写
//       （该静默通过，原来因为「没写的 `enumerable` 被当成假」而误抛）、
//       以及不可配置访问器上换 `get`。
// xl:end
const o: any = {};
Object.defineProperty(o, "a", { value: 1, configurable: false });
try { Object.defineProperty(o, "a", { value: 2 }); console.log("ok", o.a); } catch (e: any) { console.log("throw", e.constructor.name); }
try { Object.defineProperty(o, "a", { get() { return 3; } }); console.log("get-ok"); } catch (e: any) { console.log("get-throw", e.constructor.name); }
