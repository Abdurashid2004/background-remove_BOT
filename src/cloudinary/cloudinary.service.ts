import { Injectable } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  /**
   * Uploads an image to Cloudinary.
   * @param file - The image file to upload.
   * @returns A promise that resolves with the upload response or rejects with an error response.
   */
  async uploadImage(
    file: UploadApiErrorResponse,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        },
      );

      toStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Removes an image from Cloudinary by its public ID.
   * @param publicId - The public ID of the image to remove.
   * @returns A promise that resolves with the result of the deletion or rejects with an error response.
   */
  async removeImage(
    publicId: string,
  ): Promise<{ result: string } | UploadApiErrorResponse> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new Error(
        `Failed to remove image with public ID ${publicId}: ${error.message}`,
      );
    }
  }

  /**
   * Extracts the public ID from a Cloudinary URL.
   * @param url - The URL of the image.
   * @returns The public ID of the image.
   */
  extractPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const publicIdWithExtension = parts[parts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    return publicId;
  }

  /**
   * Removes an image from Cloudinary by its URL.
   * @param url - The URL of the image to remove.
   * @returns A promise that resolves with the result of the deletion or rejects with an error response.
   */
  async removeImageByUrl(
    url: string,
  ): Promise<{ result: string } | UploadApiErrorResponse> {
    const publicId = this.extractPublicIdFromUrl(url);
    return this.removeImage(publicId);
  }
}
