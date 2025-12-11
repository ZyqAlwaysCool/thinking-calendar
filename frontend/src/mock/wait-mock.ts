let resolveReady: (() => void) | null = null

const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export const setMockReady = (promise: Promise<unknown>) => {
  promise
    .then(() => {
      resolveReady?.()
    })
    .catch(() => {
      resolveReady?.()
    })
}

export const waitForMock = async (): Promise<void> => {
  if (typeof window === 'undefined') return
  await readyPromise
}
