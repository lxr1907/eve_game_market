const EveSsoCode = require('../models/EveSsoCode');
const pool = require('../config/database');

// ESI OAuth 配置
const ESI_CLIENT_ID = 'bc90aa496a404724a93f41b4f4e97761';
const ESI_REDIRECT_URI = 'https://ali-esi.evepc.163.com/ui/oauth2-redirect.html';
const ESI_TOKEN_URL = 'https://login.evepc.163.com/v2/oauth/token';
const ESI_BASE_URL = 'https://ali-esi.evepc.163.com/latest';

// 获取角色的公司信息
const fetchCorporationInfo = async (characterId, accessToken) => {
  try {
    const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch character info:', response.status);
      return null;
    }
    
    const characterData = await response.json();
    const corporationId = characterData.corporation_id;
    
    if (!corporationId) {
      console.log('Character has no corporation:', characterId);
      return null;
    }
    
    // 获取公司详细信息
    const corpResponse = await fetch(`${ESI_BASE_URL}/corporations/${corporationId}/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!corpResponse.ok) {
      console.error('Failed to fetch corporation info:', corpResponse.status);
      return null;
    }
    
    const corporationData = await corpResponse.json();
    return {
      id: corporationId,
      name: corporationData.name,
      ticker: corporationData.ticker,
      description: corporationData.description || null,
      member_count: corporationData.member_count || null,
      tax_rate: corporationData.tax_rate || null,
      date_founded: corporationData.date_founded ? new Date(corporationData.date_founded) : null,
      ceo_id: corporationData.ceo_id || null,
      creator_id: corporationData.creator_id || null,
      faction_id: corporationData.faction_id || null,
      home_station_id: corporationData.home_station_id || null,
      shares: corporationData.shares || null,
      url: corporationData.url || null
    };
  } catch (error) {
    console.error('Error fetching corporation info:', error.message);
    return null;
  }
};

// 保存公司信息到数据库
const saveCorporationToDatabase = async (corporationInfo, datasource) => {
  try {
    const [result] = await pool.execute(
      `INSERT INTO corporations 
       (id, name, ticker, description, member_count, tax_rate, date_founded, 
        ceo_id, creator_id, faction_id, home_station_id, shares, url, datasource) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         ticker = VALUES(ticker),
         description = VALUES(description),
         member_count = VALUES(member_count),
         tax_rate = VALUES(tax_rate),
         date_founded = VALUES(date_founded),
         ceo_id = VALUES(ceo_id),
         creator_id = VALUES(creator_id),
         faction_id = VALUES(faction_id),
         home_station_id = VALUES(home_station_id),
         shares = VALUES(shares),
         url = VALUES(url),
         updated_at = CURRENT_TIMESTAMP`,
      [
        corporationInfo.id,
        corporationInfo.name,
        corporationInfo.ticker,
        corporationInfo.description,
        corporationInfo.member_count,
        corporationInfo.tax_rate,
        corporationInfo.date_founded,
        corporationInfo.ceo_id,
        corporationInfo.creator_id,
        corporationInfo.faction_id,
        corporationInfo.home_station_id,
        corporationInfo.shares,
        corporationInfo.url,
        datasource
      ]
    );
    return result;
  } catch (error) {
    console.error('Error saving corporation to database:', error.message);
    throw error;
  }
};

// 刷新 access_token
const refreshAccessToken = async (refreshToken) => {
  try {
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    body.append('client_id', ESI_CLIENT_ID);

    console.log('Refreshing access token...');

    const response = await fetch(ESI_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Token refresh successful');

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // 有些实现会返回新的refresh_token
      expires_at: Date.now() + data.expires_in * 1000,
      token_type: data.token_type || 'Bearer'
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

// 用refresh_token刷新并更新数据库
const refreshAndUpdateToken = async (characterId, datasource = 'serenity') => {
  const record = await EveSsoCode.getLatestToken(characterId, datasource);
  if (!record || !record.refresh_token) {
    throw new Error('No refresh token available');
  }

  const newTokenData = await refreshAccessToken(record.refresh_token);
  await EveSsoCode.updateToken(characterId, newTokenData, datasource);
  console.log(`Token refreshed and updated for character ${characterId}`);

  return {
    ...record,
    ...newTokenData
  };
};

// 获取有效的token（自动刷新如果快过期）
const getValidTokenWithRefresh = async (characterId, datasource = 'serenity') => {
  // 先检查是否有有效token
  let tokenData = await EveSsoCode.getValidToken(characterId, datasource);

  if (!tokenData) {
    // 没有有效token，尝试刷新
    console.log(`No valid token for character ${characterId}, attempting refresh...`);
    try {
      tokenData = await refreshAndUpdateToken(characterId, datasource);
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      return null;
    }
  }

  return tokenData;
};

const exchangeCodeForToken = async (code, codeVerifier = null) => {
  try {
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('client_id', ESI_CLIENT_ID);
    body.append('redirect_uri', ESI_REDIRECT_URI);
    // PKCE模式需要code_verifier
    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    console.log('Exchanging code for token, clientId:', ESI_CLIENT_ID, 'hasCodeVerifier:', !!codeVerifier);

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    };

    const response = await fetch(ESI_TOKEN_URL, fetchOptions);

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
        // 尝试从JWT token中解析角色信息
        const tokenParts = data.access_token.split('.');
        if (tokenParts.length === 3) {
          // 是JWT格式，使用base64url解码
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
          console.log('JWT payload:', payload);
          tokenData.character_id = payload.sub?.replace('CHARACTER:EVE:', '') || payload.character_id || null;
          tokenData.character_name = payload.name || payload.character_name || null;
          tokenData.scopes = payload.scp?.join(' ') || payload.scopes || null;
          tokenData.datasource = 'serenity';
        }
        
        // 如果JWT解析失败或没有角色信息，尝试调用ESI verify端点
        if (!tokenData.character_id) {
          try {
            const verifyResponse = await fetch(`${ESI_BASE_URL}/verify/`, {
              headers: {
                'Authorization': `Bearer ${data.access_token}`,
                'Accept': 'application/json'
              }
            });

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              console.log('Verify successful:', verifyData);
              tokenData.character_id = verifyData.CharacterID || verifyData.character_id || null;
              tokenData.character_name = verifyData.CharacterName || verifyData.character_name || null;
              tokenData.scopes = verifyData.Scopes || verifyData.scopes || null;
            } else {
              console.error('Verify failed:', verifyResponse.status, await verifyResponse.text());
            }
          } catch (verifyError) {
            console.error('Verify error:', verifyError);
          }
        }
        
        // 确保有默认值
        tokenData.character_id = tokenData.character_id || null;
        tokenData.character_name = tokenData.character_name || null;
        tokenData.scopes = tokenData.scopes || null;
        tokenData.datasource = 'serenity';
      } catch (error) {
        console.error('Error parsing token:', error);
        // 设置默认值避免undefined
        tokenData.character_id = null;
        tokenData.character_name = null;
        tokenData.scopes = null;
        tokenData.datasource = 'serenity';
      }
    } else {
      // 没有access_token时设置默认值
      tokenData.character_id = null;
      tokenData.character_name = null;
      tokenData.scopes = null;
      tokenData.datasource = 'serenity';
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

    // 默认使用国服(serenity)作为datasource
    const datasource = 'serenity';

    let tokenData = null;
    let tokenError = null;
    try {
      tokenData = await exchangeCodeForToken(code, code_verifier);
      // 直接保存完整token数据（包含code用于关联）
      await EveSsoCode.saveToken(code, tokenData);
      console.log('Token saved successfully for code:', code);
      
      // 获取并保存公司信息
      if (tokenData.access_token && tokenData.character_id) {
        try {
          const corporationInfo = await fetchCorporationInfo(tokenData.character_id, tokenData.access_token);
          if (corporationInfo) {
            await saveCorporationToDatabase(corporationInfo, datasource);
            console.log('Corporation info saved successfully for character:', tokenData.character_id);
          }
        } catch (corpError) {
          console.error('Failed to save corporation info:', corpError.message);
          // 公司信息保存失败不影响登录流程
        }
      }
    } catch (tokenErr) {
      console.error('Token exchange failed:', tokenErr.message);
      tokenError = tokenErr.message;
      // token交换失败时不保存code，因为code已经无效（一次性使用）
      // 返回错误信息给前端
      return res.status(400).json({
        success: false,
        error: '授权码无效或已过期',
        message: '请重新登录授权，授权码只能使用一次'
      });
    }

    res.json({
      success: true,
      code,
      state,
      token_saved: !!tokenData,
      character_name: tokenData?.character_name,
      character_id: tokenData?.character_id
      // 注意：不返回 access_token，安全原因保存在后端
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
      'SELECT id, state, character_id, character_name, token_type, expires_at, created_at, datasource FROM eve_sso_codes ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get SSO codes error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

const getCharacterNames = async (req, res) => {
  try {
    const datasource = req.query.datasource || 'serenity';
    const names = await EveSsoCode.getAllCharacterNames(datasource);
    res.json({ success: true, data: names });
  } catch (error) {
    console.error('Get character names error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

module.exports = {
  saveSsoCode,
  getSsoCodes,
  getCharacterNames,
  getValidTokenWithRefresh,
  refreshAndUpdateToken
};
