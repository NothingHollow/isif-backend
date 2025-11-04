export type SensorMessage = {
    // temperature: number
    light_intensity: number
    ph_level: number
    turbidity: number
    // dissolved_oxygen: number
    timestamp: string
}

export type PresetType = 'clear' | 'flash' | 'dirty'

export const preset = ['clear', 'flash', 'dirty'] as const
