// xl:title Object.groupBy：按字符串键分组
// xl:round 676
// xl:judge stdout
// xl:end

const grouped = Object.groupBy(["a", "bb", "c", "dd"], (s: string) => String(s.length));
console.log(grouped["1"]?.join(","), grouped["2"]?.join(","), Object.keys(grouped).join("|"));
