const { searchVideos, getVideoDetails } = require('./youtube');
const cron = require('cron');

function Worker(db) {
  this.queue = [];
  this.processing = false;
  this.db = db;
  this.concurrency = 3;

  this.enqueueSearch = async (query, maxResults=20) => {
    const apiKey = db.getSetting('youtube_api_key');
    if (!apiKey) throw new Error('YouTube API key not set (use Settings).');
    const items = await searchVideos(apiKey, query, maxResults);
    const ids = items.map(it => it.id && it.id.videoId).filter(Boolean);
    while (ids.length) {
      const chunk = ids.splice(0, 50);
      const details = await getVideoDetails(apiKey, chunk);
      for (const v of details) {
        const duration = parseDuration(v.contentDetails && v.contentDetails.duration);
        const is_shorts = (duration <= 60) || ((v.snippet.title + ' ' + v.snippet.description).toLowerCase().includes('#shorts'));
        db.upsertChannel({
          id: v.snippet.channelId, title: v.snippet.channelTitle, description: v.snippet.description, publishedAt: v.snippet.publishedAt, raw: v.snippet
        });
        db.upsertVideo({
          id: v.id, channelId: v.snippet.channelId, title: v.snippet.title, description: v.snippet.description,
          tags: v.snippet.tags || [], duration_seconds: duration, is_shorts: is_shorts, published_at: v.snippet.publishedAt, raw: v
        });
        db.insertMetric({
          video_id: v.id,
          snapshot_at: new Date().toISOString(),
          view_count: Number(v.statistics && v.statistics.viewCount) || 0,
          like_count: Number(v.statistics && v.statistics.likeCount) || 0,
          comment_count: Number(v.statistics && v.statistics.commentCount) || 0,
          raw: v.statistics || {}
        });
      }
    }
    return true;
  };

  function parseDuration(ds) {
    if (!ds) return 0;
    const matches = ds.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!matches) return 0;
    const h = Number(matches[1]||0), m = Number(matches[2]||0), s = Number(matches[3]||0);
    return h*3600 + m*60 + s;
  }

  this.startSchedule = () => {
    const job = new cron.CronJob('0 0 * * * *', async () => {
      try {
        const apiKey = db.getSetting('youtube_api_key');
        if (!apiKey) return;
        await this.enqueueSearch('#shorts', 10);
        console.log('[worker] scheduled search completed');
      } catch (e) {
        console.error('[worker] scheduled error', e);
      }
    }, null, true);
    job.start();
  };

  return this;
}

module.exports = Worker;
