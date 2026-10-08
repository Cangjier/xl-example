// xl:title 带标签的块：`outer: { … break outer; … }`
// xl:judge stdout
// xl:end

let log = "";
outer: {
  log += "a";
  if (log.length === 1) break outer;
  log += "b";
}
console.log(log);
