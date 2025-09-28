import { PartialType } from '@nestjs/swagger';
import { CreateUserExperienceDto } from './create-user-experience.dto';

export class UpdateUserExperienceDto extends PartialType(CreateUserExperienceDto) {}
