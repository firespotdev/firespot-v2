import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.configService.get<string>("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadImage(
    fileBuffer: Buffer,
    folder: string = "flare/profiles",
  ): Promise<{ url: string; publicId: string }> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",
            transformation: [
              { width: 500, height: 500, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              reject(
                new HttpException(
                  "Failed to upload image",
                  HttpStatus.INTERNAL_SERVER_ERROR,
                ),
              );
            }
            if (result) {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
              });
            }
          },
        );

        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      throw new HttpException(
        "Failed to upload image to Cloudinary",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload a document-style image (receipts, screenshots). Unlike
   * uploadImage, this never crops — the avatar face-crop would make a bank
   * transfer receipt illegible.
   */
  async uploadDocument(
    fileBuffer: Buffer,
    folder: string = "flare/receipts",
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          transformation: [
            { width: 1200, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            reject(
              new HttpException(
                "Failed to upload image",
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
            );
          }
          if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadBanner(
    fileBuffer: Buffer,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "flare/banners",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 480, crop: "fill", gravity: "auto" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            reject(
              new HttpException(
                "Failed to upload banner",
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
            );
          }
          if (result) {
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new HttpException(
        "Failed to delete image from Cloudinary",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
