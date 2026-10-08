// xl:title `console` 那一族仍然走**同一份渲染**（格式串 / `inspect`）
// xl:round 735
// xl:judge stdout
// xl:end
// 九个名字**共用一份实现**（只有「走哪条流」不同）——
// 所以 `console.error` 的格式串行为与 `console.log` **一字不差**。
// 这一条钉的就是那个「共用」：分开写九份的话，这一句会先漂。
console.error("%s and %d", "x", 3);
console.warn("%s", "y");
console.log("%s and %d", "x", 3);
console.error("multi", 1, true, null);
console.log("multi", 1, true, null);
console.info([1, 2]);
console.debug({ a: 1 });
