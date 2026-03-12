import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddQuizTables1774000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'quizzes',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'courseId', type: 'int' },
          { name: 'teacherId', type: 'int' },
          { name: 'duration', type: 'int', comment: 'Duration in minutes' },
          { name: 'startTime', type: 'datetime' },
          { name: 'endTime', type: 'datetime' },
          { name: 'isActive', type: 'tinyint', default: 1 },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'quizzes',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedTableName: 'course',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quizzes',
      new TableForeignKey({
        columnNames: ['teacherId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'quiz_questions',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'quizId', type: 'int' },
          { name: 'questionText', type: 'text' },
          { name: 'options', type: 'json' },
          { name: 'correctOptionIndex', type: 'int', comment: 'Index of correct option (0-based)' },
          { name: 'marks', type: 'int', default: 1 },
          { name: 'sortOrder', type: 'int', default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'quiz_questions',
      new TableForeignKey({
        columnNames: ['quizId'],
        referencedTableName: 'quizzes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'quiz_attempts',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'quizId', type: 'int' },
          { name: 'studentId', type: 'int' },
          { name: 'answers', type: 'json', isNullable: true },
          { name: 'score', type: 'int', default: 0 },
          { name: 'totalMarks', type: 'int', default: 0 },
          { name: 'submitted', type: 'tinyint', default: 0 },
          { name: 'tabSwitchCount', type: 'int', default: 0 },
          { name: 'flaggedCheating', type: 'tinyint', default: 0 },
          { name: 'startedAt', type: 'datetime', isNullable: true },
          { name: 'submittedAt', type: 'datetime', isNullable: true },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['quizId'],
        referencedTableName: 'quizzes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'quiz_attempts',
      new TableForeignKey({
        columnNames: ['studentId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('quiz_attempts', true, true, true);
    await queryRunner.dropTable('quiz_questions', true, true, true);
    await queryRunner.dropTable('quizzes', true, true, true);
  }
}
