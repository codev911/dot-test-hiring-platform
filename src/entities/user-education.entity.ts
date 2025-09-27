import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { EducationLevel } from '../utils/enums/education-level.enum';
import { Month } from '../utils/enums/month.enum';

@Entity('users_educations')
export class UserEducation extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: UserEducation) => entity.userIdRel)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  userIdRel: User;

  @Column({ name: 'institution', type: 'varchar', length: 255, nullable: false })
  institution: string;

  @Column({ name: 'education_level', type: 'enum', enum: EducationLevel, nullable: false })
  educationLevel: EducationLevel;

  @Column({ name: 'from_month', type: 'enum', enum: Month, nullable: true })
  fromMonth?: Month;

  @Column({ name: 'from_year', type: 'integer', unsigned: true, nullable: false })
  fromYear: number;

  @Column({ name: 'to_month', type: 'enum', enum: Month, nullable: true })
  toMonth?: Month;

  @Column({ name: 'to_year', type: 'integer', unsigned: true, nullable: false })
  toYear: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;
}
