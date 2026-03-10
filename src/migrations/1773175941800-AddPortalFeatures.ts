import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPortalFeatures1773175941800 implements MigrationInterface {
    name = 'AddPortalFeatures1773175941800'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to existing user table
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`phone\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`department\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`role\` varchar(255) NOT NULL DEFAULT 'student'`);
        // Add new columns to existing course table
        await queryRunner.query(`ALTER TABLE \`course\` ADD \`creditHours\` int NOT NULL DEFAULT '3'`);
        await queryRunner.query(`ALTER TABLE \`course\` ADD \`schedule\` varchar(255) NULL`);
        // Create new enrollment table
        await queryRunner.query(`CREATE TABLE \`enrollment\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`courseId\` int NOT NULL, \`status\` varchar(255) NOT NULL DEFAULT 'enrolled', \`enrolledAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_bb8d5ae5e144676c88c0ebd3c1\` (\`userId\`, \`courseId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`enrollment\` ADD CONSTRAINT \`FK_e97ecbf11356b5173ce7fb0b060\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`enrollment\` ADD CONSTRAINT \`FK_d1a599a7740b4f4bd1120850f04\` FOREIGN KEY (\`courseId\`) REFERENCES \`course\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`enrollment\` DROP FOREIGN KEY \`FK_d1a599a7740b4f4bd1120850f04\``);
        await queryRunner.query(`ALTER TABLE \`enrollment\` DROP FOREIGN KEY \`FK_e97ecbf11356b5173ce7fb0b060\``);
        await queryRunner.query(`DROP INDEX \`IDX_bb8d5ae5e144676c88c0ebd3c1\` ON \`enrollment\``);
        await queryRunner.query(`DROP TABLE \`enrollment\``);
        await queryRunner.query(`ALTER TABLE \`course\` DROP COLUMN \`schedule\``);
        await queryRunner.query(`ALTER TABLE \`course\` DROP COLUMN \`creditHours\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`role\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`department\``);
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`phone\``);
    }

}
