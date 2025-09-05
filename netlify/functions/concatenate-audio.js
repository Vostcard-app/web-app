const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const { Buffer } = require('buffer');

ffmpeg.setFfmpegPath(ffmpegPath);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('application/json')) {
      return { statusCode: 400, body: 'Expected application/json' };
    }

    const body = JSON.parse(event.body || '{}');
    const { userAudioBase64 } = body;
    if (!userAudioBase64) {
      return { statusCode: 400, body: 'Missing userAudioBase64' };
    }

    // Load Tag.mp3 from public
    // Netlify serves /public into the published site; for functions, include the asset in the function bundle
    // Easiest: expect client to send tag as part of request, or embed minimal base64 here.
    // For now, fetch over HTTP from the same site domain.
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
    if (!siteUrl) {
      return { statusCode: 500, body: 'Missing site URL for Tag.mp3 fetch' };
    }

    // Use global fetch (Node 18+) to retrieve Tag.mp3 from the deployed site
    const resp = await fetch(`${siteUrl}/Tag.mp3`);
    if (!resp.ok) {
      return { statusCode: 500, body: `Failed to fetch Tag.mp3: ${resp.status}` };
    }
    const tagBuffer = Buffer.from(await resp.arrayBuffer());
    const userBuffer = Buffer.from(userAudioBase64, 'base64');

    // Concatenate using filter_complex with explicit stream labels for reliability
    const concatBuffers = async (buf1, buf2) => new Promise((resolve, reject) => {
      const chunks = [];
      const command = ffmpeg()
        .input(Buffer.from(buf1))
        .inputOptions(['-f mp3'])
        .input(Buffer.from(buf2))
        .inputOptions(['-f mp3'])
        .complexFilter([
          {
            filter: 'concat',
            options: { n: 2, v: 0, a: 1 },
            inputs: ['0:a', '1:a'],
            outputs: 'aout'
          }
        ])
        .outputOptions([
          '-map [aout]',
          '-c:a libmp3lame',
          '-ar 44100',
          '-ac 2',
          '-b:a 192k'
        ])
        .on('error', (err) => reject(err))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .format('mp3');

      const stream = command.pipe();
      stream.on('data', (d) => chunks.push(d));
      stream.on('error', (err) => reject(err));
    });

    const output = await concatBuffers(userBuffer, tagBuffer);
    const outB64 = output.toString('base64');

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ audioBase64: outB64 })
    };
  } catch (e) {
    return { statusCode: 500, body: `Error: ${e.message}` };
  }
};


