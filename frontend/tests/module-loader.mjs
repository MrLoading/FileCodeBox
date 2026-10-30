import { readFileSync } from 'node:fs'
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm'
import ts from 'typescript'

export async function loadTypeScript(path, dependencies = {}) {
  const context = createContext({
    console,
    File,
    Blob,
    AbortController,
    DOMException,
    performance,
    setTimeout,
    clearTimeout
  })
  const cache = new Map()
  const dependency = async (name) => {
    if (cache.has(name)) return cache.get(name)
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
    const values = dependencies[name]
    const module = new SyntheticModule(
      Object.keys(values),
      function () {
        for (const [key, value] of Object.entries(values)) this.setExport(key, value)
      },
      { context }
    )
    cache.set(name, module)
    await module.link(() => {
      throw new Error('Unexpected nested import')
    })
    return module
  }
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  })
  const module = new SourceTextModule(outputText, {
    context,
    importModuleDynamically: async (name) => {
      const resolved = await dependency(name)
      if (resolved.status === 'linked') await resolved.evaluate()
      return resolved
    }
  })
  await module.link(dependency)
  await module.evaluate()
  return module.namespace
}
