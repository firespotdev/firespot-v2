import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Report, ReportSchema } from "../schemas/report.schema";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { UsersModule } from "../users/users.module";
import { Sale, SaleSchema } from "../schemas/sale.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
    UsersModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
