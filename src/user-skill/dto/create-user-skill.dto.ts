import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { SkillProficiency } from '../../utils/enums/skill-proficiency.enum';

/**
 * DTO for creating a new user skill.
 */
export class CreateUserSkillDto {
  @ApiProperty({
    description: 'Name of the skill',
    example: 'JavaScript',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  skillName!: string;

  @ApiProperty({
    description: 'Proficiency level',
    enum: SkillProficiency,
    example: SkillProficiency.INTERMEDIATE,
  })
  @IsEnum(SkillProficiency)
  proficiency!: SkillProficiency;

  @ApiProperty({
    description: 'Years of experience with this skill',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  yearsExperience?: number;
}
