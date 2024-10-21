import pify from 'pify'
import humanlizePath from '@/utils/humanlize-path'
import { loadModule } from '@/utils/load-module'

const lessLoader = {
  name: 'less',
  async process({
    code,
  }: {
    code: string
  }): Promise<{ code: string; map?: string }> {
    const less = loadModule('less')
    if (!less) {
      throw new Error(
        'You need to install "less" packages in order to process Less files'
      )
    }

    const lessObject: {
      css: string
      imports: unknown[]
      map?: string
    } = await pify(less.render.bind(less))(code, {
      ...this.options,
      filename: this.id,
      sourceMap: this.sourceMap && {},
    })

    for (const dep of lessObject.imports) {
      this.dependencies.add(dep)
    }

    let map:
      | {
          sources: (string | undefined)[]
        }
      | undefined

    if (lessObject.map) {
      map = JSON.parse(lessObject.map)
      if (map?.sources) {
        map.sources =
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
