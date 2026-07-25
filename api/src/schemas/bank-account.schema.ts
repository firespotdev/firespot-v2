import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ _id: false, timestamps: true })
export class BankAccount {
  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  bankCode: string;

  @Prop({ required: true, length: 10 })
  accountNumber: string;

  @Prop({ required: true }) // From Paystack verification
  accountName: string;

  @Prop({ default: false })
  isPrimary: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BankAccountSchema = SchemaFactory.createForClass(BankAccount);
