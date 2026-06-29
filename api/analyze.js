export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const params = req.query;
  const tipo = params.tipo || 'contentiq';

  let prompt = '';

  if (tipo === 'incomeiq') {
    const { situacion, ingresos, horas, modelo } = params;
    prompt = `Eres un experto en mercado laboral remoto y modelos de ingresos digitales. Analiza este perfil y genera un diagnostico de potencial de ingresos remotos en español.

DATOS DEL PERFIL:
- Situacion actual: ${situacion}
- Ingresos mensuales actuales: ${ingresos}
- Horas semanales trabajadas: ${horas}
- Modelo de ingresos: ${modelo}

CONTEXTO: Esta persona ha descubierto que existe una habilidad de alto valor que permite trabajar de forma remota desde cualquier parte del mundo, sin crear contenido, sin camara, sin inversion inicial. Aun no sabe exactamente que es — solo sabe que existe y que puede transformar su modelo de ingresos. Tu diagnostico debe mostrarle el gap entre donde esta hoy y donde podria estar, generando urgencia real basada en sus datos.

Genera un JSON con esta estructura exacta (sin markdown, solo JSON puro):
{
  "score": [numero del 0 al 100 — potencial de transicion al modelo remoto basado en su perfil],
  "mainTitle": "[diagnostico principal en 1 frase directa, maximo 15 palabras, basado en sus datos reales]",
  "mainDesc": "[explicacion del gap principal, 2-3 frases, menciona datos especificos de su perfil, genera urgencia sin revelar que es la habilidad]",
  "strengths": ["[lo que ya tiene a su favor 1]", "[fortaleza 2]", "[fortaleza 3]"],
  "issues": ["[lo que le cuesta dinero hoy 1, con dato especifico]", "[problema 2]", "[problema 3]", "[problema 4]"],
  "incomeNow": "[su ingreso actual formateado, ej: 1.800€/mes]",
  "incomeFuture": "[rango de ingreso estimado con la habilidad en 60 dias, ej: 3.000€ - 6.000€/mes]",
  "incomeGap": "[diferencia mensual estimada, ej: +1.200€ - +4.200€/mes]",
  "incomeGapDesc": "[una frase explicando que representa esa diferencia]",
  "projection": "[que pasa si no cambia nada en 12 meses, datos especificos, genera urgencia]",
  "auditItems": [
    {"type": "bad|warn|ok", "icon": "X|!|OK", "title": "[titulo]", "desc": "[descripcion detallada]"},
    {"type": "bad|warn|ok", "icon": "X|!|OK", "title": "[titulo]", "desc": "[descripcion detallada]"},
    {"type": "bad|warn|ok", "icon": "X|!|OK", "title": "[titulo]", "desc": "[descripcion detallada]"},
    {"type": "ok", "icon": "OK", "title": "[titulo]", "desc": "[descripcion detallada]"},
    {"type": "warn", "icon": "!", "title": "[titulo]", "desc": "[descripcion detallada]"}
  ]
}`;

  } else {
    const { username, followers, following, posts, bio, isVerified, isBusiness, externalUrl, category, fullName } = params;
    prompt = `Eres un experto en marketing digital y ventas en Instagram con 10 anos de experiencia. Analiza este perfil de Instagram y genera un diagnostico de ventas en espanol.

DATOS DEL PERFIL:
- Usuario: @${username}
- Nombre: ${fullName}
- Seguidores: ${followers}
- Siguiendo: ${following}
- Publicaciones: ${posts}
- Bio: "${bio || 'Sin bio'}"
- Cuenta de negocio: ${isBusiness === 'true' ? 'Si' : 'No'}
- Verificado: ${isVerified === 'true' ? 'Si' : 'No'}
- Enlace externo: ${externalUrl || 'No tiene'}
- Categoria: ${category || 'No especificada'}

Genera un JSON con esta estructura exacta (sin markdown, solo JSON puro):
{
  "score": [numero del 0 al 100 basado en el potencial de conversion real],
  "mainTitle": "[diagnostico principal en 1 frase directa y personalizada, maximo 15 palabras]",
  "mainDesc": "[explicacion del problema principal, 2-3 frases, tono directo, menciona datos especificos del perfil]",
  "strengths": ["[fortaleza 1 especifica]", "[fortaleza 2 especifica]", "[fortaleza 3 especifica]"],
  "issues": ["[problema 1 especifico con dato del perfil]", "[problema 2 especifico]", "[problema 3 especifico]", "[problema 4 especifico]"],
  "projection": "[proyeccion de que pasa si no cambia nada en 6 meses, menciona numeros especificos]"
}`;
  }

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
