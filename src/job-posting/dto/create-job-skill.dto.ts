import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SkillPriority } from '../../utils/enums/skill-priority.enum';
import { SkillProficiency } from '../../utils/enums/skill-proficiency.enum';

/**
 * Payload to create a new job skill.
 */
export class CreateJobSkillDto {
  @ApiProperty({ description: 'Skill name', maxLength: 100, example: 'TypeScript' })
  @IsString()
  @MaxLength(100)
  skillName!: string;

  @ApiProperty({ description: 'Skill priority', enum: SkillPriority, example: SkillPriority.CORE })
  @IsEnum(SkillPriority)
  priority!: SkillPriority;

  @ApiPropertyOptional({
    description: 'Desired proficiency',
    enum: SkillProficiency,
    example: SkillProficiency.ADVANCED,
  })
  @IsOptional()
  @IsEnum(SkillProficiency)
  proficiency?: SkillProficiency;
}
