// xl:title Date 的本地时间写入族：setHours / setDate / setMonth 与非法时刻
// xl:round 778
// xl:judge stdout
// xl:want differ
// xl:why **量出来的形状**（第 778 轮普查当场红的那一行）：本仓把**本机时区**当成 UTC，
// xl:why 于是 `new Date(2020, 0, 15, 12, 30, 45, 500)` 的时刻差**一个时区偏移**
// xl:why （Node 给 `1579030245500`、本仓给 `1579059045500`，本机是 Asia/Shanghai）。
// xl:why **这一条里判据只取「与环境时区无关」的那几档**，可 `02 setHours 返回新时刻`
// xl:why 是**绝对时刻**、藏不住：本地构造 + 本地读回的那几档（01 / 03 / 15）两边都对，
// xl:why 因为偏移在构造与读回上各出现一次、抵消掉了。
// xl:why **它与语料里已有的一族同源**（`stdlib/date/041-date-iso`、`042-r676-std-date-local-time`、
// xl:why `045-names-date-proto` 都记着同一件事）——**根在时区口径**，不在 `set*` 这一族：
// xl:why 本仓的 `Date` 只有 UTC 一条路，本地时区还没有落点。
// xl:why **为什么不顺手收**：那要给 `Date` 加一条「本机偏移」的通路（构造 / 读回 / `set*`
// xl:why 三处一起），是一次独立的重构，与这一条用例量到的 `set*` 半族不是一件事。
// xl:end
const show = (v: any): string => (v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v));
const mk = (): any => new Date(2020, 0, 15, 12, 30, 45, 500);
console.log('01 本机时区读写往返', show(mk().getTime() === mk().getTime()));
console.log('02 setHours 返回新时刻', show((() => { const x = mk(); return x.setHours(3); })()));
const setHours = mk();
setHours.setHours(3);
console.log('03 setHours 之后各字段', show([setHours.getHours(), setHours.getMinutes(), setHours.getSeconds(), setHours.getMilliseconds()].join(",")));
const hourOnly = mk();
hourOnly.setHours(5);
// **只给小时时，分秒毫秒保留原值**（`undefined` 的实参在规范里是「这一档不动」，
// 不是「清成 0」——这一档是本条用例里唯一容易记反的地方，实测值就是判据）。
console.log('04 省略分秒时保留原值', show([hourOnly.getMinutes(), hourOnly.getSeconds(), hourOnly.getMilliseconds()].join(",")));
const setDate = mk();
setDate.setDate(1);
console.log('05 setDate(1)', show(setDate.getDate() + ":" + setDate.getMonth()));
const date0 = mk();
date0.setDate(0);
console.log('06 setDate(0) 回上一月最后一天', show(date0.getMonth() + ":" + date0.getDate()));
const overflow = mk();
overflow.setMonth(13);
console.log('07 setMonth(13) 跨年', show(overflow.getFullYear() + ":" + overflow.getMonth()));
console.log('08 setTime 返回同一值', show((() => { const x = mk(); return x.setTime(0) === 0; })()));
console.log('09 setTime(NaN) 传染', show((() => { const x = mk(); x.setTime(NaN); return [x.getTime(), x.getFullYear(), x.getHours()].join(","); })()));
console.log('10 非法时刻上的 setHours 仍是 NaN', show((() => { const x = new Date(NaN); return [x.setHours(1), x.getTime()].join(","); })()));
console.log('11 setFullYear 返回与字段', show((() => { const x = mk(); const t = x.setFullYear(1999); return [t === x.getTime(), x.getFullYear()].join(","); })()));
console.log('12 仅给年时月份不动', show((() => { const x = mk(); x.setFullYear(1999); return [x.getMonth(), x.getDate()].join(","); })()));
console.log('13 千年那一档', show((() => { const x = new Date(0); x.setFullYear(275760); return x.getFullYear(); })()));
console.log('14 超出范围给 NaN', show((() => { const x = new Date(0); return x.setFullYear(300000); })()));
console.log('15 本机偏移的往返', show((() => { const x = mk(); return x.getTime() === new Date(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), x.getMinutes(), x.getSeconds(), x.getMilliseconds()).getTime(); })()));
console.log('16 valueOf 与 getTime 同源', show((() => { const x = mk(); return x.valueOf() === x.getTime(); })()));
