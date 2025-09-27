import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { JobApplication } from './job-application.entity';
import { ApplicationStatus } from '../utils/enums/application-status.enum';

@Entity('jobs_application_events')
export class JobApplicationEvent extends BaseEntity {
  @Column({ name: 'application_id', type: 'bigint', nullable: false })
  @RelationId((entity: JobApplicationEvent) => entity.application)
  applicationId: string;

  @ManyToOne(() => JobApplication, { nullable: false })
  @JoinColumn({ name: 'application_id', referencedColumnName: 'id' })
  application: JobApplication;

  @Column({ name: 'status', type: 'enum', enum: ApplicationStatus, nullable: false })
  status: ApplicationStatus;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string;

  @Column({
    name: 'occurred_at',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  occurredAt: Date;
}
