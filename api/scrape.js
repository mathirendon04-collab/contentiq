const https = require('https');
const zlib = require('zlib');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    const data = await scrapeInstagram(username);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function scrapeInstagram(username) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.instagram.com',
      path: `/${username}/`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      }
    };

    const req = https.request(options, (response) => {
      let rawData = '';
      let stream = response;

      if (response.headers['content-encoding'] === 'gzip') {
        stream = response.pipe(zlib.createGunzip());
      } else if (response.headers['content-encoding'] === 'br') {
        stream = response.pipe(zlib.createBrotliDecompress());
      } else if (response.headers['content-encoding'] === 'deflate') {
        stream = response.pipe(zlib.createInflate());
      }

      stream.on('data', (chunk) => { rawData += chunk; });
      stream.on('end', () => {
        try {
          const result = parseInstagramHTML(rawData, username);
          resolve(result);
        } catch(e) {
          reject(new Error('Could not parse Instagram data: ' + e.message));
        }
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function parseInstagramHTML(html, username) {
  const extract = (pattern) => { const m = html.match(pattern); return m ? m[1] : null; };

  const followersRaw = extract(/"edge_followed_by":\{"count":(\d+)\}/);
  const postsRaw = extract(/"edge_owner_to_timeline_media":\{"count":(\d+)/);
  const bio = extract(/"biography":"((?:[^"\\]|\\.)*)"/);
  const fullName = extract(/"full_name":"((?:[^"\\]|\\.)*)"/);
  const profilePic = extract(/"profile_pic_url":"((?:[^"\\]|\\.)*)"/);
  const isPrivate = extract(/"is_private":(true|false)/);
  const isBusiness = extract(/"is_business_account":(true|false)/);
  const isVerified = extract(/"is_verified":(true|false)/);
  const externalUrl = extract(/"external_url":"((?:[^"\\]|\\.)*)"/) ;

  const followers = followersRaw ? parseInt(followersRaw) : 0;
  const posts = postsRaw ? parseInt(postsRaw) : 0;
  const cleanBio = bio ? bio.replace(/\\n/g, ' ').replace(/\\u[\dA-F]{4}/gi, m => String.fromCharCode(parseInt(m.slice(2), 16))).trim() : '';
  const cleanPic = profilePic ? profilePic.replace(/\\/g, '') : '';
  const hasExternalLink = !!(externalUrl && externalUrl.length > 5);
  const hasCTA = cleanBio && (
    cleanBio.toLowerCase().includes('link') ||
    cleanBio.includes('http') ||
    cleanBio.toLowerCase().includes('dm') ||
    cleanBio.toLowerCase().includes('wa.me') ||
    cleanBio.toLowerCase().includes('whatsapp') ||
    cleanBio.toLowerCase().includes('escríbeme') ||
    cleanBio.toLowerCase().includes('contáctame')
  );

  return {
    username,
    followers,
    posts,
    bio: cleanBio,
    fullName: fullName ? fullName.replace(/\\/g,'') : username,
    profilePic: cleanPic,
    isPrivate: isPrivate === 'true',
    isBusiness: isBusiness === 'true',
    isVerified: isVerified === 'true',
    hasExternalLink,
    hasCTA,
    real: followers > 0 || posts > 0
  };
}
