// xl:title new Object(null)：构造调用该造一个空对象（不是原样返回 null）
// xl:judge stdout
// xl:want differ
// xl:why `new Object(null)` 被当成 `Object(null)`：构造那一半该造 `{}`，这里原样返回 `null`（静默错值）
// xl:end
console.log(new Object(null as any) === null);
console.log(Object(null as any) === null);
