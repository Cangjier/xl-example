// xl:title const show = (v) => (v === null ? "null" : typeof v + ":" + String(v)); class B extends null {} try { new B(); console.log("no-throw"); } catch (e) { console.log("throw:" + e.constructor.name); }
// xl:round 699
// xl:judge stdout
// xl:want blocked
// xl:why `class B extends null {}` 是合法的 JS，而继承目标那一趟**只按名字解析**（`null` 被当成一个名字 ⇒ `name is not a local or a capture: null`，整份文件进不来）。JS 里它给的是一个「原型为空、`new` 抛 TypeError」的类。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
class B extends null {}
try { new B(); console.log("no-throw"); } catch (e) { console.log("throw:" + e.constructor.name); }
