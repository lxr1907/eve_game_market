const EveSsoCode = require('../models/EveSsoCode');

const exchangeCodeForToken = async (code) => {
  const clientId = process.env.EVE_CLIENT_ID || '7014295958';
  const clientSecret = process.env.EVE_CLIENT_SECRET || '';
  const redirectUri = 'https://ali-esi.evepc.163.com/ui/oauth2-redirect.html';

  try {
    const tokenUrl = 'https://login.evepc.163.com/v2/oauth/token';
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('client_id', clientId);
    body.append('client_secret', clientSecret);
    body.append('redirect_uri', redirectUri);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
      token_type: data.token_type
    };

    if (data.access_token) {
      try {
        const verifyResponse = await fetch('https://esi.evepc.163.com/verify/', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          tokenData.character_id = verifyData.CharacterID;
          tokenData.character_name = verifyData.CharacterName;
          tokenData.scopes = verifyData.Scopes;
        }
      } catch (verifyError) {
        console.error('Verify error:', verifyError);
      }
    }

    return tokenData;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

const saveSsoCode = async (req, res) => {
  try {
    const { callback_url } = req.body;

    if (!callback_url) {
      return res.status(400).json({ error: '缺少回调地址' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(callback_url);
    } catch (e) {
      return res.status(400).json({ error: '无效的URL格式' });
    }

    const code = parsedUrl.searchParams.get('code');
    const state = parsedUrl.searchParams.get('state');

    if (!code) {
      return res.status(400).json({ error: 'URL中未找到授权码(code)' });
    }

    const id = await EveSsoCode.saveCode(code, state);

    let tokenData = null;
    try {
      tokenData = await exchangeCodeForToken(code);
      await EveSsoCode.saveToken(code, tokenData);
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError);
    }

    res.json({
      success: true,
      id,
      code,
      state,
      token_saved: !!tokenData,
      character_name: tokenData?.character_name,
      character_id: tokenData?.character_id
    });

  } catch (error) {
    console.error('Save SSO code error:', error);
    res.status(500).json({ error: '服务器内部错误', message: error.message });
  }
};

const getSsoCodes = async (req, res) => {
  try {
    const pool = require('../config/database');
    const [rows] = await pool.execute(
      'SELECT id, state, character_id, character_name, token_type, expires_at, created_at FROM eve_sso_codes ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get SSO codes error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

module.exports = {
  saveSsoCode,
  getSsoCodes
};
