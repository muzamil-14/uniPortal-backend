import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePasswordNullable1773800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`password\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user\` MODIFY \`password\` varchar(255) NOT NULL`,
    );
  }
}
