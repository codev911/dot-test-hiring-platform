import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Month } from '../utils/enums/month.enum';
import { JobLocation } from '../utils/enums/job-location.enum';
import { JobType } from '../utils/enums/job-type.enum';

@Entity('users_experiences')
export class UserExperience extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: UserExperience) => entity.userIdRel)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  userIdRel: User;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ name: 'company', type: 'varchar', length: 255, nullable: false })
  company: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: JobType,
    nullable: false,
    default: JobType.FULL_TIME,
  })
  type: JobType;

  @Column({
    name: 'location',
    type: 'enum',
    enum: JobLocation,
    nullable: false,
    default: JobLocation.ONSITE,
  })
  location: JobLocation;

  @Column({ name: 'from_month', type: 'enum', enum: Month, nullable: true })
  fromMonth?: Month;

  @Column({ name: 'from_year', type: 'integer', unsigned: true, nullable: true })
  fromYear?: number;

  @Column({ name: 'to_month', type: 'enum', enum: Month, nullable: true })
  toMonth?: Month;

  @Column({ name: 'to_year', type: 'integer', unsigned: true, nullable: true })
  toYear?: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;
}
