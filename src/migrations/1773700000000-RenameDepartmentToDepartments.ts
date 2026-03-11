import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDepartmentToDepartments1773700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new JSON departments column
    await queryRunner.query(
      `ALTER TABLE \`course\` ADD \`departments\` json NULL`,
    );

    // Migrate existing department data into departments array
    await queryRunner.query(
      `UPDATE \`course\` SET \`departments\` = JSON_ARRAY(\`department\`) WHERE \`department\` IS NOT NULL AND \`department\` != ''`,
    );

    // Drop old department column
    await queryRunner.query(
      `ALTER TABLE \`course\` DROP COLUMN \`department\``,
    );

    // Drop schedule column (no longer used)
    await queryRunner.query(
      `ALTER TABLE \`course\` DROP COLUMN \`schedule\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`course\` ADD \`schedule\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course\` ADD \`department\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `UPDATE \`course\` SET \`department\` = JSON_UNQUOTE(JSON_EXTRACT(\`departments\`, '$[0]')) WHERE \`departments\` IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`course\` DROP COLUMN \`departments\``,
    );
  }
}
