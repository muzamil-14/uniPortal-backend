import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewFeatures1773900000000 implements MigrationInterface {
    name = 'AddNewFeatures1773900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create course_material table
        await queryRunner.query(`
            CREATE TABLE \`course_material\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`fileName\` varchar(255) NOT NULL,
                \`fileUrl\` varchar(255) NOT NULL,
                \`fileType\` varchar(255) NOT NULL,
                \`courseId\` int NOT NULL,
                \`uploadedById\` int NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_course_material_course\` FOREIGN KEY (\`courseId\`) REFERENCES \`course\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT \`FK_course_material_user\` FOREIGN KEY (\`uploadedById\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) ENGINE=InnoDB
        `);

        // Create assignment table
        await queryRunner.query(`
            CREATE TABLE \`assignment\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`title\` varchar(255) NOT NULL,
                \`description\` text NOT NULL,
                \`courseId\` int NOT NULL,
                \`createdById\` int NOT NULL,
                \`deadline\` datetime NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_assignment_course\` FOREIGN KEY (\`courseId\`) REFERENCES \`course\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT \`FK_assignment_user\` FOREIGN KEY (\`createdById\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) ENGINE=InnoDB
        `);

        // Create submission table
        await queryRunner.query(`
            CREATE TABLE \`submission\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`assignmentId\` int NOT NULL,
                \`studentId\` int NOT NULL,
                \`fileName\` varchar(255) NOT NULL,
                \`fileUrl\` varchar(255) NOT NULL,
                \`submittedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_submission_student_assignment\` (\`studentId\`, \`assignmentId\`),
                CONSTRAINT \`FK_submission_assignment\` FOREIGN KEY (\`assignmentId\`) REFERENCES \`assignment\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT \`FK_submission_user\` FOREIGN KEY (\`studentId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) ENGINE=InnoDB
        `);

        // Create notification table
        await queryRunner.query(`
            CREATE TABLE \`notification\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`title\` varchar(255) NOT NULL,
                \`message\` text NOT NULL,
                \`type\` varchar(255) NOT NULL,
                \`isRead\` tinyint NOT NULL DEFAULT 0,
                \`relatedId\` int NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`FK_notification_user\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`notification\``);
        await queryRunner.query(`DROP TABLE \`submission\``);
        await queryRunner.query(`DROP TABLE \`assignment\``);
        await queryRunner.query(`DROP TABLE \`course_material\``);
    }
}
