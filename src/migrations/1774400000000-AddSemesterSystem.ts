import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSemesterSystem1774400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add currentSemester column to user table
    await queryRunner.query(
      `ALTER TABLE \`user\` ADD \`currentSemester\` int NOT NULL DEFAULT 1`,
    );

    // Add semesterNumber to enrollment table (nullable for legacy rows)
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` ADD \`semesterNumber\` int NULL`,
    );

    // Add semesterNumber to course table (optional: designate a course for a specific semester)
    await queryRunner.query(
      `ALTER TABLE \`course\` ADD \`semesterNumber\` int NULL`,
    );

    // Create semester_configs table
    await queryRunner.query(`
      CREATE TABLE \`semester_configs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`semesterNumber\` int NOT NULL,
        \`name\` varchar(255) NOT NULL DEFAULT '',
        \`minCreditHours\` int NOT NULL DEFAULT 9,
        \`maxCreditHours\` int NOT NULL DEFAULT 21,
        UNIQUE INDEX \`IDX_semester_configs_semesterNumber\` (\`semesterNumber\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create student_semesters table
    await queryRunner.query(`
      CREATE TABLE \`student_semesters\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`semesterNumber\` int NOT NULL,
        \`gpa\` decimal(4,2) NULL,
        \`status\` varchar(255) NOT NULL DEFAULT 'active',
        \`startedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`completedAt\` datetime NULL,
        UNIQUE INDEX \`IDX_student_semesters_user_sem\` (\`userId\`, \`semesterNumber\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_student_semesters_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    // Seed default semester configurations for all 12 semesters
    for (let i = 1; i <= 12; i++) {
      await queryRunner.query(
        `INSERT INTO \`semester_configs\` (\`semesterNumber\`, \`name\`, \`minCreditHours\`, \`maxCreditHours\`) VALUES (?, ?, ?, ?)`,
        [i, `Semester ${i}`, 9, 21],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`student_semesters\``);
    await queryRunner.query(`DROP TABLE \`semester_configs\``);
    await queryRunner.query(
      `ALTER TABLE \`course\` DROP COLUMN \`semesterNumber\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`enrollment\` DROP COLUMN \`semesterNumber\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user\` DROP COLUMN \`currentSemester\``,
    );
  }
}
