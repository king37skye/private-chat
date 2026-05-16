require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend static files
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

const PORT = process.env.PORT || 3001;

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'PASTE_YOUR_API_KEY_HERE') {
    console.error("API Key is missing or default.");
    return res.status(500).json({ error: 'Server misconfiguration: Missing API Key' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google API Error Body:", errorText);
      throw new Error(`Google API returned status: ${response.status}`);
    }

    const data = await response.json();
    
    let text = "I am sorry, I could not process that securely.";
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
    }

    res.json({ text: text.trim() });
  } catch (error) {
    console.error("Backend AI Routing Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Cloud LLM' });
  }
});

// Serve index.html for any unmatched routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', async () => {
  const localIP = getLocalIP();
  console.log(`\n✅ Private AI running!`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Mobile:  http://${localIP}:${PORT}  ← Open this on your phone!`);
  console.log(`\n📱 Make sure your phone is on the same WiFi as this PC.\n`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'PASTE_YOUR_API_KEY_HERE') {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await res.json();
      console.log("Available Models:", JSON.stringify(data.models?.map(m => m.name).slice(0, 5), null, 2));
    } catch (e) {
      console.error("Failed to list models:", e);
    }
  }
});
