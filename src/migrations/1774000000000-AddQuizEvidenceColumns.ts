import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuizEvidenceColumns1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`quiz_attempts\` ADD \`screenshotPath\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`quiz_attempts\` ADD \`recordingPath\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`quiz_attempts\` DROP COLUMN \`recordingPath\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`quiz_attempts\` DROP COLUMN \`screenshotPath\``,
    );
  }
}
