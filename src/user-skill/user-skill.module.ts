import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSkillService } from './user-skill.service';
import { UserSkillController } from './user-skill.controller';
import { User } from '../entities/user.entity';
import { UserSkill } from '../entities/user-skill.entity';
import { CandidateAuthGuard } from '../common/guards/candidate-auth.guard';

/**
 * NestJS module bundling the user skill controller and service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserSkill])],
  controllers: [UserSkillController],
  providers: [UserSkillService, CandidateAuthGuard],
})
export class UserSkillModule {}
