import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeacherRole1773400000000 implements MigrationInterface {
    name = 'AddTeacherRole1773400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add instructorId column to course table
        await queryRunner.query(`ALTER TABLE \`course\` ADD \`instructorId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`course\` ADD CONSTRAINT \`FK_course_instructor\` FOREIGN KEY (\`instructorId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`course\` DROP FOREIGN KEY \`FK_course_instructor\``);
        await queryRunner.query(`ALTER TABLE \`course\` DROP COLUMN \`instructorId\``);
    }
}
