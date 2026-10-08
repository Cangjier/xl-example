// xl:title split / join 的往返与空项
// xl:round 371
// xl:judge stdout
// xl:end
const parts = "a,,b,".split(",");
console.log(JSON.stringify(parts), parts.join("|"), parts.length);
console.log(JSON.stringify("a b  c".split(" ")), JSON.stringify("a b  c".split(" ", 2)));
console.log("a,b".split(",", 0).length, "abc".split("", 2).join("-"));
