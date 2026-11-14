export const FIBONACCI_DIFFICULTIES = [1, 2, 3, 5, 8, 13, 21] as const

export type DifficultyValue = typeof FIBONACCI_DIFFICULTIES[number]
