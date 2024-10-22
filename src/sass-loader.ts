import path from 'path'
import pify from 'pify'
import resolve from 'resolve'
import PQueue from 'p-queue'
import type { Sass } from '@/types'
import { loadModule } from '@/utils'

const threadPoolSize = Number(process.env.UV_THREADPOOL_SIZE || 4),
  workQueue = new PQueue({ concurrency: threadPoolSize - 1 }),
  moduleRe = /^~([a-z\d]|@).+/i,
  getUrlOfPartial = (url: string) => {
    const parsedUrl = path.parse(url)
    return `${parsedUrl.dir}${path.sep}_${parsedUrl.base}`
  },
  resolvePromise = pify(resolve),
  sassModuleIds = ['sass'] as const,
  sassLoader = {
    name: 'sass',
    process({
      code,
    }: {
      code: string
    }): Promise<{ code: string; map?: string }> {
      return new Promise((resolve, reject) => {
        const sass = loadSassOrThrow(),
          render = pify(sass.render.bind(sass)),
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          data = this.options?.data || ''
        workQueue.add(() =>
          render({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ...this.options,
            data: data + code,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            file: this.id,
            importer: [
              (
                url: string,
                importer: string,
                done: (x: { file: string }) => void
              ) => {
                if (!moduleRe.test(url)) {
                  return done({ file: url })
                }

                const moduleUrl = url.slice(1),
                  partialUrl = getUrlOfPartial(moduleUrl),
                  options = {
                    basedir: path.dirname(importer),
                    extensions: ['.scss', '.sass', '.css'],
                  },
                  finishImport = (id: string) => {
                    done({
                      // Do not add `.css` extension in order to inline the file
                      file: id.endsWith('.css') ? id.replace(/\.css$/, '') : id,
                    })
                  },
                  next = () => {
                    // Catch all resolving errors, return the original file and pass responsibility back to other custom importers
                    done({ file: url })
                  }

                // Give precedence to importing a partial
                resolvePromise(partialUrl, options)
                  .then(finishImport)
                  .catch((error) => {
                    if (
                      error.code === 'MODULE_NOT_FOUND' ||
                      error.code === 'ENOENT'
                    ) {
                      resolvePromise(moduleUrl, options)
                        .then(finishImport)
                        .catch(next)
                    } else {
                      next()
                    }
                  })
              },
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
            ].concat(this.options?.importer || []),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            indentedSyntax: /\.sass$/.test(this.id),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            sourceMap: this.sourceMap,
          })
            .then((result) => {
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              for (const file of result.stats?.includedFiles || []) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.dependencies.add(file)
              }

              resolve({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                code: result.css.toString(),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                map: result.map && result.map.toString(),
              })
            })
            .catch(reject)
        )
      })
    },
    test: /\.(sass|scss)$/,
  }

/**
 *
 */
function loadSassOrThrow(): Sass {
  // Loading one of the supported modules
  for (const moduleId of sassModuleIds) {
    const module = loadModule(moduleId)
    if (module) {
      return module as Sass
    }
  }

  // Throwing exception if module can't be loaded
  throw new Error(
    `You need to install one of the following packages: ${sassModuleIds
      .map((moduleId) => `"${moduleId}"`)
      .join(', ')} in order to process SASS files`
  )
}

export default sassLoader
