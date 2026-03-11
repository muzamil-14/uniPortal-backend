import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CourseModule } from './course/course.module';
import { AuthModule } from './auth/auth.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { DepartmentModule } from './department/department.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { AttendanceModule } from './attendance/attendance.module';
import { CourseMaterialModule } from './course-material/course-material.module';
import { AssignmentModule } from './assignment/assignment.module';
import { SubmissionModule } from './submission/submission.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false, // disable in production
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    CourseModule,
    AuthModule,
    EnrollmentModule,
    DepartmentModule,
    AnnouncementModule,
    AttendanceModule,
    CourseMaterialModule,
    AssignmentModule,
    SubmissionModule,
    NotificationModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
