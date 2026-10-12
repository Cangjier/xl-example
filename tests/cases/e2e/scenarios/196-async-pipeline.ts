// xl:title 端到端：异步流水线（Promise 串起来 + 并发闸门 + 汇总顺序）
// xl:round 7
// xl:judge stdout
// xl:end

const run = async () => {
  // 并发闸门：外层是普通函数（生成器回调里再起 async IIFE），避免 async 生成器那一路。
  const withLimit = <T,>(items: T[], limit: number): Promise<number[]> => {
    const out: number[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, () => (async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await Promise.resolve(items[i] as unknown as number * 2);
      }
    })());
    return Promise.all(workers).then(() => out);
  };
  const map = await withLimit([1, 2, 3, 4, 5], 2);
  console.log(map.join(","));
  const settled = await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error("bad")), Promise.resolve(3)]);
  console.log(settled.map((s) => (s.status === "fulfilled" ? "ok" + s.value : "no")).join(","));
  const all = await Promise.all([Promise.resolve("a"), Promise.resolve("b")]);
  console.log(all.join("+"));
};
run();
