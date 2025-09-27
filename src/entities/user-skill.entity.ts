import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SkillProficiency } from '../utils/enums/skill-proficiency.enum';

@Entity('users_skills')
export class UserSkill extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  @RelationId((entity: UserSkill) => entity.user)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @Column({ name: 'skill_name', type: 'varchar', length: 100, nullable: false })
  skillName: string;

  @Column({ name: 'proficiency', type: 'enum', enum: SkillProficiency, nullable: false })
  proficiency: SkillProficiency;

  @Column({ name: 'years_experience', type: 'smallint', unsigned: true, nullable: true })
  yearsExperience?: number;
}
