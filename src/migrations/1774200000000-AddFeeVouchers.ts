import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeeVouchers1774200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`fee_vouchers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`voucherNumber\` varchar(255) NOT NULL, \`userId\` int NOT NULL, \`courseId\` int NOT NULL, \`courseFee\` decimal(10,2) NOT NULL DEFAULT '0.00', \`previousDue\` decimal(10,2) NOT NULL DEFAULT '0.00', \`totalAmount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`dueDate\` date NULL, \`status\` varchar(255) NOT NULL DEFAULT 'unpaid', \`paidAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fee_voucher_number\` (\`voucherNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` ADD CONSTRAINT \`FK_fee_vouchers_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` ADD CONSTRAINT \`FK_fee_vouchers_course\` FOREIGN KEY (\`courseId\`) REFERENCES \`course\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` DROP FOREIGN KEY \`FK_fee_vouchers_course\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fee_vouchers\` DROP FOREIGN KEY \`FK_fee_vouchers_user\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_fee_voucher_number\` ON \`fee_vouchers\``);
    await queryRunner.query(`DROP TABLE \`fee_vouchers\``);
  }
}
