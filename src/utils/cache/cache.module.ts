import { Global, Module } from '@nestjs/common';
import { CacheHelperService } from './cache.service';

@Global()
@Module({
  providers: [CacheHelperService],
  exports: [CacheHelperService],
})
export class CacheHelperModule {}
