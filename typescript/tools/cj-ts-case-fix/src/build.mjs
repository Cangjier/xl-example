/**
 * 构建与回归门禁：改完 `.xl.md` 之后要真的生效，否则对拍读的还是旧实现。
 *
 * 默认构建通道有两条，按可用性选：
 * 1. 宿主里注册了 `xl_build`（`xl` 插件）→ 先用它生成 `dist/ts`，再跑仓库自己的 `tsc`；
 * 2. 配置了 `build.command` → 原样执行（交给用户决定，比如 `npm run build`）。
 * 两条都没有就报错，不静默跳过：跳过构建 = 对拍永远看旧实现，工具会假装修好了。
 *
 * 门禁（`typescript/cases/tts/run.mjs`）是一道只读的回归检查：success 目录必须保持
 * 全绿。它和 `.infer` 无关，量的是最终 AST 有没有被改坏。
 *
 * @module cj-ts-case-fix/build
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

/** 单个输出流的保留上限（字符）：只看尾部，前面的是噪声。 */
const OUTPUT_LIMIT = 12_000

/**
 * 构造构建器。`ctx` 用来找 `xl_build` 工具；找不到就走配置里的命令。
 *
 * @param {object} options
 * @param {object} options.ctx - Cordis 插件上下文。
 * @param {object} options.config - 归一化配置。
 * @param {object} options.logger
 * @returns {{build: () => Promise<object>, gate: () => Promise<object>, describe: () => string}}
 */
export function createBuilder({ ctx, config, logger }) {
  const root = config.root
  const timeoutMs = Math.max(60_000, config.timeoutMs)

  return {
    describe() {
      if (config.buildCommand !== null) {
        return `build.command: ${config.buildCommand}`
      }
      return xlBuildTool(ctx) === null ? 'npm run build（没有 xl_build 工具）' : 'xl_build 工具 + tsc'
    },

    /**
     * 构建一次：xl_build（或命令）+ tsc。
     *
     * @returns {Promise<{ok: boolean, steps: object[], errors: string[], ms: number}>}
     */
    async build() {
      const started = Date.now()
      const steps = []

      if (config.buildCommand !== null) {
        const step = await runShell(config.buildCommand, { cwd: root, timeoutMs })
        steps.push({ name: config.buildCommand, ...step })
        const ok = step.ok
        logger.info(`case-fix: 构建命令 ${ok ? '成功' : '失败'}（${step.ms}ms）`)
        return {
          ok,
          steps,
          errors: ok ? [] : [`构建命令 \`${config.buildCommand}\` 失败（exit=${step.code}）：`, ...tailLines(step.output)],
          ms: Date.now() - started,
        }
      }

      const xlBuild = xlBuildTool(ctx)
      if (xlBuild === null) {
        return {
          ok: false,
          steps,
          errors: [
            '没有构建通道：宿主里没有 `xl_build` 工具，也没有配置 build.command。',
            '先在 profile 里启用 `xl` 插件，或在 case-fix 的 config 里写 build.command（例如 "npm run build"）。',
          ],
          ms: Date.now() - started,
        }
      }

      const xlStep = await runXlBuild(xlBuild, root, timeoutMs, logger)
      steps.push({ name: 'xl_build', ...xlStep })
      if (!xlStep.ok) {
        return {
          ok: false,
          steps,
          errors: ['xl build 失败（dist/ts 没有更新）：', ...tailLines(xlStep.output)],
          ms: Date.now() - started,
        }
      }

      const tscStep = await runTsc(root, timeoutMs)
      steps.push({ name: 'tsc', ...tscStep })
      if (!tscStep.ok) {
        return {
          ok: false,
          steps,
          errors: ['tsc 失败（TypeScript 报错，改坏的实现先修掉）：', ...tailLines(tscStep.output)],
          ms: Date.now() - started,
        }
      }

      logger.info(`case-fix: 构建完成（xl_build ${xlStep.ms}ms，tsc ${tscStep.ms}ms）`)
      return { ok: true, steps, errors: [], ms: Date.now() - started }
    },

    /**
     * 回归门禁：`typescript/cases/tts/run.mjs`（success 全绿）。
     *
     * @returns {Promise<{ok: boolean, skipped: boolean, output: string, ms: number}>}
     */
    async gate() {
      if (config.gate !== true) {
        return { ok: true, skipped: true, output: '', ms: 0 }
      }
      const script = path.join(root, 'typescript', 'cases', 'tts', 'run.mjs')
      if (!fs.existsSync(script)) {
        return { ok: false, skipped: false, output: `找不到门禁脚本：${script}`, ms: 0 }
      }
      const step = await runNode(script, [], { cwd: root, timeoutMs })
      const ok = step.ok
      logger.info(`case-fix: 回归门禁 ${ok ? '通过' : '失败'}（${step.ms}ms）`)
      return { ok, skipped: false, output: step.output, ms: step.ms }
    },
  }
}

/**
 * 从 `ctx` 上取 `xl_build` 工具；没有就返回 null（不是错误）。
 *
 * @param {object} ctx
 * @returns {object|null}
 */
