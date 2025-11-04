import mqtt from "mqtt";

import 'dotenv/config';

const client = mqtt.connect(process.env.MQTT_URL!, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
})

client.on("connect", () => {
  console.log("✅ Publisher connected");

  setInterval(() => {
    const fakeData = {
      // temperature: (25 + Math.random() * 5).toFixed(2),
      light_intensity: (200 + Math.random() * 100).toFixed(1),
      ph_level: (6.5 + Math.random() * 1).toFixed(2),
      turbidity: (10 + Math.random() * 5).toFixed(2),
      // dissolved_oxygen: (7 + Math.random() * 2).toFixed(2),
    };

    client.publish("sensor", JSON.stringify(fakeData));
    console.log("📡 Published:", fakeData);
  }, 5000); // every 5 seconds
});
