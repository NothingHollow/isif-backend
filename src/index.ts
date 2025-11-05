import { serve } from '@hono/node-server'
import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import {
  getActiveClients,
  getLatestData,
  onMqttMessage,
  removeMqttListener,
} from './lib/mqtt.js'
import { db } from './lib/db.js'
import { readingsTable } from './models/Schema.js'
import { gt } from 'drizzle-orm'
import NodeCache from 'node-cache'
import { preset, type PresetType, type SensorMessage } from './types.js'
import { sensorReadingSchema, type SensorReading } from './validations.js'

const app = new Hono()
const cache = new NodeCache();

app.use('*', cors({
  origin: '*',
  credentials: true,
}))

app.get('/', (c) => {
  return c.text('Hey Hoy, it’s almost Christmas — this backend is built with Santa Ho Ho Hono! 🎅')
})

app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    activeClients: getActiveClients(),
    lastUpdate: getLatestData()?.timestamp || null,
  })
})


// app.get('/api/connect', (c) => {
//   console.log('🟢 New SSE client connected')

//   const encoder = new TextEncoder()

//   // ✅ Create the stream properly
//   const stream = new ReadableStream({
//     start(controller) {
//       const send = (msg: any) => {
//         controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
//       }

//       controller.enqueue(encoder.encode(':\n\n'));

//       // ✅ Immediately send the latest cached data (if any)
//       const latest = getLatestData();
//       if (latest) {
//         send(latest)
//       }

//       // ✅ Subscribe to new MQTT messages
//       onMqttMessage(send)

//       // ✅ Keep-alive ping every 15 seconds (important for React Native)
//       // const keepAlive = setInterval(() => {
//       //   controller.enqueue(encoder.encode(':\n\n')) // Comment line — keeps connection open
//       // }, 15000)

//       // ✅ Cleanup when client disconnects
//       const close = () => {
//         console.log('❌ SSE client disconnected')
//         // clearInterval(keepAlive)
//         removeMqttListener(send)
//         controller.close()
//       }

//       c.req.raw.signal.addEventListener('abort', close)
//     },
//   })

//   return new Response(stream, {
//     headers: {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive',
//       'Access-Control-Allow-Origin': '*',
//     },
//   })
// })
//

app.get('/api/connect', (c) => {
  console.log('🟢 New SSE client connected')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
      }

      // Initial comment line for SSE protocol
      controller.enqueue(encoder.encode(':\n\n'))

      // Function to generate fake sensor data
      const generateFakeData = () => {
        let data;
        data = {
          ph_level: (9 + (Math.random() * 0.3 - 0.15)).toFixed(2),   // ~9 ± 0.15
          turbidity: (30 + Math.random() * 15).toFixed(2),           // 30–45
          light_intensity: (600 + Math.random() * 100).toFixed(2),   // 500–600
          timestamp: new Date().toISOString(),
        };

        if (cache.get('modifier') === 'custom') {
          const modifierData = cache.get('custom');
          data = {
            ph_level: (
              parseFloat(modifierData.ph_level) +
              (Math.random() * 0.06 - 0.03) // ±0.03 variation
            ).toFixed(2),

            turbidity: (
              parseFloat(modifierData.turbidity) +
              (Math.random() * 1.5 - 0.75) // ±0.75 variation
            ).toFixed(2),

            light_intensity: (
              parseFloat(modifierData.light_intensity) +
              (Math.random() * 10 - 5) // ±5 variation
            ).toFixed(2),

            timestamp: new Date().toISOString(),
          };
        }
        send(data)
        console.log("Published Data:")
        console.log(data)
      }

      // Immediately send one data point
      generateFakeData()

      // Send new data every 5 seconds
      const interval = setInterval(generateFakeData, 5000)

      // Cleanup when connection closes
      const close = () => {
        console.log('❌ SSE client disconnected')
        clearInterval(interval)
        controller.close()
      }

      c.req.raw.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
})


app.get("/api/trends/24h", async (c) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(readingsTable)
    .where(gt(readingsTable.timestamp, since))
    .orderBy(readingsTable.timestamp);

  return c.json(rows);
});

// app.post("/api/data/template", async (c) => {
//   const modifier: PresetType = c.req.query('condition');

//   if (!modifier || modifier === '' || !preset.includes(modifier)) {
//     global.cache.del('modifier')
//   }

//   global.cache.set('modifier', modifier);
// })
//

app.post("api/data/default", async (c) => {
  cache.set("modifier", "default");

  return c.json({ success: true }); // ✅ Return a response
});

app.post("/api/data/custom", async (c) => {
  console.log(c.body.toString())
  cache.set('modifier', 'custom');

  const data: SensorMessage = await c.req.json();
  const parsed: SensorReading = sensorReadingSchema.parse(data)

  cache.set('custom', {
    light_intensity: parsed.light_intensity,
    ph_level: parsed.ph_level,
    turbidity: parsed.turbidity
  })

  console.log('modified');

  return c.json({ success: true }); // ✅ Return a response
})

serve(
  {
    fetch: app.fetch,
    port: 1234,
  },
  (info) => {
    console.log(`🚀 Server is running at http://localhost:${info.port}`)
  }
)
