import pify from 'pify'
import { loadModule } from '@/utils/load-module'

const stylusLoader = {
  name: 'stylus',
  async process({ code }: { code: string }): Promise<{
    code: string
    map?: string
  }> {
    const stylus = loadModule('stylus')
    if (!stylus) {
      throw new Error(
        'You need to install "stylus" packages in order to process Stylus files'
      )
    }

    console.log(stylus)

    const style = stylus(code, {
        ...this.options,
        filename: this.id,
        sourcemap: this.sourceMap && {},
      }),
      css = await pify(style.render.bind(style))(),
      deps = style.deps()
    for (const dep of deps) {
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
