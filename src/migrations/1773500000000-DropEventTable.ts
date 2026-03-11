import { MigrationInterface, QueryRunner } from "typeorm";

export class DropEventTable1773500000000 implements MigrationInterface {
    name = 'DropEventTable1773500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`event\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`event\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`eventDate\` date NOT NULL, \`endDate\` varchar(255) NULL, \`eventType\` varchar(255) NOT NULL DEFAULT 'event', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }
}
