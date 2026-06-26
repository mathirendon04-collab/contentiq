const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const username = event.queryStringParameters?.username;
  if (!username) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Username required' }) };
  }

  try {
    const data = await scrapeInstagram(username);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

function scrapeInstagram(username) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.instagram.com',
      path: `/${username}/`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const result = parseInstagramHTML(rawData, username);
          resolve(result);
        } catch(e) {
          reject(new Error('Could not parse Instagram data'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
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
  const cleanBio = bio ? bio.replace(/\\n/g, ' ').replace(/\\u[\dA-F]{4}/gi, '').trim() : '';
  const cleanPic = profilePic ? profilePic.replace(/\\/g, '') : '';
  const hasExternalLink = !!(externalUrl && externalUrl.length > 5);
  const hasCTA = cleanBio && (cleanBio.toLowerCase().includes('link') || cleanBio.includes('http') || cleanBio.toLowerCase().includes('dm') || cleanBio.toLowerCase().includes('wa.me'));

  return {
    username, followers, posts,
    bio: cleanBio,
    fullName: fullName ? fullName.replace(/\\/g,'') : username,
    profilePic: cleanPic,
    isPrivate: isPrivate === 'true',
    isBusiness: isBusiness === 'true',
    isVerified: isVerified === 'true',
    hasExternalLink, hasCTA,
    real: followers > 0 || posts > 0
  };
}
