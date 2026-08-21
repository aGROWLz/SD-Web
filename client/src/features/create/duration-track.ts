export const DURATION_TRACK_MAX = 35
export const SHORT_DURATION_TRACK_MAX = 16

export const durationToTrackPosition = (duration: number): number => {
  if (duration < 4) return 0
  if (duration <= 15) return duration + 1
  return Math.min(duration, 30) + 5
}

export const trackPositionToDuration = (
  rawPosition: number,
  currentDuration: number,
  maxDuration: number,
): number => {
  const trackMax = maxDuration > 15 ? DURATION_TRACK_MAX : SHORT_DURATION_TRACK_MAX
  const position = Math.max(0, Math.min(trackMax, Math.round(rawPosition)))

  if (position === 0) return -1
  if (position < 5) return currentDuration === -1 ? -1 : 4
  if (position <= 16) return position - 1
  if (maxDuration <= 15) return 15
  if (position < 21) return currentDuration >= 16 ? 16 : 15
  return Math.min(position - 5, maxDuration)
}
