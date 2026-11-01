// build/ts 的「新进程」执行通道：每次起一个 node，读磁盘上的当前实现。
//
// 为什么要子进程：长驻进程（cases-viewer、DSH 插件宿主）会把自己 require 过的 build/ts 模块
// 一直留在内存里，删 `require.cache` 也换不回来。于是 `npm run build` 之后，这些进程还按旧实现
// 算——「每改完一个用例就得重启看板」就是这么来的。
//
// 父进程用法：
//   import { runInFreshProcess, buildStamp } from "./fresh-build.mjs";
//   const { steps } = runInFreshProcess({ job: "steps", source, name });
//
// job 由同目录的 fresh-build-child.mjs 分派：
//   "actual"    → traceActualInProcess：created at 与最终树
//   "steps"     → traceSteps：逐字符 token 树
//   "markdown"  → renderMarkdown：逐字 .md 文本
//
// 子进程失败（build/ts 缺失、语法错误、超时）一律抛出带 stderr 尾巴的错误——不静默降级成
// 进程内通道，否则又会回到「悄悄用旧实现」。
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(HERE, "..", "..");
export const BUILD = path.join(ROOT, "build", "ts");
export const BUILD_ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");

const CHILD = path.join(HERE, "fresh-build-child.mjs");

/** 一个用例的源码与 AST 都很小；64MB 是给畸形输入留的余量，超限要报错而不是截断。 */
const MAX_BUFFER = 64 * 1024 * 1024;

export function parserAvailable() {
  return fs.existsSync(BUILD_ENTRY);
}

/** `build/ts` 整棵树的指纹：相对路径 + 大小 + mtime，改过任何一个文件都会变。 */
export function buildStamp() {
  if (!parserAvailable()) {
    return "";
  }
  const hash = createHash("sha1");
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) {
        continue;
      }
      const stat = fs.statSync(full);
      hash.update(path.relative(BUILD, full).split(path.sep).join("/"));
      hash.update("\u0000");
      hash.update(String(stat.size));
      hash.update("\u0000");
      hash.update(String(stat.mtimeMs));
      hash.update("\n");
    }
  };
  walk(BUILD);
  return hash.digest("hex");
}

/** `build/ts` 里最新一个文件的 mtime（毫秒）；不可用时 null。给人看「这次构建是什么时候的」。 */
export function newestBuildMtime() {
  if (!parserAvailable()) {
    return null;
  }
  let newest = null;
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) {
        continue;
      }
      try {
        const stat = fs.statSync(full);
        if (newest === null || stat.mtimeMs > newest) {
          newest = stat.mtimeMs;
        }
      } catch {
        /* 刚好被删掉：跳过 */
      }
    }
  };
  walk(BUILD);
  return newest;
}

/**
 * 在一个新进程里跑一个 build/ts 作业，返回子进程写回的 JSON。
 *
 * @param {{job: string, source: string, name: string}} request
 * @param {{timeoutMs?: number}} [options]
 * @returns {any} 子进程的输出（已解析）
 */
export function runInFreshProcess(request, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300000;
  const run = spawnSync(process.execPath, [CHILD], {
    input: JSON.stringify(request),
    encoding: "utf8",
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
    timeout: timeoutMs,
  });
  if (run.error !== undefined && run.error !== null) {
    const reason = run.error.code === "ETIMEDOUT" ? `超过 ${timeoutMs}ms` : run.error.message;
    throw new Error(`build/ts 子进程失败（${path.relative(ROOT, CHILD)}）：${reason}`);
  }
  if (run.status !== 0) {
    const detail = String(run.stderr ?? "").trim();
    throw new Error(`build/ts 子进程失败（exit=${run.status}）：${detail.length > 0 ? detail.slice(0, 800) : "没有 stderr"}`);
  }
  try {
    return JSON.parse(String(run.stdout));
  } catch {
    throw new Error(`build/ts 子进程的输出不是 JSON：${String(run.stdout).slice(0, 400)}`);
  }
}
