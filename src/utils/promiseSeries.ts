/**
 * Run Promise in series.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function series(tasks: any[], initial?: any) {
  if (!Array.isArray(tasks)) {
    return Promise.reject(
      new TypeError('promise.series only accepts an array of functions')
    )
  }
  return tasks.reduce(
    (current, next) => current.then(next),
    Promise.resolve(initial)
  )
}
