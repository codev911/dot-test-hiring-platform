import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { JobApplication } from './job-application.entity';
import { CompanyRecruiter } from './company-recruiter.entity';

@Entity('jobs_application_notes')
export class JobApplicationNote extends BaseEntity {
  @Column({ name: 'application_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobApplicationNote) => entity.application)
  applicationId: string;

  @ManyToOne(() => JobApplication, { nullable: false })
  @JoinColumn({ name: 'application_id', referencedColumnName: 'id' })
  application: JobApplication;

  @Column({ name: 'author_recruiter_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobApplicationNote) => entity.author)
  authorRecruiterId: string;

  @ManyToOne(() => CompanyRecruiter, { nullable: false })
  @JoinColumn({ name: 'author_recruiter_id', referencedColumnName: 'id' })
  author: CompanyRecruiter;

  @Column({ name: 'note', type: 'text', nullable: false })
  note: string;
}
