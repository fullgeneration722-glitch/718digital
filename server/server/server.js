require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGINS || '*' }));
app.use(express.json({ limit: '10mb' }));

async function callMistral(messages, maxTokens = 2048, temperature = 0.7) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      messages, max_tokens: maxTokens, temperature
    })
  });
  if (!response.ok) throw new Error(`Mistral error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

app.get('/', (req, res) => {
  res.json({ name: '718Digital API', version: '2026.1.0', status: 'operational' });
});

app.get('/test', (req, res) => {
  res.json({ status: 'ok', mistral: !!process.env.MISTRAL_API_KEY });
});

app.post('/webhook/agent-00', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const response = await callMistral([
      { role: 'system', content: 'Tu es l\'assistant IA de 718Digital, agence digitale en Côte d\'Ivoire. Sois professionnel et concis.' },
      { role: 'user', content: message }
    ], 1024);
    res.json({ response, score: 0.95, agent: 'agent-00' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/agent-01', async (req, res) => {
  try {
    const { formData } = req.body;
    const brief = await callMistral([
      { role: 'system', content: 'Génère un brief professionnel structuré en français.' },
      { role: 'user', content: `Client: ${formData.nom}, Service: ${formData.service}, Description: ${formData.description}` }
    ]);
    res.json({ brief, agent: 'agent-01' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/agent-02', async (req, res) => {
  try {
    const { brief } = req.body;
    const response = await callMistral([
      { role: 'system', content: 'Génère un devis JSON: {"service","description","prix_ht","tva":18,"total_ttc","duree"}. Réponds UNIQUEMENT en JSON.' },
      { role: 'user', content: brief }
    ], 1500, 0.5);
    let devis;
    try {
      const match = response.match(/\{[\s\S]*\}/);
      devis = match ? JSON.parse(match[0]) : { service: 'Service', prix_ht: 150000, tva: 18, total_ttc: 177000, duree: '2-3 semaines' };
    } catch { devis = { service: 'Service', prix_ht: 150000, tva: 18, total_ttc: 177000, duree: '2-3 semaines' }; }
    res.json({ devis, agent: 'agent-02' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/agent-03', async (req, res) => {
  try {
    const { brief, serviceType, clientName } = req.body;
    const concept = await callMistral([
      { role: 'system', content: 'Tu es un directeur artistique. Génère un concept créatif détaillé.' },
      { role: 'user', content: `Client: ${clientName}, Service: ${serviceType}, Brief: ${brief}` }
    ]);
    res.json({ result: { type: 'concept', content: concept }, agent: 'agent-03' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/webhook/agent-07', async (req, res) => {
  try {
    const { clientName, livrableUrl } = req.body;
    res.json({
      message: `📦 Bonjour ${clientName} ! Votre projet est livré : ${livrableUrl} — 718Digital`,
      agent: 'agent-07'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 718Digital API running on port ${PORT}`);
});
