// xl:title 带标号的 do/while 与 continue
// xl:round 304
// xl:judge stdout
// xl:end

let i = 0;
const seen: number[] = [];
outer: do {
  i += 1;
  if (i % 2 === 0) continue outer;
  seen.push(i);
} while (i < 6);
console.log(seen.join(","));
