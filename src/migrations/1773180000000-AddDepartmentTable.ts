import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDepartmentTable1773180000000 implements MigrationInterface {
    name = 'AddDepartmentTable1773180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`department\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_department_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_department_name\` ON \`department\``);
        await queryRunner.query(`DROP TABLE \`department\``);
    }
}
