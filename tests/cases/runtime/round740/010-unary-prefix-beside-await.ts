// xl:title `await` 与一元前缀在同一格里（第 739 轮的邻居）
// xl:round 740
// xl:judge stdout
// xl:end
// 本文件是 `p740a-a14` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

async function main() {
  console.log(-(await Promise.resolve(2)), !(await Promise.resolve(0)));
  console.log(typeof (await Promise.resolve("s")), void (await Promise.resolve(1)));
  console.log(-await Promise.resolve(2), !await Promise.resolve(0));
}
main();
