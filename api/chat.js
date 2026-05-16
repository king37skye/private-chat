export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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
      throw new Error(`Google API returned status: ${response.status}`);
    }

    const data = await response.json();
    let text = "I am sorry, I could not process that securely.";
    if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      text = data.candidates[0].content.parts[0].text;
    }

    res.json({ text: text.trim() });
  } catch (error) {
    console.error("AI Relay Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Cloud LLM' });
  }
}
