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
import { preset, type PresetType } from './types.js'

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


app.get('/api/connect', (c) => {
  console.log('🟢 New SSE client connected')

  const encoder = new TextEncoder()

  // ✅ Create the stream properly
  const stream = new ReadableStream({
    start(controller) {
      const send = (msg: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
      }

      controller.enqueue(encoder.encode(':\n\n'));

      // ✅ Immediately send the latest cached data (if any)
      const latest = getLatestData()
      if (latest) {
        send(latest)
      }

      // ✅ Subscribe to new MQTT messages
      onMqttMessage(send)

      // ✅ Keep-alive ping every 15 seconds (important for React Native)
      // const keepAlive = setInterval(() => {
      //   controller.enqueue(encoder.encode(':\n\n')) // Comment line — keeps connection open
      // }, 15000)

      // ✅ Cleanup when client disconnects
      const close = () => {
        console.log('❌ SSE client disconnected')
        // clearInterval(keepAlive)
        removeMqttListener(send)
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

app.post("/api/data", async (c) => {
  const modifier: PresetType = c.req.query('condition');

  if (!modifier || modifier === '' || !preset.includes(modifier)) {
    cache.del('modifier')
  }

  cache.set('modifier', modifier);
})

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`🚀 Server is running at http://localhost:${info.port}`)
  }
)
