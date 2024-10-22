import pify from 'pify'
import type { SourceMapInput } from 'rollup'
import { humanlizePath, loadModule } from '@/utils'

const lessLoader = {
  name: 'less',
  async process({
    code,
  }: {
    code: string
  }): Promise<{ code: string; map?: SourceMapInput }> {
    const less = loadModule('less')
    if (!less) {
      throw new Error(
        'You need to install "less" packages in order to process Less files'
      )
    }

    const lessObject: {
      css: string
      imports: unknown[]
      map?: SourceMapInput
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
    } = await pify(less.render.bind(less))(code, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ...this.options,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      filename: this.id,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sourceMap: this.sourceMap && {},
    })

    for (const dep of lessObject.imports) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.dependencies.add(dep)
    }

    let map: SourceMapInput | undefined

    if (lessObject.map) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      map = JSON.parse(lessObject.map)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof map === 'object' && map?.sources) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        map.sources =
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          map.sources.map((source) => source && humanlizePath(source)) || []
      }
    }

    return {
      code: lessObject.css,
      map,
    }
  },
  test: /\.less$/,
}

export default lessLoader
