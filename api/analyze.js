export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { username, followers, following, posts, bio, isVerified, isBusiness, externalUrl, category, fullName } = req.body || req.query;

  const prompt = `Eres un experto en marketing digital y ventas en Instagram con 10 años de experiencia. Analiza este perfil de Instagram y genera un diagnóstico de ventas en español.

DATOS DEL PERFIL:
- Usuario: @${username}
- Nombre: ${fullName}
- Seguidores: ${followers}
- Siguiendo: ${following}
- Publicaciones: ${posts}
- Bio: "${bio || 'Sin bio'}"
- Cuenta de negocio: ${isBusiness ? 'Sí' : 'No'}
- Verificado: ${isVerified ? 'Sí' : 'No'}
- Enlace externo: ${externalUrl || 'No tiene'}
- Categoría: ${category || 'No especificada'}

Genera un análisis JSON con esta estructura exacta (sin markdown, solo JSON puro):
{
  "score": [número del 0 al 100 basado en el potencial de conversión real],
  "mainTitle": "[diagnóstico principal en 1 frase directa y personalizada, máximo 15 palabras]",
  "mainDesc": "[explicación del problema principal, 2-3 frases, tono directo, menciona datos específicos del perfil]",
  "strengths": ["[fortaleza 1 específica]", "[fortaleza 2 específica]", "[fortaleza 3 específica]"],
  "issues": ["[problema 1 específico con dato del perfil]", "[problema 2 específico]", "[problema 3 específico]", "[problema 4 específico]"],
  "projection": "[proyección de qué pasa si no cambia nada en 6 meses, menciona números específicos]"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(clean);
    return res.status(200).json(analysis);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
