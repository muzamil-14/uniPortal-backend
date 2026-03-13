import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FeeVoucherService } from './fee-voucher.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeeVoucherStatus } from './fee-voucher.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fee-vouchers')
export class FeeVoucherController {
  constructor(private readonly feeVoucherService: FeeVoucherService) {}

  @Roles('admin')
  @Get('admin/course/:courseId')
  getCourseVouchersForAdmin(@Param('courseId', ParseIntPipe) courseId: number) {
    return this.feeVoucherService.getCourseVouchersForAdmin(courseId);
  }

  @Roles('admin')
  @Get('admin')
  getAllVouchersForAdmin() {
    return this.feeVoucherService.getAllVouchersForAdmin();
  }

  @Roles('admin')
  @Get('generate/course/:courseId')
  rejectManualGeneration() {
    throw new BadRequestException(
      'Vouchers are created automatically only when a student registers a semester.',
    );
  }

  @Roles('admin')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: FeeVoucherStatus },
  ) {
    return this.feeVoucherService.updateStatus(id, body.status);
  }

  @Roles('student')
  @Get('my')
  getMyVouchers(@Request() req: any) {
    return this.feeVoucherService.getMyVouchers(req.user.userId);
  }

  @Roles('student')
  @Get('my/:id/download')
  downloadMyVoucher(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.feeVoucherService.getMyVoucher(req.user.userId, id);
  }
}
