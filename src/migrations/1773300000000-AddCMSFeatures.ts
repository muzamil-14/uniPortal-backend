import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCMSFeatures1773300000000 implements MigrationInterface {
    name = 'AddCMSFeatures1773300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create announcement table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`announcement\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`content\` text NOT NULL, \`authorId\` int NULL, \`isImportant\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`announcement\` ADD CONSTRAINT \`FK_announcement_author\` FOREIGN KEY (\`authorId\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Create attendance table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`attendance\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`courseId\` int NOT NULL, \`date\` date NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'present', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_attendance_user_course_date\` (\`userId\`, \`courseId\`, \`date\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`attendance\` ADD CONSTRAINT \`FK_attendance_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`attendance\` ADD CONSTRAINT \`FK_attendance_course\` FOREIGN KEY (\`courseId\`) REFERENCES \`course\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Create event table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`event\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`eventDate\` date NOT NULL, \`endDate\` varchar(255) NULL, \`eventType\` varchar(255) NOT NULL DEFAULT 'event', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

        // Add grade and marks columns to enrollment
        await queryRunner.query(`ALTER TABLE \`enrollment\` ADD \`grade\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`enrollment\` ADD \`marks\` decimal(5,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`enrollment\` DROP COLUMN \`marks\``);
        await queryRunner.query(`ALTER TABLE \`enrollment\` DROP COLUMN \`grade\``);

        await queryRunner.query(`DROP TABLE \`event\``);

        await queryRunner.query(`ALTER TABLE \`attendance\` DROP FOREIGN KEY \`FK_attendance_course\``);
        await queryRunner.query(`ALTER TABLE \`attendance\` DROP FOREIGN KEY \`FK_attendance_user\``);
        await queryRunner.query(`DROP INDEX \`IDX_attendance_user_course_date\` ON \`attendance\``);
        await queryRunner.query(`DROP TABLE \`attendance\``);

        await queryRunner.query(`ALTER TABLE \`announcement\` DROP FOREIGN KEY \`FK_announcement_author\``);
        await queryRunner.query(`DROP TABLE \`announcement\``);
    }
}
