import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Company } from './company.entity';
import { RecuiterLevel } from '../utils/enums/recuiter-level.enum';

@Entity('companies_recruiter')
export class CompanyRecruiter extends BaseEntity {
  @Column({
    name: 'company_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: CompanyRecruiter) => entity.companyIdRel)
  companyId: string;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({
    name: 'company_id',
    referencedColumnName: 'id',
  })
  companyIdRel: Company;

  @Column({
    name: 'recruiter_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: CompanyRecruiter) => entity.recruiterIdRel)
  recruiterId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'recruiter_id',
    referencedColumnName: 'id',
  })
  recruiterIdRel: User;

  @Column({ name: 'recuiter_level', type: 'enum', enum: RecuiterLevel, nullable: false })
  recuiterLevel: RecuiterLevel;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  is_active: boolean;
}
