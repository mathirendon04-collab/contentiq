export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username requerido' });

  const cleanUsername = username.replace('@', '').trim();

  const response = await fetch(
    `https://api.scrapecreators.com/v1/instagram/profile?handle=${cleanUsername}`,
    { headers: { 'x-api-key': process.env.SCRAPECREATORS_KEY } }
  );

  const raw = await response.json();
  return res.status(200).json(raw);
}
