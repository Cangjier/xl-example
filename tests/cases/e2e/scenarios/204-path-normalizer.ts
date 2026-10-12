// xl:title 端到端：路径归一化（处理 . / .. / 重复斜杠 / 越界 ..）
// xl:round 7
// xl:judge stdout
// xl:end

function normalize(p: string): string {
  const abs = p.startsWith("/");
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") { if (out.length > 0 && out[out.length - 1] !== "..") out.pop(); else if (!abs) out.push(".."); continue; }
    out.push(part);
  }
  const joined = out.join("/");
  if (abs) return "/" + joined;
  return joined === "" ? "." : joined;
}
for (const p of ["/a/b/../c", "a/./b//c/", "../../a", "a/../../b", "/", "", "./", "/../a", "a/b/.."]) {
  console.log(JSON.stringify(p) + " => " + JSON.stringify(normalize(p)));
}
