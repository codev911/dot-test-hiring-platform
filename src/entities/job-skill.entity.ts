import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { JobPosting } from './job-posting.entity';
import { SkillPriority } from '../utils/enums/skill-priority.enum';
import { SkillProficiency } from '../utils/enums/skill-proficiency.enum';

@Entity('jobs_skills')
export class JobSkill extends BaseEntity {
  @Column({ name: 'job_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobSkill) => entity.job)
  jobId: string;

  @ManyToOne(() => JobPosting, { nullable: false })
  @JoinColumn({ name: 'job_id', referencedColumnName: 'id' })
  job: JobPosting;

  @Column({ name: 'skill_name', type: 'varchar', length: 100, nullable: false })
  skillName: string;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: SkillPriority,
    nullable: false,
    default: SkillPriority.CORE,
  })
  priority: SkillPriority;

  @Column({ name: 'proficiency', type: 'enum', enum: SkillProficiency, nullable: true })
  proficiency?: SkillProficiency;
}
