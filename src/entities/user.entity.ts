import { BeforeInsert, Column, Entity } from 'typeorm';
import { HashingService } from '../services/hashing.service';
import { BaseEntity } from './base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: false })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName?: string;

  @Column({ name: 'avatar_path', type: 'text', nullable: true })
  avatarPath?: string;

  @Column({ name: 'email', type: 'varchar', length: 320, unique: true, nullable: false })
  email: string;

  @Column({ name: 'password', type: 'varchar', length: 500, nullable: false })
  password: string;

  @Column({ name: 'is_active', type: 'boolean', nullable: true, default: true })
  isActive?: boolean;

  @BeforeInsert()
  hashPassword(): void {
    if (!this.email || !this.password) {
      return;
    }

    this.password = HashingService.hash(`${this.email}${this.password}`);
  }

  comparePassword(rawPassword: string): boolean {
    if (!this.email || !this.password) {
      return false;
    }

    return this.password === HashingService.hash(`${this.email}${rawPassword}`);
  }
}
