import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';
@Entity('companies')
export class Company extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 255, unique: true, nullable: false })
  name: string;

  @Column({ name: 'website', type: 'varchar', length: 255, unique: true, nullable: true })
  website?: string;

  @Column({ name: 'logo_path', type: 'text', nullable: true })
  logoPath?: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;
}
