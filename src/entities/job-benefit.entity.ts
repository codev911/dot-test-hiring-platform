import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { JobPosting } from './job-posting.entity';

@Entity('jobs_benefits')
export class JobBenefit extends BaseEntity {
  @Column({ name: 'job_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobBenefit) => entity.job)
  jobId: string;

  @ManyToOne(() => JobPosting, { nullable: false })
  @JoinColumn({ name: 'job_id', referencedColumnName: 'id' })
  job: JobPosting;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: false })
  label: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;
}
