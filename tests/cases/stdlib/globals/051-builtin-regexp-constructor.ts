// xl:title RegExp 构造器：new RegExp / 字面量与字面量不是一回事
// xl:judge stdout
// xl:want blocked
// xl:why `RegExp` 这个全局名没登记。**必做**
// xl:end

const re = new RegExp("a+", "g");
console.log(re.test("caaat"), re.source, re.flags);
console.log(/b/.test("abc"), "abc".replace(/b/, "B"));
console.log(typeof RegExp, new RegExp("x").toString());
