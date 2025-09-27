import { Column, Entity, JoinColumn, ManyToOne, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('users_resume')
export class UserResume extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  @RelationId((entity: UserResume) => entity.userIdRel)
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  userIdRel: User;

  @Column({ name: 'resume_path', type: 'text', nullable: false })
  resumePath: string;
}
