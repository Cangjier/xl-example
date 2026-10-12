// xl:title 嵌套 try：内层 return 时两层 finally 的先后，以及抛错时 finally 的先后
// xl:round 7
// xl:judge stdout
// xl:end

function f(): string {
  const log: string[] = [];
  try {
    try { return log.push("inner") && "ret"; } finally { log.push("fin-inner"); }
  } finally { log.push("fin-outer"); }
}
console.log(f());
try {
  try { throw new Error("e"); } finally { console.log("A"); }
} catch { console.log("B"); } finally { console.log("C"); }
