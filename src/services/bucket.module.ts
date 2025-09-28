import { Global, Module } from '@nestjs/common';
import { BucketService } from './bucket.service';

/**
 * Global module exposing the {@link BucketService} for dependency injection.
 */
@Global()
@Module({
  providers: [BucketService],
  exports: [BucketService],
})
export class BucketModule {}
