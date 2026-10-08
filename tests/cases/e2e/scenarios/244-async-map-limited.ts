// xl:title 并发的有界映射：Promise.all + 分批
// xl:round 683
// xl:judge stdout
// xl:end
async function mapLimit(xs: number[], limit: number, fn: any): Promise<any[]> { const out: any[] = []; for (let i = 0; i < xs.length; i += limit) { const batch = xs.slice(i, i + limit); out.push(...await Promise.all(batch.map((x: any) => fn(x)))); } return out; }
mapLimit([1, 2, 3, 4, 5], 2, async (x: number) => x * 2).then((r: any) => console.log(r.join(',')));
