// xl:title JSON.parse 坏输入要抛（且是可接住的那种）
// xl:judge stdout
// xl:end

for (const bad of ["{", "[1,", "nope", ""]) {
  try { JSON.parse(bad); console.log("no-throw", bad.length); }
  catch (e: any) { console.log("threw", bad.length); }
}
