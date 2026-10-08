// xl:title `Date` 的三种构造形态：无实参问时钟、`Date` 实参拷贝、字符串走 `Date.parse`
// xl:round 767
// xl:judge stdout
// xl:note 第 767 轮收掉的两格（都在这一条里）：
// xl:note ① **不给实参 ⇒ 要问时钟**：原来给死 `0` ⇒ `new Date().getFullYear()` 给 1970、
// xl:note    `new Date().getTime() > 0` 给假（**静默错值**），而同一台机器上 `Date.now()`
// xl:note    明明是对的——`ClockNow` 那一号本来就有宿主在答，这条构造只是**没接上去**。
// xl:note ② **`Date` 实参 ⇒ 拷贝它的时刻**：原来对象直接落进「毫秒数」那一支，
// xl:note    于是**响亮地抛** `needs a number of milliseconds or an ISO string`；
// xl:note    JS 的口径是先 `ToPrimitive(hint "string")`，而本仓的 `toString` 是自己按 UTC
// xl:note    渲染的、`DateParseUnits` 只认 ISO 子集 ⇒ 这一档**直接读它自己那一格时刻**
// xl:note    （时刻的唯一来源就是那一格，与 Node 给同一个答案）。
// xl:note 表里还钉住其余几档：毫秒数、ISO 字符串、`toISOString()` 往返、七实参那一档。
// xl:note **不打印真实钟的读数**（只比大小关系），否则读数不可复现。
// xl:note **不量 `Object.getOwnPropertyNames(new Date())`**：Node 给空数组、本仓给
// xl:note `["__t"]`——时刻只有那一格可放（写在 `DateCtor` 那一段），是明处的一处已知差。
// xl:end
const d = new Date(1000);
console.log("01", new Date().getTime() > 0, new Date().getFullYear() >= 2020);
console.log("02", typeof Date.now(), Date.now() > 0);
console.log("03", new Date(d as any).getTime(), new Date(d as any).getTime() === d.getTime());
console.log("04", new Date(d.toISOString()).getTime());
console.log("05", new Date(1000).getTime(), new Date("1970-01-01T00:00:01.000Z").getTime());
console.log("06", new Date(2020, 0, 2).getTime() === new Date(2020, 0, 2).getTime());
console.log("07", Object.keys(new Date(0)).length);
const copy = new Date(d as any);
console.log("08", copy instanceof Date, copy.getTime() === d.getTime());
