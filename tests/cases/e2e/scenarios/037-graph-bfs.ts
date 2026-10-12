// xl:title 图的最短路径：邻接表 + 队列 + 距离表
// xl:round 330
// xl:judge stdout
// xl:end

const graph: { [k: string]: string[] } = {
  a: ["b", "c"],
  b: ["d"],
  c: ["d", "e"],
  d: ["e"],
  e: [],
};
function distances(from: string): { [k: string]: number } {
  const dist: { [k: string]: number } = { [from]: 0 };
  const queue: string[] = [from];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    for (const next of graph[node]) {
      if (Object.prototype.hasOwnProperty.call(dist, next)) continue;
      dist[next] = dist[node] + 1;
      queue.push(next);
    }
  }
  return dist;
}
const d = distances("a");
for (const key of Object.keys(d).sort()) console.log(key, d[key]);
