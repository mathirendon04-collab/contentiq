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
  const user = raw?.data?.user;

  if (!user) return res.status(404).json({ error: 'Perfil no encontrado' });

  return res.status(200).json({
    username: user.username,
    fullName: user.full_name || '',
    followers: user.edge_followed_by?.count || 0,
    following: user.edge_follow?.count || 0,
    posts: user.edge_owner_to_timeline_media?.count || 0,
    bio: user.biography || '',
    profilePic: user.profile_pic_url_hd || user.profile_pic_url || '',
    isVerified: user.is_verified || false,
    isBusiness: user.is_business_account || false,
    isPrivate: user.is_private || false,
    externalUrl: user.external_url || '',
    category: user.category_name || '',
    real: true
  });
}
