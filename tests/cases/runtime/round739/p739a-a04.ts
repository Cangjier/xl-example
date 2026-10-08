// xl:title `await` 在条件位与三元条件里
// xl:round 739
// xl:judge stdout
// xl:end
async function main() {
  if (await Promise.resolve(1) > 0) console.log("pos");
  const v = await Promise.resolve(0) ? "T" : "F";
  console.log(v);
  console.log(await Promise.resolve("") || "empty");
}
main();
