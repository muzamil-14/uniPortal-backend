import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseDepartment1773600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`course\` ADD \`departments\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`course\` DROP COLUMN \`departments\``,
    );
  }
}
