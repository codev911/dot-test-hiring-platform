import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { JobPosting } from './job-posting.entity';
import { User } from './user.entity';
import { UserResume } from './user-resume.entity';
import { ApplicationStatus } from '../utils/enums/application-status.enum';
import { FiatCurrency } from '../utils/enums/fiat-currency.enum';

@Entity('jobs_applications')
export class JobApplication extends BaseEntity {
  @Column({ name: 'job_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobApplication) => entity.job)
  jobId: string;

  @ManyToOne(() => JobPosting, { nullable: false })
  @JoinColumn({ name: 'job_id', referencedColumnName: 'id' })
  job: JobPosting;

  @Column({ name: 'candidate_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobApplication) => entity.candidate)
  candidateId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'candidate_id', referencedColumnName: 'id' })
  candidate: User;

  @Column({ name: 'resume_id', type: 'bigint', nullable: true })
  @RelationId((entity: JobApplication) => entity.resume)
  resumeId?: string;

  @ManyToOne(() => UserResume, { nullable: true })
  @JoinColumn({ name: 'resume_id', referencedColumnName: 'id' })
  resume?: UserResume;

  @Column({ name: 'cover_letter', type: 'text', nullable: true })
  coverLetter?: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ApplicationStatus,
    nullable: false,
    default: ApplicationStatus.APPLIED,
  })
  status: ApplicationStatus;

  @Column({ name: 'expected_salary', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedSalary?: string;

  @Column({ name: 'salary_currency', type: 'enum', enum: FiatCurrency, nullable: true })
  salaryCurrency?: FiatCurrency;

  @Column({ name: 'available_from', type: 'date', nullable: true })
  availableFrom?: string;

  @Column({
    name: 'submitted_at',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt: Date;
}
