import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccountStr = this.configService.get<string>("FIREBASE_SERVICE_ACCOUNT");
    
    if (!serviceAccountStr) {
      this.logger.warn("FIREBASE_SERVICE_ACCOUNT not found in environment variables. Push notifications will be disabled.");
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.messaging = admin.messaging();
      this.logger.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", error.stack);
    }
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.messaging || !tokens || tokens.length === 0) {
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data,
      tokens,
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} messages failed.`);
      
      // Potential for cleanup of invalid tokens here if needed
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.warn(`Failure sending to token ${tokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return response;
    } catch (error) {
      this.logger.error("Error sending push notification", error.stack);
    }
  }
}
