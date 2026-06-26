export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username requerido' });

  const cleanUsername = username.replace('@', '').trim();

  try {
    const response = await fetch(
      `https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_about.php?username_or_url=${cleanUsername}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        }
      }
    );

    const data = await response.json();
    if (!data || data.error) return res.status(404).json({ error: 'Perfil no encontrado' });

    const user = data.data?.user || data.user || data;

    return res.status(200).json({
      username: cleanUsername,
      fullName: user.full_name || '',
      followers: user.follower_count || user.edge_followed_by?.count || 0,
      following: user.following_count || user.edge_follow?.count || 0,
      posts: user.media_count || user.edge_owner_to_timeline_media?.count || 0,
      bio: user.biography || '',
      profilePic: user.profile_pic_url_hd || user.profile_pic_url || '',
      isVerified: user.is_verified || false,
      isBusiness: user.is_business || false,
      isPrivate: user.is_private || false,
      externalUrl: user.external_url || '',
      category: user.category || '',
      real: true
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
