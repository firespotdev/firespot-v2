import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as QRCode from 'qrcode'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import sharp from 'sharp'

@Injectable()
export class QRCodeService {
  private readonly qrCodeBaseUrl: string

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      })
    }

    this.qrCodeBaseUrl =
      this.configService.get<string>('QR_CODE_BASE_URL') ||
      'https://lite.firespot.co/pay'
  }

  /**
   * Generate QR code as SVG string
   * @param serialNumber - The serial number to encode in the QR code
   * @returns SVG string
   */
  async generateQRCodeSVG(serialNumber: string): Promise<string> {
    // Generate URL pointing to the payment page: {BASE_URL}/pay/{serialNumber}
    const url = `${this.qrCodeBaseUrl}/pay/${serialNumber}`

    try {
      const svg = await QRCode.toString(url, {
        type: 'svg',
        width: 1000,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      return svg
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`)
    }
  }

  /**
   * Upload SVG to Cloudinary
   * @param svgString - The SVG string to upload
   * @param serialNumber - Serial number for folder organization
   * @returns Object with url and publicId
   */
  async uploadQRCodeSVG(
    svgString: string,
    serialNumber: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const svgBuffer = Buffer.from(svgString, 'utf-8')

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'flare/qr-codes',
          resource_type: 'image',
          public_id: `qr-${serialNumber}`,
        },
        (error, result) => {
          if (error) {
            reject(
              new Error(
                `Failed to upload QR code: ${error.message || 'Unknown error'}`,
              ),
            )
          }
          if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          }
        },
      )

      const readableStream = new Readable()
      readableStream.push(svgBuffer)
      readableStream.push(null)
      readableStream.pipe(uploadStream)
    })
  }

  /**
   * Get SVG from Cloudinary and convert to PNG
   * @param publicId - Cloudinary public ID
   * @returns PNG buffer
   */
  async getQRCodeAsPNG(publicId: string): Promise<Buffer> {
    try {
      // Get SVG URL from Cloudinary (auto-detects format)
      const svgUrl = cloudinary.url(publicId, {
        resource_type: 'image',
      })

      // Fetch SVG
      const response = await fetch(svgUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch SVG from Cloudinary')
      }
      const svgString = await response.text()

      // Convert SVG to PNG using sharp
      const pngBuffer = await sharp(Buffer.from(svgString))
        .resize(1000, 1000)
        .png()
        .toBuffer()

      return pngBuffer
    } catch (error) {
      throw new Error(`Failed to convert QR code to PNG: ${error.message}`)
    }
  }
}
