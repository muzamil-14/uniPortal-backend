import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existing = await this.userRepository.findOneBy({
      email: signupDto.email,
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = this.userRepository.create({
      name: signupDto.name,
      email: signupDto.email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const token = this.generateToken(user);
    return {
      user: this.sanitizeUser(user),
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOneBy({
      email: loginDto.email,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user);
    return {
      user: this.sanitizeUser(user),
      access_token: token,
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, updates: Partial<User>) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }
    Object.assign(user, updates);
    await this.userRepository.save(user);
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async getAllUsers() {
    const users = await this.userRepository.find({ order: { createdAt: 'DESC' } });
    return users.map((u) => this.sanitizeUser(u));
  }

  async assignDepartment(userId: number, department: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    user.department = department;
    await this.userRepository.save(user);
    return this.sanitizeUser(user);
  }

  async updateUserRole(userId: number, role: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    user.role = role;
    await this.userRepository.save(user);
    return this.sanitizeUser(user);
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }
}
