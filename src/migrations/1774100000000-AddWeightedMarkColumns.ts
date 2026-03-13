import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeightedMarkColumns1774100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` ADD \`finalMarks\` decimal(5,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` ADD \`midMarks\` decimal(5,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` ADD \`quizMarks\` decimal(5,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` ADD \`assignmentMarks\` decimal(5,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` DROP COLUMN \`assignmentMarks\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` DROP COLUMN \`quizMarks\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` DROP COLUMN \`midMarks\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` DROP COLUMN \`finalMarks\``,
    );
  }
}
