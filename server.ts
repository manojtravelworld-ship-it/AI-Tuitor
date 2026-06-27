import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import textToSpeech from '@google-cloud/text-to-speech';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API routes
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    console.log("API TTS called with text:", text);
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const client = new textToSpeech.TextToSpeechClient();
      console.log("Calling Google Cloud TTS...");
      const [response] = await client.synthesizeSpeech({
        input: { text: text },
        voice: { languageCode: 'ml-IN', name: 'ml-IN-Wavenet-A' },
        audioConfig: { audioEncoding: 'MP3' },
      });
      console.log("Google Cloud TTS success");

      res.set('Content-Type', 'audio/mpeg');
      res.send(response.audioContent);
    } catch (error) {
      console.error('Error generating speech:', error);
      res.status(500).json({ error: 'Failed to generate speech: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
