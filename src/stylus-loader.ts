import pify from 'pify'
import type { SourceMapInput } from 'rollup'
import { loadModule } from '@/utils'

const stylusLoader = {
  name: 'stylus',
  async process({ code }: { code: string }): Promise<{
    code: string
    map?: SourceMapInput
  }> {
    const stylus = loadModule('stylus')
    if (!stylus) {
      throw new Error(
        'You need to install "stylus" packages in order to process Stylus files'
      )
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const style = stylus(code, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ...this.options,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        filename: this.id,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sourcemap: this.sourceMap && {},
      }),
      css = await pify(style.render.bind(style))(),
      deps = style.deps()
    for (const dep of deps) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.dependencies.add(dep)
    }

    return {
      code: css,
      map: style.sourcemap,
    }
  },
  test: /\.(styl|stylus)$/,
}

export default stylusLoader
