import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SkillPriority } from '../../utils/enums/skill-priority.enum';
import { SkillProficiency } from '../../utils/enums/skill-proficiency.enum';

/**
 * Payload to update an existing job skill.
 */
export class UpdateJobSkillDto {
  @ApiPropertyOptional({ description: 'Skill name', maxLength: 100, example: 'React' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  skillName?: string;

  @ApiPropertyOptional({
    description: 'Skill priority',
    enum: SkillPriority,
    example: SkillPriority.NICE_TO_HAVE,
  })
  @IsOptional()
  @IsEnum(SkillPriority)
  priority?: SkillPriority;

  @ApiPropertyOptional({
    description: 'Desired proficiency',
    enum: SkillProficiency,
    example: SkillProficiency.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(SkillProficiency)
  proficiency?: SkillProficiency;
}
