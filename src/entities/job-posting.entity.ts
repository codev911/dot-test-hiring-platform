import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Company } from './company.entity';
import { CompanyRecruiter } from './company-recruiter.entity';
import { JobType } from '../utils/enums/job-type.enum';
import { JobLocation } from '../utils/enums/job-location.enum';
import { FiatCurrency } from '../utils/enums/fiat-currency.enum';

@Entity('jobs')
export class JobPosting extends BaseEntity {
  @Column({ name: 'company_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobPosting) => entity.company)
  companyId: string;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  company: Company;

  @Column({ name: 'recruiter_id', type: 'bigint', nullable: true })
  @RelationId((entity: JobPosting) => entity.recruiter)
  recruiterId?: string;

  @ManyToOne(() => CompanyRecruiter, { nullable: true })
  @JoinColumn({ name: 'recruiter_id', referencedColumnName: 'id' })
  recruiter?: CompanyRecruiter;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ name: 'slug', type: 'varchar', length: 255, unique: true, nullable: false })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: false })
  description: string;

  @Column({
    name: 'employment_type',
    type: 'enum',
    enum: JobType,
    nullable: false,
    default: JobType.FULL_TIME,
  })
  employmentType: JobType;

  @Column({
    name: 'work_location_type',
    type: 'enum',
    enum: JobLocation,
    nullable: false,
    default: JobLocation.ONSITE,
  })
  workLocationType: JobLocation;

  @Column({ name: 'salary_min', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMin?: string;

  @Column({ name: 'salary_max', type: 'decimal', precision: 12, scale: 2, nullable: true })
  salaryMax?: string;

  @Column({ name: 'salary_currency', type: 'enum', enum: FiatCurrency, nullable: true })
  salaryCurrency?: FiatCurrency;

  @Column({ name: 'is_published', type: 'boolean', nullable: false, default: false })
  isPublished: boolean;
}
