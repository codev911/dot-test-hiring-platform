import { Injectable } from '@nestjs/common';
import { keccak256, id } from 'ethers';

/**
 * Utility service for hashing plaintext using keccak256.
 */
@Injectable()
export class HashingService {
  /**
   * Hash the provided data using keccak256(id(data)).
   *
   * @param data Plaintext value to hash.
   * @returns Hex-encoded hash string.
   */
  static hash(data: string): string {
    return keccak256(id(data));
  }
}
