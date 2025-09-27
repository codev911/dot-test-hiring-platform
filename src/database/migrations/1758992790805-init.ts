import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1758992790805 implements MigrationInterface {
  name = 'Init1758992790805';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`first_name\` varchar(255) NOT NULL, \`last_name\` varchar(255) NULL, \`avatar_path\` text NULL, \`email\` varchar(320) NOT NULL, \`password\` varchar(500) NOT NULL, \`is_active\` tinyint NULL DEFAULT 1, UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_skills\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`skill_name\` varchar(100) NOT NULL, \`proficiency\` enum ('beginner', 'intermediate', 'advanced', 'expert') NOT NULL, \`years_experience\` smallint UNSIGNED NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_sites\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`site_type\` enum ('LinkedIn', 'GitHub', 'Portofolio Website') NOT NULL, \`url\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_resume\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`resume_path\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_experiences\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`title\` varchar(255) NOT NULL, \`company\` varchar(255) NOT NULL, \`type\` enum ('full-time', 'part-time', 'freelance', 'self-employed', 'contract', 'temporary', 'intern') NOT NULL DEFAULT 'full-time', \`location\` enum ('remote', 'on-site', 'hybrid') NOT NULL DEFAULT 'on-site', \`from_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`from_year\` int UNSIGNED NULL, \`to_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`to_year\` int UNSIGNED NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_educations\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`institution\` varchar(255) NOT NULL, \`education_level\` enum ('High School Diploma or Equivalent', 'Vocational Diploma', 'Associate''s Degree', 'Bachelor''s Degree', 'Postgraduate Diploma', 'Master''s Degree', 'Professional Degree', 'Doctoral Degree', 'Postdoctoral Research') NOT NULL, \`from_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`from_year\` int UNSIGNED NOT NULL, \`to_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`to_year\` int UNSIGNED NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`companies\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`name\` varchar(255) NOT NULL, \`website\` varchar(255) NULL, \`logo_path\` text NULL, \`description\` text NULL, UNIQUE INDEX \`IDX_3dacbb3eb4f095e29372ff8e13\` (\`name\`), UNIQUE INDEX \`IDX_3e7b86aa8b4ffe84947ff29c0b\` (\`website\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`companies_recruiter\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`company_id\` bigint NOT NULL, \`recruiter_id\` bigint NOT NULL, \`recuiter_level\` enum ('owner', 'manager') NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`company_id\` bigint NOT NULL, \`recruiter_id\` bigint NULL, \`title\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`employment_type\` enum ('full-time', 'part-time', 'freelance', 'self-employed', 'contract', 'temporary', 'intern') NOT NULL DEFAULT 'full-time', \`work_location_type\` enum ('remote', 'on-site', 'hybrid') NOT NULL DEFAULT 'on-site', \`salary_min\` decimal(12,2) NULL, \`salary_max\` decimal(12,2) NULL, \`salary_currency\` enum ('AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XCG', 'XDR', 'XOF', 'XPF', 'XSU', 'YER', 'ZAR', 'ZMW', 'ZWG', 'ZWL') NULL, \`is_published\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_ebf78eba11615c490d5db84451\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_skills\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`job_id\` bigint NOT NULL, \`skill_name\` varchar(100) NOT NULL, \`priority\` enum ('core', 'nice to have') NOT NULL DEFAULT 'core', \`proficiency\` enum ('beginner', 'intermediate', 'advanced', 'expert') NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users_certifications\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`user_id\` bigint NOT NULL, \`certification_name\` varchar(255) NOT NULL, \`issuing_organization\` varchar(255) NOT NULL, \`issued_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`issued_year\` int UNSIGNED NOT NULL, \`expired_month\` enum ('01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12') NULL, \`expired_year\` int UNSIGNED NULL, \`certification_id\` varchar(255) NULL, \`certification_url\` text NULL, \`certificate_path\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_requirements\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`job_id\` bigint NOT NULL, \`label\` varchar(255) NOT NULL, \`detail\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_benefits\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`job_id\` bigint NOT NULL, \`label\` varchar(255) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_applications\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`job_id\` bigint NOT NULL, \`candidate_id\` bigint NOT NULL, \`resume_id\` bigint NULL, \`cover_letter\` text NULL, \`status\` enum ('applied', 'under review', 'interview', 'offer', 'hired', 'rejected', 'withdrawn') NOT NULL DEFAULT 'applied', \`expected_salary\` decimal(12,2) NULL, \`salary_currency\` enum ('AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XCG', 'XDR', 'XOF', 'XPF', 'XSU', 'YER', 'ZAR', 'ZMW', 'ZWG', 'ZWL') NULL, \`available_from\` date NULL, \`submitted_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_application_notes\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`application_id\` bigint NOT NULL, \`author_recruiter_id\` bigint NOT NULL, \`note\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`jobs_application_events\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, \`application_id\` bigint NOT NULL, \`status\` enum ('applied', 'under review', 'interview', 'offer', 'hired', 'rejected', 'withdrawn') NOT NULL, \`note\` text NULL, \`occurred_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_skills\` ADD CONSTRAINT \`FK_aa700512dc7cfdf555880af5541\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_sites\` ADD CONSTRAINT \`FK_1a4da83de6b246a47b1ea0db6d1\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_resume\` ADD CONSTRAINT \`FK_3813ce5caf50f94246f3ca0c40f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_experiences\` ADD CONSTRAINT \`FK_54272cc03597eceda694d6d6846\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_educations\` ADD CONSTRAINT \`FK_366554b1f6306a280afc6d4ff6e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`companies_recruiter\` ADD CONSTRAINT \`FK_5f7fdb9620e12271fa4413b0ec8\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`companies_recruiter\` ADD CONSTRAINT \`FK_888dab778de0feed8e9f172662d\` FOREIGN KEY (\`recruiter_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs\` ADD CONSTRAINT \`FK_087a773c50525e348e26188e7cc\` FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs\` ADD CONSTRAINT \`FK_4aa9e89c9fdf42566a1978820a6\` FOREIGN KEY (\`recruiter_id\`) REFERENCES \`companies_recruiter\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_skills\` ADD CONSTRAINT \`FK_447196318490b98d5ea9e01b9bf\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_certifications\` ADD CONSTRAINT \`FK_354e2b78d5b0b95311e2b75f0dd\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_requirements\` ADD CONSTRAINT \`FK_e5f6f1426f19114fa6b4618c94c\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_benefits\` ADD CONSTRAINT \`FK_3512e7d550cc564db83226bce5c\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` ADD CONSTRAINT \`FK_5a79424a96630aaedba4cea3cd4\` FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` ADD CONSTRAINT \`FK_39c4a24206642e4a450ed619008\` FOREIGN KEY (\`candidate_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` ADD CONSTRAINT \`FK_41c877621ea2a9bf5a7424d2ecb\` FOREIGN KEY (\`resume_id\`) REFERENCES \`users_resume\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_notes\` ADD CONSTRAINT \`FK_c860f22a0b96e4734aec4edffe2\` FOREIGN KEY (\`application_id\`) REFERENCES \`jobs_applications\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_notes\` ADD CONSTRAINT \`FK_e43beceb6cb3a9f02b443377fdf\` FOREIGN KEY (\`author_recruiter_id\`) REFERENCES \`companies_recruiter\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_events\` ADD CONSTRAINT \`FK_13b0b4e1d2fa0759f50c076b411\` FOREIGN KEY (\`application_id\`) REFERENCES \`jobs_applications\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_events\` DROP FOREIGN KEY \`FK_13b0b4e1d2fa0759f50c076b411\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_notes\` DROP FOREIGN KEY \`FK_e43beceb6cb3a9f02b443377fdf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_application_notes\` DROP FOREIGN KEY \`FK_c860f22a0b96e4734aec4edffe2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` DROP FOREIGN KEY \`FK_41c877621ea2a9bf5a7424d2ecb\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` DROP FOREIGN KEY \`FK_39c4a24206642e4a450ed619008\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_applications\` DROP FOREIGN KEY \`FK_5a79424a96630aaedba4cea3cd4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_benefits\` DROP FOREIGN KEY \`FK_3512e7d550cc564db83226bce5c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_requirements\` DROP FOREIGN KEY \`FK_e5f6f1426f19114fa6b4618c94c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_certifications\` DROP FOREIGN KEY \`FK_354e2b78d5b0b95311e2b75f0dd\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs_skills\` DROP FOREIGN KEY \`FK_447196318490b98d5ea9e01b9bf\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs\` DROP FOREIGN KEY \`FK_4aa9e89c9fdf42566a1978820a6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`jobs\` DROP FOREIGN KEY \`FK_087a773c50525e348e26188e7cc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`companies_recruiter\` DROP FOREIGN KEY \`FK_888dab778de0feed8e9f172662d\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`companies_recruiter\` DROP FOREIGN KEY \`FK_5f7fdb9620e12271fa4413b0ec8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_educations\` DROP FOREIGN KEY \`FK_366554b1f6306a280afc6d4ff6e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_experiences\` DROP FOREIGN KEY \`FK_54272cc03597eceda694d6d6846\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_resume\` DROP FOREIGN KEY \`FK_3813ce5caf50f94246f3ca0c40f\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_sites\` DROP FOREIGN KEY \`FK_1a4da83de6b246a47b1ea0db6d1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users_skills\` DROP FOREIGN KEY \`FK_aa700512dc7cfdf555880af5541\``,
    );
    await queryRunner.query(`DROP TABLE \`jobs_application_events\``);
    await queryRunner.query(`DROP TABLE \`jobs_application_notes\``);
    await queryRunner.query(`DROP TABLE \`jobs_applications\``);
    await queryRunner.query(`DROP TABLE \`jobs_benefits\``);
    await queryRunner.query(`DROP TABLE \`jobs_requirements\``);
    await queryRunner.query(`DROP TABLE \`users_certifications\``);
    await queryRunner.query(`DROP TABLE \`jobs_skills\``);
    await queryRunner.query(`DROP INDEX \`IDX_ebf78eba11615c490d5db84451\` ON \`jobs\``);
    await queryRunner.query(`DROP TABLE \`jobs\``);
    await queryRunner.query(`DROP TABLE \`companies_recruiter\``);
    await queryRunner.query(`DROP INDEX \`IDX_3e7b86aa8b4ffe84947ff29c0b\` ON \`companies\``);
    await queryRunner.query(`DROP INDEX \`IDX_3dacbb3eb4f095e29372ff8e13\` ON \`companies\``);
    await queryRunner.query(`DROP TABLE \`companies\``);
    await queryRunner.query(`DROP TABLE \`users_educations\``);
    await queryRunner.query(`DROP TABLE \`users_experiences\``);
    await queryRunner.query(`DROP TABLE \`users_resume\``);
    await queryRunner.query(`DROP TABLE \`users_sites\``);
    await queryRunner.query(`DROP TABLE \`users_skills\``);
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
