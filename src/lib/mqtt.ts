import mqtt from 'mqtt'
import { db } from './db.js'
import { readingsTable } from '../models/Schema.js'
import type { SensorMessage } from '../types.js'
import { sensorReadingSchema, type SensorReading } from '../validations.js'

const client = mqtt.connect(process.env.MQTT_URL!, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
})

const subscribers = new Set<(msg: SensorReading) => void>()
let latestData: SensorReading | null = null

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker')
  client.subscribe('sensor', (err) => {
    if (err) console.error('❌ MQTT subscribe failed:', err)
    else console.log('📡 Subscribed to topic: sensor')
  })
})

client.on('message', async (topic, message) => {
  try {
    const data: SensorMessage = JSON.parse(message.toString())
    const parsed: SensorReading = sensorReadingSchema.parse(data)
    latestData = parsed
    console.log('📥 MQTT message received:', parsed)

    // Save to DB
    await db.insert(readingsTable).values({
      ...parsed,
      timestamp: parsed.timestamp || new Date(),
    })

    // Broadcast to all active SSE subscribers
    for (const cb of subscribers) cb(parsed)
  } catch (err) {
    console.error('❌ Failed to parse MQTT message:', err)
  }
})

// --- Exported functions ---

export function onMqttMessage(cb: (msg: SensorReading) => void) {
  subscribers.add(cb)
}

export function removeMqttListener(cb: (msg: SensorReading) => void) {
  subscribers.delete(cb)
}

export function getLatestData(): SensorReading | null {
  return latestData
}

export function getActiveClients(): number {
  return subscribers.size
}
