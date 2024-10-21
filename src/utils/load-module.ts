import importCwd from 'import-cwd'
import importSync from 'import-sync'
import type { Sass, Stylus } from '@/types'

/**
 *
 */
export function loadModule(moduleId: string): Sass | Stylus {
  // Trying to load module normally (relative to plugin directory)
  try {
    return importSync(moduleId)
  } catch {
    // Ignore error
  }

  // Then, trying to load it relative to CWD
  return importCwd.silent(moduleId) as Sass | Stylus
}