function xlBuildTool(ctx) {
  const tools = typeof ctx?.get === 'function' ? ctx.get('tools') : undefined
  if (tools === undefined || tools === null || typeof tools.get !== 'function') {
    return null
  }
  const tool = tools.get('xl_build')
  return tool !== null && tool !== undefined && typeof tool.execute === 'function' ? tool : null
}

/**
 * 调一次 `xl_build`（`targets: ['ts']`，全仓库）。
 *
 * @param {object} tool
 * @param {string} root
 * @param {number} timeoutMs
 * @param {object} logger
 * @returns {Promise<{ok: boolean, code: number|null, output: string, ms: number}>}
 */
async function runXlBuild(tool, root, timeoutMs, logger) {
  const started = Date.now()
  const result = await withTimeout(
    tool.execute({ targets: ['ts'], cwd: root }, { cwd: root }),
    timeoutMs,
    'xl_build 超过超时时间',
  )
  const ms = Date.now() - started
  const ok = result?.ok === true || result?.exitCode === 0
  const text = typeof result?.text === 'string' && result.text !== ''
    ? result.text
    : JSON.stringify({ errors: result?.errors ?? null, warnings: result?.warnings ?? null, exitCode: result?.exitCode ?? null })
  if (!ok) {
    logger.info(`case-fix: xl_build 失败：${truncate(text, 1000)}`)
  }
  return { ok, code: typeof result?.exitCode === 'number' ? result.exitCode : null, output: truncate(text, OUTPUT_LIMIT), ms }
}

/**
 * 跑仓库自己的 `tsc`：`node node_modules/typescript/bin/tsc -p .`。
 *
 * @param {string} root
 * @param {number} timeoutMs
 * @returns {Promise<{ok: boolean, code: number|null, output: string, ms: number}>}
 */
async function runTsc(root, timeoutMs) {
  const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
  if (!fs.existsSync(tsc)) {
    return {
      ok: false,
      code: null,
      output: `找不到 ${tsc}：先在此仓库装好 devDependencies（typescript）。`,
      ms: 0,
    }
  }
  return runNode(tsc, ['-p', '.'], { cwd: root, timeoutMs })
}

/**
 * 用当前 node 跑一个脚本。
 *
 * @param {string} script - 绝对路径。
 * @param {string[]} args
 * @param {{cwd: string, timeoutMs: number}} options
 * @returns {Promise<{ok: boolean, code: number|null, output: string, ms: number}>}
 */
async function runNode(script, args, { cwd, timeoutMs }) {
  return runProcess(process.execPath, [script, ...args], { cwd, timeoutMs, shell: false })
}

/**
 * 用 shell 跑一条命令（配置里的 build.command）。
 *
 * @param {string} command
 * @param {{cwd: string, timeoutMs: number}} options
 * @returns {Promise<{ok: boolean, code: number|null, output: string, ms: number}>}
 */
async function runShell(command, { cwd, timeoutMs }) {
  return runProcess(command, [], { cwd, timeoutMs, shell: true })
}

/**
 * 起一个子进程、收输出、带超时。
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{cwd: string, timeoutMs: number, shell: boolean}} options
 * @returns {Promise<{ok: boolean, code: number|null, output: string, ms: number, timedOut: boolean}>}
 */
function runProcess(command, args, { cwd, timeoutMs, shell }) {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(command, args, { cwd, shell, windowsHide: true })
    const buffer = { text: '' }
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    timer.unref?.()

    const append = (chunk) => {
      buffer.text = truncate(buffer.text + chunk.toString('utf8'), OUTPUT_LIMIT * 2)
    }
    child.stdout?.on('data', append)
    child.stderr?.on('data', append)

    const finish = (code) => {
      clearTimeout(timer)
      const output = timedOut
        ? `${buffer.text}\n（超过 ${timeoutMs}ms，进程已终止）`
        : buffer.text
      resolve({
        ok: code === 0 && !timedOut,
        code,
        output: truncate(output.trim(), OUTPUT_LIMIT),
        ms: Date.now() - started,
        timedOut,
      })
    }

    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({
        ok: false,
        code: null,
        output: `无法启动 ${command}：${error.message}`,
        ms: Date.now() - started,
        timedOut: false,
      })
    })
    child.on('close', (code) => finish(code))
  })
}

/**
 * 给一个 promise 加超时：超时就 reject（用于工具调用，工具自己不一定有超时）。
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} timeoutMs
 * @param {string} message
 * @returns {Promise<T>}
 */
function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${message}（${timeoutMs}ms）`)), timeoutMs)
    timer.unref?.()
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * @param {string} text
 * @param {number} limit
 * @returns {string}
 */
function truncate(text, limit) {
  const value = typeof text === 'string' ? text : String(text)
  if (value.length <= limit) {
    return value
  }
  return `…（前 ${value.length - limit} 字符已省略）\n${value.slice(-limit)}`
}

/**
 * 把长输出折成几行提示（尾部最有信息）。
 *
 * @param {string} output
 * @returns {string[]}
 */
function tailLines(output) {
  const lines = String(output).replace(/\r\n?/g, '\n').split('\n').filter((line) => line.trim() !== '')
  return lines.slice(-20)
}
