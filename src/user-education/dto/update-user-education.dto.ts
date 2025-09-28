import { PartialType } from '@nestjs/swagger';
import { CreateUserEducationDto } from './create-user-education.dto';

export class UpdateUserEducationDto extends PartialType(CreateUserEducationDto) {}
