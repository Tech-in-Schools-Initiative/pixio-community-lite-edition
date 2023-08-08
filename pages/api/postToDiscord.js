import { Client, Intents, MessageAttachment } from 'discord.js';

export default async function handler(req, res) {
  const { message, imageUrl } = req.body;
  
  console.log('Received image url:', imageUrl);

  const intents = new Intents([Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]);
  const client = new Client({ intents });

  try {
    await client.login(process.env.BOT_TOKEN);

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    if (!channel.isText()) {
      throw new Error('Channel must be a text-based channel');
    }

    const attachment = new MessageAttachment(imageUrl, 'image.png');
    await channel.send({ content: message, files: [attachment] });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  } finally {
    client.destroy();
  }
}
