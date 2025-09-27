import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import appDataSource from '../typeorm.database';
import { User } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { CompanyRecruiter } from '../../entities/company-recruiter.entity';
import { RecuiterLevel } from '../../utils/enums/recuiter-level.enum';

async function seedOwner(ds: DataSource): Promise<void> {
  const queryRunner = ds.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const userRepo = queryRunner.manager.getRepository(User);
    const companyRepo = queryRunner.manager.getRepository(Company);
    const recruiterRepo = queryRunner.manager.getRepository(CompanyRecruiter);

    const ownerEmail = 'owner@example.com';
    const ownerPassword = 'ChangeMe123!';

    let owner = await userRepo.findOne({ where: { email: ownerEmail } });

    if (!owner) {
      owner = userRepo.create({
        firstName: 'Owner',
        lastName: 'User',
        email: ownerEmail,
        password: ownerPassword,
        isActive: true,
      });
      owner = await userRepo.save(owner);
    }

    const companyName = 'Example Company';
    const companyWebsite = 'https://example.com';

    let company = await companyRepo.findOne({ where: { name: companyName } });

    if (!company) {
      company = companyRepo.create({
        name: companyName,
        website: companyWebsite,
        description: 'Example company seeded for initial setup.',
      });
      company = await companyRepo.save(company);
    }

    const existingRecruiter = await recruiterRepo.findOne({
      where: {
        companyId: company.id,
        recruiterId: owner.id,
      },
    });

    if (!existingRecruiter) {
      const recruiter = recruiterRepo.create({
        companyIdRel: company,
        recruiterIdRel: owner,
        recuiterLevel: RecuiterLevel.OWNER,
        is_active: true,
      });
      await recruiterRepo.save(recruiter);
    }

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

async function bootstrap(): Promise<void> {
  if (!appDataSource.isInitialized) {
    await appDataSource.initialize();
  }

  try {
    await seedOwner(appDataSource);
    // eslint-disable-next-line no-console
    console.log('Seed completed successfully.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Seed failed.', error);
    process.exitCode = 1;
  } finally {
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
  }
}

void bootstrap();
