import { PartialType } from '@nestjs/swagger';
import { CreateUserCertificationDto } from './create-user-certification.dto';

export class UpdateUserCertificationDto extends PartialType(CreateUserCertificationDto) {}
