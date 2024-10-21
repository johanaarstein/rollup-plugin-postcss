import path from 'path'
import normalizePath from '@/utils/normalize-path'

const humanlizePath = (filepath: string) =>
  normalizePath(path.relative(process.cwd(), filepath))

export default humanlizePath
