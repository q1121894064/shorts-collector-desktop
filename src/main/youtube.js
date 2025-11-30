const axios = require('axios');

async function searchVideos(apiKey, q, maxResults=20) {
  const url = 'https://www.googleapis.com/youtube/v3/search';
  const params = { key: apiKey, q, part: 'snippet', type: 'video', maxResults: Math.min(50, maxResults) };
  const r = await axios.get(url, { params, timeout: 20000 });
  return r.data.items || [];
}

async function getVideoDetails(apiKey, videoIds = []) {
  if (!videoIds || videoIds.length === 0) return [];
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const params = { key: apiKey, id: videoIds.join(','), part: 'snippet,contentDetails,statistics', maxResults: videoIds.length };
  const r = await axios.get(url, { params, timeout: 20000 });
  return r.data.items || [];
}

module.exports = { searchVideos, getVideoDetails };
