const EveSsoCode = require('../models/EveSsoCode');

const exchangeCodeForToken = async (code, codeVerifier = null) => {
  // 使用PKCE模式的ESI UI client_id
  const clientId = 'bc90aa496a404724a93f41b4f4e97761';
  // 使用正确的回调地址
  const redirectUri = 'https://ali-esi.evepc.163.com/ui/oauth2-redirect.html';

  try {
    const tokenUrl = 'https://login.evepc.163.com/v2/oauth/token';
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('client_id', clientId);
    body.append('redirect_uri', redirectUri);
    // PKCE模式需要code_verifier
    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    console.log('Exchanging code for token, clientId:', clientId, 'hasCodeVerifier:', !!codeVerifier);

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    };

    const response = await fetch(tokenUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Token exchange successful, access_token received:', data.access_token ? 'yes' : 'no');

    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
      token_type: data.token_type
    };

    if (data.access_token) {
      try {
        const verifyResponse = await fetch('https://ali-esi.evepc.163.com/verify', {
          headers: {
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          console.log('Verify successful:', verifyData);
          tokenData.character_id = verifyData.CharacterID;
          tokenData.character_name = verifyData.CharacterName;
          tokenData.scopes = verifyData.Scopes;
        } else {
          console.error('Verify failed:', verifyResponse.status);
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
    const { callback_url, code_verifier } = req.body;

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

    console.log('Saving code:', code, 'state:', state, 'hasCodeVerifier:', !!code_verifier);

    const id = await EveSsoCode.saveCode(code, state);

    let tokenData = null;
    let tokenError = null;
    try {
      tokenData = await exchangeCodeForToken(code, code_verifier);
      await EveSsoCode.saveToken(code, tokenData);
      console.log('Token saved successfully for code:', code);
    } catch (tokenError) {
      console.error('Token exchange failed:', tokenError.message);
      tokenError = tokenError.message;
    }

    res.json({
      success: true,
      id,
      code,
      state,
      token_saved: !!tokenData,
      character_name: tokenData?.character_name,
      character_id: tokenData?.character_id,
      access_token: tokenData?.access_token,
      error: tokenError
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
