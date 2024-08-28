import { Ctx, On, Start, Update, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';
import axios from 'axios';
import * as FormData from 'form-data';
import * as sharp from 'sharp';
import { API_KEY } from 'src/app.constants';

// In-memory store
const inMemoryStore: { [key: number]: string } = {};

@Update()
export class UpdateBot {
  @Start()
  async onStart(@Ctx() ctx: Context) {
    const username = ctx.from?.username || 'user';
    const welcomeMessage = `Hush kelibsiz bizni bo'timizga, <b>${username}</b>`;
    await ctx.replyWithHTML(welcomeMessage);
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    const message = ctx.message as Message.PhotoMessage;
    const photo = message.photo;
    if (photo && photo.length > 0) {
      const fileId = photo[photo.length - 1].file_id;
      const fileUrl = await ctx.telegram.getFileLink(fileId);
      inMemoryStore[ctx.from.id] = fileUrl.href;

      await ctx.reply('Tanlang:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Rasmni 3x4 qilish', callback_data: 'resize' }],
            [{ text: 'Fonini olib tashlash', callback_data: 'remove_bg' }],
          ],
        },
      });
    } else {
      await ctx.reply('No photo found in the message.');
    }
  }

  @Action('resize')
  async onResize(@Ctx() ctx: Context) {
    const fileUrl = inMemoryStore[ctx.from.id];
    if (fileUrl) {
      try {
        const resizedBuffer = await this.resizeImage(fileUrl);
        await ctx.replyWithPhoto({ source: resizedBuffer });
      } catch (error) {
        console.error('Failed to resize image:', error);
        await ctx.reply('Failed to resize image.');
      }
    } else {
      await ctx.reply('No photo found in the in-memory store.');
    }
  }

  @Action('remove_bg')
  async onRemoveBg(@Ctx() ctx: Context) {
    const fileUrl = inMemoryStore[ctx.from.id];
    if (fileUrl) {
      try {
        const removedBgBuffer = await this.removeBackground(fileUrl);

        if (removedBgBuffer) {
          const sharpenedBuffer = await this.sharpenImage(removedBgBuffer);
          await ctx.replyWithPhoto({ source: sharpenedBuffer });
        } else {
          await ctx.reply('Failed to remove background.');
        }
      } catch (error) {
        console.error('Failed to process image:', error);
        await ctx.reply('Failed to process image.');
      }
    } else {
      await ctx.reply('No photo found in the in-memory store.');
    }
  }

  private async removeBackground(imageUrl: string): Promise<Buffer | null> {
    const apiKey = API_KEY;
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto');

    try {
      const response = await this.retryAxiosRequest(
        'https://api.remove.bg/v1.0/removebg',
        {
          method: 'POST',
          data: formData,
          headers: {
            ...formData.getHeaders(),
            'X-Api-Key': apiKey,
          },
          responseType: 'arraybuffer',
          timeout: 20000,
        },
      );

      if (response.status === 200) {
        return Buffer.from(response.data, 'binary');
      } else {
        console.error(
          'Error removing background:',
          response.status,
          response.statusText,
        );
        return null;
      }
    } catch (error) {
      console.error('Error removing background:', error);
      return null;
    }
  }

  private async resizeImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await this.retryAxiosRequest(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 20000,
      });
      const imageBuffer = Buffer.from(response.data, 'binary');
      const resizedBuffer = await sharp(imageBuffer)
        .resize({
          width: 300,
          height: 400,
          fit: sharp.fit.cover,
        })
        .toBuffer();
      return resizedBuffer;
    } catch (error) {
      console.error('Error resizing image:', error);
      throw error;
    }
  }

  private async sharpenImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Rasmni o'lchamini olish uchun sharp kutubxonasidan foydalanamiz
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      const sharpenedBuffer = await image
        .withMetadata({
          exif: {
            IFD0: { ImageDescription: 'afc0871ce04747449009844073e0a4ba' },
          },
        })
        .toBuffer();
      return sharpenedBuffer;
    } catch (error) {
      console.error('Error sharpening image:', error);
      throw error;
    }
  }

  private async retryAxiosRequest(
    url: string,
    options: object,
    retries = 3,
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        return await axios(url, options);
      } catch (error) {
        if (i === retries - 1) throw error;
      }
    }
  }
}
