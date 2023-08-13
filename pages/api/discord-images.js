import { Client, Intents } from 'discord.js';

export default async function handler(req, res) {
  const intents = new Intents([Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]);
  const client = new Client({ intents });

  try {
    await client.login(process.env.BOT_TOKEN);

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    if (!channel.isText()) {
      throw new Error('Channel must be a text-based channel');
    }

    let lastId;
    let allMessages = [];
    const page = parseInt(req.query.page, 10) || 1;  // Get page from query params, default to 1.
    const perPage = 50;  // Images per page.
    const toSkip = (page - 1) * perPage;  // Number of images to skip.
    let skipped = 0;  // Counter for skipped images.

    for(let i = 0; i < 3; i++) {
      const options = { limit: 100 };
      if (lastId) {
        options.before = lastId;
      }
      
      const messages = await channel.messages.fetch(options);
      allMessages = [...allMessages, ...Array.from(messages.values())];
      
      if (messages.size > 0) {
        lastId = messages.last().id;
      } else {
        break;
      }
    }

    const images = allMessages
      .filter(message => {
        // We only count images for skipping, not every message.
        if (message.attachments.size > 0) {
          if (skipped < toSkip) {
            skipped++;
            return false;  // Skip this image.
          }
          return true;
        }
        return false;  // Not an image, don't count for skipping.
      })
      .map(message => {
        const attachment = message.attachments.first();
        return {
          url: attachment.url,
          text: message.content
        };
      })
      .slice(0, perPage);  // Only take as many images as needed per page.

    res.status(200).json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  } finally {
    client.destroy();
  }
}