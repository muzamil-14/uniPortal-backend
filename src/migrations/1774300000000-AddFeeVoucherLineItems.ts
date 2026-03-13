import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeeVoucherLineItems1774300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` ADD \`lineItems\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` DROP COLUMN \`lineItems\``,
    );
  }
}
