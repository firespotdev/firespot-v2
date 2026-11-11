import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Expense, ExpenseSchema } from "../schemas/expense.schema";
import { Supplier, SupplierSchema } from "../schemas/supplier.schema";
import { User, UserSchema } from "../schemas/user.schema";
import { MerchantReferralsModule } from "../merchant-referrals/merchant-referrals.module";
import { ExpensesController, SuppliersController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { SuppliersService } from "./suppliers.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MerchantReferralsModule,
  ],
  controllers: [ExpensesController, SuppliersController],
  providers: [ExpensesService, SuppliersService],
})
export class ExpensesModule {}
