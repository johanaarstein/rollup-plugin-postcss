const normalizePath = (path?: string) => {
  if (path) {
    return path.replace(/\\+/g, '/')
  }
  return ''
}

export default normalizePath
