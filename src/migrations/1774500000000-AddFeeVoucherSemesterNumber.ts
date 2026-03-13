import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeeVoucherSemesterNumber1774500000000 implements MigrationInterface {
  name = 'AddFeeVoucherSemesterNumber1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `fee_vouchers` ADD `semesterNumber` int NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `fee_vouchers` DROP COLUMN `semesterNumber`',
    );
  }
}
