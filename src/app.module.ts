import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { QRKitsModule } from "./qr-kits/qr-kits.module";
import { AdminModule } from "./admin/admin.module";
import { PaymentsModule } from "./payments/payments.module";
import { ScansModule } from "./scans/scans.module";
import { SmsModule } from "./services/sms/sms.module";
import { EmailModule } from "./services/email/email.module";
import { NotificationModule } from "./services/notifications/notification.module";
import { getDatabaseConfig } from "./config/database.config";
import { SalesModule } from './sales/sales.module';
import { QROrdersModule } from './qr-orders/qr-orders.module';
import { EventsModule } from './events/events.module';
import { FirebaseModule } from './services/firebase/firebase.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    // Global IP-based rate limiting; stricter per-route limits are set with
    // @Throttle on sensitive endpoints (OTP request, admin login).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    QRKitsModule,
    AdminModule,
    PaymentsModule,
    ScansModule,
    SmsModule,
    EmailModule,
    NotificationModule,
    SalesModule,
    QROrdersModule,
    EventsModule,
    FirebaseModule,
    CustomersModule,
    ProductsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
