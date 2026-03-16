/**
 * Compute the payment amount in cents for a session based on its duration and hourly rate.
 *
 * @param startTime - Session start in "HH:MM" format
 * @param endTime   - Session end in "HH:MM" format
 * @param hourlyRate - Teacher's hourly rate in dollars
 * @returns Amount in cents, rounded to the nearest cent. Returns 0 if duration is non-positive.
 */
export function computeSessionAmount(
  startTime: string,
  endTime: string,
  hourlyRate: number
): number {
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)

  if (durationMinutes <= 0) return 0

  return Math.round((durationMinutes / 60) * hourlyRate * 100)
}
