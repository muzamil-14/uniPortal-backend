import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  async create(
    dto: CreateAnnouncementDto,
    authorId: number,
  ): Promise<Announcement> {
    const announcement = this.announcementRepository.create({
      ...dto,
      authorId,
    });
    return this.announcementRepository.save(announcement);
  }

  findAll(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }
    return announcement;
  }

  async update(
    id: number,
    dto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    const announcement = await this.findOne(id);
    Object.assign(announcement, dto);
    return this.announcementRepository.save(announcement);
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
  }

  async findRecent(limit: number = 5): Promise<Announcement[]> {
    return this.announcementRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
