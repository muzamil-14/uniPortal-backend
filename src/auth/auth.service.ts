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
      user: { id: user.id, name: user.name, email: user.email },
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
      user: { id: user.id, name: user.name, email: user.email },
      access_token: token,
    };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, name: user.name, email: user.email };
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }
}
