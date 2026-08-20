import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export class StorageService {
  private static supabase = (config.supabaseUrl && config.supabaseKey)
    ? createClient(config.supabaseUrl, config.supabaseKey)
    : null;

  public static async uploadIdCard(fileBuffer: Buffer, fileName: string): Promise<string> {
    // 1. Try Supabase Storage if configured
    if (this.supabase) {
      try {
        const filePath = `id-cards/${Date.now()}_${fileName}`;
        const { data, error } = await this.supabase.storage
          .from('department-ids')
          .upload(filePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!error && data) {
          const { data: publicData } = this.supabase.storage
            .from('department-ids')
            .getPublicUrl(filePath);
          return publicData.publicUrl;
        }
      } catch (err) {
        console.warn('[STORAGE] Supabase upload fallback to local storage:', err);
      }
    }

    // 2. Fallback to local storage (production ready local volume)
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localPath = path.join(uploadsDir, safeName);
    await fs.promises.writeFile(localPath, fileBuffer);

    return `/uploads/${safeName}`;
  }
}
