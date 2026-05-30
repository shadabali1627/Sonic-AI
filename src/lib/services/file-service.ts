import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export class FileService {
  static async processFile(buffer: Buffer, filename: string): Promise<{ type: string; content: string; raw: Buffer }> {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      const text = data.text;
      await parser.destroy();
      return { type: 'pdf', content: text, raw: buffer };
    } else if (ext === 'docx') {
      const data = await mammoth.extractRawText({ buffer });
      return { type: 'text', content: data.value, raw: buffer };
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) {
      return { type: 'image', content: 'image_data', raw: buffer };
    } else if (['wav', 'mp3', 'm4a'].includes(ext || '')) {
      return { type: 'audio', content: 'audio_data', raw: buffer };
    } else if (['txt', 'md', 'csv', 'json', 'py', 'js', 'ts', 'html', 'css'].includes(ext || '')) {
      return { type: 'text', content: buffer.toString('utf-8'), raw: buffer };
    } else {
      try {
        return { type: 'text', content: buffer.toString('utf-8'), raw: buffer };
      } catch {
        return { type: 'binary', content: `[Binary File: ${filename}]`, raw: buffer };
      }
    }
  }
}
