import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { UserWebsite } from '../utils/enums/user-website.enum';

@Entity('users_sites')
export class UserSites extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: UserSites) => entity.userIdRel)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  userIdRel: User;

  @Column({ name: 'site_type', type: 'enum', enum: UserWebsite, nullable: false })
  siteType: UserWebsite;

  @Column({ name: 'url', type: 'text', nullable: false })
  url: string;
}
