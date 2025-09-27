import { Injectable } from '@nestjs/common';
import { keccak256, id } from 'ethers';

@Injectable()
export class HashingService {
  static hash(data: string): string {
    return keccak256(id(data));
  }
}
