import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale, SaleSchema } from '../schemas/sale.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { QRKit, QRKitSchema } from '../schemas/qrkit.schema';
import { EventsModule } from '../events/events.module';
import { FirebaseModule } from '../services/firebase/firebase.module';

import {
  MerchantCustomer,
  MerchantCustomerSchema,
} from '../schemas/merchant-customer.schema';
import { Product, ProductSchema } from '../schemas/product.schema';
import { UsersModule } from '../users/users.module';
import { AccountLinkingModule } from '../account-linking/account-linking.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
      { name: QRKit.name, schema: QRKitSchema },
      { name: MerchantCustomer.name, schema: MerchantCustomerSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    EventsModule,
    FirebaseModule,
    UsersModule,
    AccountLinkingModule,
    CustomersModule,
  ],
  controllers: [SalesController],
  providers: [SalesService]
})
export class SalesModule {}
