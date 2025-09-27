import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Month } from '../utils/enums/month.enum';

@Entity('users_certifications')
export class UserCertification extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: UserCertification) => entity.userIdRel)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  userIdRel: User;

  @Column({ name: 'certification_name', type: 'varchar', length: 255, nullable: false })
  certificationName: string;

  @Column({ name: 'issuing_organization', type: 'varchar', length: 255, nullable: false })
  issuingOrganization: string;

  @Column({ name: 'issued_month', type: 'enum', enum: Month, nullable: true })
  issuedMonth?: Month;

  @Column({ name: 'issued_year', type: 'integer', unsigned: true, nullable: false })
  issuedYear: number;

  @Column({ name: 'expired_month', type: 'enum', enum: Month, nullable: true })
  expiredMonth?: Month;

  @Column({ name: 'expired_year', type: 'integer', unsigned: true, nullable: true })
  expiredYear?: number;

  @Column({ name: 'certification_id', type: 'varchar', length: 255, nullable: true })
  certificationId?: string;

  @Column({ name: 'certification_url', type: 'text', nullable: true })
  certificationUrl?: string;

  @Column({ name: 'certificate_path', type: 'text', nullable: true })
  certificatePath?: string;
}
