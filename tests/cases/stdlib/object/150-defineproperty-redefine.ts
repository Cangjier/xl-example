// xl:title `defineProperty` 重定义不可配置属性的那几档
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why `defineProperty` 重定义**不可配置**属性时没做 `ValidateAndApplyPropertyDescriptor`
//       那一步：JS 抛 `TypeError`，本仓照写（`{ value: 2 }` 静默生效）。要做。
// xl:end
const o: any = {};
Object.defineProperty(o, "a", { value: 1, configurable: false });
try { Object.defineProperty(o, "a", { value: 2 }); console.log("ok", o.a); } catch (e: any) { console.log("throw", e.constructor.name); }
try { Object.defineProperty(o, "a", { get() { return 3; } }); console.log("get-ok"); } catch (e: any) { console.log("get-throw", e.constructor.name); }
